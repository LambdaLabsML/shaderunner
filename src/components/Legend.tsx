import React, { useState } from 'react';
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


// load style
import styleText from "data-text:../style.scss"
import type { PlasmoGetStyle } from "plasmo"
import { useGlobalStorage } from '~util/useGlobalStorage';
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// the actual shaderunner bar
const Legend = ({tabId}) => {
  const [retrievalQuery] = useSessionStorage("retrievalQuery:"+tabId, null);
  const [classifierData] = useSessionStorage("classifierData:"+tabId, {});
  const [[highlightSetting, setHighlightSetting]] = useGlobalStorage(tabId, "highlightSetting")

  console.log("highlightSetting", highlightSetting)
  console.log("classifierData", classifierData)


  const toggleHighlight = (topic: string) => {
    setHighlightSetting(old => {
      if (old.hasOwnProperty(topic)) {
        const { [topic]: removed, ...newObject } = old;
        return newObject;
      } else {
        return { ...old, [topic]: "no-highlight" };
      }
    })
  }

  const onFocusHighlight = (topic) => {
    setHighlightSetting(old => ({ ["_active"]: topic, "_default": "dim-highlight", ...Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"]))}))
  }

  const mouseOverHighlight = (topic) => {
    setHighlightSetting(old => ({ ...old, ["_active"]: topic, "_default": "dim-highlight"}))
  }

  const mouseOverHighlightFinish = (topic) => {
    setHighlightSetting(old => {
      const { ["_active"]: removed, "_default": removed2, ...newObject } = old;
      return newObject;
    });
  }

  if (!Array.isArray(classifierData.classes_pos) || classifierData.classes_pos.length == 0)
    return "";

  return <div className="ShadeRunner-Legend">
    <div className="header">ShadeRunner</div>
    <SwitchInput
        label=""
        options={['highlight', "focus"]}
        selected={highlightSetting && highlightSetting["_mode"] || "highlight"}
        onChange={(value) => setHighlightSetting(old => ({ ...old, "_mode": value}))}
      />
    <span>(Click topic to hide/show highlights)</span>
    <span>
       <span onClick={() => setHighlightSetting({})}>all</span> / <span onClick={() => {setHighlightSetting(Object.fromEntries(classifierData.classes_pos.map(c => [c, "no-highlight"])))}}>none</span>
    </span>
    {Array.isArray(classifierData.classes_pos) ? classifierData.classes_pos.map(c => (
      <span key={c} style={{ backgroundColor: consistentColor(c, highlightSetting && highlightSetting[c] ? 0.125 : null) }} onClick={() => toggleHighlight(c)} onMouseOver={() => mouseOverHighlight(c)} onMouseLeave={() => mouseOverHighlightFinish(c)}>
        <span onClick={() => onFocusHighlight(c)}>focus</span>
        {/*<span>prev</span>
        <span>next</span>*/}
        {c}
      </span>
    )) : ""}
    {retrievalQuery ? <span style={{ backgroundColor: consistentColor(retrievalQuery + " (retrieval)", highlightSetting && highlightSetting["_retrieval"] ? 0.125 : 1.0) }}>{retrievalQuery + " (retrieval)"}</span> : ""}
  </div>
}


export default Legend;