import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMainContent, extractSplits, mapSplitsToTextnodes } from '~util/extractContent';
import { highlightText, resetHighlights, textNodesNotUnderHighlight, surroundTextNode } from '~util/DOM';
import { computeEmbeddingsCached, embeddingExists, getPageEmbeddings, VectorStore_fromClass2Embedding } from '~util/embedding';
import { useStorage } from "@plasmohq/storage/hook";
import { useGlobalStorage } from '~util/useGlobalStorage';
import HighlightStyler from '~components/HighlightStyler';
import Scroller from '~components/Scroller';
import TestsetHelper from '~components/TestsetHelper';
import Summarize from '~components/Summarize';
import { sendToBackground } from '@plasmohq/messaging';
import { MSG_QUERY2CLASS } from '~util/messages';
import { random } from '~util/misc';
import useEffectWhenReady from '~util/useEffectWhenReady';
import useTabId from '~util/useTabId';
import { getQueryClasses } from '~background/messages/llm_classify';


const DEV = process.env.NODE_ENV == "development";


const Highlighter = () => {
  const tabId = useTabId();
  const [
    [active],
    [url],
    [statusEmbedding, setStatusEmbeddings],
    [, setStatusHighlight],
    [, setStatusClassifier],
    [classEmbeddings, setClassEmbeddings],
    [highlightAmount],
    [decisionEpsAmount],
    [highlightRetrieval],
    [highlightClassify],
    [retrievalK],
    [classifierData, setClassifierData],
    [savedHighlightQuery],
    [setGlobalStorage, isSynced]
  ] = useGlobalStorage(tabId, "active", "url", "status_embedding", "status_highlight", "status_classifier", "classEmbeddings", "highlightAmount", "decisionEps", "highlightRetrieval", "highlightClassify", "retrievalK", "classifierData", "savedHighlightQuery");
  const [pageEmbeddings, setPageEmbeddings] = useState({ mode: "sentences", splits: [], splitEmbeddings: {} });
  const [isHighlightRunning, setIsHighlightRunning] = useState(false);
  const queuedHighlightRef = useRef(false);
  const classifierDataStr = JSON.stringify(classifierData);


  // -------- //
  // settings //
  // -------- //
  const [verbose] = useStorage("verbose", false);
  // const [ textretrieval_k ] = useStorage('textretrieval_k')
  const [alwayshighlighteps] = useStorage("alwayshighlighteps");
  const [minimalhighlighteps] = useStorage("minimalhighlighteps");
  // const [ default_decisioneps ] = useStorage("decisioneps");


  // ------- //
  // effects //
  // ------- //

  // init
  useEffectWhenReady([isSynced, active, tabId], async () => {

    // initialize tab/document info
    setGlobalStorage({
      message: "",
      status_embedding: ["checking", 0],
      title: document.title,
      url: window.location.hostname + window.location.pathname + window.location.search,
      _tabId: tabId
    })

    // start directly by getting page embeddings
    // (uses cache if already computed)
    const mode = "sentences";
    if (pageEmbeddings.mode != mode || !pageEmbeddings.finished) {
      const mainel = getMainContent();
      await getPageEmbeddings(mainel, url, mode, setStatusEmbeddings, setPageEmbeddings);
    }
  }, [active, tabId])


  // user sends input
  useEffectWhenReady([isSynced], async () => {
    // reset for empty query
    if (!savedHighlightQuery) return setClassifierData({});

    // query llm to give classes
    if (highlightClassify) {
      setStatusClassifier(["checking", 0])
      const result = await getQueryClasses({query: savedHighlightQuery, title: document.title, url}, () => {
        setStatusClassifier(["checking", 0, random(MSG_QUERY2CLASS)])
      }, () => {
        setStatusClassifier(["loaded", 100])
      })
      setClassifierData(old => ({ ...old, classes_pos: result.classes_pos, classes_neg: result.classes_neg, thought: result.thought, scope: result.scope, query: savedHighlightQuery, classes_retrieval: [savedHighlightQuery] }))
    }

    if (highlightRetrieval) {
      setClassifierData(old => ({ ...old, classes_retrieval: savedHighlightQuery ? [savedHighlightQuery] : [] }))
    }
  }, [savedHighlightQuery])


  // restore classifier status
  useEffectWhenReady([isSynced, classifierData], () => {
    setStatusClassifier(classifierData && classifierData.classes_pos && classifierData.classes_neg ? ["loaded", 100] : null)
  }, [isSynced, classifierDataStr]);


  // on every classifier change, recompute highlights
  useEffectWhenReady([isSynced, active, tabId, classEmbeddings], () => {
    if (Object.entries(classEmbeddings).filter(([c, v]) => classifierData.classes_retrieval?.includes(c) || classifierData.classes_pos?.includes(c)).length == 0) return;

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
  }, [pageEmbeddings, isSynced, classifierDataStr, active, highlightAmount, highlightRetrieval, highlightClassify, decisionEpsAmount, classEmbeddings ? Object.keys(classEmbeddings).join(",") : "null", retrievalK])


  // on every classifier change, recompute class embeddings
  useEffectWhenReady([isSynced, active, tabId, classifierData?.classes_pos || classifierData?.classes_retrieval], async () => {
    const classes_pos = classifierData.classes_pos || [];
    const classes_neg = classifierData.classes_neg || [];
    const classes_retrieval = classifierData.classes_retrieval || [];
    if ((!classes_pos || !classes_neg) && !classes_retrieval)
      return;

    const allclasses = [...classes_pos, ...classes_neg, ...classes_retrieval]

    // embeddings of classes (use cached / compute)
    const classCollection = url + "|classes"
    if (classEmbeddings && allclasses.every(a => a in classEmbeddings)) {
      setStatusHighlight(["ready", 0]);
    } else {
      setStatusHighlight(["checking", 0, "embedding classes"]);
      const class2Embedding = await computeEmbeddingsCached(classCollection, allclasses, null);//"shaderunner-classes");
      setClassEmbeddings(class2Embedding)
      setStatusHighlight(["ready", 0]);
    }
  }, [active, isSynced, classifierDataStr])



  // --------- //
  // functions //
  // --------- //

  const highlight = async () => {
    const classes_pos = classifierData.classes_pos || [];
    const classes_neg = classifierData.classes_neg || [];
    const classes_retrieval = classifierData.classes_retrieval || [];
    if ((!classes_pos || !classes_neg) && !classes_retrieval)
      return;
    if (!classEmbeddings) return;
    const classifyMode = classes_pos.length && classes_neg.length;

    setStatusHighlight(["checking", 0]);
    const allclasses = [...classes_pos, ...classes_neg]
    const numClasses = allclasses.length;
    const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]))
    const classStore = VectorStore_fromClass2Embedding(Object.fromEntries(Object.entries(classEmbeddings).filter(([c]) => !classes_retrieval.includes(c))))
    allclasses.push(...classes_retrieval)

    // ensure we have embedded the page contents
    let { splits, splitEmbeddings } = pageEmbeddings;
    if (splits.length == 0) return;
    const mainel = getMainContent();
    resetHighlights()
    let { splitDetails, textNodes } = mapSplitsToTextnodes(splits, mainel)
    splits = splits.filter((s, i) => splitDetails[i])
    splitDetails = splitDetails.filter((s, i) => splitDetails[i])
    setStatusHighlight(["checking", 0, "starting highlighting"]);

    // mark sentences based on similarity
    let toHighlight = [];
    let scores = [];
    let max_diff = 0;
    for (let i = 0; i < splits.length; i++) {
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
      for (let i = 0; i < classes_retrieval.length; i++) {
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
          toHighlight[split_id].closestClass = [{ pageContent: c }, retrieved[1]];
          toHighlight[split_id].highlight = true;
          toHighlight[split_id].otherclassmod = -1;
        });
      }
    }

    // highlight based on statistics
    const decisioneps = (1 - (decisionEpsAmount ?? 0.5)) * (max_diff - 1e-5);
    if (classifyMode)
      toHighlight.forEach((h, i) => {
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
      toHighlight.sort((a, b) => b.closestClass[1] - a.closestClass[1])
      toHighlight.slice(Math.ceil(toHighlight.length * highlightAmount)).forEach((h) => {
        h.highlight = false
      })
      toHighlight.sort((a, b) => a.index - b.index)
    }

    // streamlined text highlighting
    let currentTextNodes = textNodes.slice();
    let node_offset = 0;
    let textoffset = 0;
    const topicCounts = Object.fromEntries(allclasses.map((c) => [c, 0]))
    for (let i = 0; i < toHighlight.length; i++) {
      const { index, closestClass, closestOtherClass, otherclassmod, highlight, isRetrieval } = toHighlight[i];
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
      if (index < splits.length - 1 && splitDetails[index + 1].from_text_node == details.to_text_node && nextTextOffset > 0) {
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
    const devOpts = DEV ? { DEV_highlighterData: { url, classifierData, splits, title } } : {};

    // if we are in retrieval-only mode, jump to first result
    const jumpOp = !classifyMode ? { ScrollerCommand: { "selector": "span.shaderunner-highlight.show.highlightclass-0", "cmd": "first" } } : {}

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
    <HighlightStyler key="styler" tabId={tabId} />,
    <Summarize key="summarize" tabId={tabId} />,
    <Scroller key="scroller" tabId={tabId} />,
    DEV ? <TestsetHelper key="testsethelper" tabId={tabId} /> : "",
  ]
};

export default Highlighter;