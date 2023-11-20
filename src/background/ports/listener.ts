import type { PlasmoMessaging } from "@plasmohq/messaging"
import { registerListener } from "~background/tabData";


const handler: PlasmoMessaging.PortHandler = async (req, res) => {
    const tabId = req.body.tabId;
    registerListener(tabId, (update) => res.send(update));
}

export default handler