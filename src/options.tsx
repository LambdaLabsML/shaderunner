import React, { useState } from 'react';
import { useStorage } from "@plasmohq/storage/hook";
import './options.scss';


// NumericInput.js
const NumericInput = ({ label, value, step, onChange }) => (
  <div className="setting-item">
    <label>{label}</label>
    <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

// SwitchInput.js
const SwitchInput = ({ label, options, selected, onChange }) => (
  <div className="setting-item">
    <label>{label}</label>
    <div className="switch-options">
      {options.map((option) => (
        <button
          key={option}
          className={`switch-option ${selected === option ? 'active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

// StringInput.js
const StringInput = ({ label, value, onChange }) => (
  <div className="setting-item">
    <label>{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);


const Settings = () => {

  const defaults = {
    alwayshighlighteps: 0.825,
    minimalhighlighteps: 0.65,
    decisioneps: 0.025,
    verbose: false,
  }

  const [openaikey, setopenaikey] = useStorage('OPENAI_API_KEY', (v) => v === undefined ? "" : v)
  const [gptversion, setgptversion] = useStorage('gpt_version', (v) => v === undefined ? "gpt-4" : v)
  const [gptchat, setgptchat] = useStorage('gpt_chat', (v) => v === undefined ? false : v)
  const [alwayshighlighteps, setalwayshighlighteps] = useStorage('alwayshighlighteps', (v) => v === undefined ? defaults["alwayshighlighteps"] : v)
  const [minimalhighlighteps, setminimalhighlighteps] = useStorage('minimalhighlighteps', (v) => v === undefined ? defaults["minimalhighlighteps"] : v)
  const [decisioneps, setdecisioneps] = useStorage('decisioneps', (v) => v === undefined ? defaults["decisioneps"] : v)
  const [verbose, setVerbose] = useStorage('verbose', (v) => v === undefined ? defaults["verbose"] : v)

  const resetExpert = () => {
    setalwayshighlighteps(defaults["alwayshighlighteps"])
    setminimalhighlighteps(defaults["minimalhighlighteps"])
    setdecisioneps(defaults["decisioneps"])
    setVerbose(defaults["verbose"])
  }

  return (
    <div className="settings-container">
      <StringInput
        label="OPENAI_API_KEY"
        value={openaikey}
        onChange={(value) => setopenaikey(value)}
      />

      <b style={{width:"100%", textAlign: "left"}}>(Note: GPT4 + Instruct seems to be the best combination.)</b> 
      <SwitchInput
        label="GPT-Version"
        options={['gpt-3.5-turbo', 'gpt-4']}
        selected={gptversion}
        onChange={(value) => setgptversion(value)}
      />
      <SwitchInput
        label="GPT-Model"
        options={['ChatGPT', "InstructGPT"]}
        selected={gptchat ? "ChatGPT" : "InstructGPT"}
        onChange={(value) => setgptchat(value == "ChatGPT")}
      />

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
      <NumericInput
        label="Always-Highlight Threshold (default: 0.825, when the similarity is above this value, always highlight the sentence)."
        step={0.01}
        value={alwayshighlighteps}
        onChange={(value) => setalwayshighlighteps(value)}
      />
      <NumericInput
        label="Minimal-Highlight Threshold (default: 0.65, when the similarity is below this value, always skip the sentence)."
        step={0.01}
        value={minimalhighlighteps}
        onChange={(value) => setminimalhighlighteps(value)}
      />
      <NumericInput
        label="Decision-Highlight Threshold (default 0.025, skips highlight when the similarity of positive and negative class is smaller than this value)."
        step={0.01}
        value={decisioneps}
        onChange={(value) => setdecisioneps(value)}
      />

      {/* Add more settings inputs as needed */}
    </div>
  );
};

export default Settings;

/*
function IndexPopup() {
  const [openaikey, setOpenaiKey] = useStorage('OPENAI_API_KEY', (v) => v === undefined ? "": v)
  const [minimalEps, setMinimalEps] = useStorage('minimal_eps', (v) => v === undefined ? false: v)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: "300px",
        height: "300px",
      }}>
      <h1>ShadeRunner</h1>
      OPENAI_API_KEY: <input onChange={(e) => setOpenaiKey(e.target.value)} value={openaikey} />
      <br/>
      <br/>
    </div>
  )
}

export default IndexPopup

*/