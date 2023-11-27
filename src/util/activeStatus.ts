import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook";
const storage = new Storage()


// Toggle a URL's active status in a list
const toggleActive = async (_url) => {
    const url = new URL(_url).hostname; // Normalize URL
    const activeURLs = await storage.get("activeURLs") || {};
    const isActive = url in activeURLs;

    // Update the activeURLs object
    const newActiveURLs = isActive 
        ? Object.fromEntries(Object.entries(activeURLs).filter(([key]) => key !== url))
        : { ...activeURLs, [url]: true };

    await storage.set("activeURLs", newActiveURLs);
    return !isActive; // Return the new status
};


// check active status for a url
const getActiveStatus = async (_url) => {
    const activeURLs = await storage.get("activeURLs") || {};
    try {
        const url = new URL(_url).hostname; // Normalize URL
        return url in activeURLs;
    } catch(e) {
        return false;
    }
}

// check active status for a url
const setActiveStatus = async (_url: string, isActive: boolean) => {
    const url = new URL(_url).hostname; // Normalize URL
    const activeURLs = await storage.get("activeURLs") as {};
    await storage.set("activeURLs", { ...activeURLs, [url]: true });
}


// react hook to get active status
const useActiveState = (_url: string | Location | URL) => {
  const [activeURLs, setActiveURLs] = useStorage("activeURLs", {})
  const url = new URL(_url as URL).hostname; // Normalize URL
  const fullurl = window.location.hostname + window.location.pathname;
  const setActive = (active: Boolean) => setActiveURLs({ ...activeURLs, [url]: active });
  return [fullurl, url in activeURLs, setActive];
}



export { toggleActive, getActiveStatus, setActiveStatus, useActiveState };