import { Storage } from "@plasmohq/storage"
const storage = new Storage()


// toggle url from active list
const toggleActive = async (url) => {
    const activeURLs = (await storage.get("activeURLs")) || {}

    if (activeURLs[url])
        activeURLs[url] = !activeURLs[url];
    else
        activeURLs[url] = true;

    await storage.set("activeURLs", activeURLs)

    return activeURLs[url]
};


// toggle active status when clicking plugin icon
chrome.action.onClicked.addListener(async (tab) => {
    const url = new URL(tab.url).hostname;
    const newStatus = await toggleActive(url);
    chrome.action.setBadgeText({
        text: newStatus ? "ON" : "OFF"
    });
})

// on tab change, update the plugin icon
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, async function(tab) {
        const url = new URL(tab.url).hostname;
        const activeURLs = (await storage.get("activeURLs")) || {}
        chrome.action.setBadgeText({
            text: activeURLs[url] ? "ON" : "OFF"
        });
    });
})

// on startup, update the plugin icon
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs.length == 0) return;
    const tab = tabs[0];
    const url = new URL(tab.url).hostname;
    const activeURLs = (await storage.get("activeURLs")) || {}
    chrome.action.setBadgeText({
        text: activeURLs[url] ? "ON" : "OFF"
    });
});