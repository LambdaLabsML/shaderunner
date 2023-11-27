import React, { useEffect } from 'react';
import Logo from 'data-url:./assets/icon.png';
import "style.scss"
import Legend from '~components/Legend';
import MainInput from '~components/MainInput';
import CircularProgressBar from '~components/basic/CircularProgressBar';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Modes from '~components/Modes';
import {styleCSS} from '~components/basic/Icon';
import CollapsibleBox from '~components/basic/CollapsibleBox';
import Button from '~components/basic/Button';
import TestsetHelperControls from '~components/TestsetHelperControls';
import ThoughtInfo from '~components/ThoughtInfo';



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
  const [[statusEmbedding], [statusClassifier], [statusHighlight], [highlightMode]] = useGlobalStorage(tabId, "status_embedding", "status_classifier", "status_highlight", "highlightMode")


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

  return <div className="ShadeRunner-Sidepanel">
    <div className="statusContainer">
      <StatusIndicator name="embedding" status={statusEmbedding}/>
      <StatusIndicator name="classifier" status={statusClassifier}/>
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
    ) : [
      <CollapsibleBox key="interesting_topics" title="Interesting Topics" className="Legend">
        <Legend tabId={tabId} topics="classes_pos" flipVisibility={false}></Legend>
      </CollapsibleBox>,
      <CollapsibleBox key="outlier_topics" title="Outlier Topics" className="Legend" open={false}>
        <Legend tabId={tabId} topics="classes_neg" flipVisibility={true}></Legend>
      </CollapsibleBox>
    ]}
    <CollapsibleBox key="advanced" title="Advanced" className="Legend" open={true}>
      <CollapsibleBox key="advanced" title="ThoughtInfo" className="Legend" open={false}>
        <ThoughtInfo tabId={tabId}/>
      </CollapsibleBox>
    </CollapsibleBox>
    {/*<div className="logoContainer">
      <img className="thinking_logo" width="30" src={Logo}/>
    </div>*/}
  </div>
}

export default Sidepanel;