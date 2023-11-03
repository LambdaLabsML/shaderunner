import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import { Chroma } from "langchain/vectorstores/chroma";

const modelName = 'text-embedding-ada-002'
const storage = new Storage()



// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(sentences, metadata, dbsettings) {
    const api_key = await storage.get("OPENAI_API_KEY");

    // create documents
    const docs = sentences.map((sentence, i) => new Document({ metadata: metadata[i], pageContent: sentence}))
  
    // Compute embeddings
    const vectorStore = await Chroma.fromDocuments(
      docs,
      new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName}),
      dbsettings
    );

    const embeddings = {};
    for (let obj of vectorStore.memoryVectors) {
      embeddings[obj.content] = obj
    }
  
    return [ vectorStore, embeddings ];
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


export { computeEmbeddingsLocal, computeEmbeddingsCached };