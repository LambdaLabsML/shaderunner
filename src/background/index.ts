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