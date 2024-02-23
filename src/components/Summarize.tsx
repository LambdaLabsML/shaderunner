import { sendToBackground } from '@plasmohq/messaging';
import React, { useState, useEffect } from 'react';
import { getTextNodesIn } from '~util/DOM';
import { getMainContent } from '~util/extractContent';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Logo from "data-base64:../assets/logo.png"
import useEffectWhenReady from '~util/useEffectWhenReady';


const Summarize = ({tabId}) => {
    const [[active], [summarizeParagraphs], [, setStatusSummarize], [, isSynced]] = useGlobalStorage(tabId, "active", "summarizeParagraphs", "statusSummarize");
    const [summaryInitalized, setSummaryInitalized] = useState(false);

    // show/hide 
    useEffectWhenReady([isSynced], () => {
        const sameIdElements = document.querySelectorAll(`p[summaryid]`);
        if (active && summarizeParagraphs)
            sameIdElements.forEach(elem => elem.classList.add('showsummarized'));
        else
            sameIdElements.forEach(elem => elem.classList.remove('showsummarized'));
    }, [active, summarizeParagraphs]);

    // summarize if requested by user
    useEffectWhenReady([isSynced, tabId, active, summarizeParagraphs], () => {initializeSummaryElements()}, []);

    // summarize if requested by user
    useEffectWhenReady([summaryInitalized], async () => {
        const splits = summaryInitalized.splits;

        async function summarize_and_replace_batch(batch, startIndex) {
            const summaries = await sendToBackground({ name: "llm_summarize", body: { texts: batch } })
            summaries.forEach((summarized, index) => {
                const actualIndex = startIndex + index;
                const container = document.querySelector(`.shaderunner-summarized[summaryid='${actualIndex}']`);
                if (!container) return;
        
                container.classList.remove("loading");
                container.classList.add("showsummarized");
        
                const sameIdElements = document.querySelectorAll(`.original-text[summaryid="${actualIndex}"]`);
                sameIdElements.forEach(elem => elem.classList.add('showsummarized'));
        
                const el = container.querySelector(".summary");
                el.innerHTML = summarized;
            });
        }
        
        async function process_in_batches() {
            const batchSize = 3; // You can adjust the batch size
            for (let i = 0; i < splits.length; i += batchSize) {
                const batch = splits.slice(i, i + batchSize);
                summarize_and_replace_batch(batch, i);
            }
        }
        
        process_in_batches();
    }, []);


    const initializeSummaryElements = async () => {
        if (summaryInitalized) return;
        const mainel = getMainContent();
        console.log("blub")
        let elements;
        if (window.location.hostname === 'news.ycombinator.com') {
            elements = mainel.querySelectorAll('div.comment');
        } else {
            elements = mainel.querySelectorAll('p');
        }

        const splits = [];
        const textNodes = [];

        elements.forEach((pElement, index) => {
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
                this.parentElement.classList.toggle('showsummarized'); // 'this' now refers to 'logoContainer'
                const summaryId = this.parentNode.getAttribute('summaryid'); // Get summaryid from parent
                const sameIdElements = document.querySelectorAll(`.original-text[summaryid="${summaryId}"]`);
                sameIdElements.forEach(elem => elem.classList.toggle('showsummarized'));
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