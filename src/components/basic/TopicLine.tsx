import React from 'react';
import Icon from './Icon';
import { consistentColor } from '~util/DOM';

const TopicLine = ({ topic, active, toggleHighlight, mouseOverHighlight, mouseOverHighlightFinish, onFocusHighlight, topicCounts }) => {

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      // Add your delete logic here
      console.log('Item deleted');
    }
  };

  return (
    <div key={topic} className={`TopicLine ${active ? '' : 'inactive'}`}>
      <div 
        className='highlight'
        style={{ backgroundColor: consistentColor(topic) }} 
        onClick={() => toggleHighlight(topic)} 
        onMouseOver={() => mouseOverHighlight(topic)} 
        onMouseLeave={() => mouseOverHighlightFinish()}
      >
        <span className="left onhover">
          <Icon name="up-arrow" onClick={() => console.log('Left Arrow clicked')} />
          <Icon name="down-arrow" onClick={() => console.log('Right Arrow clicked')} />
        </span>
        <span>
          {topic}
        </span>
        <span className="right">
          {topicCounts ? ` (${topicCounts[topic]})` : ""}
          <span className="onhover">
            <Icon name="cog" onClick={() => console.log('Left Arrow clicked')} />
          </span>
        </span>
      </div>
      {/*<div>
        <Icon name="edit" onClick={() => console.log('Edit clicked')} />
        <Icon name="focus" onClick={(ev) => onFocusHighlight(ev, topic)} />
        <Icon name="trash" onClick={handleDelete} />
      </div>*/}
    </div>
  );
};

export default TopicLine;
