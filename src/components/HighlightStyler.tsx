import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook";
import { consistentColor } from "~util/DOM";
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useGlobalStorage } from "~util/useGlobalStorage";

// in development mode we want to use persistent storage for debugging
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const HighlightStyler = ({tabId}) => {
    const [ [highlightMode], [highlightDefaultStyle], [highlightDefaultNegStyle], [highlightActiveStyle], [activeTopic], [topicStyles] ] = useGlobalStorage(tabId, "highlightMode", "highlightDefaultStyle", "highlightDefaultNegStyle", "highlightActiveStyle", "highlightActiveTopic", "highlightTopicStyles")
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

    // adapt style dynamically according to classifier & topicStyles 
    useEffect(() => {
        if (!Array.isArray(classifierData.classes_pos) || !styleEl) return;

        const mode = highlightMode || "highlight";

        // default / fallback style
        const defaultStyle = highlightDefaultStyle || "highlight";
        const defaultNegStyle = highlightDefaultNegStyle || "no-highlight";
        const activeStyle = highlightActiveStyle || "highlight";

        // create class for each pos-class
        const allclasses = [...classifierData.classes_pos, ...classifierData.classes_neg];
        const colorStyle = allclasses.map((c, i) => {
            const isPosClass = i < classifierData.classes_pos.length;
            const isActive = activeTopic == c

            // use default setting unless we have a specific highlight setting given
            // i.e. if class is "active", use "strong-highlight" setting
            const classSetting = isActive ? activeStyle : topicStyles && c in topicStyles ? topicStyles[c] : isPosClass ? defaultStyle : defaultNegStyle;

            if (mode == "testset helper")
                return `span.shaderunner-highlight[splitid] {
                    background: ${consistentColor("")};
                }

                span.shaderunner-highlight[splitid].good {
                    background: ${consistentColor("testing")};
                }
                ` 

            if (mode == "focus" && classSetting == "no-highlight")
                return `span.highlightclass-${i} {
                            display: none;
                        }`

            if (classSetting == "strong-highlight")
                return `span.highlightclass-${i} {
                            background: ${consistentColor(c)};
                        }`

            if (classSetting == "light-highlight")
                return `span.highlightclass-${i} {
                            background: ${consistentColor(c, 0.35)};
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
        const focusModeStyle = (mode != "focus") ? "" : `
            h1 span.highlightclass-normaltext, h2 span.highlightclass-normaltext, h3 span.highlightclass-normaltext, h4 span.highlightclass-normaltext, h5 span.highlightclass-normaltext, h6 span.highlightclass-normaltext {
                display: inline;
            }

            span.highlightclass-normaltext {
                display: none;
            }
        `

        const scrollFocusStyle = `
            span.shaderunner-highlight.focused {
                text-shadow: 0 0 10px yellow;
            }
        ` 

        // apply styles
        styleEl.textContent = focusModeStyle + colorStyle + scrollFocusStyle
    }, [classifierData.classes_pos, styleEl, highlightMode, highlightDefaultStyle, activeTopic, topicStyles])


    return "";
};

export default HighlightStyler;