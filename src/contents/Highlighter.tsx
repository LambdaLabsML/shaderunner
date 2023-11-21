import React, { useState, useEffect } from 'react';
import { useMessage, usePort } from "@plasmohq/messaging/hook"
import { getMainContent, splitContent } from '~util/extractContent'
import { textNodesUnderElem, findTextSlow, findTextFast, highlightText, resetHighlights, textNodesNotUnderHighlight, surroundTextNode } from '~util/DOM'
import { computeEmbeddingsLocal } from '~util/embedding'
import { sendToBackground, type MessagesMetadata } from "@plasmohq/messaging"
import { MSG_CONTENT, MSG_EMBED, MSG_QUERY2CLASS } from "~util/messages";
import type { VectorStore } from "langchain/dist/vectorstores/base";
import { useStorage } from "@plasmohq/storage/hook";
import { useSessionStorage as _useSessionStorage } from '~util/misc'
import { useActiveState } from '~util/activeStatus'
import { random } from '~util/misc';
import HighlightStyler from '~components/HighlightStyler';
const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;
type JSX = React.JSX.Element;


const Highlighter = ({highlightSetting, mode}) => {
    const [ tabId, setTabId ] = useState(null);
    const controller = usePort("controller")
    const [url, isActive] = useActiveState(window.location)
    const [ pageEmbeddings, setPageEmbeddings] = useState({});
    const [ classifierData ] = useSessionStorage("classifierData:"+tabId, {});
    const [ retrievalQuery ] = useSessionStorage("retrievalQuery:"+tabId, null);
    const [ scores, setScores] = useState([]);

    // -------- //
    // settings //
    // -------- //
    const [ verbose ] = useStorage("verbose", false);
    const [ textclassifier ] = useStorage('textclassifier')
    const [ textretrieval ] = useStorage('textretrieval')
    const [ textretrieval_k ] = useStorage('textretrieval_k')
    const [ alwayshighlighteps ] = useStorage("alwayshighlighteps");
    const [ minimalhighlighteps ] = useStorage("minimalhighlighteps");
    const [ decisioneps, setdecisioneps ] = useStorage("decisioneps");


    // ------- //
    // effects //
    // ------- //

    // init (make sure tabId is known, needed for messaging with other parts of this application)
    useEffect(() => {
      if (!isActive || tabId) return;

      async function init() {
        const tabId = await chrome.runtime.sendMessage("get_tabid")
        setTabId(tabId);
        
        // init data
        const notify = msg => controller.send({_tabId: tabId, ...msg})
        notify({
          message: "",
          status_embedding: ["checking",0],
          title: document.title,
          url: url
        })

        // start directly by getting page embeddings
        const mode = "sentences";
        const newEmbeddings = await getPageEmbeddings(mode, status => notify({status_embedding: status}));
        setPageEmbeddings(old => ({...old, [mode]: newEmbeddings}));
      }
      init();
    }, [isActive])


    // on every classifier change, recompute highlights
    useEffect(() => {
      resetHighlights()
      if(!tabId || !isActive || !classifierData.thought) return;

      const applyHighlight = () => {
        try {
          if (textclassifier) {
            highlightUsingClasses()
          }
          if (textretrieval) {
            highlightUsingRetrieval(retrievalQuery)
          }
        } catch (error) {
          console.error('Error in applyHighlight:', error);
        }
      }
      applyHighlight()
    }, [classifierData, isActive, textclassifier, textretrieval, retrievalQuery])


    // --------- //
    // functions //
    // --------- //

    // ensure page embeddings exist
    const getPageEmbeddings = async (mode = "sentences", onStatus = (status) => {}) => {

      // use cache if already computed
      if (pageEmbeddings[mode]) return pageEmbeddings[mode];

      // if not in cache, check if database has embeddings
      const exists = await sendToBackground({ name: "embedding_exists", body: { collectionName: url } })
      if (!exists)
        onStatus(["computing", 0])
      else
        onStatus(["found database", 0])

      // extract main content & generate splits
      const mainEl = getMainContent(true);
      const [splits, metadata] = splitContent(mainEl.textContent, mode, url)

      // retrieve embedding (either all at once or batch-wise)
      let splitEmbeddings = [];
      if (exists)
        splitEmbeddings = await sendToBackground({ name: "embedding_compute", body: { collectionName: url, splits: splits, metadata: metadata } })
      else {
        const batchSize = 64;
        for(let i = 0; i < splits.length; i+= batchSize) {
          const splitEmbeddingsBatch = await sendToBackground({ name: "embedding_compute", body: { collectionName: url, splits: splits.slice(i, i+batchSize), metadata: metadata.slice(i, i+batchSize) } })
          splitEmbeddings = splitEmbeddings.concat(splitEmbeddingsBatch);
          onStatus(["computing", Math.floor(i / splits.length * 100)])
        }
      }
      const _pageEmbeddings = { [mode]: { splits: splits, metadata: metadata, embeddings: splitEmbeddings } }

      onStatus(["loaded", 100])

      return _pageEmbeddings;
    }


    const highlightUsingClasses = async (mode = "sentences") => {
      const classes_pos = classifierData.classes_pos;
      const classes_neg = classifierData.classes_neg;
      if (!classes_pos || !classes_neg)
        return;

      // ensure we have embedded the page contents
      const pageEmbeddings = await getPageEmbeddings(mode)
      const splits = pageEmbeddings[mode].splits;
      const splitEmbeddings = pageEmbeddings[mode].embeddings;

      // compute embeddings of classes
      const allclasses = [...classes_pos, ...classes_neg]
      const result = await computeEmbeddingsLocal(allclasses, []);
      const classStore = result[0] as VectorStore;
      const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]))

      // mark sentences based on similarity
      let scores_diffs = [];
      let scores_plus = [];
      for (const i in splits) {
        const split = splits[i];

        // using precomputed embeddings
        const embedding = splitEmbeddings[split];
        const closest = await classStore.similaritySearchVectorWithScore(embedding, allclasses.length);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        scores_plus.push(score_plus);
        scores_diffs.push(score_plus - score_minus);

        let highlightanyway = false;

        // always highlight if similarity is above given value
        if (alwayshighlighteps > 0 && score_plus > alwayshighlighteps)
          highlightanyway = true;

        // ignore anything that is not distinguishable
        //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
        else if (!highlightanyway && (decisioneps > 0 && Math.abs(score_plus - score_minus) < decisioneps || minimalhighlighteps > 0 && score_plus < minimalhighlighteps)) {
          if (verbose) console.log("skipping", split, score_plus, score_minus)
          continue
        }

        // apply color if is first class
        if (score_plus > score_minus || highlightanyway) {
          if (verbose) console.log("mark", split, score_plus, score_minus)

          // get all text nodes
          const textNodes = textNodesUnderElem(document.body);

          // mark sentence
          let [texts, nodes] = findTextFast(textNodes, split);
          if (texts.length == 0) {
            [texts, nodes] = findTextSlow(textNodes, split);
            if (texts.length == 0) {
              if (verbose) console.log("ERROR: text not found", split)
            }
          }
          highlightText(texts, nodes, class2Id[closest[0][0].pageContent], closest[0][0].pageContent + " " + closest[0][1]);
        } else {
          if (verbose) console.log("reject", split, score_plus, score_minus)
        }

      }

      // finally, let's highlight all textnodes that are not highlighted
      const textNodes = textNodesNotUnderHighlight(document.body);
      textNodes.forEach(node => surroundTextNode(node, "normaltext"))

      setScores([scores_plus, scores_diffs])
    }


    // mark sentences based on retrieval
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

    return <HighlightStyler highlightSetting={highlightSetting} mode={mode} tabId={tabId}/>
};

export default Highlighter;