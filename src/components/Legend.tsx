import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const Legend = ({tabId}) => {
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);
  const [classifierData] = useSessionStorage("classifierData:"+tabId, {});
  const [
    [mode, setMode],
    [topicStyles, setTopicStyles],
    [ setGlobalStorage ]
  ] = useGlobalStorage(tabId, "highlightMode", "highlightTopicStyles")


  // --------- //
  // functions //
  // --------- //

  // active current, hide all others
  const onFocusHighlight = (topic: string) => {
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightDefaultStyle: "dim-highlight",
      highlightTopicStyles: Object.fromEntries(classifierData.classes_pos.map((c: string) => [c, "no-highlight"]))
    })
  }

  // active current, dim all others
  const mouseOverHighlight = (topic: string) => {
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightDefaultStyle: "dim-highlight"
    })
  }

  // restore state before mouseOver
  const mouseOverHighlightFinish = () => {
    setGlobalStorage({
      highlightActiveTopic: null,
      highlightDefaultStyle: null
    })
  }

  // hide topic
  const toggleHighlight = (topic: string) => {
    setTopicStyles(old => {
      if (old.hasOwnProperty(topic)) {
        const { [topic]: removed, ...newObject } = old;
        return newObject;
      } else {
        return { ...old, [topic]: "no-highlight" };
      }
    })
  }



  // ------ //
  // render //
  // ------ //

  if (!Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  return <div className="ShadeRunner-Legend">
    <div className="header">Legend</div>
    <SwitchInput
        label=""
        options={['highlight', "focus"]}
        selected={mode || "highlight"}
        onChange={(value: string) => setMode(value)}
      />
    <span>(Click topic to hide/show highlights)</span>
    <span>
       <span onClick={() => setTopicStyles({})}>all</span> / <span onClick={() => {setTopicStyles(Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])))}}>none</span>
    </span>
    {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
      <span key={c} style={{ backgroundColor: consistentColor(c, topicStyles && topicStyles[c] ? 0.125 : null) }} onClick={() => toggleHighlight(c)} onMouseOver={() => mouseOverHighlight(c)} onMouseLeave={() => mouseOverHighlightFinish()}>
        <span onClick={() => onFocusHighlight(c)}>focus</span>
        {/*<span>prev</span>
        <span>next</span>*/}
        {c}
      </span>
    )) : ""}
    {retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", topicStyles && topicStyles?._retrieval ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""}
  </div>
}


export default Legend;