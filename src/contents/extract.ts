import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  //matches: ["<all_urls>"],
  matches: ["https://en.wikipedia.org/*"],
  all_frames: true
}


const extract_sentences = () => {
  console.log(window.location.hostname, window.location.pathname)
}


window.addEventListener("load", () => {
  console.log("very new content script loaded")

  extract_sentences()

  document.body.style.background = "pink"
})
