import React, { useState, useEffect } from 'react';
import { getMainContent, extractSplits, mapSplitsToTextnodes } from '~util/extractContent'
import { highlightText, resetHighlights, textNodesNotUnderHighlight, surroundTextNode } from '~util/DOM'
import { computeEmbeddingsCached, embeddingExists, VectorStore_fromClass2Embedding, type Metadata } from '~util/embedding'
import { useStorage } from "@plasmohq/storage/hook";
import HighlightStyler from '~components/HighlightStyler';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Scroller from '~components/Scroller';
import TestsetHelper from '~components/TestsetHelper';

const DEV = process.env.NODE_ENV == "development";

const isPromise = obj => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

const Highlighter = () => {
    const [ tabId, setTabId ] = useState(null);
    const [
      [active],
      [savedUrl],
      [statusEmbedding,setStatusEmbeddings],
      [,setStatusHighlight],
      [classEmbeddings, setClassEmbeddings],
      [highlightAmount],
      [decisionEpsAmount],
      [highlightRetrieval],
      [highlightClassify],
      [retrievalK],
      [classifierData],
      [setGlobalStorage, connected]
    ] = useGlobalStorage(tabId, "active", "url", "status_embedding", "status_highlight", "classEmbeddings", "highlightAmount", "decisionEps", "highlightRetrieval", "highlightClassify", "retrievalK", "classifierData");
    const [ pageEmbeddings, setPageEmbeddings ] = useState({mode: "sentences", splits: [], splitEmbeddings: {}});

    // -------- //
    // settings //
    // -------- //
    const [ verbose ] = useStorage("verbose", false);
    // const [ textclassifier ] = useStorage('textclassifier')
    // const [ textretrieval ] = useStorage('textretrieval')
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


    // on every classifier change, recompute highlights
    useEffect(() => {
      if(!tabId || !active || !connected || !classifierData?.classes_pos) return;

      const applyHighlight = () => {
        try {
          highlight()
        } catch (error) {
          console.error('Error in applyHighlight:', error);
        }
      }
      applyHighlight()
    }, [pageEmbeddings, connected, classifierData, active, highlightAmount, highlightRetrieval, highlightClassify, decisionEpsAmount, classEmbeddings, retrievalK])


    // on every classifier change, recompute class embeddings
    useEffect(() => {
      if(!tabId || !active || !connected || !classifierData?.classes_pos || !classifierData?.classes_retrieval) return;

      async function computeClassEmbeddings() {
        const classes_pos = classifierData.classes_pos;
        const classes_neg = classifierData.classes_neg;
        const classes_retrieval = classifierData.classes_retrieval;
        if (!Array.isArray(classes_pos) || !Array.isArray(classes_neg))
          return;

        const allclasses = [...classes_pos, ...classes_neg, ...classes_retrieval]
        // embeddings of classes (use cached / compute)
        const classCollection = savedUrl + "|classes"
        if (classEmbeddings && allclasses.every(a => a in classEmbeddings)) {
          setStatusHighlight(["checking", 0, "using cache"]);
        } else {
          setStatusHighlight(["checking", 0, "embedding classes"]);
          const class2Embedding = await computeEmbeddingsCached(classCollection, allclasses, "shaderunner-classes");
          setClassEmbeddings(class2Embedding)
        }
      }
      computeClassEmbeddings()
    }, [active, connected, classifierData])



    // --------- //
    // functions //
    // --------- //

    // ensure page embeddings exist
    const getPageEmbeddings = async (mode = "sentences", onStatus = (status: [string, Number, string?]) => {}) => {

      // use cache if already computed
      if (pageEmbeddings.mode == mode && pageEmbeddings.finished) return pageEmbeddings;

      // if not in cache, check if database has embeddings
      const exists = await embeddingExists(savedUrl as string)
      const status_msg = exists ? "found database" : "";
      await onStatus(["computing", 0, status_msg])

      // extract main content & generate splits
      const mainel = getMainContent();
      const splits = extractSplits(mode, mainel)

      // retrieve embedding (either all at once or batch-wise)
      let splitEmbeddings = {};
      const batchSize = exists ? 256 : 64;
      for(let i = 0; i < splits.length; i+= batchSize) {
        const splitEmbeddingsBatch = await computeEmbeddingsCached(savedUrl as string, splits.slice(i, i+batchSize))
        splitEmbeddings = {...splitEmbeddings, ...splitEmbeddingsBatch};
        await onStatus(["computing", Math.floor(i / splits.length * 100), status_msg])
        setPageEmbeddings({ splits: splits.slice(0, i+batchSize), splitEmbeddings, mode });
      }
      await onStatus(["loaded", 100])
    }


    const highlight = async () => {
      const classes_pos = classifierData.classes_pos;
      const classes_neg = classifierData.classes_neg;
      const classes_retrieval = classifierData.classes_retrieval;
      if (!classes_pos || !classes_neg || !classes_retrieval)
        return;
      if (!classEmbeddings || isPromise(classEmbeddings)) return;

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
      let {splitDetails, textNodes} = mapSplitsToTextnodes(splits, mainel, mode)
      splits = splits.filter((s,i) => splitDetails[i])
      splitDetails = splitDetails.filter((s,i) => splitDetails[i])
      setStatusHighlight(["checking", 0, "starting highlighting"]);

      // mark sentences based on similarity
      let toHighlight = [];
      let scores = [];
      let max_diff = 0;
      for (let i=0; i<splits.length; i++) {
        const split = splits[i];

        // using precomputed embeddings
        const embedding = splitEmbeddings[split];
        const closest = await classStore.similaritySearchVectorWithScore(embedding, numClasses);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        scores.push([score_plus, score_minus]);
        if (score_plus > score_minus)
          max_diff = Math.max(max_diff, (Math.abs(score_plus - score_minus)))

        // remember to mark split for highlighting later streamlined
        const closestClass = closest[0];
        const closestClassName = closestClass[0].pageContent
        const otherclassmod = class2Id[closestClassName] < classifierData.classes_pos.length ? -1 : 1;
        const otherclassmatches = closest.filter(([doc, score]) => class2Id[doc.pageContent] * otherclassmod < classifierData.classes_pos.length * otherclassmod)
        const closestOtherClass = otherclassmatches[0];
        const index = i;
        const highlight = highlightClassify ?? true;
        const isRetrieval = false;
        toHighlight.push({ index, closestClass, closestOtherClass, otherclassmod, highlight, isRetrieval })

        setStatusHighlight(["computing", 100 * Number(i) / splits.length]);
      }

      // retrieval
      if (highlightRetrieval ?? false) {
        for(let i=0; i<classes_retrieval.length; i++) {
          const c = classes_retrieval[i] as string;
          class2Id[c] = numClasses + i;
          const query_embedding = classEmbeddings[c];
          const retrievalStore = VectorStore_fromClass2Embedding(splitEmbeddings)
          const closestRetrieved = await retrievalStore.similaritySearchVectorWithScore(query_embedding, retrievalK)
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
        const className = closestClass[0].pageContent;
        const classScore = closestClass[1];
        const otherClassName = closestOtherClass[0].pageContent;
        const otherClassScore = closestOtherClass[1];
        const details = splitDetails[index];
        let true_from_node_pos = details.from_text_node + node_offset;
        let true_to_node_pos = details.to_text_node + node_offset;
        const num_textnodes = 1 + details.to_text_node - details.from_text_node
        const textNodesSubset = currentTextNodes.slice(true_from_node_pos, true_to_node_pos + 1);
        const highlightClass = class2Id[className];
        const relative_details = {
          from_text_node_char_start: details.from_text_node_char_start - textoffset,
          to_text_node_char_end: details.to_text_node_char_end - (details.from_text_node == details.to_text_node ? textoffset : 0),
          from_text_node: 0,
          to_text_node: details.to_text_node - details.from_text_node
        }
        const { replacedNodes, nextTextOffset } = highlightText(relative_details, textNodesSubset, highlightClass, (span) => {
          span.setAttribute("data-title", `[${otherclassmod < 0 ? "✓" : "✗"}] ${classScore.toFixed(2)}: ${className} | [${otherclassmod < 0 ? "✗" : "✓"}] ${otherClassScore.toFixed(2)}: ${otherClassName}`);
          span.setAttribute("splitid_class", topicCounts[className])
          if (!highlight && !isRetrieval)
            span.classList.add("transparent")
          else
            span.classList.add("show")
          if (DEV)
            span.setAttribute("splitid", index);
        });
        topicCounts[className] += highlight || isRetrieval ? 1 : 0;
        currentTextNodes.splice(true_from_node_pos, num_textnodes, ...replacedNodes);
        node_offset += replacedNodes.length - num_textnodes 
        if (index < splits.length - 1 && splitDetails[index+1].from_text_node == details.to_text_node && nextTextOffset > 0) {
          textoffset = nextTextOffset + (details.to_text_node == details.from_text_node ? textoffset : 0);
          //textoffset += nextTextOffset;
        } else {
          textoffset = 0;
        }
        setStatusHighlight(["computing", i / toHighlight.length * 100]) // bug: needs to be outside due to concurrency conflict of this variable
      }

      // finally, let's highlight all textnodes that are not highlighted
      const emptyTextNodes = textNodesNotUnderHighlight(document.body);
      emptyTextNodes.forEach(node => surroundTextNode(node, "normaltext"))

      // in DEV mode, we also save the all the data
      const title = document.title;
      const devOpts = DEV ? { DEV_highlighterData: { savedUrl, classifierData, splits, title }} : {};

      if (statusEmbedding && statusEmbedding[1] == 100)
        setStatusHighlight(["loaded", 100]) // bug: needs to be outside due to concurrency conflict of this variable
      setGlobalStorage({
        topicCounts: topicCounts,
        classifierScores: scores,
        ...devOpts
      })
    }

    return [
      <HighlightStyler key="styler" tabId={tabId}/>,
      <Scroller key="scroller" tabId={tabId}/>,
      DEV ? <TestsetHelper key="testsethelper" tabId={tabId}/> : "",
    ]
};

export default Highlighter;