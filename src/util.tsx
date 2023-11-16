import { useState } from 'react';
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
const getActiveStatu = async (_url) => {
    const activeURLs = await storage.get("activeURLs") || {};
    const url = new URL(_url).hostname; // Normalize URL
    return url in activeURLs;
}


// react hook to get active status
const useActiveState = (_url) => {
  const [activeURLs] = useStorage("activeURLs", {})
  const url = new URL(_url).hostname; // Normalize URL
  const fullurl = window.location.hostname + window.location.pathname;
  return [fullurl, url in activeURLs];
}


// react hook to save in session Storage
export default function useSessionStorage(key, initialValue) {
  const [item, setInnerValue] = useState(() => {
    try {
      return window.sessionStorage.getItem(key)
        ? JSON.parse(window.sessionStorage.getItem(key))
        : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      setInnerValue(value);
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.log(e);
    }
  };

  return [item, setValue];
}


export { useSessionStorage, toggleActive, getActiveStatu, useActiveState };