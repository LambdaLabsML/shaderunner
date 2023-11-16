import defaults from "~defaults";
import { toggleActive, getActiveStatu } from "~util";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


// set plugin icon status badge
const setIconBadge = async (active) => {
    chrome.action.setBadgeText({
        text: active ? "ON" : "OFF"
    });
}


// toggle active status when clicking plugin icon
chrome.action.onClicked.addListener(async (tab) => {
    const newStatus = await toggleActive(tab.url);
    await setIconBadge(newStatus);

})


// on tab change, update the plugin icon
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, async function(tab) {
        await setIconBadge(await getActiveStatu(tab.url))
    });
})


// on startup, update the plugin icon
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs.length == 0) return;
    await setIconBadge(await getActiveStatu(tabs[0].url))
});


// ensure settinngs exist upon installation
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        if (process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent") return;
        console.log("Setting default settings.");
        Object.entries(defaults).forEach(async (v, i) => {
            const [key, value] = v;
            return (await storage.set(key, value));
        })
    } 
    if (details.reason === 'update') {
        console.log("Update! Settings set to default.");
    }
});