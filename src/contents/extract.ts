import type { PlasmoCSConfig } from "plasmo"
const { Readability } = require('@mozilla/readability');
import nlp from 'compromise'
import { textNodesUnderElem, findSentence, markSentence  } from './utilDOM'
import { computeEmbeddings } from './embeddings'



export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}


window.addEventListener("load", async () => {
  console.log("content script loaded")
  return;

  // extract main content
  const reader = new Readability(document.cloneNode(true));
  const article = reader.parse()
  const mainEl = article || document.body;
  const content = mainEl.textContent;

  // split to senteces
  const doc = nlp(content)
  const sentences = doc.sentences().out('array')
  const metadata = sentences.map(() => ({"url": url, "data-type": "sentence"}))
  return;

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
