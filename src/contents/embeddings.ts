import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddings(sentences, metadata) {
  const api_key = await storage.get("OPENAI_API_KEY");

  //const modelName = 'text-similarity-davinci-001'
  const modelName = 'text-embedding-ada-002'

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


export { computeEmbeddings };