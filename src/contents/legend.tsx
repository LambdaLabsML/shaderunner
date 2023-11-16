import type { PlasmoGetOverlayAnchor, PlasmoGetInlineAnchor } from "plasmo"
import React, { useCallback, useState } from 'react';
import { useSessionStorage as _useSessionStorage, isActiveOn, useActiveState } from '../util'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from './utilDOM'
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

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
  cursor: pointer;
}
  
`
  return style
}




// the actual shaderunner bar
const Legend = () => {
  const [url, isActive] = useActiveState(window.location)
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+url, null);
  const [classifierData] = useSessionStorage("classifierData:"+url, {});
  const [highlightSetting, setHighlightSettings] = useSessionStorage("highlightSetting:"+url, {});
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const throttledSetHighlightSettings = useCallback(throttle(
    (newSettings) => setHighlightSettings(newSettings),
    100
  ), []);
  const debouncedRemoveHighlightSettings = useCallback(debounce(
    (topic) => {
      setHighlightSettings(old => {
        const { ["_active"]: removed, "_default": removed2, ...newObject } = old;
        return newObject;
      });
    },
    200
  ), []);


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

  const toggleHighlight = (topic) => {
    setHighlightSettings(old => {
      if (old.hasOwnProperty(topic)) {
        const { [topic]: removed, ...newObject } = old;
        return newObject;
      } else {
        return { ...old, [topic]: "no-highlight" };
      }
    })
  }

  const mouseOverHighlight = (topic) => {
    throttledSetHighlightSettings(old => ({ ...old, ["_active"]: topic, "_default": "dim-highlight"}))
    debouncedRemoveHighlightSettings.cancel()
  }

  const mouseOverHighlightFinish = (topic) => {
    debouncedRemoveHighlightSettings(topic);
  }

  if (!isActive || !Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  return <div className="ShadeRunner-Legend" style={{ top: pos.y, left: pos.x }}>
    <div className="header" onMouseDown={handleMouseDown}>ShadeRunner</div>
    <span>(Click topic to hide/show highlights)</span>
    {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
      <span key={c} style={{ backgroundColor: consistentColor(c, highlightSetting[c] ? 0.125 : null) }} onClick={() => toggleHighlight(c)} onMouseOver={() => mouseOverHighlight(c)} onMouseLeave={() => mouseOverHighlightFinish(c)}>{c}</span>
    )) : ""}
    {retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", highlightSetting["_retrieval"] ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""}
  </div>
}


export default Legend;