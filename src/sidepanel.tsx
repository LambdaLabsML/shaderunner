import React, { useEffect } from 'react';
import Logo from 'data-url:./assets/icon.png';
import styleText from "data-text:./style.scss"
import Legend from '~components/Legend';
import MainInput from '~components/MainInput';
import CircularProgressBar from '~components/basic/CircularProgressBar';
import { useGlobalStorage } from '~util/useGlobalStorage';



const StatusIndicator = ({status, size=4}) => {
  if (!status) return "off"
  const [statusMsg, progress] = status;
  return <span>
    <CircularProgressBar className={statusMsg} size={size} progress={statusMsg == "checking" ? 50 : progress || 0} color={progress == 100 ? "#000" : "#777"}/>
    <span className="status-msg">({statusMsg})</span>
  </span>;
}



// mount in sidepanel
const Sidepanel = () => {
  const tabId = new URL(window.location.href).searchParams.get("tabId")
  const [statusEmbedding, statusClassifier, statusHighlight] = useGlobalStorage(tabId, "status_embedding", "status_classifier", "status_highlight")


  // ======= //
  // Effects //
  // ======= //

  // add shaderunner style file to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    const styleDark = "body { background: rgba(32,33,36); }";
    const styleLight = "";
    style.textContent = `${styleLight} ${styleText}`
    window.document.head.appendChild(style);
  }, [])


  // ====== //
  // Render //
  // ====== //

  return <div className="ShadeRunner-Sidepanel">
    <div className="statusContainer">
      <div className="status">embeddings: <StatusIndicator status={statusEmbedding}/></div>
      <div className="status">classifier: <StatusIndicator status={statusClassifier}/></div>
      <div className="status">highlight: <StatusIndicator status={statusHighlight}/></div>
    </div>
    <MainInput tabId={tabId}/>
    <Legend></Legend>
    <div className="logoContainer">
      <img className="thinking_logo" width="30" src={Logo}/>
    </div>
  </div>
}

export default Sidepanel;