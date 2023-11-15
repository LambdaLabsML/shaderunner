import type { PlasmoGetOverlayAnchor, PlasmoGetInlineAnchor } from "plasmo"
import React, { useState } from 'react';
import { useSessionStorage as _useSessionStorage } from '../util'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from './utilDOM'

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => document.querySelector("body")


// load style
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `


.ShadeRunner-Legend {
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;

  border: 1px solid #8136e2;
  border-radius: 1em;
  padding: 0.5em;
  background: white;
  gap: 0.2em;

  padding-top: 2.2em;
  overflow: hidden;
}

.ShadeRunner-Legend div.header {
  position: absolute;
  background: #8136e2;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.4em;
  color: white;
  text-align: center;
  cursor: grab;
}

.ShadeRunner-Legend span {
  padding: 0.25em 0.2em;
  font-size: 85%;
  border-radius: 0.4em;
}
  
`
  return style
}




// the actual shaderunner bar
const Legend = () => {
    const [ isActiveOn, setIsActiveOn ] = useStorage("activeURLs", []);
    const [ retrievalQuery ] = useSessionStorage("retrievalQuery", null);
    const [ classifierData ] = useSessionStorage("classifierData", {});
    const [ pos, setPos ] = useState({x: 20, y: 20});

    const url = window.location.hostname + window.location.pathname;
    const isActive = isActiveOn[window.location.hostname] ? true : false;

    const handleMouseDown = (event) => {
      const rect = event.target.getBoundingClientRect();

      // Compute the initial offset inside the element where the mouse was clicked
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const handleMouseMove = (moveEvent) => {
        setPos({ x: moveEvent.clientX - offsetX, y: moveEvent.clientY - offsetY });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

    if (!isActive || !Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
      return "";

    return <div className="ShadeRunner-Legend" style={{top: pos.y, left: pos.x}}>
      <div className="header" onMouseDown={handleMouseDown}>ShadeRunner</div>
      {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
        <span style={{backgroundColor: consistentColor(c)}}>{c}</span>
      )) : ""}
      {retrievalQuery ? <span style={{backgroundColor: consistentColor(retrievalQuery+" (retrieval)", true)}}>{retrievalQuery+" (retrieval)"}</span> : ""}
    </div>
}

export default Legend;