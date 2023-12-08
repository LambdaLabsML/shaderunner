import React, { useEffect, useState } from 'react';
import { useStorage } from "@plasmohq/storage/hook";
import {styleCSS} from './style.scss';
import NumericInput from '~components/basic/NumericInput';
import SwitchInput from '~components/basic/SwitchInput';
import StringInput from '~components/basic/StringInput';
import defaults from '~defaults';
import Logo from "data-base64:./assets/logo.png"
import {version} from '../package.json';

const Settings = () => {

  const [openaikey, setopenaikey] = useStorage('OPENAI_API_KEY', (v) => v === undefined ? "" : v)
  const [openchatapibase, setopenchatapibase] = useStorage('OPENCHAT_API_BASE', (v) => v === undefined ? "" : v)
  const [gptversion, setgptversion] = useStorage('gpt_version', (v) => v === undefined ? defaults["gpt_version"]: v)
  const [gptchat, setgptchat] = useStorage('gpt_chat', (v) => v === undefined ? defaults["gpt_chat"] : v)
  const [gpttemperature, setgpttemperature] = useStorage('gpt_temperature', (v) => v === undefined ? defaults["gpt_temperature"] : v)
  const [textclassifier, settextclassifier] = useStorage('textclassifier', (v) => v === undefined ? defaults["textclassifier"] : v)
  const [textretrieval, settextretrieval] = useStorage('textretrieval', (v) => v === undefined ? defaults["textretrieval"] : v)
  const [textretrieval_k, settextretrieval_k] = useStorage('textretrieval_k', (v) => v === undefined ? defaults["textretrieval_k"] : v)
  const [alwayshighlighteps, setalwayshighlighteps] = useStorage('alwayshighlighteps', (v) => v === undefined ? defaults["alwayshighlighteps"] : v)
  const [minimalhighlighteps, setminimalhighlighteps] = useStorage('minimalhighlighteps', (v) => v === undefined ? defaults["minimalhighlighteps"] : v)
  const [decisioneps, setdecisioneps] = useStorage('decisioneps', (v) => v === undefined ? defaults["decisioneps"] : v)
  const [verbose, setVerbose] = useStorage('verbose', (v) => v === undefined ? defaults["verbose"] : v)
  const [apiworks, setApiworks] = useStorage('apiworks', (v) => v === undefined ? true : v)

  const resetExpert = () => {
    setalwayshighlighteps(defaults["alwayshighlighteps"])
    setminimalhighlighteps(defaults["minimalhighlighteps"])
    setdecisioneps(defaults["decisioneps"])
    setVerbose(defaults["verbose"])
  }

  // add darkmode background to sidepannel
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      @media (prefers-color-scheme: dark) {
        body {
          background: rgba(53,54,58);
        }
      }";
  
      ${styleCSS}
      `

    window.document.head.appendChild(style);
  }, [])

  return (
    <div className="settings-container">
      { gptversion.startsWith("gpt-") ?
        ( <StringInput
          label="OPENAI_API_KEY"
          value={openaikey.replace(/./g, "*")}
          onChange={(value) => {setopenaikey(value); if (!apiworks) setApiworks(true);}}
        /> ) : ( <StringInput
          label="OPENCHAT_API_BASE"
          value={openchatapibase}
          onChange={(value) => {setopenchatapibase(value); if (!apiworks) setApiworks(true);}}
        /> )
      }
      <b style={{width:"100%", textAlign: "left"}}>(Note: GPT4 + Instruct seems to be the best combination, cheaper and nearly as good is gpt-4-1106-preview + ChatGPT. Openchat works only in Chat-Mode)</b> 
      <SwitchInput
        label="GPT-Version"
        options={['gpt-3.5-turbo', 'gpt-4', 'gpt-4-1106-preview', 'openchat_3.5']}
        selected={gptversion}
        onChange={(value) => {
          if (gptchat != "ChatGPT" && value.startsWith("openchat"))
            setgptchat("ChatGPT")
          setgptversion(value)
        }}
      />
      <SwitchInput
        label="GPT-Model"
        options={['ChatGPT', "InstructGPT"]}
        selected={gptchat ? "ChatGPT" : "InstructGPT"}
        onChange={(value) => {
          if (value != "ChatGPT" && gptversion.startsWith("openchat"))
            setgptversion("gpt-4")
          setgptchat(value == "ChatGPT")
        }}
      />
      <NumericInput
          label="LLM Temperature"
          value={gpttemperature}
          step={0.1}
          onChange={(value) => setgpttemperature(Math.min(1.0, Math.max(value, 0.0)))}
        />
      {/* <SwitchInput
        label="Modes: Text Classifier (can highlight arbitrary many sentences), Text Retriever (can highlight a fixed amount of sentences)"
        options={['Text Classifier', "Text Retriever", "Both"]}
        selected={textclassifier && textretrieval ? "Both" : textclassifier ? "Text Classifier" : "Text Retriever"}
        onChange={(value) => {
          settextclassifier(value == "Both" || value == "Text Classifier")
          settextretrieval(value == "Both" || value == "Text Retriever")
        }}
      /> */}
      { textretrieval ? (
        <NumericInput
          label="Number of Retrievals (only for Text Retriever mode)"
          value={textretrieval_k}
          step={1}
          onChange={(value) => settextretrieval_k(Math.round(value))}
        />
      ) : ""}


      <hr/>
      <b>Expert Values</b>
      To disable a feature, insert the value -1.
      <div className="setting-item" style={{display:"block", textAlign: "center"}}>
        <div className="switch-options" style={{display:"block"}}>
          <button key={"reset"}
            className={"switch-option active"}
            onClick={() => resetExpert()}
          >
            Reset Expert Settings
          </button>
        </div>
      </div>

      <SwitchInput
        label="Verbose Console Output"
        options={["on", "off"]}
        selected={verbose ? "on" : "off"}
        onChange={(value) => setVerbose(value == "on")}
      />

      { textclassifier ? [
        <NumericInput
          key="alwayshighlighteps"
          label="Always-Highlight Threshold (default: 0.825, when the similarity is above this value, always highlight the sentence)."
          step={0.01}
          value={alwayshighlighteps}
          onChange={(value) => setalwayshighlighteps(value)}
        />,
        <NumericInput
          key="minimalhighlighteps"
          label="Minimal-Highlight Threshold (default: 0.65, when the similarity is below this value, always skip the sentence)."
          step={0.01}
          value={minimalhighlighteps}
          onChange={(value) => setminimalhighlighteps(value)}
        />,
        // <NumericInput
        //   key="decisioneps"
        //   label="Decision-Highlight Threshold (default 0.025, skips highlight when the similarity of positive and negative class is smaller than this value)."
        //   step={0.01}
        //   value={decisioneps}
        //   onChange={(value) => setdecisioneps(value)}
        // />
      ] : ""}
      <div className="logoContainer">
        <img src={Logo} alt="Some pretty cool image" />
        <br />
        <br />
        version: {version}<br/>
        powered by Lambda
      </div>
    </div>
  );
};

export default Settings;