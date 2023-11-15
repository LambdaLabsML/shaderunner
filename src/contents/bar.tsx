import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import React, { useState, useEffect } from 'react';
import Logo from 'data-url:./icon.png';
import { getMainContent, splitContent } from './extract'
import { useSessionStorage as _useSessionStorage } from '../util'
import { textNodesUnderElem, findTextSlow, findTextFast, highlightText, resetHighlights, findMainContent, consistentColor } from './utilDOM'
import { computeEmbeddingsLocal } from './embeddings'
import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook";
import { MSG_CONTENT, MSG_EMBED, MSG_QUERY2CLASS } from "./messages";
import Histogram from "../histogram";
import EditableText from "./EditableText";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;
console.log(process.env.NODE_ENV, process.env.PLASMO_PUBLIC_STORAGE)


// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => findMainContent()
 

// place it above the anchor
export const mountShadowHost: PlasmoMountShadowHost = ({
  shadowHost,
  anchor,
  mountState
}) => {
  anchor.element.prepend(shadowHost)
  mountState.observer.disconnect() // OPTIONAL DEMO: stop the observer as needed
}


// load style
import styleText from "data-text:./shaderunner.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// let arrays have a random sample method
const random = function (A) {
  return A[Math.floor((Math.random()*A.length))];
}



const CollapsibleBox = (props) => {
  const [ collapsed, setCollapsed ] = useState(true);

  const toggleCollapse = () => setCollapsed(!collapsed);

  if (!collapsed)
    return ( <div><h3 onClick={toggleCollapse}>{props.title} (click to close)</h3>{props.children}</div> );

  return ( <h3 onClick={toggleCollapse}>{props.title} (collapsed, click to open)</h3> );
};


const ClassModifierList = ({title, classList, onSubmit}) => {
  return (<div className="ClassModifier">
    <h4>{title}</h4>
    {
        classList.map((c, i) => ( <EditableText key={c} text={c} onSubmit={(c_new) => onSubmit(classList, c_new, i)}/> ))
    }
    <EditableText key={"new"+Math.random()} text={(<i>Add New</i>)} onSubmit={(c_new) => onSubmit(classList, c_new, -1)}/>
  </div>);
};





// the actual shaderunner bar
const ShadeRunnerBar = () => {
    const [ isActiveOn, setIsActiveOn ] = useStorage("activeURLs", []);
    const [ highlightQuery, setHighlightQuery ] = useSessionStorage("highlightQuery", "");
    const [ pageEmbeddings, setPageEmbeddings] = useState({});
    const [ classifierData, setClassifierData] = useSessionStorage("classifierData", {});
    const [ retrievalQuery, setRetrievalQuery] = useSessionStorage("retrievalQuery", null);
    const [ scores, setScores] = useState([]);
    const [ statusMsg, setStatusMsg] = useState([]);
    const [ isThinking, setIsThinking] = useState(false);
    const [ verbose, setVerbose ] = useStorage("verbose", false);
    const [textclassifier, settextclassifier] = useStorage('textclassifier', (v) => v === undefined ? true : v)
    const [textretrieval, settextretrieval] = useStorage('textretrieval', (v) => v === undefined ? true : v)
    const [textretrieval_k, settextretrieval_k] = useStorage('textretrieval_k', (v) => v === undefined ? 3 : v)

    // eps values
    const [ alwayshighlighteps, setalwayshighlighteps ] = useStorage("alwayshighlighteps");
    const [ minimalhighlighteps, setminimalhighlighteps ] = useStorage("minimalhighlighteps");
    const [ decisioneps, setdecisioneps ] = useStorage("decisioneps");
    let poseps = [];
    if (alwayshighlighteps > 0) poseps.push(alwayshighlighteps);
    if (minimalhighlighteps > 0) poseps.push(minimalhighlighteps);


    const url = window.location.hostname + window.location.pathname;
    const isActive = isActiveOn[window.location.hostname] ? true : false;


    // ------ //
    // helper //
    // ------ //
    const statusAdd = (type: string, msg: string) => setStatusMsg((old) => [...old, [type, msg]]);
    const statusClear = () => setStatusMsg(old => []);
    const statusAmend = (fn: ((msg: ([string, string])) => [string,string]), i?: number) => setStatusMsg(old => {
        if(!i) i = old.length - 1;
        const newStatus = [...old];
        newStatus[i] = fn(newStatus[i]);
        return newStatus;
    })


    // ------ //
    // events //
    // ------ //
    const onEnterPress = async (ev) => {
      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 
        setStatusMsg([])
        setIsThinking(true)
        //await query2embedding(highlightQuery);

        // set retrieval query
        setRetrievalQuery(textretrieval ? highlightQuery : null);

        // query llm to give classes
        if (textclassifier) {
          await getQueryClasses(highlightQuery, () => {
            statusAdd("llm", random(MSG_QUERY2CLASS))
          }, () => {
            statusAmend(status => [status[0], status[1] + " done"])
          })
        }

        // ensure split embeddings exist
        const mode = "sentences";
        const newEmbeddings = await getPageEmbeddings(mode, () => {
          statusAdd("embedding", random(MSG_EMBED))
        }, () => {
          statusAmend(status => [status[0], status[1] + " done"])
        })
        setPageEmbeddings(old => ({...old, [mode]: newEmbeddings}));

        statusAdd("status","done")
        setIsThinking(false)
      }
    }

    const onClassChange = (classList, c_new, pos) => {
      setClassifierData(oldData => {
        const list = (classList == classifierData.classes_pos) ? "classes_pos" : "classes_neg"
        let newClasses = oldData[list]
        if (!c_new)
          newClasses = newClasses.filter((c,i) => i != pos)
        else if (pos < 0)
          newClasses.push(c_new)
        else
          newClasses[pos] = c_new;
        return {...oldData, [list]: newClasses}
      })
    }


    // ------- //
    // effects //
    // ------- //

    // on every classifier change, recompute highlights
    useEffect(() => {
      if(!isActive || !classifierData.thought && !highlightQuery) return;

      resetHighlights()

      const applyHighlight = async () => {
        try {
          if (textclassifier)
            highlightUsingClasses()
          if (textretrieval)
            highlightUsingRetrieval(highlightQuery)
        } catch (error) {
          console.error('Error in applyHighlight:', error);
        }
      }
      applyHighlight()
    }, [classifierData, isActive, textclassifier, textretrieval])


    // --------- //
    // functions //
    // --------- //

    // ensure page embeddings exist
    const getPageEmbeddings = async (mode = "sentences", onEmbed = () => {}, onEmbedDone = () => {}) => {

        // use cache if already computed
        if (pageEmbeddings[mode]) return pageEmbeddings[mode];

        // if not in cache, check if database has embeddings
        const exists = (await sendToBackground({ name: "embedding", method: "exits_embeddings", collectionName: url}))
        if (!exists)
          onEmbed()

        // extract main content & generate splits
        //statusAdd(random(MSG_CONTENT))
        const mainEl = getMainContent(true);
        const [splits, metadata] = splitContent(mainEl.textContent, mode, url)

        // retrieve embedding
        const splitEmbeddings = (await sendToBackground({ name: "embedding", method: "get_embeddings", collectionName: url, data: [splits, metadata]})).embeddings
        const _pageEmbeddings = {[mode]: {splits: splits, metadata: metadata, embeddings: splitEmbeddings}}

        if (!exists)
          onEmbedDone()

        return _pageEmbeddings;
    }


    // ask llm for classes
    const getQueryClasses = async (query, onLLM = () => {}, onLLMDone = () => {}) => {
      onLLM()
      const result = await sendToBackground({ name: "query2classes", query: query, url: url, title: document.title })
      setClassifierData(old => ({...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope}))
      onLLMDone()
    }


    const highlightUsingClasses = async (mode = "sentences") => {
      const classes_pos = classifierData.classes_pos;
      const classes_neg = classifierData.classes_neg;
      if (!classes_pos || !classes_neg)
        return;

      // ensure we have embedded the page contents
      const pageEmbeddings = await getPageEmbeddings(mode)
      console.log(pageEmbeddings)
      const splits = pageEmbeddings[mode].splits;
      const splitEmbeddings = pageEmbeddings[mode].embeddings;

      // compute embeddings of classes
      //statusAdd(random(MSG_EMBED))
      const allclasses = [...classes_pos, ...classes_neg]
      const result = await computeEmbeddingsLocal(allclasses, []);
      const classStore = result[0];

      // mark sentences based on similarity
      //statusAdd("Done. See below.")
      let scores_diffs = [];
      let scores_plus = [];
      for (const i in splits) {
        const split = splits[i];

        // using precomputed embeddings
        const embedding = splitEmbeddings[split];
        const closest = await classStore.similaritySearchVectorWithScore(embedding, k = allclasses.length);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        scores_plus.push(score_plus);
        scores_diffs.push(score_plus - score_minus);

        let highlightanyway = false;

        // always highlight if similarity is above given value
        if (alwayshighlighteps > 0 && score_plus > alwayshighlighteps)
          highlightanyway = true;

        // ignore anything that is not distinguishable
        //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
        else if (!highlightanyway && (decisioneps > 0 && Math.abs(score_plus - score_minus) < decisioneps || minimalhighlighteps > 0 && score_plus < minimalhighlighteps)) {
          if (verbose) console.log("skipping", split, score_plus, score_minus)
          continue
        }

        // apply color if is first class
        if (score_plus > score_minus || highlightanyway) {
          if (verbose) console.log("mark", split, score_plus, score_minus)

          // get all text nodes
          const textNodes = textNodesUnderElem(document.body);

          // mark sentence
          let [texts, nodes] = findTextFast(textNodes, split);
          if (texts.length == 0) {
            [texts, nodes] = findTextSlow(textNodes, split);
            if (texts.length == 0) {
              if (verbose) console.log("ERROR: text not found", split)
            }
          }
          highlightText(texts, nodes, consistentColor(closest[0][0].pageContent), closest[0][0].pageContent + " " + closest[0][1]);
        } else {
          if (verbose) console.log("reject", split, score_plus, score_minus)
        }
      }

      setScores([scores_plus, scores_diffs])
    }


    // mark sentences based on retrieval
    const highlightUsingRetrieval = async (query, mode = "sentences") => {
      if (!query) return;

      // ensure we have embedded the page contents
      const pageEmbeddings = await getPageEmbeddings(mode)
      const splits = pageEmbeddings[mode].splits;
      const metadata = pageEmbeddings[mode].metadata;

      // using precomputed embeddings
      const retrieved_splits = (await sendToBackground({ name: "embedding", method: "retrieval", collectionName: url, data: [splits, metadata], query: query, k: textretrieval_k }))

      for (const i in retrieved_splits) {
        const split = retrieved_splits[i][0].pageContent;
        const score = retrieved_splits[i][1]

        // apply color if is first class
        if (verbose) console.log("mark retrieval", split, score)

        // get all text nodes
        const textNodes = textNodesUnderElem(document.body);

        // mark sentence
        const [texts, nodes] = findTextSlow(textNodes, split);
        highlightText(texts, nodes, consistentColor(highlightQuery+" (retrieval)", true));
      }
    }


    // ------ //
    // render //
    // ------ //

    // show only when active
    if (!isActive) return "";



    const thinkingLogo = ( <img className="thinking_logo" width="20" src={Logo}/>)
    const statusHtml = (
      <div className="status">
        {/*[statusMsg[statusMsg.length-1]].map((status, i) => ( <div key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status}</div>))*/}
        {!statusMsg ? "" : statusMsg.map((status, i) => ( <div key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status[0]}: {status[1]}</div>))}
      </div>
      
    )


    return <div className="ShadeRunner-Bar">
      <h1 className="title">ShadeRunner</h1>
      <textarea
        className="text-box"
        placeholder="What do you want to find here?"
        value={highlightQuery}
        onChange={(ev) => setHighlightQuery(ev.target.value)}
        onKeyDown={onEnterPress}
        rows="4"
      />
      {statusMsg && statusMsg.length ? statusHtml : ""}
      {classifierData.thought && Array.isArray(classifierData.classes_pos) && Array.isArray(classifierData.classes_neg) ? (
        <CollapsibleBox title="Highlight Classes">
          <h3>Scope:</h3>
          {classifierData.scope}
          <h3>Thought:</h3>
          {classifierData.thought}
          <ClassModifierList title="Positive Terms" classList={classifierData.classes_pos} onSubmit={onClassChange}/>
          <ClassModifierList title="Negative Terms" classList={classifierData.classes_neg} onSubmit={onClassChange}/>
        </CollapsibleBox>
      ) : ""}
      {scores.length && scores[0].length ? ( 
        <CollapsibleBox title="Histograms">
          <div className="histograms" style={{display: "flex", flexDirection: "row"}}>
            <div style={{ flex: "1" }}>
              <b style={{display: "block", width: "100%", textAlign: "center"}}>Scores of Positive Class</b>
              <Histogram scores={scores[0]} lines={poseps} />
            </div>
            <div style={{ flex: "1" }}>
              <b style={{display: "block", width: "100%", textAlign: "center"}}>Score Differences (score_plus - score_minus)</b>
              <Histogram scores={scores[1]} lines={decisioneps > 0 ? [decisioneps] : []} />
            </div>
          </div>
        </CollapsibleBox>
      ) : ""}
      <h3>Colors</h3>
      {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
        <span style={{backgroundColor: consistentColor(c)}}>{c}</span>
      )) : ""}
      {retrievalQuery ? <span style={{backgroundColor: consistentColor(retrievalQuery+" (retrieval)", true)}}>{retrievalQuery+" (retrieval)"}</span> : ""}
    </div>
}

export default ShadeRunnerBar;