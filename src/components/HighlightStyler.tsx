import { useEffect, useState } from "react"
import { consistentColor } from "~util/DOM";
import { useGlobalStorage } from "~util/useGlobalStorage";


const HighlightStyler = ({tabId}) => {
    const [ [highlightMode], [highlightRetrieval], [highlightDefaultStyle], [highlightDefaultNegStyle], [highlightActiveStyle], [activeTopic], [topicStyles], [classifierData] ] = useGlobalStorage(tabId, "highlightMode", "highlightRetrieval", "highlightDefaultStyle", "highlightDefaultNegStyle", "highlightActiveStyle", "highlightActiveTopic", "highlightTopicStyles", "classifierData")
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
        if (!styleEl) return;
        const classes_pos = classifierData?.classes_pos || [];
        const classes_neg = classifierData?.classes_neg || [];
        const classes_retrieval = classifierData?.classes_retrieval || [];

        const mode = highlightMode || "highlight";

        // default / fallback style
        const defaultStyle = highlightDefaultStyle || "highlight";
        const defaultNegStyle = highlightDefaultNegStyle || "no-highlight";
        const activeStyle = highlightActiveStyle || "highlight";

        // create class for each pos-class
        const allclasses = [...classes_pos, ...classes_neg, ...classes_retrieval];
        const colorStyle = allclasses.map((c, i) => {
            const isPosClass = i < classes_pos.length;
            const isRetrievalClass = classes_retrieval.includes(c);
            const isActive = activeTopic == c

            // use default setting unless we have a specific highlight setting given
            // i.e. if class is "active", use "strong-highlight" setting
            const classSetting = isActive ? activeStyle : topicStyles && c in topicStyles ? topicStyles[c] : isPosClass || isRetrievalClass ? defaultStyle : defaultNegStyle;

            if (mode == "testset helper")
                return `span.shaderunner-highlight[splitid] {
                    background: ${consistentColor("")};
                }

                span.shaderunner-highlight[splitid].good {
                    background: ${consistentColor("testing")};
                }
                ` 

            if (mode == "focus" && classSetting == "no-highlight" || mode == "focus" && highlightRetrieval && !isRetrievalClass)
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

            span.highlightclass-normaltext, span.shaderunner-highlight.transparent {
                display: none;
            }
        `

        // summary mode: hide summaries by default
        const summaryStyle = `
            p.shaderunner-summarized {
                position: relative;
            }

            @keyframes opacityAnimation {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            p.shaderunner-summarized.loading {
                padding: 0.25em 0.25em;
                background: rgba(0,0,0,0.1);
                border-radius: 4px;
                animation: opacityAnimation 3s linear infinite;
                color: #8136e2;
            }

            p.shaderunner-summarized div.logoContainer {
                position: absolute;
                margin-left: -2em;
            }
            p.shaderunner-summarized.loading div.logoContainer {
                animation: opacityAnimation 3s linear infinite;
            }

            p.shaderunner-summarized div.logoContainer img {
                width: 20px;
            }

            p.shaderunner-summarized {
                margin-top: 1em;
            }

            p.shaderunner-summarized .summary {
                display: none;
            }
            p.original-text[summaryid].showsummarized {
                display: none;
            }
            p.shaderunner-summarized.showsummarized .summary {
                display: inline;
            }

            p.shaderunner-summarized .summary ul {
                list-style: disc;
            }
        `

        const scrollFocusStyle = `
            span.shaderunner-highlight.transparent {
                background: transparent;
            }

            span.shaderunner-highlight.focused {
                text-shadow: 0 0 10px yellow;
            }

            span.shaderunner-highlight {
                position: relative;
                cursor: pointer;
            }

            span.shaderunner-highlight[data-title]:hover::before {
                content: attr(data-title);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                background-color: #f8f9fa;
                color: #333;
                padding: 5px 10px;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                z-index: 1;
                font-size: 12px;
              }
        ` 

        // apply styles
        styleEl.textContent = focusModeStyle + colorStyle + scrollFocusStyle + summaryStyle;
    }, [classifierData, styleEl, highlightMode, highlightDefaultStyle, highlightRetrieval, activeTopic, topicStyles])


    return "";
};

export default HighlightStyler;