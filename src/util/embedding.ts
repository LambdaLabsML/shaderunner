import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import type { Embeddings, EmbeddingsParams } from "langchain/dist/embeddings/base";
const storage = new Storage()
const modelName = 'text-embedding-ada-002'
// TODO: turn off anonymized_telemetry here


export type Metadata = { "data-type": string, "url": string };

const DBNAME = "shaderunner";



// Utilize async/await syntax for cleaner code
async function collection_exists(dbName, storeName) {
  try {
    const request = indexedDB.open(dbName);
    const event = await promisifyRequest(request);
    const db = event.target.result;
    const storeExists = db.objectStoreNames.contains(storeName);
    const dbVersion = db.version || 0;
    return { storeExists, dbVersion };
  } catch (error) {
    console.error("Error opening database:", error);
    throw error; // Rethrow the error
  }
}

async function openDatabase(dbName, storeName, dbVersion = undefined) {
  try {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    const event = await promisifyRequest(request);
    return event.target.result;
  } catch (error) {
    console.error("IndexedDB error:", error);
    throw error;
  }
}

async function saveBulkData(db, storeName, keyValuePairs) {
  try {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const promises = [];

    for (const [key, data] of keyValuePairs) {
      promises.push(promisifyRequest(store.put(data, key)));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Error writing bulk data:", error);
    throw error;
  }
}

async function retrieveMultipleData(dbName, storeName, keys) {
  try {
    const db = await openDatabase(dbName, storeName);
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    const results = {};

    // Wait for all get requests to complete
    await Promise.all(keys.map(key => 
      new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          // Assign the result to the key. If key doesn't exist, value will be undefined
          results[key] = request.result;
          resolve();
        };
        request.onerror = () => {
          // Handle individual request errors, e.g., by setting the value to null
          results[key] = null;
          resolve(); // resolve even in case of error to allow other operations to continue
        };
      })
    ));

    return results;
  } catch (error) {
    console.error('Error retrieving data:', error);
    throw error; // Rethrow the error for the caller to handle
  }
}


// Helper function to convert IndexedDB requests to Promises
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}


/*async function getStoreFromDB(collectionName: string, splits: string[], embeddingfn) {
  const embeddings = await retrieveData(DBNAME, collectionName, splits)
  const classStore = new MemoryVectorStore(embeddings as Embeddings)
  classStore.memoryVectors = Object.values(embeddings);
  return classStore
}
*/


// check if embedding exists
async function embeddingExists(collectionName: string) {
    try {
      const {storeExists} = (await collection_exists(DBNAME, collectionName));
      return storeExists;
    } 
    catch (error) {
      return false;
    }
}


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(collectionName: string, splits: string[], dbname=DBNAME) {
  const api_key = await storage.get("OPENAI_API_KEY");
  const openaiembedding = new OpenAIEmbeddings({ openAIApiKey: api_key, modelName: modelName })

  // first try to get an existing collection
  let { storeExists, dbVersion } = dbname ? await collection_exists(dbname, collectionName) : {storeExists: false, dbVersion: "ignore"}

  // embeddings we want to have
  const split2embedding = storeExists ? await retrieveMultipleData(dbname, collectionName, splits) : Object.fromEntries(splits.map((s, i) => [s, null]));

  // check which sentences are not embedded, yet
  let missingsplits = Object.entries(split2embedding).filter(([s, embedding]) => embedding == null || embedding == undefined).map(([split, e]) => split);

  // if nothing is missing, we can directly return
  if (!missingsplits.length)
    return split2embedding;

  // else embed missing docs
  if (missingsplits.length) {
    const missingdocs = missingsplits.map((split, i) => new Document({ pageContent: split }))
    const missingembeddings = await openaiembedding.embedDocuments(missingsplits);
    let db = dbname ? await openDatabase(dbname, collectionName, dbVersion + (storeExists ? 0 : 1)) : null;
    const new_split2embedding = [];
    for (let i = 0; i < missingdocs.length; i++) {
      const split = missingdocs[i].pageContent;
      const embedding = missingembeddings[i];
      split2embedding[split] = embedding;
      new_split2embedding.push([split, embedding]);
    }
    if (dbname)
      await saveBulkData(db, collectionName, new_split2embedding);
  }

  return split2embedding;
}



function VectorStore_fromClass2Embedding(class2Embedding: { [s: string]: Number[]; } | ArrayLike<unknown>) {
  const embeddings = Object.entries(class2Embedding).map(([content, embedding]) => ({content, embedding}))
  const classStore = new MemoryVectorStore(embeddings);
  classStore.memoryVectors = Object.values(embeddings);
  return classStore;
}

// method: retrieval
// return await vectorStore.similaritySearchWithScore(method_data.query, method_data.k)


export { embeddingExists, computeEmbeddingsCached, VectorStore_fromClass2Embedding };