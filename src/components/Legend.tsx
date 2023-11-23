import React, { useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";
import TopicLine from './basic/TopicLine';

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const Legend = ({tabId}) => {
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);
  const [classifierData, setClassifierData] = useSessionStorage("classifierData:"+tabId, {});
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

  // user changes topic
  const onTopicChange = (oldtopic, newtopic) => {
    const index = classifierData.classes_pos.indexOf(oldtopic);
    if (index >= 0)
      classifierData.classes_pos[index] = newtopic;
    const index2 = classifierData.classes_neg.indexOf(oldtopic);
    if (index2 >= 0)
      classifierData.classes_neg[index2] = newtopic;
    setClassifierData(classifierData);
  }

  // user delete topic
  const onTopicDelete = (topic) => {
    const index = classifierData.classes_pos.indexOf(topic);
    if (index >= 0)
      delete classifierData.classes_pos[index];
    const index2 = classifierData.classes_neg.indexOf(topic);
    if (index2 >= 0)
      delete classifierData.classes_neg[index2];
    setClassifierData(classifierData);
  }

  // jump to next topic occurence
  const onNext = (topic) => {
  }

  // jump to previous topic occurence
  const onPrevious = (topic) => {
  }

  const topicLineSettings = {toggleHighlight, onFocusHighlight, mouseOverHighlight, mouseOverHighlightFinish, onTopicChange, onTopicDelete, onPrevious, onNext}


  // ------ //
  // render //
  // ------ //

  if (!Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  function sortByCounts (c,d) { return topicCounts[d] - topicCounts[c] };
  const numStyles = topicStyles ? Object.keys(topicStyles).length : 0;
  const selected = numStyles == classifierData.classes_pos.length ? "hide all" : numStyles == 0 ? "show all" : "custom selection"

  return <div className="ShadeRunner Legend">
    <div className="header">Legend</div>
    <SwitchInput
      label=""
      options={['gpt order', "sort by occurences"]}
      selected={sortBy || 'gpt order'}
      onChange={(value: string) => setSortBy(value)}
    />
    <SwitchInput
      label=""
      options={['show all', ...(selected == "custom selection" ? ["custom selection"] : []), "hide all"]}
      selected={selected}
      onChange={(value: string) => {
        if (value == "show all") setTopicStyles({})
        if (value == "hide all") setTopicStyles(Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])))
      }}
    />
    <div className="topicContainer">
      {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.sort(sortBy == "sort by occurences" ? sortByCounts : undefined).map(c => (
        <TopicLine topic={c} extraInfo={topicCounts ? topicCounts[c] : null} active={!topicStyles || !topicStyles[c]} {...topicLineSettings}></TopicLine>
      )) : ""}
      {/*retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", topicStyles && topicStyles?._retrieval ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""*/}
    </div>
  </div>
}


export default Legend;