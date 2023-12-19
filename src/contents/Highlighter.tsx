import React, { useState, useEffect, useRef } from 'react';
import { getMainContent, extractSplits, mapSplitsToTextnodes } from '~util/extractContent'
import { highlightText, resetHighlights, textNodesNotUnderHighlight, surroundTextNode } from '~util/DOM'
import { computeEmbeddingsCached, embeddingExists, VectorStore_fromClass2Embedding, type Metadata } from '~util/embedding'
import { useStorage } from "@plasmohq/storage/hook";
import HighlightStyler from '~components/HighlightStyler';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Scroller from '~components/Scroller';
import TestsetHelper from '~components/TestsetHelper';
import { sendToBackground } from '@plasmohq/messaging';
import { MSG_QUERY2CLASS } from '~util/messages';
import { random } from '~util/misc';
import Logo from "data-base64:../assets/logo.png"

const DEV = process.env.NODE_ENV == "development";

const isPromise = obj => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

function splitMarkdownList(markdown) {
  const lines = markdown.split('\n');
  return lines
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(2).trim());
}


const Highlighter = () => {
    const [ tabId, setTabId ] = useState(null);
    const [
      [active],
      [url],
      [title],
      [statusEmbedding,setStatusEmbeddings],
      [,setStatusHighlight],
      [,setStatusClassifier],
      [classEmbeddings, setClassEmbeddings],
      [highlightAmount],
      [decisionEpsAmount],
      [highlightRetrieval],
      [highlightClassify],
      [retrievalK],
      [classifierData, setClassifierData],
      [savedHighlightQuery],
      [summarizeParagraphs],
      [setGlobalStorage, isSynced]
    ] = useGlobalStorage(tabId, "active", "url", "title", "status_embedding", "status_highlight", "status_classifier", "classEmbeddings", "highlightAmount", "decisionEps", "highlightRetrieval", "highlightClassify", "retrievalK", "classifierData", "savedHighlightQuery", "summarizeParagraphs");
    const [ pageEmbeddings, setPageEmbeddings ] = useState({mode: "sentences", splits: [], splitEmbeddings: {}});
    const [ summaryInitalized, setSummaryInitalized ] = useState(false);
    const [isHighlightRunning, setIsHighlightRunning] = useState(false);
    const queuedHighlightRef = useRef(false);
    const classifierDataStr = JSON.stringify(classifierData);


    // -------- //
    // settings //
    // -------- //
    const [ verbose ] = useStorage("verbose", false);
    // const [ textretrieval_k ] = useStorage('textretrieval_k')
    const [ alwayshighlighteps ] = useStorage("alwayshighlighteps");
    const [ minimalhighlighteps ] = useStorage("minimalhighlighteps");
    // const [ default_decisioneps ] = useStorage("decisioneps");


    // ------- //
    // effects //
    // ------- //

    // init (make sure tabId is known, needed for messaging with other parts of this application)
    useEffect(() => {
      async function init() {
        const tabId = await chrome.runtime.sendMessage("get_tabid")
        setTabId(tabId);
      }
      init();
    }, [])


    useEffect(() => {
      if (!isSynced) return;

      // reset for empty query
      if (!savedHighlightQuery) setClassifierData({});

        // query llm to give classes
        if (highlightClassify) {
          setStatusClassifier(["checking", 0])
          getQueryClasses(savedHighlightQuery, () => {
            setStatusClassifier(["checking", 0, random(MSG_QUERY2CLASS)])
          }, () => {
            setStatusClassifier(["loaded", 100])
          })
        }

        if (highlightRetrieval) {
          setClassifierData(old => ({...old, classes_retrieval: savedHighlightQuery ? [savedHighlightQuery] : []}))
        }
    }, [isSynced, savedHighlightQuery])


    // restore classifier status
    useEffect(() => {
      if (!isSynced || !classifierData) return;
      setStatusClassifier(classifierData && classifierData.classes_pos && classifierData.classes_neg ? ["loaded", 100] : null)
    }, [isSynced, classifierDataStr]);
        

    // start directly by getting page embeddings
    useEffect(() => {
      if (!active || !tabId) return;

      // data
      setGlobalStorage({
        message: "",
        status_embedding: ["checking", 0],
        title: document.title,
        url: window.location.hostname + window.location.pathname + window.location.search,
        _tabId: tabId
      })

      // start directly by getting page embeddings
      async function init() {
        const mode = "sentences";
        await getPageEmbeddings(mode, setStatusEmbeddings);
      }
      init();
    }, [active, tabId])


    // summarize if requested by user
    useEffect(() => {
      if(!tabId || !active || !isSynced || !summarizeParagraphs || summaryInitalized) return;
      init_summary()
    }, [tabId, active, isSynced, summarizeParagraphs]);


    // summarize if requested by user
    useEffect(() => {
      if (!summaryInitalized) return;
      const splits = summaryInitalized.splits;

      async function summarize_and_replace(container, i) {
        const split = splits[i];
        const summary = await sendToBackground({name: "llm_summarize", body: {text: split}})
        const summaries = splitMarkdownList(summary);
        container.classList.remove("loading");
        const el = document.querySelector("div.shaderunner-summarized[summaryid='"+i+"'] .summary");
        el.innerHTML = "<ul>" + summaries.map(s => "<li>"+s+"</li>").join("\n") + "</ul>";
      }
      async function summarize() {
        for(let i=0; i<splits.length; i++) {
          const container = document.querySelector("div.shaderunner-summarized[summaryid='"+i+"']");
          if (!container) continue;
          summarize_and_replace(container, i);
        }
      }
      summarize();
    }, [summaryInitalized]);


    // on every classifier change, recompute highlights
    useEffect(() => {
      if(!tabId || !active || !isSynced || !classEmbeddings || Object.entries(classEmbeddings).filter(([c,v]) => classifierData.classes_retrieval?.includes(c) || classifierData.classes_pos?.includes(c)).length == 0) return;

      const applyHighlight = async () => {
        if (!classifierData?.classes_pos && !classifierData?.classes_retrieval) return;

        if (isHighlightRunning) {
            // Mark that a new highlight call is queued
            queuedHighlightRef.current = true;
            return;
        }

        setIsHighlightRunning(true);

        try {
            await highlight();
        } catch (error) {
            console.error('Error in highlight function:', error);
        } finally {
            setIsHighlightRunning(false);

            // Check if a new highlight call was queued during execution
            if (queuedHighlightRef.current) {
                queuedHighlightRef.current = false;
                applyHighlight(); // Start the queued highlight call
            }
        }
    };
      applyHighlight()
    }, [pageEmbeddings, isSynced, classifierDataStr, active, highlightAmount, highlightRetrieval, highlightClassify, decisionEpsAmount, classEmbeddings ? Object.keys(classEmbeddings).join(",") : "null", retrievalK, summarizeParagraphs])


    // on every classifier change, recompute class embeddings
    useEffect(() => {
      if(!tabId || !active || !isSynced || (!classifierData?.classes_pos && !classifierData?.classes_retrieval)) return;

      async function computeClassEmbeddings() {
        const classes_pos = classifierData.classes_pos || [];
        const classes_neg = classifierData.classes_neg || [];
        const classes_retrieval = classifierData.classes_retrieval || [];
        if ((!classes_pos || !classes_neg) && !classes_retrieval)
          return;

        const allclasses = [...classes_pos, ...classes_neg, ...classes_retrieval]

        // embeddings of classes (use cached / compute)
        const classCollection = url + "|classes"
        if (classEmbeddings && allclasses.every(a => a in classEmbeddings)) {
          setStatusHighlight(["checking", 0, "using cache"]);
        } else {
          setStatusHighlight(["checking", 0, "embedding classes"]);
          const class2Embedding = await computeEmbeddingsCached(classCollection, allclasses, "shaderunner-classes");
          setClassEmbeddings(class2Embedding)
        }
      }
      computeClassEmbeddings()
    }, [active, isSynced, classifierDataStr])



    // --------- //
    // functions //
    // --------- //

    // ask llm for classes
    const getQueryClasses = async (query, onLLM = () => {}, onLLMDone = () => {}) => {
      onLLM()
      const result = await sendToBackground({ name: "llm_classify", body: {query: query, url: url, title: title }})
      setClassifierData(old => ({...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope, query: query, classes_retrieval: [query]}))
      onLLMDone()
    }

    // ensure page embeddings exist
    const getPageEmbeddings = async (mode = "sentences", onStatus = (status: [string, Number, string?]) => {}) => {

      // use cache if already computed
      if (pageEmbeddings.mode == mode && pageEmbeddings.finished) return pageEmbeddings;

      // if not in cache, check if database has embeddings
      const exists = await embeddingExists(url as string)
      const status_msg = exists ? "found database" : "";
      await onStatus(["computing", 0, status_msg])

      // extract main content & generate splits
      const mainel = getMainContent();
      const splits = extractSplits(mode, mainel)

      // retrieve embedding (either all at once or batch-wise)
      let splitEmbeddings = {};
      const batchSize = exists ? 256 : 64;
      for(let i = 0; i < splits.length; i+= batchSize) {
        const splitEmbeddingsBatch = await computeEmbeddingsCached(url as string, splits.slice(i, i+batchSize))
        splitEmbeddings = {...splitEmbeddings, ...splitEmbeddingsBatch};
        await onStatus(["computing", Math.floor(i / splits.length * 100), status_msg])
        setPageEmbeddings({ splits: splits.slice(0, i+batchSize), splitEmbeddings, mode });
      }
      await onStatus(["loaded", 100])
    }


    const init_summary = async () => {
      const mainel = getMainContent();
      const splits = extractSplits("paragraphs", mainel).filter(s => s.trim().endsWith(".") && s.length > 150)
      let {splitDetails, textNodes} = mapSplitsToTextnodes(splits, mainel, -1);//2000)

      // streamlined text highlighting
      let currentTextNodes = textNodes.slice();
      let node_offset = 0;
      let textoffset = 0;
      for (let i = 0; i < splits.length; i++) {
        const details = splitDetails[i];
        if (!details) continue;
        let true_from_node_pos = details.from_text_node + node_offset;
        let true_to_node_pos = details.to_text_node + node_offset;
        const num_textnodes = 1 + details.to_text_node - details.from_text_node
        const textNodesSubset = currentTextNodes.slice(true_from_node_pos, true_to_node_pos + 1);
        const highlightClass = "hidden";
        const relative_details = {
          from_text_node_char_start: details.from_text_node_char_start - textoffset,
          to_text_node_char_end: details.to_text_node_char_end - (details.from_text_node == details.to_text_node ? textoffset : 0),
          from_text_node: 0,
          to_text_node: details.to_text_node - details.from_text_node
        }
        const { replacedNodes, nextTextOffset } = highlightText(relative_details, textNodesSubset, highlightClass, (span) => {
          span.setAttribute("summaryid", i);
        }, "shaderunner-origtext");

        const summarizedEl = document.createElement('div');
        summarizedEl.innerHTML = `<div class='logoContainer'><img src='${Logo}'/></div><span class='summary'>Loading</span>`;
        summarizedEl.classList.add("shaderunner-summarized");
        summarizedEl.classList.add("loading");
        summarizedEl.setAttribute("summaryid", i);
        function toggleShowOriginal() {
          this.parentElement.classList.toggle('showoriginal'); // 'this' now refers to 'logoContainer'
          const summaryId = this.parentNode.getAttribute('summaryid'); // Get summaryid from parent
          const sameIdElements = document.querySelectorAll(`.shaderunner-origtext[summaryid="${summaryId}"]`);
          sameIdElements.forEach(elem => elem.classList.toggle('showoriginal'));
        }
        const logoContainer = summarizedEl.querySelector('.logoContainer');
        logoContainer.addEventListener('click', toggleShowOriginal);
        replacedNodes[0].parentElement.parentElement.insertBefore(summarizedEl, replacedNodes[0].parentElement);

        currentTextNodes.splice(true_from_node_pos, num_textnodes, ...replacedNodes);
        node_offset += replacedNodes.length - num_textnodes
        if (i < splits.length - 1 && splitDetails[i + 1] && splitDetails[i + 1].from_text_node == details.to_text_node && nextTextOffset > 0) {
          textoffset = nextTextOffset + (details.to_text_node == details.from_text_node ? textoffset : 0);
        } else {
          textoffset = 0;
        }
      }

      setSummaryInitalized({splits});
    };


    const highlight = async () => {
      const classes_pos = classifierData.classes_pos || [];
      const classes_neg = classifierData.classes_neg || [];
      const classes_retrieval = classifierData.classes_retrieval || [];
      if ((!classes_pos || !classes_neg) && !classes_retrieval)
        return;
      if (!classEmbeddings || isPromise(classEmbeddings)) return;
      const classifyMode = classes_pos.length && classes_neg.length;

      setStatusHighlight(["checking", 0]);
      const allclasses = [...classes_pos, ...classes_neg]
      const numClasses = allclasses.length;
      const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]))
      const classStore = VectorStore_fromClass2Embedding(Object.fromEntries(Object.entries(classEmbeddings).filter(([c]) => !classes_retrieval.includes(c))))
      allclasses.push(...classes_retrieval)

      // ensure we have embedded the page contents
      let { splits, splitEmbeddings, mode } = pageEmbeddings;
      if (splits.length == 0) return;
      const mainel = getMainContent();
      resetHighlights()
      let {splitDetails, textNodes} = mapSplitsToTextnodes(splits, mainel)
      splits = splits.filter((s,i) => splitDetails[i])
      splitDetails = splitDetails.filter((s,i) => splitDetails[i])
      setStatusHighlight(["checking", 0, "starting highlighting"]);

      // mark sentences based on similarity
      let toHighlight = [];
      let scores = [];
      let max_diff = 0;
      for (let i=0; i<splits.length; i++) {
        const split = splits[i];

        let closestClass, closestOtherClass, otherclassmod;
        if (classifyMode) {
          // using precomputed embeddings
          const embedding = splitEmbeddings[split];
          const closest = await classStore.similaritySearchVectorWithScore(embedding, numClasses);

          const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
          const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

          scores.push([score_plus, score_minus]);
          if (score_plus > score_minus)
            max_diff = Math.max(max_diff, (Math.abs(score_plus - score_minus)))

          // remember to mark split for highlighting later streamlined
          closestClass = closest[0];
          const closestClassName = closestClass[0].pageContent
          otherclassmod = class2Id[closestClassName] < classes_pos.length ? -1 : 1;
          const otherclassmatches = closest.filter(([doc, score]) => class2Id[doc.pageContent] * otherclassmod < classes_pos.length * otherclassmod)
          closestOtherClass = otherclassmatches[0];
        }
        const index = i;
        const highlight = highlightClassify ?? true;
        const isRetrieval = false;
        toHighlight.push({ index, closestClass, closestOtherClass, otherclassmod, highlight, isRetrieval })

        if (i % 10 == 0 || i == splits.length - 1)
          setStatusHighlight(["computing", 100 * Number(i) / splits.length]);
      }

      // retrieval
      if (highlightRetrieval ?? false) {
        for(let i=0; i<classes_retrieval.length; i++) {
          const c = classes_retrieval[i] as string;
          class2Id[c] = numClasses + i;
          const query_embedding = classEmbeddings[c];
          if (!query_embedding) continue;
          const retrievalStore = VectorStore_fromClass2Embedding(splitEmbeddings)
          const closestRetrieved = await retrievalStore.similaritySearchVectorWithScore(query_embedding, retrievalK || 1)
          closestRetrieved.forEach(retrieved => {
            const split_id = splits.indexOf(retrieved[0].pageContent)
            if (split_id < 0) return;
            toHighlight[split_id].isRetrieval = true;
            toHighlight[split_id].closestClass = [{pageContent: c}, retrieved[1]];
            toHighlight[split_id].highlight = true;
            toHighlight[split_id].otherclassmod = -1;
          });
        }
      }

      // highlight based on statistics
      const decisioneps = (1-(decisionEpsAmount ?? 0.5)) * (max_diff - 1e-5);
      if (classifyMode)
      toHighlight.forEach((h,i) => {
        const [score_plus, score_minus] = scores[i];
        const split = splits[i];

        // always highlight if similarity is above given value
        if (alwayshighlighteps > 0 && score_plus > alwayshighlighteps) {
          if (verbose) console.log("mark", split, score_plus, score_minus)
        }

        // ignore anything that is not distinguishable
        //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
        else if ((decisioneps > 0 && Math.abs(score_plus - score_minus) < decisioneps || minimalhighlighteps > 0 && score_plus < minimalhighlighteps)) {
          if (verbose) console.log("skipping", split, score_plus, score_minus)
          h.highlight = false;
        }

        // apply color if is first class
        else if (score_plus > score_minus) {
          if (verbose) console.log("mark", split, score_plus, score_minus)
        }
        
        else {
          if (verbose) console.log("reject", split, score_plus, score_minus)
        }

      })

      // filter out amount to highlight
      if (highlightAmount !== null && highlightAmount < 1.0) {
        toHighlight.sort((a,b) => b.closestClass[1] - a.closestClass[1])
        toHighlight.slice(Math.ceil(toHighlight.length * highlightAmount)).forEach((h) => {
          h.highlight = false
        })
        toHighlight.sort((a,b) => a.index - b.index)
      }

      // streamlined text highlighting
      let currentTextNodes = textNodes.slice();
      let node_offset = 0;
      let textoffset = 0;
      const topicCounts = Object.fromEntries(allclasses.map((c) => [c, 0]))
      for(let i=0; i<toHighlight.length; i++) {
        const {index, closestClass, closestOtherClass, otherclassmod, highlight, isRetrieval} = toHighlight[i];
        const className = closestClass ? closestClass[0].pageContent : null;
        const classScore = closestClass ? closestClass[1] : null;
        const otherClassName = closestOtherClass ? closestOtherClass[0].pageContent : null;
        const otherClassScore = closestOtherClass ? closestOtherClass[1] : null;
        const details = splitDetails[index];
        let true_from_node_pos = details.from_text_node + node_offset;
        let true_to_node_pos = details.to_text_node + node_offset;
        const num_textnodes = 1 + details.to_text_node - details.from_text_node
        const textNodesSubset = currentTextNodes.slice(true_from_node_pos, true_to_node_pos + 1);
        const highlightClass = `highlightclass-${class2Id[className]}`;
        const relative_details = {
          from_text_node_char_start: details.from_text_node_char_start - textoffset,
          to_text_node_char_end: details.to_text_node_char_end - (details.from_text_node == details.to_text_node ? textoffset : 0),
          from_text_node: 0,
          to_text_node: details.to_text_node - details.from_text_node
        }
        const { replacedNodes, nextTextOffset } = highlightText(relative_details, textNodesSubset, highlightClass, (span) => {
          if (className && otherClassName)
            span.setAttribute("data-title", `[${otherclassmod < 0 ? "✓" : "✗"}] ${classScore.toFixed(2)}: ${className} | [${otherclassmod < 0 ? "✗" : "✓"}] ${otherClassScore.toFixed(2)}: ${otherClassName}`);
          if (className)
            span.setAttribute("splitid_class", topicCounts[className])
          if (!highlight && !isRetrieval)
            span.classList.add("transparent")
          else
            span.classList.add("show")
          if (DEV)
            span.setAttribute("splitid", index);
        });
        if (className)
          topicCounts[className] += highlight || isRetrieval ? 1 : 0;
        currentTextNodes.splice(true_from_node_pos, num_textnodes, ...replacedNodes);
        node_offset += replacedNodes.length - num_textnodes 
        if (index < splits.length - 1 && splitDetails[index+1].from_text_node == details.to_text_node && nextTextOffset > 0) {
          textoffset = nextTextOffset + (details.to_text_node == details.from_text_node ? textoffset : 0);
          //textoffset += nextTextOffset;
        } else {
          textoffset = 0;
        }
        if (i % 10 == 0 || i == splits.length - 1)
          setStatusHighlight(["computing", i / toHighlight.length * 100]) // bug: needs to be outside due to concurrency conflict of this variable
      }

      // finally, let's highlight all textnodes that are not highlighted
      const emptyTextNodes = textNodesNotUnderHighlight(document.body);
      emptyTextNodes.forEach(node => surroundTextNode(node, "normaltext"))

      // in DEV mode, we also save the all the data
      const title = document.title;
      const devOpts = DEV ? { DEV_highlighterData: { url, classifierData, splits, title }} : {};

      // if we are in retrieval-only mode, jump to first result
      const jumpOp = !classifyMode ? {ScrollerCommand: {"selector": "span.shaderunner-highlight.show.highlightclass-0", "cmd": "first"}} : {}

      if (statusEmbedding && statusEmbedding[1] == 100)
        setStatusHighlight(["loaded", 100]) // bug: needs to be outside due to concurrency conflict of this variable
      setGlobalStorage({
        topicCounts: topicCounts,
        classifierScores: scores,
        ...devOpts,
        ...jumpOp
      })

    }

    return [
      <HighlightStyler key="styler" tabId={tabId}/>,
      <Scroller key="scroller" tabId={tabId}/>,
      DEV ? <TestsetHelper key="testsethelper" tabId={tabId}/> : "",
    ]
};

export default Highlighter;