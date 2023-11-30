import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import type { Embeddings } from "langchain/dist/embeddings/base";
const storage = new Storage()
const modelName = 'text-embedding-ada-002'
// TODO: turn off anonymized_telemetry here


export type Metadata = { "data-type": string, "url": string };

const DBNAME = "shaderunner";



async function db_exists(dbName, storeName) {
  return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onsuccess = function(event) {
          const db = event.target.result;
          const storeExists = db.objectStoreNames.contains(storeName);
          const dbVersion = db.version;
          console.log("db_exists, exists?", storeExists, ", version:", dbVersion);
          resolve({ storeExists, dbVersion });
      };

      request.onerror = function(event) {
          console.error("Error opening database:", event.target.error);
          reject(new Error("Error opening database"));
      };
  });
}


function openDatabase(dbName, storeName, dbVersion=undefined) {
  return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = function(event) {
        console.log("upgrade!", storeName)
          const db = event.target.result;
          if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
          }
      };

      request.onsuccess = function(event) {
        console.log("found!", storeName)
          resolve(event.target.result);
      };

      request.onerror = function(event) {
          reject(new Error("IndexedDB error: " + event.target.error));
      };
  });
}


async function saveData(dbName, storeName, key, data, newDBVersion) {
  const db = await openDatabase(dbName, storeName, newDBVersion);
  return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data, key);

      request.onsuccess = function() {
          resolve();
      };

      request.onerror = function(event) {
          reject(new Error("Error writing data: " + event.target.errorCode));
      };
  });
}


async function retrieveData(dbName, storeName, key) {
  const db = await openDatabase(dbName, storeName);
  return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = function(event) {
          resolve(event.target.result);
      };

      request.onerror = function(event) {
          reject(new Error("Error reading data: " + event.target.errorCode));
      };
  });
}


async function getStoreFromDB(collectionName: string, embeddingfn) {
  const embeddings = await retrieveData(DBNAME, collectionName, "embeddings")
  const classStore = new MemoryVectorStore(embeddings as Embeddings)
  classStore.memoryVectors = Object.values(embeddings);
  return classStore
}


async function saveStoreToDB(collectionName: string, store: MemoryVectorStore, newDBVersion: Number) {
  return await saveData(DBNAME, collectionName, "embeddings", store.memoryVectors, newDBVersion)
}



// check if embedding exists
async function embeddingExists(collectionName: string) {
    try {
      return (await db_exists(DBNAME, collectionName));
    } 
    catch (error) {
      return {storeExists: false, dbVersion: -1};
    }
}


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(collectionName: string, splits: string[], metadata_template: Metadata, method_data: { method: string; k?: number; query?: string; }) {
    const api_key = await storage.get("OPENAI_API_KEY");
    const openaiembedding = new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName})

    // embeddings we want to have
    let split2embedding = Object.fromEntries(splits.map((s, i) => [s, null]));

    // first try to get an existing collection
    let vectorStore;
    let isNew = false;

    let {storeExists, dbVersion} = await embeddingExists(collectionName)
    if (storeExists)
      vectorStore = await getStoreFromDB(collectionName, openaiembedding)
    
    // if that collection hasn't been filled, we fill it now
    else {
      console.log("compute & save embeddings for: ", collectionName)

      // create documents
      const docs = splits.map((split, i) => new Document({ metadata: metadata_template, pageContent: split}))
    
      // Compute embeddings
      vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        openaiembedding
      );
      await saveStoreToDB(collectionName, vectorStore, ++dbVersion);
      isNew = true;

      // method 1: retrieval
      if (method_data.method == "retrieval")
          return await vectorStore.similaritySearchWithScore(method_data.query, method_data.k)

    }

    // fill the mapping
    for (let i=0; i<vectorStore.embeddings.length; i++) {
      const embeddingObj = vectorStore.embeddings[i]
      if(!(embeddingObj.content in split2embedding)) continue;
      split2embedding[embeddingObj.content] = embeddingObj.embedding;
    }

    // check which sentences are not embedded, yet
    let missingsplits = isNew ? [] : Object.entries(split2embedding).filter(([split, embedding]) => embedding == null).map(([split, embedding]) => split);

    // if nothing is missing, we can directly return
    if (!missingsplits.length && method_data.method == "get_embeddings" )
        return split2embedding;

    if (method_data.method == "get_embeddings")
      console.log(missingsplits.length, "splits are missing. will compute & save embeddings for these now.")

    // else embed missing docs
    if (missingsplits.length) {
      const missingdocs = missingsplits.map((split, i) => new Document({ metadata: metadata_template, pageContent: split}))
      const missingembeddings = await openaiembedding.embedDocuments(missingsplits);
      vectorStore.addVectors(missingembeddings, missingdocs);
      for(let i=0; i<missingdocs.length; i++) {
        split2embedding[missingdocs[i].pageContent] = missingembeddings;
      }
      console.log("save missing")
      await saveStoreToDB(collectionName, vectorStore, ++dbVersion);
      console.log("saved missing")
    }

    // method 1: retrieval
    if (method_data.method == "retrieval")
        return await vectorStore.similaritySearchWithScore(method_data.query, method_data.k)

    // method 2: get all embeddings
    return split2embedding;
  }





// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsLocal(sentences: string[], metadata: Metadata[]) {
  const api_key = await storage.get("OPENAI_API_KEY");

  // Compute embeddings
  const vectorStore = await MemoryVectorStore.fromTexts(
    sentences,
    metadata,
    new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName})
  );
  const embeddings = {};
  for (let obj of vectorStore.memoryVectors) {
    embeddings[obj.content] = obj
  }

  return [ vectorStore, embeddings ];
}


export { computeEmbeddingsLocal, embeddingExists, computeEmbeddingsCached };