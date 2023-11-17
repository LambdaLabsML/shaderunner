import { Readability } from '@mozilla/readability';

import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)


type Metadata = {
  url: string,
  "data-type": string
}


// get main content parent element of page
const getMainContent = (clone = true) => {
  const reader = new Readability(clone ? document.cloneNode(true) as Document : document);
  const article = reader.parse()
  return article || document.body;
}


// split content into paragraphs, sentences or words
const splitContent = (content: string, type: string, url: string | boolean) : [string[], Metadata[]] => {
  const doc = nlp(content)

  const splits = (type == "sentences") ? doc.sentences().out('array') : (type == "paragraphs") ? (doc as any).paragraphs().map((p) => p.text()).views : (type == "terms") ? doc.terms().out('array') : new Error(`Cannot split into ${type}. (Not known)`);
  const metadata = splits.map(() => ({"url": url, "data-type": type}))

  return [ splits, metadata ];
}


export { getMainContent, splitContent };
export type { Metadata };
