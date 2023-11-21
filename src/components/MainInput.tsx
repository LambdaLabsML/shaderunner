import React, { useState, useEffect } from 'react';
import { useSessionStorage as _useSessionStorage, random } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import { useStorage } from "@plasmohq/storage/hook";
import { MSG_CONTENT, MSG_EMBED, MSG_QUERY2CLASS } from "../util/messages";
import Histogram from "~components/basic/Histogram";
import CollapsibleBox from "~components/basic/Collapsible";
import ClassModifierList from "./basic/ClassModifierList";
import { sendToBackground } from '@plasmohq/messaging';
import { usePort } from '@plasmohq/messaging/hook';
import { useGlobalStorage } from '~util/useGlobalStorage';
type JSX = React.JSX.Element;

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;
console.log(process.env.NODE_ENV, process.env.PLASMO_PUBLIC_STORAGE)




// the actual shaderunner bar
const MainInput = ({tabId}) => {
    const [ [title], [url], [statusClassifier, setStatusClassifier]] = useGlobalStorage(tabId, "title", "url", "status_classifier")
    const [ savedHighlightQuery, setSavedHighlightQuery ] = useSessionStorage("savedHighlightQuery:"+tabId, "");
    const [ classifierData, setClassifierData] = useSessionStorage("classifierData:"+tabId, {});
    const [ retrievalQuery, setRetrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);


    // -------- //
    // Settings //
    // -------- //
    const [ textclassifier ] = useStorage('textclassifier')
    const [ textretrieval ] = useStorage('textretrieval')


    // ------ //
    // events //
    // ------ //

    // reset input & data
    const onReset = () => {
      setSavedHighlightQuery("")
      setClassifierData({})
      setRetrievalQuery(null)
    }

    // ask llm for classes
    const getQueryClasses = async (query, onLLM = () => {}, onLLMDone = () => {}) => {
      onLLM()
      const result = await sendToBackground({ name: "llm_classify", body: {query: query, url: url, title: title }})
      setClassifierData(old => ({...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope}))
      onLLMDone()
    }

    const onEnterPress = async (ev) => {
      const highlightQuery = ev.target.value;

      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 
        onReset();
        if (!highlightQuery) return;

        // set query settings
        setSavedHighlightQuery(highlightQuery)
        setRetrievalQuery(textretrieval ? highlightQuery : null);

        // query llm to give classes
        if (textclassifier) {
          setStatusClassifier(["checking", 0])
          await getQueryClasses(highlightQuery, () => {
            setStatusClassifier(["checking", 0, random(MSG_QUERY2CLASS)])
          }, () => {
            setStatusClassifier(["loaded", 100])
          })
        }

      }
    }


    // ------ //
    // render //
    // ------ //

    return <div className="ShadeRunner MainInput">
      <div className="header">What to Highlight</div>
      <textarea
        disabled={!title}
        className="text-box"
        placeholder="What do you want to find here?"
        defaultValue={savedHighlightQuery}
        onKeyDown={onEnterPress}
        rows={4}
      />
    </div>
}

export default MainInput;