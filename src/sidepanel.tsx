import React, { useEffect } from 'react';
import Logo from 'data-url:./assets/icon.png';
import "style.scss"
import Legend from '~components/Legend';
import MainInput from '~components/MainInput';
import CircularProgressBar from '~components/basic/CircularProgressBar';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Modes from '~components/Modes';



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
  const [[statusEmbedding], [statusClassifier], [statusHighlight]] = useGlobalStorage(tabId, "status_embedding", "status_classifier", "status_highlight")


  // ======= //
  // Effects //
  // ======= //

  // add darkmode background to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = "@media (prefers-color-scheme: dark) { body { background: rgba(53,54,58); } }";
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
    <MainInput tabId={tabId}/>
    <Legend tabId={tabId}></Legend>
    <Modes tabId={tabId}/>
    <div className="logoContainer">
      <img className="thinking_logo" width="30" src={Logo}/>
    </div>
  </div>
}

export default Sidepanel;