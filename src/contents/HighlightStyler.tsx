import { useEffect, useRef, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook";
import { useSessionStorage as _useSessionStorage, useActiveState } from '../util'
import { consistentColor, defaultHighlightClass } from "./utilDOM";


// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const HighlightStyler = () => {
    const [url, isActive] = useActiveState(window.location)
    const [ classifierData ] = useSessionStorage("classifierData:"+url, {});
    const [ toggledHighlights ] = useSessionStorage("toggledHighlights:"+url, {});
    const [ styleEl, setStyleEl ] = useState(null);

    useEffect(() => {
        if (!isActive || !Array.isArray(classifierData.classes_pos) || !styleEl) return;

        const colorStyle = classifierData.classes_pos.map((c, i) => `
span.highlightclass-${i} {
    background: ${!(c in toggledHighlights) ? consistentColor(c) : "inherit"};
}
`).join("\n")
        styleEl.textContent = colorStyle
    }, [isActive, classifierData.classes_pos, styleEl, toggledHighlights])

    useEffect(() => {
        if (!isActive || styleEl) return;


        const style = document.createElement('style');
        style.title = 'shadowcss';
        setStyleEl(style)
        window.document.head.appendChild(style);
    }, [isActive]);
};

export default HighlightStyler;