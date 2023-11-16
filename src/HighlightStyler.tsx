import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook";
import { useSessionStorage as _useSessionStorage, useActiveState } from './util'
import { consistentColor } from "./contents/utilDOM";


// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const HighlightStyler = ({highlightSetting, mode}) => {
    const [url, isActive] = useActiveState(window.location)
    const [ classifierData ] = useSessionStorage("classifierData:"+url, {});
    const [ styleEl, setStyleEl ] = useState(null);

    useEffect(() => {
        if (!isActive || !Array.isArray(classifierData.classes_pos) || !styleEl) return;

        const defaultSetting = highlightSetting["_default"] || "highlight";
        const colorStyle = classifierData.classes_pos.map((c, i) => {
            const classSetting = c in highlightSetting ? highlightSetting[c] : highlightSetting["_active"] == c ? "strong-highlight" : defaultSetting;

            if (mode == "focus" && classSetting == "no-highlight")
                return `
                    span.highlightclass-${i} {
                        display: none;
                    }
                `

            // if no settings available or mode is highlight, just show it normally
            if (classSetting == "strong-highlight")
                return `
                    span.highlightclass-${i} {
                        background: ${consistentColor(c)};
                    }
                `

            // if no settings available or mode is highlight, just show it normally
            if (classSetting == "highlight")
                return `
                    span.highlightclass-${i} {
                        background: ${consistentColor(c)};
                    }
                `

            if (classSetting == "dim-highlight")
                return `
                    span.highlightclass-${i} {
                        background: ${consistentColor(c, 0.4, 20)};
                    }
                `

            return ``
        }).join("\n")
        styleEl.textContent = colorStyle
        if (mode == "focus")
            styleEl.textContent = styleEl.textContent + `
                h1 span.highlightclass-normaltext, h2 span.highlightclass-normaltext, h3 span.highlightclass-normaltext, h4 span.highlightclass-normaltext, h5 span.highlightclass-normaltext, h6 span.highlightclass-normaltext {
                    display: inline;
                }

                span.highlightclass-normaltext {
                    display: none;
                }
            `
    }, [isActive, classifierData.classes_pos, styleEl, highlightSetting, mode])

    useEffect(() => {
        if (!isActive || styleEl) return;


        const style = document.createElement('style');
        style.title = 'shadowcss';
        setStyleEl(style)
        window.document.head.appendChild(style);
    }, [isActive]);

    return "";
};

export default HighlightStyler;