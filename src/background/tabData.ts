const tabData = {};
const tabListeners = {};


const sendMessage = (msg) => {
    try {
        chrome.runtime.sendMessage(msg)
    } catch (e) {}
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        tabs.forEach(tab => {
            try {
                chrome.tabs.sendMessage(tab.id, msg);
            } catch (e) { }
        })
    });
}


const registerListener = (tabId, variables, listenerId) => {
    if (!(tabId in tabListeners)) {
        tabListeners[tabId] = {};
    }
    tabListeners[tabId][listenerId] = new Set(variables);
    const update = tabData[tabId];
    sendMessage({action: "storage_listener_notify", tabId, update, listenerId})
};


const notifyListeners = (tabId, msg) => {
    if (!(tabId in tabData))
        tabData[tabId] = msg;
    else
        tabData[tabId] = {...tabData[tabId], ...msg};

    if (tabId in tabListeners) {
        Object.entries(tabListeners[tabId]).forEach(([listenerId, vars]) => {
            const update = {};
            let any = false;
            vars.forEach(varName => {
                if (varName in msg) {
                    any = true;
                    update[varName] = msg[varName];
                }
            });
            if (!any) return;
            sendMessage({action: "storage_listener_notify", tabId, update, listenerId})
        });
    }
};


const getData = (tabId, variables) => {
    return Object.fromEntries(variables.map(v => [v,tabData[tabId] ? tabData[tabId][v] : undefined]))
}



export { registerListener, notifyListeners, getData };