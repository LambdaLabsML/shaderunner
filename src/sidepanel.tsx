import React, { useEffect } from 'react';
import Logo from 'data-url:./assets/icon.png';
import styleText from "data-text:./style.scss"
import Legend from '~components/legend';
import MainInput from '~components/MainInput';


// the actual shaderunner bar
const Sidepanel = () => {

  // ======= //
  // Effects //
  // ======= //

  // add style file to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `

    body {
      background: rgba(32,33,36);
    }
    
    ${styleText}`
    window.document.head.appendChild(style);
  }, [])


  // ====== //
  // Render //
  // ====== //


  return <div className="ShadeRunner-Sidepanel">
    <img className="thinking_logo" width="20" src={Logo}/>
    <MainInput/>
    <Legend></Legend>
  </div>
}

export default Sidepanel;