const tabData = {};
const tabListeners = {};


const notifyListeners = (tabId, msg) => {
    if(!(tabId in tabData))
        tabData[tabId] = msg;
    else
        tabData[tabId] = {...tabData[tabId], ...msg};
    if (!(tabId in tabListeners)) return;
    tabListeners[tabId] = tabListeners[tabId].filter(fn => {
        try {
            fn(msg);
            return true;
        } catch (e) {
            return false;
        }
    });
}


const registerListener = (tabId, update_fn) => {
    if (tabId in tabListeners)
        tabListeners[tabId].push(update_fn);
    else
        tabListeners[tabId] = [update_fn];
    update_fn(tabData[tabId])
}


const getData = (tabId, variables) => {
    //variables.push("_ver")
    return Object.fromEntries(variables.map(v => [v,tabData[tabId] ? tabData[tabId][v] : undefined]))
}



export { registerListener, notifyListeners, getData };