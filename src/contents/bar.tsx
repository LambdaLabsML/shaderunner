import type { PlasmoGetInlineAnchor } from "plasmo"
import type { PlasmoMountShadowHost } from "plasmo"
import React, { useState } from 'react';
import Logo from 'data-url:./icon.png';
import { findText, getMainContent, splitContent } from './extract'
import { textNodesUnderElem, findText, markSentence, findMainContent  } from './utilDOM'
import { computeEmbeddingsLocal } from './embeddings'
import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook";
//import { Histogram } from "./histogram";

//const EPS = 0.05;
const EPS = 0.025;

import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const Histogram = ({ scoresA, scoresB }) => {
  const numBins = 100;
  let binsA = new Array(numBins).fill(0);
  let binsB = new Array(numBins).fill(0);
  const binSize = 1 / numBins;

  if (!scoresA) return "";

  const calculateBin = (score) => Math.floor(score / binSize);

  scoresA.forEach(score => {
    if (score >= 0 && score <= 1) {
      binsA[calculateBin(score)]++;
    }
  });

  scoresB.forEach(score => {
    if (score >= 0 && score <= 1) {
      binsB[calculateBin(score)]++;
    }
  });

  const data = {
    labels: binsA.map((_, index) => `${(index * binSize).toFixed(2)} - ${((index + 1) * binSize).toFixed(2)}`),
    datasets: [
      {
        label: 'Scores A',
        data: binsA,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Scores B',
        data: binsB,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'x',
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  return <Bar data={data} options={options} />;
};
 
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
import styleText from "data-text:./shaderunner.scss"
import type { PlasmoGetStyle } from "plasmo"
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}


// let arrays have a random sample method
const random = function (A) {
  return A[Math.floor((Math.random()*A.length))];
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
    const [ isActiveOn, setIsActiveOn ] = useStorage("activeURLs", []);
    const [ scores, setScores ] = useState([]);

    // show only when active
    if (!isActiveOn[window.location.hostname]) return "";

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
        statusAdd(random(MSG_QUERY2CLASS))
        const classes = await sendToBackground({ name: "query2classes", query: highlightQuery, url: url, title: document.title })
        statusAdd( ( <div className="indent"><b>Positive Class:</b> {classes["classes_plus"].join(", ")} </div> ) )
        statusAdd( ( <div className="indent"><b>Negative Class:</b> {classes["classes_minus"].join(", ")} </div> ) )
        statusAdd( ( <div className="indent"><b>Thought:</b> {classes["thought"]} </div> ) )
        statusAppend(" done", status_msg)
        status_msg += 4

        // extract main content & generate splits
        statusAdd(random(MSG_CONTENT))
        const mainEl = getMainContent(true);
        const [splits, metadata] = splitContent(mainEl.textContent, mode, url)
        statusAppend(" done", status_msg)
        status_msg++

        // retrieve embedding
        statusAdd(random(MSG_EMBED))
        const splitEmbeddings = (await sendToBackground({ name: "embedding", collectionName: url, data: [splits, metadata]})).embeddings
        statusAppend(" done", status_msg)
        status_msg++

        // compute embeddings of classes
        statusAdd(random(MSG_EMBED))
        const allclasses = [...classes["classes_plus"], ...classes["classes_minus"]]
        const [classStore, classEmbeddings] = await computeEmbeddingsLocal(allclasses, [])
        statusAppend(" done", status_msg)
        status_msg++

        // mark sentences based on similarity
        statusAdd("Done. See below.")
        let scores_plus = [];
        let scores_minus = [];
        for (const i in splits) {
          const split = splits[i];

          // using precomputed embeddings
          const embedding = splitEmbeddings[split];
          const closest = (await classStore.similaritySearchVectorWithScore(embedding, k = allclasses.length));

          const score_plus = classes["classes_plus"] ? closest.filter((c) => classes["classes_plus"].includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
          const score_minus = classes["classes_minus"] ? closest.filter((c) => classes["classes_minus"].includes(c[0].pageContent)).reduce((a, c) =>  Math.max(a, c[1]), 0) : 0

          scores_plus.push(score_plus);
          scores_minus.push(score_minus);

          // ignore anything that is not distinguishable
          //if (score_plus < MIN_CLASS_EPS || Math.abs(score_plus - score_minus) < EPS) {
          if (Math.abs(score_plus - score_minus) < EPS) {
            console.log("skipping", split, score_plus, score_minus)
            continue
          }

          // apply color if is first class
          if (score_plus > score_minus) {
            console.log("mark", split, score_plus, score_minus)

            // get all text nodes
            const textNodes = textNodesUnderElem(document.body);

            // mark sentence
            const [texts, nodes] = findText(textNodes, split);
            markSentence(texts, nodes);
          } else {
            console.log("reject", split, score_plus, score_minus)
          }
        }

        setScores([scores_plus, scores_minus])
        setIsThinking(false);
      }
    }


    const thinkingLogo = ( <img className="thinking_logo" width="20" src={Logo}/>)
    const statusHtml = (
      <div className="status">
        {statusMsg.map((status, i) => ( <div key={i} className={`status_msg ${isThinking ? "processing" : "done"}`}>{status} {isThinking && i == statusMsg.length - 1 ? thinkingLogo : ""}</div>))}
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
      {scores.length ? ( <Histogram scoresA={scores[0]} scoresB={scores[1]} /> ) : ""}
    </div>
}

export default ShadeRunnerBar;