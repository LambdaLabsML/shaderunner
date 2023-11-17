import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import { Chroma } from "langchain/vectorstores/chroma";
import { ChromaClient } from "chromadb";
const storage = new Storage()
const modelName = 'text-embedding-ada-002'
const chromaclient = new ChromaClient() as any
// TODO: turn off anonymized_telemetry here







// check if embedding exists
async function embeddingExists(collectionName) {
    try {
      const api_key = await storage.get("OPENAI_API_KEY");
      const openaiembedding = new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName})
      await chromaclient.getCollection({name: collectionName, embeddingFunction: openaiembedding})
      return true;
    } 
    catch (error) {
      return false;
    }
}


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(collectionName, splits, metadata, method_data) {
    const api_key = await storage.get("OPENAI_API_KEY");
    const openaiembedding = new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName})

    // chroma settings of the new collection
    const chromaSettings = {
      collectionName: collectionName,
      url: "http://localhost:8000",
      collectionMetadata: {
        "hnsw:space": "cosine",
        "creation-time": Date.now(),
      },
      index: chromaclient
    };


    // first try to get an existing collection
    let collection;
    let vectorStore;
    try {
      collection = await chromaclient.getCollection({name: collectionName, embeddingFunction: openaiembedding})
    } 
    
    // if that collection hasn't been filled, we fill it now
    catch (error) {
      console.log("compute & save embeddings for: ", collectionName)

      // create documents
      const docs = splits.map((split, i) => new Document({ metadata: metadata[i], pageContent: split}))
    
      // Compute embeddings
      vectorStore = await Chroma.fromDocuments(
        docs,
        openaiembedding,
        chromaSettings
      );
      collection = vectorStore.collection;

      // method 1: retrieval
      if (method_data.method == "retrieval")
          return await vectorStore.similaritySearchWithScore(method_data.query, method_data.k)

    }

    // now get all embeddings
    const result = await collection.get({include: ["embeddings", "documents"]})
    const embeddings = {};
    for (let i=0; i<result.documents.length; i++) {
      embeddings[result.documents[i]] = result.embeddings[i]
    }

    // check which sentences are not embedded, yet
    let missingsplits = [];
    let missingmetadata = [];
    for(let i=0; i<splits.length; i++) {
      const split = splits[i];
      if (embeddings[split]) continue;
      missingsplits.push(split);
      missingmetadata.push(metadata[i]);
    }

    // if nothing is missing, we can return
    if (!missingsplits.length && method_data.method == "get_embeddings" )
        return embeddings;

    if (method_data.method == "get_embeddings")
      console.log(missingsplits.length, "splits are missing. will compute & save embeddings for these now.")

    // else embed missing docs
    const missingdocs = missingsplits.map((split, i) => new Document({ metadata: missingmetadata[i], pageContent: split }))
    vectorStore = await Chroma.fromDocuments(
      missingdocs,
      openaiembedding,
      chromaSettings
    );

    // method 1: retrieval
    if (method_data.method == "retrieval")
        return await vectorStore.similaritySearchWithScore(method_data.query, method_data.k)

    // method 2: get all embeddings
    const result2 = await collection.get({include: ["embeddings", "documents"]})
    const embeddings2 = {};
    for (let i=0; i<result2.documents.length; i++) {
      embeddings2[result2.documents[i]] = result2.embeddings[i]
    }

    return embeddings2;
  }





// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsLocal(sentences, metadata) {
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