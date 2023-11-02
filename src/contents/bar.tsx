import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import React, { useState } from 'react';
import Logo from 'data-url:./icon.png';
 
// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () =>
  document.querySelector("main")
 

// place it above the anchor
export const mountShadowHost: PlasmoMountShadowHost = ({
  shadowHost,
  anchor,
  mountState
}) => {
  anchor.element.appendChild(shadowHost)
  mountState.observer.disconnect() // OPTIONAL DEMO: stop the observer as needed
}

// load style
import styleText from "data-text:./shaderunner.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// the actual shaderunner bar
const ShadeRunnerBar = () => {
    const [ highlightQuery, setHighlightQuery ] = useState("");

    const onEnterPress = (ev) => {
      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 
      }
    }


    const thinkingLogo = ( <img className="thinking_logo" width="20" src={Logo}/>)
    const status = (
      <div className="status">
        Status: ... {thinkingLogo}
      </div>
    )

    return <div className="ShadeRunner-Bar">
      <h1 className="title">ShadeRunner</h1>
      <textarea
        className="text-box"
        placeholder="What do you want to find here?"
        value={highlightQuery}
        onChange={(ev) => setHighlightQuery(ev.target.value)}
        onKeyDown={onEnterPress}
        rows="4"
      />
      {status}
    </div>
}



export default ShadeRunnerBar;