import type { PlasmoMessaging } from "@plasmohq/messaging"
import { notifyListeners } from "~background/tabData";
 

const handler: PlasmoMessaging.PortHandler = async (req, res) => {
    const tabId = req.body.tabId;
    if (!tabId) throw "Listener cannot be notified without tabId." 
    notifyListeners(tabId, req.body)
}

export default handler