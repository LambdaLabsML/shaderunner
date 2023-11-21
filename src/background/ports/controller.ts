import type { PlasmoMessaging } from "@plasmohq/messaging"
import { notifyListeners } from "~background/tabData";
 

const handler: PlasmoMessaging.PortHandler = async (req, res) => {
    const {_tabId, _who, ...body}= req.body;
    if (!_tabId) throw "Listener cannot be notified without tabId." 
    notifyListeners(_tabId, body)
}

export default handler