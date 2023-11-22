import React, { useState } from 'react';
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
    [ topicStyles, setTopicStyles ],
    [ topicCounts ],
    [ setGlobalStorage ]
  ] = useGlobalStorage(tabId, "highlightTopicStyles", "topicCounts")
  const [ sortBy, setSortBy ] = useState(undefined)


  // --------- //
  // functions //
  // --------- //

  // active current, hide all others
  const onFocusHighlight = (ev, topic: string) => {
    ev.stopPropagation();
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightDefaultStyle: "highlight",
      highlightTopicStyles: Object.fromEntries(classifierData.classes_pos.filter(c => c != topic).map((c: string) => [c, "no-highlight"]))
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

  function sortByCounts (c,d) { return topicCounts[d] - topicCounts[c] };
  const numStyles = topicStyles ? Object.keys(topicStyles).length : 0;
  const selected = numStyles == classifierData.classes_pos.length ? "none" : numStyles == 0 ? "all" : "custom"

  return <div className="ShadeRunner Legend">
    <div className="header">Legend</div>
    <SwitchInput
      label=""
      options={['gpt order', "sort by occurences"]}
      selected={sortBy || 'gpt order'}
      onChange={(value: string) => setSortBy(value)}
    />
    <div className="topicContainer">
      {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.sort(sortBy == "sort by occurences" ? sortByCounts : undefined).map(c => (
        <div key={c} className="topic"><span style={{ backgroundColor: consistentColor(c, topicStyles && topicStyles[c] ? 0.125 : null) }} onClick={() => toggleHighlight(c)} onMouseOver={() => mouseOverHighlight(c)} onMouseLeave={() => mouseOverHighlightFinish()}>
          <span onClick={(ev) => onFocusHighlight(ev, c)}>focus</span>
          {/*<span>prev</span>
              <span>next</span>*/}
          {c}
          {topicCounts ? ` (${topicCounts[c]})` : ""}
        </span>
        </div>
      )) : ""}
      {retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", topicStyles && topicStyles?._retrieval ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""}
    </div>
    <SwitchInput
      label=""
      options={['all', ...(selected == "custom" ? ["custom"] : []), "none"]}
      selected={selected}
      onChange={(value: string) => {
        if (value == "all") setTopicStyles({})
        if (value == "none") setTopicStyles(Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])))
      }}
    />
  </div>
}


export default Legend;