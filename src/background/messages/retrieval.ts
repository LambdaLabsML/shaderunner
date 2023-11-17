import type { PlasmoMessaging } from "@plasmohq/messaging"
import { computeEmbeddingsCached } from "~util/embedding";
import { simpleHash } from "~util/misc"
import type { Metadata } from "../../util/extractContent"
 

type RequestBody = {
  collectionName: string
  splits: string[],
  metadata: Metadata[],
  method: string,
  k: number,
  query: string
};


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as RequestBody;
  res.send(await computeEmbeddingsCached(simpleHash(body.collectionName), body.splits, body.metadata, {"method": "retrieval", "k": body.k, "query": body.query}))
}

export default handler;