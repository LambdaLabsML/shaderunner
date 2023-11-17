import type { PlasmoGetInlineAnchor } from "plasmo"
import { useState } from "react";

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => document.querySelector("body")

// load style
import styleText from "data-text:../style.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

const FloatingMount = () => {
    const [pos, setPos] = useState({ x: 20, y: 20 });

    const handleMouseDown = (event) => {
        const rect = event.target.getBoundingClientRect();

        // Compute the initial offset inside the element where the mouse was clicked
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        const handleMouseMove = (moveEvent) => {
            setPos({ x: moveEvent.clientX - offsetX, y: moveEvent.clientY - offsetY });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // enable dragable: onMouseDown={handleMouseDown} && style={{ position: "fixed" top: pos.y, left: pos.x }}
    return "";
}

export default FloatingMount