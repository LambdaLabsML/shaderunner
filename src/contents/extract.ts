const { Readability } = require('@mozilla/readability');

import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)



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


export { getMainContent, splitContent }