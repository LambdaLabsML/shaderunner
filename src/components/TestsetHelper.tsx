import { sendToBackground } from "@plasmohq/messaging";
import React, { useEffect } from "react";
import { useGlobalStorage } from "~util/useGlobalStorage";

const TestsetHelper = ({tabId}) => {
    const [ [ mode ], [ controlSend ], [ highlighterData ] ] = useGlobalStorage(tabId, "highlightMode", "testsethelperControlSend", "DEV_highlighterData")

    useEffect(() => {
        if (mode != "testset helper") return;

        const spans = document.querySelectorAll("span.shaderunner-highlight[splitid]");
        function handleClick(event) {
            const span = event.currentTarget;
            const splitid = span.getAttribute("splitid")
            console.log("splitid", splitid)
            const els = document.querySelectorAll(`span.shaderunner-highlight[splitid="${splitid}"]`);
            els.forEach(el => {
                el.classList.toggle("good")
            })
            event.preventDefault();
            event.stopPropagation();
        }

        // Add an event listener to the whole document
        document.addEventListener('click', function (event) {
            if (!event.target.closest('.shaderunner-highlight')) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true); // Use capture to ensure the event is captured in the capturing phase

        // replace event listener with newest version
        spans.forEach(span => span.addEventListener('click', handleClick));
        return () => spans.forEach(span => span.removeEventListener('click', handleClick));
    }, [mode, highlighterData]);

    // save-button
    useEffect(() => {
        if(!controlSend || !highlighterData) return;

        async function send() {
            console.log("sending")
            const classification = highlighterData.splits.map((s, i) => {
                const elements = document.querySelectorAll(`span.shaderunner-highlight[splitid="${i}"]`);
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