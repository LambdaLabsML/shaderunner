import React, { useState } from 'react';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import HighlightStyler from "./HighlightStyler";
import SwitchInput from "~components/basic/SwitchInput";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


// load style
import styleText from "data-text:../style.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// the actual shaderunner bar
const Legend = () => {
  const [url, isActive] = useActiveState(window.location)
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+url, null);
  const [classifierData] = useSessionStorage("classifierData:"+url, {});
  const [highlightSetting, setHighlightSettings] = useState({});
  const [mode, setMode] = useState("highlight");


  const toggleHighlight = (topic: string) => {
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

  if (!Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  return <div className="ShadeRunner-Legend">
    <HighlightStyler highlightSetting={highlightSetting} mode={mode}/>
    <div className="header">ShadeRunner</div>
    <SwitchInput
        label=""
        options={['highlight', "focus"]}
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