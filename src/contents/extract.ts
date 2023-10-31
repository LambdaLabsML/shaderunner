import type { PlasmoCSConfig } from "plasmo"
const { Readability } = require('@mozilla/readability');
import nlp from 'compromise'

export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}


function textNodesUnder(el){
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}


function splitIntoWords(str) {
  // The regex pattern \w+ matches one or more alphanumeric characters
  // The pattern \S matches any non-whitespace character
  // Combining both patterns with the | (OR) operator will match either words or individual non-whitespace characters
  return str.match(/\w+|\s+|\S/g) || [];
}


function findSentence(textNodes, sentence_str) {
  const results = [];
  const domElements = [];
  const sentence = splitIntoWords(sentence_str)

  // find textNode-interval that contains the sentence
  let pos_sentence = 0;
  let nodes = []; // the text nodes containing the sentence
  let texts = []; // the actual strings contained in each text node
  textNodeLoop:
  for (let i = 0; i < textNodes.length && pos_sentence < sentence.length; i++) {
    const node = textNodes[i];
    const textContent = splitIntoWords(node.textContent);

    // get index of first word
    const word = sentence[pos_sentence];
    const wordIndex = textContent.indexOf(word);

    // if starting word not found in same node, we haven't found the actual sentence
    // i.e. restart search with next node
    if (wordIndex < 0) {
      pos_sentence = 0;
      nodes = [];
      texts = [];
      continue textNodeLoop;
    }

    // we found already one word from the sentence
    texts.push(word)
    nodes.push(node)
    pos_sentence += 1;

    // otherwise check equalness of all succeeding words
    for (let j = 1; pos_sentence < sentence.length && wordIndex + j < textContent.length; j++) {
      const word = sentence[pos_sentence]

      // if the next word of the node differs from the sentence, we haven't found the actual sentence
      // i.e. restart search with next node
      if (word != textContent[wordIndex + j]) {
        pos_sentence = 0;
        nodes = [];
        texts = [];
        continue textNodeLoop;
      }

      // we found a word from the sentence
      //nodes.push(node)
      texts[texts.length-1] += word
      pos_sentence += 1;

    }
  }

  return [texts, nodes];
}

window.addEventListener("load", async () => {
  console.log("1 very new content script loaded")

  // extract main content
  const reader = new Readability(document.cloneNode(true));
  const article = reader.parse()
  const mainEl = article || document.body;
  const content = mainEl.textContent;

  // get all text nodes
  const textNodes = textNodesUnder(document.body);

  // split to senteces
  const doc = nlp(content)
  const sentences = doc.sentences().out('array')
  console.log(sentences);

  // mark sentence
  console.log(findSentence(textNodes, sentences[5]));


  return;



})
