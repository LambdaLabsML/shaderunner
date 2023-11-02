import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"
 
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}


window.addEventListener("load", async () => {
    const storage = new Storage()
    const url = window.location.hostname
    await storage.set("current_url", url)
})
