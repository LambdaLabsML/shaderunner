import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import React, { useState } from 'react';
import Logo from 'data-url:./icon.png';
import { findText, getMainContent, splitContent } from './extract'
import { textNodesUnderElem, findText, markSentence  } from './utilDOM'
import { computeEmbeddingsCached, computeEmbeddingsLocal } from './embeddings'
import { sendToBackground } from "@plasmohq/messaging"
 
// where to place the element
export const getInlineAnchor: PlasmoGetInlineAnchor = async () =>
  document.querySelector("main")
 

// place it above the anchor
export const mountShadowHost: PlasmoMountShadowHost = ({
  shadowHost,
  anchor,
  mountState
}) => {
  anchor.element.appendChild(shadowHost)
  mountState.observer.disconnect() // OPTIONAL DEMO: stop the observer as needed
}

// load style
import styleText from "data-text:./shaderunner.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// let arrays have a random sample method
Array.prototype.random = function () {
  return this[Math.floor((Math.random()*this.length))];
}

// messages
const MSG_CONTENT = [
  "Harvesting pixels from the digital garden...",
  "Seducing the HTML to spill the beans...",
  "Tickling the website until it laughs out all its content...",
  "Giving the webpage a gentle shake to dislodge loose text...",
  "Whispering sweet nothings to the server to get the good stuff...",
  "On a digital safari, hunting for the elusive text nodes...",
  "Bribing the CSS to let the text come out and play...",
  "Distracting the JavaScript while I pocket the sentences...",
  "Conducting a séance to summon the spirit of the content...",
  "Cracking the webpage like a piñata to gather the sweet, sweet text...",
  "Diving into the code soup to fish out some sentences...",
  "Charmingly persuading the paragraphs to come forth...",
  "Performing a textual heist on the website's vault...",
  "Engaging in a staring contest with the webpage until it blinks out content...",
  "Scouring the digital depths for sunken sentences..."
]


const MSG_EMBED = [
  "Training my digital minions to turn text into secret codes...",
  "Teaching the alphabet to dance in vector space...",
  "Whispering to the words until they turn into vectors...",
  "Putting sentences on the treadmill to shape them into embeddings...",
  "Waving my magic wand to transform text into numerical spells...",
  "Sending words on a space mission to become vectors...",
  "Baking a batch of text cookies, waiting for them to come out as vectors...",
  "Turning the library of Babel into a vector art gallery...",
  "Hiring ants to carry bits of text into the database picnic...",
  "Tuning into the matrix to convert texts to their digital avatars...",
  "Sprinkling some AI magic dust on sentences to get them database-ready...",
  "Casting a spell to teleport text to the realm of vectors...",
  "Concocting a potion to transmute paragraphs into vector potions...",
  "Asking the words nicely to line up as vectors in the database queue...",
  "Tossing text into the Fountain of Vectors and fishing out embeddings..."
]


const MSG_QUERY2CLASS = [
  "Playing 20 Questions with the LLM to pinpoint your interest's perfect match...",
  "Summoning the sorting hat to segregate your keen interests from the no-gos...",
  "Consulting the wise old LLM to discern scrolls of interest from scrolls of indifference...",
  "Brewing a potion from your queries to distill the essence of your interests...",
  "Instructing my AI crystal ball to sift your interests from the sands of search queries...",
  "Urging the digital oracle to reveal the sacred texts of your genuine interests...",
  "Casting user queries into the cauldron to conjure a spell of pure interest...",
  "Hosting an AI game show where only the most interesting queries take the prize...",
  "Setting up a digital salon where your interests get the VIP seats...",
  "Teaching the AI to pan for gold in the river of your queries to find the nuggets of interest...",
  "Summoning the AI genie from the lamp to sort your interests like treasures from tales of old...",
  "Using Jedi mind tricks to coax the LLM into disclosing your innermost digital desires...",
  "Embarking on a deep-sea dive with the LLM to surface your true interests...",
  "Playing Cupid to match your queries with the interests they seek...",
  "Inviting the LLM to a high-stakes game of poker, betting on revealing your true interests..."
]


// the actual shaderunner bar
const ShadeRunnerBar = () => {
    const [ highlightQuery, setHighlightQuery ] = useState("");
    const [ statusMsg, setStatusMsg ] = useState([]);
    const [ isThinking, setIsThinking ] = useState(false);

    const statusAdd = (msg) => setStatusMsg((old) => [...old, msg]);
    const statusClear = () => setStatusMsg([]);
    const statusAppend = (msg, i) => setStatusMsg(old => {
        const newStatus = [...old];
        newStatus[i] = newStatus[i] + msg;
        return newStatus;
    })

    const onEnterPress = async (ev) => {
      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 

        statusClear()
        setIsThinking(true);

        const url = window.location.hostname + window.location.pathname
        const mode = "sentences"
        let status_msg = statusMsg.length;


        // ask for classes
        statusAdd(MSG_QUERY2CLASS.random())
        const classes = await sendToBackground({ name: "query2classes", query: highlightQuery, url: url, title: document.title })
        statusAdd("Positive Class: " + classes["classes_plus"].join(", "))
        statusAdd("Negative Class: " + classes["classes_minus"].join(", "))
        statusAppend(" done", status_msg+0)

        // extract main content & generate splits
        statusAdd(MSG_CONTENT.random())
        console.log(status_msg);
        const mainEl = getMainContent(true);
        const splitsData = splitContent(mainEl.textContent, mode, url)
        statusAppend(" done", status_msg+1)

        // retrieve embedding
        statusAdd(MSG_EMBED.random())
        console.log(status_msg);
        const splitEmbeddings = (await sendToBackground({ name: "embedding", collectionName: url, data: splitsData })).embeddings
        statusAppend(" done", status_msg+2)

        // mark closest sentences
        const textNodes = textNodesUnderElem(document.body);
        const [texts, nodes] = findText(textNodes, highlightQuery);
        markSentence(texts, nodes);

        setIsThinking(false);
      }
    }


    const thinkingLogo = ( <img className="thinking_logo" width="20" src={Logo}/>)
    const statusHtml = (
      <div className="status">
        {statusMsg.map((status, i) => ( <p key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status} {isThinking && i == statusMsg.length - 1 ? thinkingLogo : ""}</p>))}
      </div>
    )

    return <div className="ShadeRunner-Bar">
      <h1 className="title">ShadeRunner</h1>
      <textarea
        className="text-box"
        placeholder="What do you want to find here?"
        value={highlightQuery}
        onChange={(ev) => setHighlightQuery(ev.target.value)}
        onKeyDown={onEnterPress}
        rows="4"
      />
      {statusMsg.length ? statusHtml : ""}
    </div>
}

export default ShadeRunnerBar;