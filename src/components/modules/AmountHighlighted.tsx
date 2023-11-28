import React, { useEffect, useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';

const AmountHighlighted = ({tabId}) => {
  const [[, setHighlightAmount]] = useGlobalStorage(tabId, "highlightAmount")
  const [value, setValue] = useState(100);

  const handleChange = (event) => {
    setValue(event.target.value);
    setHighlightAmount(event.target.value/100);
  };

  return (
    <div className="slider">
      <span>Percent Highlighted of Top Scored finds: {value}%</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={handleChange}
        onMouseUp={handleChange}
      />
    </div>
  );
};

export default AmountHighlighted;