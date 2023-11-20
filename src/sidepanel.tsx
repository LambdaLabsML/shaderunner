import React, { useEffect, useState } from 'react';
import { usePort } from "@plasmohq/messaging/hook"
import Logo from 'data-url:./assets/icon.png';
import styleText from "data-text:./style.scss"
import Legend from '~components/Legend';
import MainInput from '~components/MainInput';
import { useActiveState } from '~util/activeStatus';
import { useMessage } from "@plasmohq/messaging/hook"


// the actual shaderunner bar
const Sidepanel = () => {
  const tabId = new URL(window.location.href).searchParams.get("tabId")
  const listener = usePort("listener")
  const [statusEmbedding, setStatusEmbedding] = useState(null);
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

  return <div className="ShadeRunner-Sidepanel">
    Embedding: {statusEmbedding}
    <img className="thinking_logo" width="20" src={Logo}/>
    <MainInput/>
    <Legend></Legend>
  </div>
}

export default Sidepanel;