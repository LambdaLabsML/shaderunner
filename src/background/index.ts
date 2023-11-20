import defaults from "~defaults";
import { toggleActive, getActiveStatus, setActiveStatus } from "~util/activeStatus";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


// set plugin icon status badge
const setIconBadge = async (active) => {
    chrome.action.setBadgeText({
        text: active ? "ON" : "OFF"
    });
}

// due to a bug sidePanel.open cannot be called after an async operation (https://bugs.chromium.org/p/chromium/issues/detail?id=1478648)
// thus, we save active status globally and use the async operation after chrome.sidePanel.open
const activeTabs = {}

// on tab change, update the plugin icon & active status
const tabUpdated = tabId => {
    chrome.tabs.get(tabId, async function(tab) {
        const isActive = await getActiveStatus(tab.url)
        activeTabs[tabId] = isActive;
        await setIconBadge(isActive)
    });
}
chrome.tabs.onActivated.addListener(activeInfo => tabUpdated(activeInfo.tabId))
chrome.tabs.onUpdated.addListener(tabUpdated)
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId in activeTabs)
        delete activeTabs[tabId];
})

// on startup, update the plugin icon
/*chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs.length == 0 || !tabs[0].url) return;
    await setIconBadge(await getActiveStatus(tabs[0].url))
});*/

// toggle active status when clicking plugin icon
// open sidePanel if settings requires so
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url) return;
    const tabId = tab.id;
    if (tabId in activeTabs) {
        if(!activeTabs[tabId]) {
            chrome.sidePanel.open({ windowId: tab.windowId });
        } else {
            await chrome.sidePanel.setOptions({
                tabId,
                enabled: false
            });
            await chrome.sidePanel.setOptions({
                tabId,
                path: 'sidepanel.html',
                enabled: true
            });
        }
    } else
        chrome.sidePanel.open({ windowId: tab.windowId });
    const newStatus = await toggleActive(tab.url);
    activeTabs[tabId] = newStatus;
    await setIconBadge(newStatus);
})

// ensure settinngs exist upon installation
chrome.runtime.onInstalled.addListener(async (details) => {

    // overwrite defaults
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


// add context menu "open side pannel"
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'openSidePanel',
        title: 'Open side panel',
        contexts: ['all']
    });
});

// open side panel when context menu is clicked
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'openSidePanel') {
        chrome.sidePanel.open({ windowId: tab.windowId });
        await setActiveStatus(tab.url, true);
    }
});