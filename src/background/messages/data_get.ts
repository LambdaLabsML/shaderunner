import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getData } from "~background/tabData";


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const tabId = req.body.tabId;
    const variables = req.body.variables;
    res.send(getData(tabId, variables))
}

export default handler