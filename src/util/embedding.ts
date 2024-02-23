import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import { extractSplits } from "./extractContent";
import { db } from "~db";
const storage = new Storage()
const modelName = 'text-embedding-3-small'

export type Metadata = { "data-type": string, "url": string };

const DBNAME = "shaderunner";


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(source: string, splits: string[], dbname=DBNAME) {
  const openaiembedding = new OpenAIEmbeddings({ openAIApiKey: await storage.get("OPENAI_API_KEY"), modelName: modelName })

  // remember accessed date for the source
  db.updateLastAccessDate(source);

  // embeddings we want to have
  const split2embedding = await db.getEmbeddingsForStrings(splits);

  // check which sentences are not embedded, yet
  const missingsplits = splits.filter(split => !(split in split2embedding));

  // if nothing is missing, we can directly return
  if (!missingsplits.length)
    return split2embedding;

  // else embed missing docs
  if (missingsplits.length) {
    const missingdocs = missingsplits.map((split, i) => new Document({ pageContent: split }))
    const missingembeddings = await openaiembedding.embedDocuments(missingsplits);
    const new_split2embedding = {};
    for (let i = 0; i < missingdocs.length; i++) {
      const split = missingdocs[i].pageContent;
      const embedding = missingembeddings[i];
      split2embedding[split] = embedding;
      new_split2embedding[split] = embedding;
    }
    await db.saveEmbeddings(new_split2embedding, source);
  }

  return split2embedding;
}


// ensure page embeddings exist
const getPageEmbeddings = async (mainelement: HTMLElement, url: string, mode = "sentences", onStatus = (status: [string, Number, string?]) => { }, onEmbeddingUpdate = (embeddingData) => {}) => {

  // if not in cache, check if database has embeddings
  const exists = await db.sourceExists(url)
  const status_msg = exists ? "found database" : "";
  await onStatus(["computing", 0, status_msg])

  // extract main content & generate splits
  const splits = extractSplits(mode, mainelement)

  // retrieve embedding (either all at once or batch-wise)
  let splitEmbeddings = {};
  const batchSize = exists ? 256 : 64;
  for (let i = 0; i < splits.length; i += batchSize) {
    const splitEmbeddingsBatch = await computeEmbeddingsCached(url as string, splits.slice(i, i + batchSize))
    splitEmbeddings = { ...splitEmbeddings, ...splitEmbeddingsBatch };
    await onStatus(["computing", Math.floor(i / splits.length * 100), status_msg])
    onEmbeddingUpdate({ splits: splits.slice(0, i + batchSize), splitEmbeddings, mode });
  }
  await onStatus(["loaded", 100])
}



function VectorStore_fromClass2Embedding(class2Embedding: { [s: string]: Number[]; } | ArrayLike<unknown>) {
  const embeddings = Object.entries(class2Embedding).map(([content, embedding]) => ({content, embedding}))
  const classStore = new MemoryVectorStore(embeddings as any);
  classStore.memoryVectors = Object.values(embeddings) as any;
  return classStore;
}


export { computeEmbeddingsCached, VectorStore_fromClass2Embedding, getPageEmbeddings };