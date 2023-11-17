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


// toggle active status when clicking plugin icon
chrome.action.onClicked.addListener(async (tab) => {
    const newStatus = await toggleActive(tab.url);
    await setIconBadge(newStatus);

})


// on tab change, update the plugin icon
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, async function(tab) {
        const isActive = await getActiveStatus(tab.url)
        await setIconBadge(isActive)
    });
})


// on startup, update the plugin icon
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs.length == 0) return;
    await setIconBadge(await getActiveStatus(tabs[0].url))
});


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
/*
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
*/


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

/*
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, async function(tab) {
        if (!tab.url) return;
        console.log("update", tab.url, tab)
        const isActive = await getActiveStatus(tab.url);
        const tabId = tab.id;
        console.log("isActive", isActive)
        if (isActive) {
            await chrome.sidePanel.setOptions({
                tabId,
                path: 'sidepanel.html',
                enabled: true
            });
        } else {
            await chrome.sidePanel.setOptions({
                tabId,
                enabled: false
            });
        }
    })
});
*/