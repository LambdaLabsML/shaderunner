import React, { useEffect } from 'react';
import "style.scss"
import Legend from '~components/modules/Legend';
import MainInput from '~components/modules/MainInput';
import CircularProgressBar from '~components/basic/CircularProgressBar';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Modes from '~components/modules/Modes';
import {styleCSS} from '~components/basic/Icon';
import CollapsibleBox from '~components/basic/CollapsibleBox';
import TestsetHelperControls from '~components/modules/TestsetHelperControls';
import ThoughtInfo from '~components/modules/ThoughtInfo';
import ClassDimRed from '~components/modules/ClassDimRed';
import AmountHighlighted from '~components/modules/AmountHighlighted';
import {useSessionStorage as _useSessionStorage} from '~util/misc';
import { useStorage } from '@plasmohq/storage/hook';

const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

const StatusIndicator = ({name, status, size=4}) => {
  const [statusClass, progress, statusMsg] = status || ["", 0, "off"];
  return [
    <span key={name+" label"} className="statuslabel">{name}</span>,
    <span key={name+" progress"}><CircularProgressBar className={statusClass} size={size} progress={statusClass == "checking" ? 50 : progress || 0} color={progress == 100 ? "#000" : "#777"}/></span>,
    <span key={name+" msg"} className="statusmsg">({statusMsg || statusClass})</span>
  ];
}



// mount in sidepanel
const Sidepanel = () => {
  const tabId = new URL(window.location.href).searchParams.get("tabId")
  const [[url], [statusEmbedding], [statusClassifier], [statusHighlight], [highlightMode]] = useGlobalStorage(tabId, "url", "status_embedding", "status_classifier", "status_highlight", "highlightMode")
  const [ classifierData ] = useSessionStorage("classifierData:"+tabId, {});


  // ======= //
  // Effects //
  // ======= //

  // add darkmode background to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
    @media (prefers-color-scheme: dark) {
      body {
        background: rgba(53,54,58);
      }
    }";

    ${styleCSS}
    `

    window.document.head.appendChild(style);
  }, [])


  // ====== //
  // Render //
  // ====== //
    if (!url)
      return (<div className="ShadeRunner-Sidepanel">
        <div className="statusContainer">
          <StatusIndicator name="classifier" status={statusClassifier} />
          <StatusIndicator name="embedding" status={statusEmbedding} />
          <StatusIndicator name="highlight" status={statusHighlight} />
        </div>
        <CollapsibleBox title="Error">
          <b>This plugin is either not active on this webpage or it lost connection to the page content.</b>
          Activate this plugin for this webpage or if you have already, reload the webpage to restore a connection.
        </CollapsibleBox>
      </div>);



  return <div className="ShadeRunner-Sidepanel">
    <div className="statusContainer">
      <StatusIndicator name="classifier" status={statusClassifier}/>
      <StatusIndicator name="embedding" status={statusEmbedding}/>
      <StatusIndicator name="highlight" status={statusHighlight}/>
    </div>
    <CollapsibleBox title="What to Highlight">
      <MainInput tabId={tabId}/>
      <Modes tabId={tabId}/>
    </CollapsibleBox>
    {highlightMode == "testset helper" ? (
    <CollapsibleBox title="TestsetHelper">
      <TestsetHelperControls tabId={tabId}></TestsetHelperControls>
    </CollapsibleBox>
    ) : 
    classifierData.classes_pos && classifierData.classes_neg ? [
      <AmountHighlighted tabId={tabId} />,
      <CollapsibleBox key="interesting_topics" title="Interesting Topics" className="Legend">
        <Legend tabId={tabId} topics="classes_pos" flipVisibility={false}></Legend>
      </CollapsibleBox>,
      <CollapsibleBox key="outlier_topics" title="Outlier Topics" className="Legend" open={false}>
        <Legend tabId={tabId} topics="classes_neg" flipVisibility={true}></Legend>
      </CollapsibleBox>,
      <CollapsibleBox key="advanced" title="Advanced" open={false}>
        <CollapsibleBox key="thought_info" title="Thought Info" open={false}>
          <ThoughtInfo tabId={tabId} />
        </CollapsibleBox>
        <CollapsibleBox key="class_similarities" title="Class Similarities" open={false}>
          <ClassDimRed tabId={tabId} />
        </CollapsibleBox>
      </CollapsibleBox>
    ] : []}
    {/*<div className="logoContainer">
      <img className="thinking_logo" width="30" src={Logo}/>
    </div>*/}
  </div>
}

export default Sidepanel;