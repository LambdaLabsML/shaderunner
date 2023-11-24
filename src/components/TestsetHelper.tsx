import { sendToBackground } from "@plasmohq/messaging";
import React, { useEffect } from "react";
import { useGlobalStorage } from "~util/useGlobalStorage";

const TestsetHelper = ({tabId}) => {
    const [ [ mode ], [ controlSend ], [ highlighterData ] ] = useGlobalStorage(tabId, "highlightMode", "testsethelperControlSend", "DEV_highlighterData")

    // zapp through elements / scroll to focused element
    useEffect(() => {
        const spans = document.querySelectorAll("span.shaderunner-highlight[splitid_total]");
        function handleClick(event) {
            if (mode != "testset helper") return;
            const span = event.currentTarget;
            const splitid = span.getAttribute("splitid_total")
            console.log("splitid", splitid)
            const els = document.querySelectorAll(`span.shaderunner-highlight[splitid_total="${splitid}"]`);
            els.forEach(el => {
                el.classList.toggle("good")
            })
        }

        // replace event listener with newest version
        spans.forEach(span => span.addEventListener('click', handleClick));
        return () => spans.forEach(span => span.removeEventListener('click', handleClick));
    }, [mode]);

    // save-button
    useEffect(() => {
        if(!controlSend || !highlighterData) return;

        async function send() {
            console.log("sending")
            const classification = highlighterData.splits.map((s, i) => {
                const elements = document.querySelectorAll(`span.shaderunner-highlight[splitid_total="${i}"]`);
                return Array.from(elements).some(element => element.classList.contains('good'));
            });
            const result = await sendToBackground({name: "testsethelper", body: {cmd: "write", ...highlighterData, classification: classification}})
            console.log("sending result:", result)
        }
        send();
    }, [controlSend, highlighterData]);

    return "";
}

export default TestsetHelper;