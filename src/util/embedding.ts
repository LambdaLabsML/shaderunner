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



async function collection_exists(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onsuccess = function (event) {
      const db = event.target.result;
      const storeExists = db.objectStoreNames.contains(storeName);
      const dbVersion = db.version || 0;
      resolve({ storeExists, dbVersion });
    };

    request.onerror = function (event) {
      console.error("Error opening database:", event.target.error);
      reject(new Error("Error opening database"));
    };
  });
}


function openDatabase(dbName, storeName, dbVersion = undefined) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(new Error("IndexedDB error: " + event.target.error));
    };
  });
}


async function saveData(db, storeName, key, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data, key);

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function (event) {
      reject(new Error("Error writing data: " + event.target.errorCode));
    };
  });
}


async function retrieveMultipleData(dbName, storeName, keys) {
  try {
      // Open the database
      const db = await openDatabase(dbName, storeName);
      // Start a new transaction
      const transaction = db.transaction([storeName], 'readonly');
      // Get the object store
      const store = transaction.objectStore(storeName);

      // Use a map to store the results
      const results = {};

      // Await the completion of all get requests
      await Promise.all(keys.map(key => 
          new Promise(resolve => {
              const request = store.get(key);
              request.onsuccess = () => {
                  // If key doesn't exist, set value to null or undefined
                  results[key] = request.result;
                  resolve();
              };
              request.onerror = () => {
                  // Handle errors, e.g., by setting the value to null
                  results[key] = null;
                  resolve();
              };
          })
      ));

      return results;
  } catch (error) {
      console.error('Error retrieving data:', error);
      throw error; // Rethrow the error for caller to handle
  }
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
      return {storeExists: false, dbVersion: -1};
    }
}


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(collectionName: string, splits: string[]) {
  const api_key = await storage.get("OPENAI_API_KEY");
  const openaiembedding = new OpenAIEmbeddings({ openAIApiKey: api_key, modelName: modelName })

  // first try to get an existing collection
  let { storeExists, dbVersion } = await collection_exists(DBNAME, collectionName)

  // embeddings we want to have
  const split2embedding = storeExists ? await retrieveMultipleData(DBNAME, collectionName, splits) : Object.fromEntries(splits.map((s, i) => [s, null]));

  // check which sentences are not embedded, yet
  let missingsplits = Object.entries(split2embedding).filter(([s, embedding]) => embedding == null || embedding == undefined).map(([split, e]) => split);
  console.log("test", storeExists, missingsplits.length, splits)

  // if nothing is missing, we can directly return
  if (!missingsplits.length)
    return split2embedding;

  // else embed missing docs
  if (missingsplits.length) {
    const missingdocs = missingsplits.map((split, i) => new Document({ pageContent: split }))
    const missingembeddings = await openaiembedding.embedDocuments(missingsplits);
    console.log(collectionName, storeExists, dbVersion)
    const db = await openDatabase(DBNAME, collectionName, dbVersion + 1);
    for (let i = 0; i < missingdocs.length; i++) {
      const split = missingdocs[i].pageContent;
      const embedding = missingembeddings[i];
      split2embedding[split] = embedding;
      await saveData(db, collectionName, split, embedding);
    }
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