import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import { findMainContent } from '../util/DOM'


// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => findMainContent()


// place it above the anchor
export const mountShadowHost: PlasmoMountShadowHost = ({
  shadowHost,
  anchor,
  mountState
}) => {
  anchor.element.prepend(shadowHost)
  mountState.observer.disconnect() // OPTIONAL DEMO: stop the observer as needed
}


// load style
import styleText from "data-text:../style.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


const MainContentAnchor = () => {
    return "";
};


export default MainContentAnchor;