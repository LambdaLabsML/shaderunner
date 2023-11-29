import React, { useEffect, useState } from "react";
import { useGlobalStorage } from "~util/useGlobalStorage";

const Scroller = ({tabId}) => {
    const [ [command] ] = useGlobalStorage(tabId, "ScrollerCommand");
    let [ currentSelector, setCurrentSelector ] = useState(null);

    // ------- //
    // effects //
    // ------- //

    // zapp through elements / scroll to focused element
    useEffect(() => {

        // ensure no highlights are active
        document.querySelectorAll("span.shaderunner-highlight.focused").forEach(span => {
            span.classList.remove("focused");
        })

        if (!command) return;
        const highlighted = document.querySelectorAll(command.selector)
        if (!highlighted || highlighted.length == 0) return;
        const max_split_num = parseInt(highlighted[highlighted.length - 1].getAttribute("splitid_class"))

        // adapt index of selector
        if (!currentSelector || currentSelector[0] != command.selector)
            currentSelector = [command.selector, command.cmd == "next" ? -1 : max_split_num];
        const newIndex = Math.max(0, Math.min( max_split_num, currentSelector[1] + (command.cmd == "next" ? 1 : -1)));
        currentSelector = [currentSelector[0], newIndex]

        // focus chosen highlight
        const highlights = document.querySelectorAll(command.selector+`[splitid_class="${newIndex}"]`);
        highlights.forEach(span => {
            span.classList.add("focused")
        });
        highlights[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

        setCurrentSelector(currentSelector);
    }, [command])


    return <span></span>;
}

export default Scroller;