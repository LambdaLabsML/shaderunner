import type { PlasmoCSConfig } from "plasmo"
const { Readability } = require('@mozilla/readability');
import nlp from 'compromise'

export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}


const extract_sentences = () => {
  console.log(window.location.hostname, window.location.pathname)

  // extract main content of that page
  const reader = new Readability(document.cloneNode(true));
  const article = reader.parse()
  const mainContent = article ? article.textContent : document.body.textContent;

  // split to senteces
  const doc = nlp(mainContent)
  const sentences = doc.sentences().out('array')
  console.log(sentences);
}


window.addEventListener("load", () => {
  console.log("1 very new content script loaded")

  extract_sentences()

  document.body.style.background = "pink"
})
