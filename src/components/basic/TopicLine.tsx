import React, { useState } from 'react';
import Icon from './Icon';
import { consistentColor } from '~util/DOM';
import EditableText from './EditableText';

const TopicLine = ({ topic, active, toggleHighlight, mouseOverHighlight, mouseOverHighlightFinish, onFocusHighlight, onTopicChange, onTopicDelete, onNextPrev, extraInfo=undefined }) => {
  const [ settingsActive, setSettingsActive ] = useState(false);
  const [ editText, setEditText ] = useState(false);


  return (
    <div key={topic} className={`TopicLine ${active ? '' : 'inactive'}`}>
      <div className="tool_buttons">
        <div className="stacked">
          <Icon name="up-arrow" onClick={() => onNextPrev(topic, false)} />
          <Icon name="down-arrow" onClick={() => onNextPrev(topic, true)} />
        </div>
        <Icon style="" name="radio-circle-marked" onClick={(ev) => onFocusHighlight(ev, topic)} />
      </div>
      <div className='highlight-wrapper'>
        <div 
          className='highlight'
          style={{ backgroundColor: consistentColor(topic) }} 
          onClick={() => toggleHighlight(topic)} 
          onMouseOver={() => mouseOverHighlight(topic)} 
          onMouseLeave={() => mouseOverHighlightFinish()}
        >
          <EditableText text={topic} onSubmit={(newtopic) => {setEditText(false); onTopicChange(topic, newtopic)}} wrapped={false} editable={editText}/>
          <span className="right">
            {extraInfo ? ` (${extraInfo})` : ""}
          </span>
        </div>
        {<div className={`tool_buttons ${settingsActive ? "active" : ""}`}>
        </div>}
      </div>
      <div className="tool_buttons">
        {settingsActive ? [
          <Icon name="edit" onClick={() => setEditText(true)} />,
          <Icon name="trash" onClick={() => onTopicDelete(topic)} />,
          <Icon style="" name="x" onClick={() => setSettingsActive(!settingsActive)} />
        ] : (
          <Icon name="cog" onClick={() => setSettingsActive(!settingsActive)} />
        )}
      </div>
    </div>
  );
};

export default TopicLine;
