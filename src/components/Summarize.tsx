import { sendToBackground } from '@plasmohq/messaging';
import React, { useState, useEffect } from 'react';
import { getTextNodesIn } from '~util/DOM';
import { getMainContent } from '~util/extractContent';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Logo from "data-base64:../assets/logo.png"
import useEffectWhenReady from '~util/useEffectWhenReady';


const Summarize = ({tabId}) => {
    const [[active], [summarizeParagraphs], [, isSynced]] = useGlobalStorage(tabId, "active", "summarizeParagraphs");
    const [summaryInitalized, setSummaryInitalized] = useState(false);

    // summarize if requested by user
    useEffectWhenReady([isSynced, tabId, active, summarizeParagraphs], () => {initializeSummaryElements()}, []);

    // summarize if requested by user
    useEffectWhenReady([summaryInitalized], async () => {
        const splits = summaryInitalized.splits;

        async function summarize_and_replace(container, i) {
            const split = splits[i];
            const summarized = await sendToBackground({ name: "llm_summarize", body: { text: split } })
            container.classList.remove("loading");
            const el = document.querySelector("p.shaderunner-summarized[summaryid='" + i + "'] .summary");
            //el.innerHTML = "<ul>" + summaries.map(s => "<li>" + s + "</li>").join("\n") + "</ul>";
            el.innerHTML = summarized;
        }

        for (let i = 0; i < splits.length; i++) {
            const container = document.querySelector("p.shaderunner-summarized[summaryid='" + i + "']");
            if (!container) continue;
            await summarize_and_replace(container, i);
        }
    }, []);


    const initializeSummaryElements = async () => {
        if (summaryInitalized) return;
        const mainel = getMainContent();
        const pElements = mainel.querySelectorAll('p');
        const splits = [];
        const textNodes = [];

        pElements.forEach((pElement, index) => {
            // Prepend the shaderunner-summarized div
            const summarizedEl = document.createElement('p');
            summarizedEl.innerHTML = `<div class='logoContainer'><img src='${Logo}'/></div><span class='summary'>Loading</span>`;
            summarizedEl.classList.add("shaderunner-summarized", "loading");
            summarizedEl.setAttribute("summaryid", String(index));
            pElement.parentNode.insertBefore(summarizedEl, pElement);

            // Adjust mapSplitsToTextNodes and text highlighting for each <p> element
            // splits.push(pElement.textContent);
            splits.push(pElement.innerHTML);
            textNodes.push(getTextNodesIn(pElement));

            function toggleShowOriginal() {
                this.parentElement.classList.toggle('showoriginal'); // 'this' now refers to 'logoContainer'
                const summaryId = this.parentNode.getAttribute('summaryid'); // Get summaryid from parent
                const sameIdElements = document.querySelectorAll(`p.original-text[summaryid="${summaryId}"]`);
                sameIdElements.forEach(elem => elem.classList.toggle('showoriginal'));
            }
            const logoContainer = summarizedEl.querySelector('.logoContainer');
            logoContainer.addEventListener('click', toggleShowOriginal);

            pElement.setAttribute("summaryid", String(index))
            pElement.classList.add("original-text")
        });

        setSummaryInitalized({ splits });
    };

    return "";
};

export default Summarize;