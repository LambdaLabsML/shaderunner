import type { PlasmoCSConfig } from "plasmo"
const { Readability } = require('@mozilla/readability');
import { textNodesUnderElem, findSentence, markSentence  } from './utilDOM'
import { computeEmbeddings } from './embeddings'

import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)


export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}


// get main content parent element of page
const getMainContent = (clone = true) => {
  const reader = new Readability(document.cloneNode(clone));
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


window.addEventListener("load", async () => {
  const url = window.location.hostname + window.location.pathname
  console.log("content script loaded for", url)

  // extract main content
  const mainEl = getMainContent(true);
  const splitsData = splitContent(mainEl.textContent, "sentences", url)

  // classes to use
  //const classes = ["is a sentence", "is a single word"];
  //const classes = ["cosine"];
  //const classes = ["math sentence", "normal text"];
  //const classes = ["name, a person, personal pronouns, person's carrer", "a thing, it"];
  //const classes = ["time, date, year, month, day", "not mentioning a date or time, no historical data"];
  //const classes = ["specific space discovery that is non-biographic", "biography, something that happened on earth"];
  //const classes = ["food, cajun, taste", "weather, etymology, economy, business, history, music"]
  const classes = ["actual location", "place", "historic", "date"]
  const classes2 = [["actual location", "place"], ["historic", "date"]]
  //const classes = ["job title"]//, "normal text"]
  //const classes = ["", ""];

  const [sentences, metadata ] = splitContent(mainEl.textContent, "paragraphs", url)
  const sentence = sentences[5];
  console.log(sentence);
  const textNodes = textNodesUnderElem(document.body);
  const [texts, nodes] = findSentence(textNodes, sentence);
  //console.log(texts)
  markSentence(texts, nodes);
  return;

  // compute embeddings of sentences & classes
  const [sentenceStore, sentenceEmbeddings] = await computeEmbeddings(sentences, metadata)
  const [classStore, classEmbeddings] = await computeEmbeddings(classes, [])

  // FOR DEBUGGING
  console.log(sentenceStore, sentenceEmbeddings);
  console.log(classStore, classEmbeddings);

  //for (const sentence in sentenceEmbeddings) {
  for (const i in sentences) {
    const sentence = sentences[i];

    //if (i > 15)
    //  break;

    // using precomputed embeddings
    const embedding = sentenceEmbeddings[sentence].embedding
    const closest = (await classStore.similaritySearchVectorWithScore(embedding, k = 1))[0];

    // using sentence
    //const closest = (await classStore.similaritySearchWithScore(sentence, k = 1))

    // apply color if is first class
    if (classes2[0].includes(closest[0].pageContent)) {
    //if (closest[0].pageContent == classes[0]) {
    //if (closest[1] > 0.77) {
      console.log("marking sentence:", sentence, closest)

      // get all text nodes
      const textNodes = textNodesUnderElem(document.body);

      // mark sentence
      const [texts, nodes] = findSentence(textNodes, sentence);
      markSentence(texts, nodes);

    }
  }
})
