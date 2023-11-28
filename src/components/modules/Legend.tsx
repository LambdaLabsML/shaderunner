import React, { useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";
import TopicLine from '../basic/TopicLine';
import Icon from '~components/basic/Icon';
import { sendToBackground } from '@plasmohq/messaging';

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const Legend = ({tabId, topics, flipVisibility}) => {
  //const [retrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);
  const [classifierData, setClassifierData] = useSessionStorage("classifierData:"+tabId, {});
  const [
    [ url ],
    [ topicStyles, setTopicStyles ],
    [ activeTopic ],
    [ topicCounts ],
    [ , setScrollerCommand ],
    [ setGlobalStorage ]
  ] = useGlobalStorage(tabId, "url", "highlightTopicStyles", "highlightActiveTopic", "topicCounts", "ScrollerCommand")
  const [ sortBy, setSortBy ] = useState(undefined)
  const allclasses = classifierData && classifierData.classes_pos ? [...classifierData.classes_pos, ...classifierData.classes_neg] : [];



  // ------ //
  // helper //
  // ------ //
  const topicIsActive = (topic: string, _topicStyles: any) => {
    if (flipVisibility)
      return _topicStyles && topic in _topicStyles && _topicStyles[topic] != "no-highlight"
    else
      return !_topicStyles || !(topic in _topicStyles) || _topicStyles[topic] == "highlight"
  }

  const interesting = classifierData[topics];
  const uninteresting = classifierData[topics == "classes_pos" ? "classes_neg" : "classes_pos"]
  const suggestNewTopic = async () => (await sendToBackground({ name: "llm_newtopic", body: {url, interesting, uninteresting}}))

  // --------- //
  // functions //
  // --------- //

  // active current, hide all others
  const onFocusHighlight = (ev, topic: string) => {
    ev.stopPropagation();
    setScrollerCommand(null)
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightActiveStyle: "highlight",
      highlightDefaultStyle: "no-highlight",
      highlightTopicStyles: {...Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])), ...{[topic]: "highlight"}}
    })
  }

  // active current, dim all others
  const mouseOverHighlight = (topic: string) => {
    setScrollerCommand(null)
    setGlobalStorage({
      highlightActiveTopic: topic,
      highlightDefaultStyle: flipVisibility ? null : "dim-highlight",
      highlightDefaultNegStyle: flipVisibility ? "dim-highlight" : null,
      highlightActiveStyle: topicIsActive(topic, topicStyles) ? "strong-highlight" : "light-highlight",
    })
  }

  // restore state before mouseOver
  const mouseOverHighlightFinish = () => {
    setScrollerCommand(null)
    setGlobalStorage({
      highlightActiveTopic: null,
      highlightDefaultStyle: null,
      highlightDefaultNegStyle: null,
    })
  }

  // hide topic
  const toggleHighlight = (topic: string) => {
    setScrollerCommand(null)
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

  // jump to next/previous topic occurence
  const onNextPrev = (topic: string, next: boolean) => {
    const id = allclasses.indexOf(topic)
    setGlobalStorage({highlightDefaultStyle: "dim-highlight"})
    setScrollerCommand({"selector": "span.shaderunner-highlight.highlightclass-"+id, "cmd": next ? "next" : "previous"})
  }

  const topicLineSettings = {toggleHighlight, onFocusHighlight, mouseOverHighlight, mouseOverHighlightFinish, onTopicChange, onTopicDelete, onNextPrev}


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

  const topicList = Array.isArray(classifierData[topics]) ? classifierData[topics].filter((c: string) => c) : [];
  if (sortBy == "sort by occurences")
    topicList.sort(sortByCounts)

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
        const _topicStyles = topicStyles || {}
        const overwriteStyles = Object.fromEntries(classifierData[topics].map(c => [c, flipVisibility ? "highlight" : "no-highlight"]))
        const filteredTopicStyles = Object.fromEntries(Object.entries(_topicStyles).filter(([c]) => !classifierData[topics].includes(c)))
        if (flipVisibility) {
          if (value == "show all") setTopicStyles({..._topicStyles, ...overwriteStyles})
          if (value == "hide all") setTopicStyles(filteredTopicStyles)
        } else {
          if (value == "show all") setTopicStyles(filteredTopicStyles)
          if (value == "hide all") setTopicStyles({..._topicStyles, ...overwriteStyles})
        }
      }}
    />,
    <div className="topicContainer" key={topics+"topic_container"}>
      {topicList.map(c => (
        <TopicLine key={c} topic={c} extraInfo={topicCounts ? topicCounts[c] : null} active={(!topicCounts || topicCounts[c] > 0) && (topicIsActive(c, topicStyles) || c == activeTopic)} {...topicLineSettings}></TopicLine>
      ))}
      <div className="textLine" onClick={async () => setClassifierData({...classifierData, [topics]: [...classifierData[topics], await suggestNewTopic()]})}><Icon name="add-to-queue"/> Suggest missing topic.</div>
      {/*retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", topicStyles && topicStyles?._retrieval ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""*/}
    </div>
  ];
}


export default Legend;