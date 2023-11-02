import type { PlasmoMessaging } from "@plasmohq/messaging"
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Storage } from "@plasmohq/storage"
import { Document } from "langchain/document";
import { Chroma } from "langchain/vectorstores/chroma";
import { ChromaClient } from "chromadb";

const modelName = 'text-embedding-ada-002'
const storage = new Storage()
const chromaclient = new ChromaClient({fetchOptions:{anonymized_telemetry: false}})



function simpleHash(inputString) {
  //const length = 63
  const length = 32
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const charCode = inputString.charCodeAt(i);
    hash += charCode;
  }

  // Repeat the hash value to achieve the desired length
  let result = '';
  while (result.length < length) {
    result += hash.toString();
  }

  return result.substring(0, length);
}




// given a list of sentences & metadata compute embeddings, retrieve / store them
async function computeEmbeddingsCached(collectionName, splits, metadata) {
    const api_key = await storage.get("OPENAI_API_KEY");
    const openaiembedding = new OpenAIEmbeddings({openAIApiKey:api_key, modelName:modelName})

    let collection;

    // first try to get an existing collection
    try {
      collection = await chromaclient.getCollection({name: collectionName, embeddingFunction: openaiembedding})
    } 
    
    // if that collection hasn't been filled, we fill it now
    catch (error) {
      console.log("compute & save embeddings for: ", collectionName)

      // create documents
      const docs = splits.map((split, i) => new Document({ metadata: metadata[i], pageContent: split}))

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
    
      // Compute embeddings
      let vectorStore = await Chroma.fromDocuments(
        docs,
        openaiembedding,
        chromaSettings
      );
      collection = vectorStore.collection;
    }

    // now get all embeddings
    const result = await collection.get({include: ["embeddings", "documents"]})
    console.log("result", result)

    const embeddings = {};
    for (let i=0; i<result.documents.length; i++) {
      embeddings[result.documents[i]] = result.embeddings[i]
    }
    console.log("embeddings", embeddings)
  
    return embeddings;
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


 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("background", req);
  //const message = await querySomeApi(req.body.id)
  
 
  res.send({
    "embeddings": await computeEmbeddingsCached(simpleHash(req.collectionName), ...req.data)
  })
}
 
export default handler