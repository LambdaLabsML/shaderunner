import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from "~util/DOM";
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useGlobalStorage } from "~util/useGlobalStorage";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const HighlightStyler = ({tabId}) => {
    const [ [highlightSetting] ] = useGlobalStorage(tabId, "highlightSetting")
    const [ classifierData ] = useSessionStorage("classifierData:"+tabId, {});
    const [ styleEl, setStyleEl ] = useState(null);


    // ------- //
    // Effects //
    // ------- //

    // initialize a style element to adapt dynamically
    useEffect(() => {
        if (styleEl) return;
        const style = document.createElement('style');
        style.title = 'shaderunner-css';
        setStyleEl(style)
        window.document.head.appendChild(style);
    }, []);

    // adapt style dynamically according to classifier & highlightSettings 
    useEffect(() => {
        if (!Array.isArray(classifierData.classes_pos) || !styleEl) return;

        const mode = highlightSetting?._mode || "highlight";

        // default / fallback style
        const defaultSetting = highlightSetting?._default || "highlight";

        // create class for each pos-class
        const colorStyle = classifierData.classes_pos.map((c, i) => {

            // use default setting unless we have a specific highlight setting given
            // i.e. if class is "active", use "strong-highlight" setting
            const classSetting = highlightSetting && c in highlightSetting ? highlightSetting[c] : highlightSetting?._active == c ? "strong-highlight" : defaultSetting;

            if (mode == "focus" && classSetting == "no-highlight")
                return `span.highlightclass-${i} {
                            display: none;
                        }`

            if (classSetting == "strong-highlight")
                return `span.highlightclass-${i} {
                            background: ${consistentColor(c)};
                        }`

            if (classSetting == "highlight")
                return `span.highlightclass-${i} {
                            background: ${consistentColor(c)};
                        }`

            if (classSetting == "dim-highlight")
                return `span.highlightclass-${i} {
                            background: ${consistentColor(c, 0.4, 20)};
                        }`

            return ``
        }).join("\n")

        // focus mode: disable all non-header normal text
        const focusStyle = (mode != "focus") ? "" : `
            h1 span.highlightclass-normaltext, h2 span.highlightclass-normaltext, h3 span.highlightclass-normaltext, h4 span.highlightclass-normaltext, h5 span.highlightclass-normaltext, h6 span.highlightclass-normaltext {
                display: inline;
            }

            span.highlightclass-normaltext {
                display: none;
            }
        `

        // apply styles
        styleEl.textContent = focusStyle + colorStyle
    }, [classifierData.classes_pos, styleEl, highlightSetting])


    return "";
};

export default HighlightStyler;