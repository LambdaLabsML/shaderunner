import React, { useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";
import TopicLine from './basic/TopicLine';

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const Legend = ({tabId, topics, flipVisibility}) => {
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);
  const [classifierData, setClassifierData] = useSessionStorage("classifierData:"+tabId, {});
  const [
    [ topicStyles, setTopicStyles ],
    [ activeTopic ],
    [ defaultStyle ],
    [ activeTopicStyle  ],
    [ topicCounts ],
    [ setGlobalStorage ]
  ] = useGlobalStorage(tabId, "highlightTopicStyles", "highlightActiveTopic", "highlightActiveStyle", "highlightDefaultStyle", "topicCounts")
  const [ sortBy, setSortBy ] = useState(undefined)



  // ------ //
  // helper //
  // ------ //
  const topicIsActive = (topic: string, _topicStyles: any) => {
    if (flipVisibility)
      return !_topicStyles || (topic in _topicStyles) && _topicStyles[topic] != "no-highlight"
    else
      return !_topicStyles || !(topic in _topicStyles && defaultStyle != "no-highlight") || _topicStyles[topic] == "highlight"
  }

  // --------- //
  // functions //
  // --------- //

  // active current, hide all others
  const onFocusHighlight = (ev, topic: string) => {
    ev.stopPropagation();
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightActiveStyle: "highlight",
      highlightDefaultStyle: "no-highlight",
      highlightTopicStyles: {...Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])), ...{[topic]: "highlight"}}
    })
  }

  // active current, dim all others
  const mouseOverHighlight = (topic: string) => {
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightDefaultStyle: "dim-highlight",
      highlightActiveStyle: topicIsActive(topic, topicStyles) ? "strong-highlight" : "light-highlight",
    })
  }

  // restore state before mouseOver
  const mouseOverHighlightFinish = () => {
    setGlobalStorage({
      highlightActiveTopic: null,
      highlightDefaultStyle: null,
    })
  }

  // hide topic
  const toggleHighlight = (topic: string) => {
    let newTopicStyles = {};
    if (topicStyles && topicStyles[topic]) {
      let { [topic]: removed, ..._newTopicStyles } = topicStyles;
      newTopicStyles = _newTopicStyles;
    } else {
      newTopicStyles = { ...topicStyles, [topic]: flipVisibility ? "highlight" : "no-highlight" };
    }

    setGlobalStorage({
        highlightActiveStyle: topicIsActive(topic, newTopicStyles) ? "strong-highlight" : "light-highlight",
        highlightTopicStyles: newTopicStyles
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

  if (!Array.isArray(classifierData[topics]) || classifierData[topics].length == 0)
    return "";

  function sortByCounts (c: string,d: string) { return topicCounts[d] - topicCounts[c] };
  const numStyles = topicStyles ? classifierData[topics].filter(t => t in topicStyles).length : 0;
  let selected : string;
    if(flipVisibility)
      selected = numStyles == classifierData[topics].length ? "show all" : numStyles == 0 ? "hide all" : "custom selection"
    else
      selected = numStyles == classifierData[topics].length ? "hide all" : numStyles == 0 ? "show all" : "custom selection"

  return [
    <SwitchInput
      label=""
      key={topics+"order_selector"}
      options={['gpt order', "sort by occurences"]}
      selected={sortBy || 'gpt order'}
      onChange={(value: string) => setSortBy(value)}
    />,
    <SwitchInput
      label=""
      key={topics+"show_selector"}
      options={['show all', 'hide all']}
      selected={selected}
      onChange={(value: string) => {
        const overwriteStyles = Object.fromEntries(classifierData[topics].map(c => [c, flipVisibility ? "highlight" : "no-highlight"]))
        const filteredTopicStyles = Object.fromEntries(Object.entries(topicStyles).filter(([c]) => !classifierData[topics].includes(c)))
        if (flipVisibility) {
          if (value == "show all") setTopicStyles({...topicStyles, ...overwriteStyles})
          if (value == "hide all") setTopicStyles(filteredTopicStyles)
        } else {
          if (value == "show all") setTopicStyles(filteredTopicStyles)
          if (value == "hide all") setTopicStyles({...topicStyles, ...overwriteStyles})
        }
      }}
    />,
    <div className="topicContainer" key={topics+"topic_container"}>
      {Array.isArray(classifierData[topics]) ? classifierData[topics].sort(sortBy == "sort by occurences" ? sortByCounts : undefined).map(c => (
        <TopicLine key={c} topic={c} extraInfo={topicCounts ? topicCounts[c] : null} active={topicIsActive(c, topicStyles) || c == activeTopic} {...topicLineSettings}></TopicLine>
      )) : ""}
      {/*retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", topicStyles && topicStyles?._retrieval ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""*/}
    </div>
  ];
}


export default Legend;