import React, { useEffect } from 'react';
import { useStorage as _useStorage, random } from '~util/misc'
import { useStorage } from "@plasmohq/storage/hook";
import { MSG_QUERY2CLASS } from "../../util/messages";
import { sendToBackground } from '@plasmohq/messaging';
import { useGlobalStorage } from '~util/useGlobalStorage';



// the actual shaderunner bar
const MainInput = ({tabId}) => {
    const [ [title, setTitle], [url, setUrl], [statusClassifier, setStatusClassifier], [, isSynced]] = useGlobalStorage(tabId, "title", "url", "status_classifier")
    const [ savedHighlightQuery, setSavedHighlightQuery ] = useStorage("savedHighlightQuery:"+tabId, "");
    const [ classifierData, setClassifierData] = useStorage("classifierData:"+tabId, {});
    const [ retrievalQuery, setRetrievalQuery] = useStorage("retrievalQuery:"+tabId, null);


    // -------- //
    // Settings //
    // -------- //
    const [ textclassifier ] = useStorage('textclassifier')
    const [ textretrieval ] = useStorage('textretrieval')


    // ------- //
    // effects //
    // ------- //
    useEffect(() => {
      if (!isSynced) return;
      setStatusClassifier(classifierData && classifierData.classes_pos && classifierData.classes_neg ? ["loaded", 100] : null)
    }, [isSynced]);


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
      setClassifierData(old => ({...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope, query: query, classes_retrieval: [query]}))
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

    return <div className="MainInput">
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