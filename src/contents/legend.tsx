import type { PlasmoGetOverlayAnchor, PlasmoGetInlineAnchor } from "plasmo"
import React, { useCallback, useState } from 'react';
import { useSessionStorage as _useSessionStorage, isActiveOn, useActiveState } from '../util'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from './utilDOM'
import HighlightStyler from "../HighlightStyler";
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => document.querySelector("body")


// load style
import type { PlasmoGetStyle } from "plasmo"
import SwitchInput from "~components/SwitchInput";
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
  padding: 0.5em;
  color: white;
  text-align: center;
  cursor: grab;
  font-size: 90%;
}

.ShadeRunner-Legend span {
  padding: 0.25em 0.2em;
  font-size: 85%;
  border-radius: 0.4em;
  cursor: pointer;
}

.switch-options {
  display: flex;
  gap: 0.5rem;
}

.switch-option {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f5f5f5;
}

.switch-option.active {
  background-color: #8136e2;
  color: white;
}
`
  return style
}




// the actual shaderunner bar
const Legend = () => {
  const [url, isActive] = useActiveState(window.location)
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+url, null);
  const [classifierData] = useSessionStorage("classifierData:"+url, {});
  const [highlightSetting, setHighlightSettings] = useState({});
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [mode, setMode] = useState("highlight");


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

  const onFocusHighlight = (topic) => {
    setHighlightSettings(old => ({ ["_active"]: topic, "_default": "dim-highlight", ...Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"]))}))
  }

  const mouseOverHighlight = (topic) => {
    setHighlightSettings(old => ({ ...old, ["_active"]: topic, "_default": "dim-highlight"}))
  }

  const mouseOverHighlightFinish = (topic) => {
    setHighlightSettings(old => {
      const { ["_active"]: removed, "_default": removed2, ...newObject } = old;
      return newObject;
    });
  }

  if (!isActive || !Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  return <div className="ShadeRunner-Legend" style={{ top: pos.y, left: pos.x }}>
    <HighlightStyler highlightSetting={highlightSetting} mode={mode}/>
    <div className="header" onMouseDown={handleMouseDown}>ShadeRunner</div>
    <SwitchInput
        label=""
        options={['highlight', "focus", "sort-by-relevance"]}
        selected={mode}
        onChange={(value) => setMode(value)}
      />
    <span>(Click topic to hide/show highlights)</span>
    <span>
       <span onClick={() => setHighlightSettings({})}>all</span> / <span onClick={() => {setHighlightSettings(Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])))}}>none</span>
    </span>
    {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
      <span key={c} style={{ backgroundColor: consistentColor(c, highlightSetting[c] ? 0.125 : null) }} onClick={() => toggleHighlight(c)} onMouseOver={() => mouseOverHighlight(c)} onMouseLeave={() => mouseOverHighlightFinish(c)}>
        <span onClick={() => onFocusHighlight(c)}>focus</span>
        {/*<span>prev</span>
        <span>next</span>*/}
        {c}
      </span>
    )) : ""}
    {retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", highlightSetting["_retrieval"] ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""}
  </div>
}


export default Legend;