import React, { useState, useEffect, useRef } from 'react';
import { getMainContent, extractSplits, mapSplitsToTextnodes } from '~util/extractContent'
import { highlightText, resetHighlights, textNodesNotUnderHighlight, surroundTextNode } from '~util/DOM'
import { computeEmbeddingsCached, computeEmbeddingsLocal, embeddingExists, VectorStore_fromClass2Embedding, type Metadata } from '~util/embedding'
import { useStorage } from "@plasmohq/storage/hook";
import { useSessionStorage as _useSessionStorage, arraysAreEqual } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import HighlightStyler from '~components/HighlightStyler';
import { useGlobalStorage } from '~util/useGlobalStorage';
import Scroller from '~components/Scroller';
import TestsetHelper from '~components/TestsetHelper';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

const DEV = process.env.NODE_ENV == "development";
const useSessionStorage = DEV && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

const Highlighter = () => {
    const [ tabId, setTabId ] = useState(null);
    const [
      [savedUrl],
      [,setTopicCounts],
      [,setScores],
      [,setStatusEmbeddings],
      [,setStatusHighlight],
      [classEmbeddings, setClassEmbeddings],
      [highlightAmount],
      [setGlobalStorage, connected]
    ] = useGlobalStorage(tabId, "url", "topicCounts", "classifierScores", "status_embedding", "status_highlight", "classEmbeddings", "highlightAmount");
    const [ url, isActive ] = useActiveState(window.location);
    const [ pageEmbeddings, setPageEmbeddings ] = useState({mode: "sentences", splits: [], splitEmbeddings: {}});
    const [ classifierData ] = useSessionStorage("classifierData:"+tabId, {});
    const [ retrievalQuery ] = useSessionStorage("retrievalQuery:"+tabId, null);

    // -------- //
    // settings //
    // -------- //
    const [ verbose ] = useStorage("verbose", false);
    const [ textclassifier ] = useStorage('textclassifier')
    const [ textretrieval ] = useStorage('textretrieval')
    const [ textretrieval_k ] = useStorage('textretrieval_k')
    const [ alwayshighlighteps ] = useStorage("alwayshighlighteps");
    const [ minimalhighlighteps ] = useStorage("minimalhighlighteps");
    const [ decisioneps ] = useStorage("decisioneps");


    // ------- //
    // effects //
    // ------- //

    // init (make sure tabId is known, needed for messaging with other parts of this application)
    useEffect(() => {
      if (!isActive) return;

      async function init() {
        const tabId = await chrome.runtime.sendMessage("get_tabid")
        setTabId(tabId);
      }
      init();
    }, [isActive])

        
    // start directly by getting page embeddings
    useEffect(() => {
      if (!isActive || !tabId) return;

      // reset only if we have a new url
      if (url == savedUrl) return;

      // data
      setGlobalStorage({
        message: "",
        status_embedding: ["checking", 0],
        title: document.title,
        url: url,
        _tabId: tabId
      })

      // start directly by getting page embeddings
      async function init() {
        const mode = "sentences";
        await getPageEmbeddings(mode, setStatusEmbeddings);
      }
      init();
    }, [isActive, tabId])


    // on every classifier change, recompute highlights
    useEffect(() => {
      if(!tabId || !isActive || !connected || !classifierData.thought) return;

      const applyHighlight = () => {
        try {
          if (textclassifier) {
            highlightUsingClasses()
          }
          if (textretrieval) {
            //highlightUsingRetrieval(retrievalQuery)
          }
        } catch (error) {
          console.error('Error in applyHighlight:', error);
        }
      }
      applyHighlight()
    }, [pageEmbeddings, connected, classifierData, isActive, textclassifier, textretrieval, retrievalQuery, highlightAmount, classEmbeddings])


    // on every classifier change, recompute class embeddings
    useEffect(() => {
      if(!tabId || !isActive || !connected || !classifierData.thought) return;

      async function computeClassEmbeddings() {
        const classes_pos = classifierData.classes_pos;
        const classes_neg = classifierData.classes_neg;
        if (!classes_pos || !classes_neg)
          return;

        const allclasses = [...classes_pos, ...classes_neg]
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
    }, [isActive, connected, classifierData, isActive])



    // --------- //
    // functions //
    // --------- //

    // ensure page embeddings exist
    const getPageEmbeddings = async (mode = "sentences", onStatus = (status: [string, Number, string?]) => {}) => {

      // use cache if already computed
      if (pageEmbeddings.mode == mode && pageEmbeddings.finished) return pageEmbeddings;

      // if not in cache, check if database has embeddings
      const exists = await embeddingExists(url as string)
      if (!exists)
        onStatus(["computing", 0])
      else
        onStatus(["computing", 0, "found database"])

      // extract main content & generate splits
      const mainel = getMainContent();
      const splits = extractSplits(mode, mainel)

      // retrieve embedding (either all at once or batch-wise)
      let splitEmbeddings = {};
      const batchSize = 256;
      for(let i = 0; i < splits.length; i+= batchSize) {
        const splitEmbeddingsBatch = await computeEmbeddingsCached(url as string, splits.slice(i, i+batchSize))
        splitEmbeddings = {...splitEmbeddings, ...splitEmbeddingsBatch};
        if (!exists)
          onStatus(["computing", Math.floor(i / splits.length * 100)])
        setPageEmbeddings({ splits: splits.slice(0, i+batchSize), splitEmbeddings, mode });
      }
      onStatus(["loaded", 100])
    }


    const highlightUsingClasses = async () => {
      const classes_pos = classifierData.classes_pos;
      const classes_neg = classifierData.classes_neg;
      if (!classes_pos || !classes_neg)
        return;
      if (!classEmbeddings) return;

      setStatusHighlight(["checking", 0]);
      const allclasses = [...classes_pos, ...classes_neg]
      const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]))
      const classStore = VectorStore_fromClass2Embedding(classEmbeddings)

      // ensure we have embedded the page contents
      let { splits, splitEmbeddings, mode } = pageEmbeddings;
      if (splits.length == 0) return;
      const mainel = getMainContent();
      resetHighlights()
      let {splitDetails, textNodes} = mapSplitsToTextnodes(splits, mainel, mode)
      splits = splits.filter((s,i) => splitDetails[i])
      splitDetails = splitDetails.filter((s,i) => splitDetails[i])

      // mark sentences based on similarity
      let toHighlight = [];
      let scores_diffs = [];
      let scores_plus = [];
      for (let i=0; i<splits.length; i++) {
        const split = splits[i];

        // using precomputed embeddings
        const embedding = splitEmbeddings[split];
        const closest = await classStore.similaritySearchVectorWithScore(embedding, allclasses.length);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        scores_plus.push(score_plus);
        scores_diffs.push(score_plus - score_minus);

        let highlight = false;

        // always highlight if similarity is above given value
        if (alwayshighlighteps > 0 && score_plus > alwayshighlighteps) {
          if (verbose) console.log("mark", split, score_plus, score_minus)
          highlight = true;
        }

        // ignore anything that is not distinguishable
        //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
        else if (!highlight && (decisioneps > 0 && Math.abs(score_plus - score_minus) < decisioneps || minimalhighlighteps > 0 && score_plus < minimalhighlighteps)) {
          if (verbose) console.log("skipping", split, score_plus, score_minus)
        }

        // apply color if is first class
        else if (score_plus > score_minus) {
          if (verbose) console.log("mark", split, score_plus, score_minus)
          highlight = true;
        }
        
        else {
          if (verbose) console.log("reject", split, score_plus, score_minus)
        }

        // remember to mark split for highlighting later streamlined
        if (true || highlight) {
          const closestClass = closest[0];
          const closestClassName = closestClass[0].pageContent
          const otherclassmod = class2Id[closestClassName] < classifierData.classes_pos.length ? -1 : 1;
          const otherclassmatches = closest.filter(([doc, score]) => class2Id[doc.pageContent] * otherclassmod < classifierData.classes_pos.length * otherclassmod)
          const closestOtherClass = otherclassmatches[0];
          const index = i;
          const show = true;
          toHighlight.push({ index, closestClass, closestOtherClass, otherclassmod, show })
        }

        setStatusHighlight(["computing", 100 * Number(i) / splits.length]);
      }

      // filter out amount to highlight
      if (highlightAmount !== null && highlightAmount < 1.0) {
        toHighlight.sort((a,b) => b.closestScore - a.closestScore)
        toHighlight.slice(Math.ceil(toHighlight.length * highlightAmount)).forEach((h) => {
          h.show = false
        })
        toHighlight.sort((a,b) => a.index - b.index)
      }

      // streamlined text highlighting
      let currentTextNodes = textNodes.slice();
      let node_offset = 0;
      let textoffset = 0;
      const topicCounts = Object.fromEntries(allclasses.map((c) => [c, 0]))
      for(let i=0; i<toHighlight.length; i++) {
        const {index, closestClass, closestOtherClass, otherclassmod, show} = toHighlight[i];
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
          if (!show)
            span.classList.add("transparent")
          if (DEV)
            span.setAttribute("splitid", index);
        });
        topicCounts[className] += show ? 1 : 0;
        currentTextNodes.splice(true_from_node_pos, num_textnodes, ...replacedNodes);
        node_offset += replacedNodes.length - num_textnodes 
        if (index < splits.length - 1 && splitDetails[index+1].from_text_node == details.to_text_node && nextTextOffset > 0) {
          textoffset = nextTextOffset + (details.to_text_node == details.from_text_node ? textoffset : 0);
          //textoffset += nextTextOffset;
        } else {
          textoffset = 0;
        }
        //setStatusHighlight(["computing", i / toHighlight.length * 100]) // bug: needs to be outside due to concurrency conflict of this variable
      }

      // finally, let's highlight all textnodes that are not highlighted
      const emptyTextNodes = textNodesNotUnderHighlight(document.body);
      emptyTextNodes.forEach(node => surroundTextNode(node, "normaltext"))

      // in DEV mode, we also save the all the data
      const devOpts = DEV ? { DEV_highlighterData: { url, classifierData, splits }} : {};

      setStatusHighlight(["loaded", 100]) // bug: needs to be outside due to concurrency conflict of this variable
      setGlobalStorage({
        topicCounts: topicCounts,
        classifierScores: [scores_plus, scores_diffs],
        ...devOpts
      })
    }


    // mark sentences based on retrieval
    /*
    const highlightUsingRetrieval = async (query, mode = "sentences") => {
      if (!query) return;

      // ensure we have embedded the page contents
      const pageEmbeddings = await getPageEmbeddings(mode)
      const splits = pageEmbeddings[mode].splits;
      const metadata = pageEmbeddings[mode].metadata;

      // using precomputed embeddings
      const retrieved_splits = (await sendToBackground({ name: "retrieval", body: {collectionName: url, splits: splits, metadata: metadata, query: query, k: textretrieval_k }}))
      console.log("retrieved", retrieved_splits)

      for (const i in retrieved_splits) {
        const split = retrieved_splits[i][0].pageContent;
        const score = retrieved_splits[i][1]

        // apply color if is first class
        if (verbose) console.log("mark retrieval", split, score)

        // get all text nodes
        const textNodes = textNodesUnderElem(document.body);

        // mark sentence
        const [texts, nodes] = findTextSlow(textNodes, split);
        highlightText(texts, nodes, "retrieval", 1.0);
      }
    }
    */

    return [
      <HighlightStyler key="styler" tabId={tabId}/>,
      <Scroller key="scroller" tabId={tabId}/>,
      DEV ? <TestsetHelper key="testsethelper" tabId={tabId}/> : "",
    ]
};

export default Highlighter;