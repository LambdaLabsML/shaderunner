import type { PlasmoCSConfig } from "plasmo"
const { Readability } = require('@mozilla/readability');
import { textNodesUnderElem, findText, markSentence  } from './utilDOM'
import { computeEmbeddingsCached, computeEmbeddingsLocal } from './embeddings'
import { sendToBackground } from "@plasmohq/messaging"

import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)



/*
export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}
*/


// get main content parent element of page
const getMainContent = (clone = true) => {
  const reader = new Readability(clone ? document.cloneNode(true) : document);
  const article = reader.parse()
  return article || document.body;
}


// split content into paragraphs, sentences or words
const splitContent = (content, type, url) => {
  const doc = nlp(content)

  const splits = (type == "sentences") ? doc.sentences().out('array') : (type == "paragraphs") ? doc.paragraphs().map((p) => p.text()).views : (type == "terms") ? doc.terms().out('array') : new Error(`Cannot split into ${type}. (Not known)`);
  const metadata = splits.map(() => ({"url": url, "data-type": type}))

  return [ splits, metadata ];
}


/*
window.addEventListener("load", async () => {
  const url = window.location.hostname + window.location.pathname
  console.log("content script loaded for", url)

  // extract main content
  const mainEl = getMainContent(true);
  const splitsData = splitContent(mainEl.textContent, "sentences", url)

  return;

  // compute embeddings (uses cache if possible)
  const splitEmbeddings = (await sendToBackground({ name: "embedding", collectionName: url, data: splitsData })).embeddings

  // classes to use
  const classes = [["actual location", "place"], ["historic", "date"]]

  // compute embeddings of sentences & classes
  const allclasses = [...classes[0], ...classes[1]]
  const [classStore, classEmbeddings] = await computeEmbeddingsLocal(allclasses, [])

  //for (const sentence in sentenceEmbeddings) {
  console.log(splitsData)
  for (const i in splitsData[0]) {
    const split = splitsData[0][i];

    //if (i > 15)
    //  break;

    // using precomputed embeddings
    const embedding = splitEmbeddings[split];
    const closest = (await classStore.similaritySearchVectorWithScore(embedding, k = 1))[0];

    // apply color if is first class
    if (classes[0].includes(closest[0].pageContent)) {
      console.log("marking split:", split, closest)

      // get all text nodes
      const textNodes = textNodesUnderElem(document.body);

      // mark sentence
      const [texts, nodes] = findText(textNodes, split);
      markSentence(texts, nodes);

    }
  }
})
*/

export { getMainContent, splitContent }