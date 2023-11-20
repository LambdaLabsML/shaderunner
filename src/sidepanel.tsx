import React, { useEffect, useState } from 'react';
import { usePort } from "@plasmohq/messaging/hook"
import Logo from 'data-url:./assets/icon.png';
import styleText from "data-text:./style.scss"
import Legend from '~components/Legend';
import MainInput from '~components/MainInput';
import { useActiveState } from '~util/activeStatus';
import { useMessage } from "@plasmohq/messaging/hook"
import CircularProgressBar from '~components/basic/Progress';


// the actual shaderunner bar
const Sidepanel = () => {
  const tabId = new URL(window.location.href).searchParams.get("tabId")
  const listener = usePort("listener")
  const [statusEmbedding, setStatusEmbedding] = useState(null);
  const [statusClassifier, setStatusClassifier] = useState(null);
  const [message, setMessage] = useState(null);


  // ======= //
  // Effects //
  // ======= //

  // add style file to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `

    body {
      //background: rgba(32,33,36);
      background: white;
    }

    ${styleText}`
    window.document.head.appendChild(style);
  }, [])

  // register as a listener of tabId results
  useEffect(() => {
    listener.send({
      cmd: "register",
      tabId: tabId
    });
  }, [tabId])

  // whenever listener changes message, we know we got something new
  useEffect(() => {
    const data = listener.data;
    if(data?.message) setMessage(data?.message);
    if(data?.status_embedding) setStatusEmbedding(data?.status_embedding);
  }, [listener.data])


  // ====== //
  // Render //
  // ====== //

  const embeddingHtml = statusEmbedding ? (
    <div className="status">embeddings: <CircularProgressBar className={statusEmbedding[0]} size={4} progress={statusEmbedding[1] || 0}/> ({statusEmbedding[0]})</div>
  ) : (
    <div className="status">embeddings: -</div>
  );

  const classifierHtml = statusClassifier ? (
    <div className="status">classifier: <CircularProgressBar size={4} progress={statusClassifier[1] || 0}/> ({statusClassifier[0]})</div>
  ) : (
    <div className="status">classifier: -</div>
  );


  return <div className="ShadeRunner-Sidepanel">
    <div className="statusContainer">
      {embeddingHtml}
      {classifierHtml}
    </div>
    <MainInput/>
    <Legend></Legend>
    <div className="logoContainer">
      <img className="thinking_logo" width="30" src={Logo}/>
    </div>
  </div>
}

export default Sidepanel;