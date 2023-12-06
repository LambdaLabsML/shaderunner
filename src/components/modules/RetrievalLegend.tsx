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


const RetrievalLegend = ({tabId}) => {
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
  const allclasses = classifierData && Array.isArray(classifierData.classes_pos) && Array.isArray(classifierData.classes_neg) ? [...classifierData.classes_pos, ...classifierData.classes_neg] : [];
  const retrievalActive = true;

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
      highlightDefaultStyle: "dim-highlight",
      highlightDefaultNegStyle: null,
      highlightActiveStyle: retrievalActive ? "strong-highlight" : "light-highlight",
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
      newTopicStyles = { ...topicStyles, [topic]: "no-highlight" };
    }

    setGlobalStorage({
        highlightActiveStyle: retrievalActive ? "strong-highlight" : "light-highlight",
        highlightTopicStyles: newTopicStyles
    })
  }

  // user changes topic
  const onTopicChange = (oldtopic, newtopic) => {}

  // user delete topic
  const onTopicDelete = (topic) => {}

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
  if(!classifierData.query) return "";

  return [
    <div className="topicContainer" key={"retrieval_topic_container"}>
      <TopicLine topic={classifierData.query} extraInfo="" active={true} {...topicLineSettings}></TopicLine>
    </div>
  ];
}


export default RetrievalLegend;