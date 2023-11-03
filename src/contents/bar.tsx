import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import React, { useState } from 'react';
import Logo from 'data-url:./icon.png';
import { findText, getMainContent, splitContent } from './extract'
import { textNodesUnderElem, findText, markSentence, findMainContent  } from './utilDOM'
import { computeEmbeddingsLocal } from './embeddings'
import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook";
import { MSG_CONTENT, MSG_EMBED, MSG_QUERY2CLASS } from "./messages";
import Histogram from "../histogram";


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


// the actual shaderunner bar
const ShadeRunnerBar = () => {

    const [ highlightQuery, setHighlightQuery ] = useState("");
    const [ statusMsg, setStatusMsg ] = useState([]);
    const [ isThinking, setIsThinking ] = useState(false);
    const [ isActiveOn, setIsActiveOn ] = useStorage("activeURLs", []);
    const [ scores, setScores ] = useState([]);
    const [ verbose, setVerbose ] = useStorage("verbose");
    const [textclassifier, settextclassifier] = useStorage('textclassifier', (v) => v === undefined ? true : v)
    const [textretrieval, settextretrieval] = useStorage('textretrieval', (v) => v === undefined ? true : v)

    // eps values
    const [ alwayshighlighteps, setalwayshighlighteps ] = useStorage("alwayshighlighteps");
    const [ minimalhighlighteps, setminimalhighlighteps ] = useStorage("minimalhighlighteps");
    const [ decisioneps, setdecisioneps ] = useStorage("decisioneps");
    let poseps = [];
    if (alwayshighlighteps > 0) poseps.push(alwayshighlighteps);
    if (minimalhighlighteps > 0) poseps.push(minimalhighlighteps);

    // show only when active
    if (!isActiveOn[window.location.hostname]) return "";

    const statusAdd = (msg) => setStatusMsg((old) => [...old, msg]);
    const statusClear = () => setStatusMsg([]);
    const statusAppend = (msg, i) => setStatusMsg(old => {
        const newStatus = [...old];
        newStatus[i] = newStatus[i] + msg;
        return newStatus;
    })

    const onEnterPress = async (ev) => {
      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 

        statusClear()
        setIsThinking(true);

        const url = window.location.hostname + window.location.pathname
        const mode = "sentences"
        let status_msg = statusMsg.length;

        // ask for classes
        let classes;
        if (textclassifier) {
          statusAdd(random(MSG_QUERY2CLASS))
          classes = await sendToBackground({ name: "query2classes", query: highlightQuery, url: url, title: document.title })
          statusAdd( ( <div className="indent"><b>Positive Class:</b> {classes["classes_plus"].join(", ")} </div> ) )
          statusAdd( ( <div className="indent"><b>Negative Class:</b> {classes["classes_minus"].join(", ")} </div> ) )
          statusAdd( ( <div className="indent"><b>Thought:</b> {classes["thought"]} </div> ) )
          statusAppend(" done", status_msg)
          status_msg += 4
        }

        // extract main content & generate splits
        statusAdd(random(MSG_CONTENT))
        const mainEl = getMainContent(true);
        const [splits, metadata] = splitContent(mainEl.textContent, mode, url)
        statusAppend(" done", status_msg)
        status_msg++

        // retrieve embedding
        statusAdd(random(MSG_EMBED))
        const splitEmbeddings = (await sendToBackground({ name: "embedding", method: "get_embeddings", collectionName: url, data: [splits, metadata]})).embeddings
        statusAppend(" done", status_msg)
        status_msg++

        let allclasses, classStore, classEmbeddings;
        if (textclassifier) {
          // compute embeddings of classes
          statusAdd(random(MSG_EMBED))
          allclasses = [...classes["classes_plus"], ...classes["classes_minus"]]
          const result = await computeEmbeddingsLocal(allclasses, []);
          classStore = result[0];
          classEmbeddings = result[1];
          statusAppend(" done", status_msg)
          status_msg++
        }

        // mark sentences based on similarity
        statusAdd("Done. See below.")
        let scores_diffs = [];
        let scores_plus = [];
        if (textclassifier)
        for (const i in splits) {
          const split = splits[i];

          // using precomputed embeddings
          const embedding = splitEmbeddings[split];
          const closest = await classStore.similaritySearchVectorWithScore(embedding, k = allclasses.length);

          const score_plus = classes["classes_plus"] ? closest.filter((c) => classes["classes_plus"].includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
          const score_minus = classes["classes_minus"] ? closest.filter((c) => classes["classes_minus"].includes(c[0].pageContent)).reduce((a, c) =>  Math.max(a, c[1]), 0) : 0

          scores_plus.push(score_plus);
          scores_diffs.push(score_plus - score_minus);

          let highlightanyway = false;

          // always highlight if similarity is above given value
          if ( alwayshighlighteps > 0 && score_plus > alwayshighlighteps )
            highlightanyway = true;

          // ignore anything that is not distinguishable
          //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
          else if (decisioneps > 0 && Math.abs(score_plus - score_minus) < decisioneps || minimalhighlighteps > 0 && score_plus < minimalhighlighteps) {
            if (verbose) console.log("skipping", split, score_plus, score_minus)
            continue
          }

          // apply color if is first class
          if (score_plus > score_minus || highlightanyway) {
            if (verbose) console.log("mark", split, score_plus, score_minus)

            // get all text nodes
            const textNodes = textNodesUnderElem(document.body);

            // mark sentence
            const [texts, nodes] = findText(textNodes, split);
            markSentence(texts, nodes, "rgba(255,0,0,0.2)");
          } else {
            if (verbose) console.log("reject", split, score_plus, score_minus)
          }
        }


        // mark sentences based on retrieval
        if (textretrieval) {

          // using precomputed embeddings
          const retrieved_splits = (await sendToBackground({ name: "embedding", method: "retrieval", collectionName: url, data: [splits, metadata], query: highlightQuery, k: 3}))

          for(const i in retrieved_splits) {
            const split = retrieved_splits[i][0].pageContent;
            const score = retrieved_splits[i][1]

            // apply color if is first class
            if (verbose) console.log("mark retrieval", split, score)

            // get all text nodes
            const textNodes = textNodesUnderElem(document.body);

            // mark sentence
            const [texts, nodes] = findText(textNodes, split);
            markSentence(texts, nodes, "rgba(0,255,0,0.2)");

          }
        }

        setScores([scores_plus, scores_diffs])
        setIsThinking(false);
      }
    }


    const thinkingLogo = ( <img className="thinking_logo" width="20" src={Logo}/>)
    const statusHtml = (
      <div className="status">
        {statusMsg.map((status, i) => ( <div key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status} {isThinking && i == statusMsg.length - 1 ? thinkingLogo : ""}</div>))}
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
      {statusMsg.length ? statusHtml : ""}
      {scores.length && scores[0].length ? ( 
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
      ) : ""}
    </div>
}

export default ShadeRunnerBar;