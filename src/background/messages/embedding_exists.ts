import type { PlasmoMessaging } from "@plasmohq/messaging"
import { embeddingExists } from "~util/embedding";
import { simpleHash } from "~util/misc"


type RequestBody = {
    collectionName: string
};

 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const body = req.body as RequestBody;
    res.send(await embeddingExists(simpleHash(body.collectionName)))
}

export default handler;