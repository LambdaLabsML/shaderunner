import React, { useState, useEffect } from 'react';
import { useSessionStorage as _useSessionStorage, random } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import { useStorage } from "@plasmohq/storage/hook";
import { MSG_CONTENT, MSG_EMBED, MSG_QUERY2CLASS } from "../util/messages";
import Histogram from "~components/basic/Histogram";
import CollapsibleBox from "~components/basic/Collapsible";
import ClassModifierList from "./basic/ClassModifierList";
import { sendToBackground } from '@plasmohq/messaging';
type JSX = React.JSX.Element;

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;
console.log(process.env.NODE_ENV, process.env.PLASMO_PUBLIC_STORAGE)




// the actual shaderunner bar
const MainInput = () => {
    const [url, isActive] = useActiveState(window.location)
    const [ savedHighlightQuery, setSavedHighlightQuery ] = useSessionStorage("savedHighlightQuery:"+url, "");
    const [ pageEmbeddings, setPageEmbeddings] = useState({});
    const [ classifierData, setClassifierData] = useSessionStorage("classifierData:"+url, {});
    const [ retrievalQuery, setRetrievalQuery] = useSessionStorage("retrievalQuery:"+url, null);
    const [ scores, setScores] = useState([]);
    const [ statusMsg, setStatusMsg] = useState([]);
    const [ isThinking, setIsThinking] = useState(false);
    const [ verbose ] = useStorage("verbose", false);
    const [ textclassifier ] = useStorage('textclassifier')
    const [ textretrieval ] = useStorage('textretrieval')
    const [ textretrieval_k ] = useStorage('textretrieval_k')



    // ------ //
    // helper //
    // ------ //
    const statusAdd = (type: string | JSX, msg: string | JSX) => setStatusMsg((old) => [...old, [type, msg]]);
    const statusClear = () => setStatusMsg(old => []);
    const statusAmend = (fn: ((msg: ([string, string])) => [string,string]), i?: number) => setStatusMsg(old => {
        if(!i) i = old.length - 1;
        const newStatus = [...old];
        newStatus[i] = fn(newStatus[i]);
        return newStatus;
    })

    const resetState = () => {
      setSavedHighlightQuery("")
      setClassifierData({})
      setRetrievalQuery(null)
      setScores([])
      setStatusMsg([])
      setIsThinking(false)
    }

    // ------ //
    // events //
    // ------ //
    const onEnterPress = async (ev) => {
      const highlightQuery = ev.target.value;
      if (!highlightQuery) resetState();

      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 
        resetState();

        setSavedHighlightQuery(highlightQuery)
        setIsThinking(true)
        //await query2embedding(highlightQuery);

        // set retrieval query
        setRetrievalQuery(textretrieval ? highlightQuery : null);

        // query llm to give classes
        if (textclassifier) {
          await getQueryClasses(highlightQuery, () => {
            statusAdd(<b>Creating Classes</b>, random(MSG_QUERY2CLASS))
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

        setIsThinking(false)
      }
    }



    // --------- //
    // functions //
    // --------- //

    // apply class change when user changes inputs
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

    // ask llm for classes
    const getQueryClasses = async (query, onLLM = () => {}, onLLMDone = () => {}) => {
      onLLM()
      const result = await sendToBackground({ name: "llm_classify", body: {query: query, url: url, title: document.title }})
      setClassifierData(old => ({...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope}))
      onLLMDone()
    }



    // ------ //
    // render //
    // ------ //

    const statusHtml = (
      <div className="status">
        {statusMsg && Array.isArray(statusMsg) && statusMsg.length > 0 ? [statusMsg[statusMsg.length-1]].map((status, i) => ( <div key={i} className="status_msg">{status[0]}: {status[1]}</div>)) : ""}
        {/*!statusMsg ? "" : statusMsg.map((status, i) => ( <div key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status[0]}: {status[1]}</div>))*/}
      </div>
      
    )

    return <div className="ShadeRunner-Bar">
      <h1 className="title">ShadeRunner</h1>
      <textarea
        className="text-box"
        placeholder="What do you want to find here?"
        defaultValue={savedHighlightQuery}
        onKeyDown={onEnterPress}
        rows={4}
      />
      {isThinking && statusMsg && statusMsg.length ? statusHtml : ""}
      {!isThinking && classifierData.thought && Array.isArray(classifierData.classes_pos) && Array.isArray(classifierData.classes_neg) ? (
        <CollapsibleBox title="Highlight Classes">
          <h3>Scope:</h3>
          {classifierData.scope}
          <h3>Thought:</h3>
          {classifierData.thought}
          <ClassModifierList title="Positive Terms" classList={classifierData.classes_pos} onSubmit={onClassChange}/>
          <ClassModifierList title="Negative Terms" classList={classifierData.classes_neg} onSubmit={onClassChange}/>
        </CollapsibleBox>
      ) : ""}
      {!isThinking && scores.length > 0 && scores[0].length > 0 ? ( 
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
    </div>
}

export default MainInput;