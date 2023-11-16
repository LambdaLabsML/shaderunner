import { toggleActive, getActiveStatu } from "~util";


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