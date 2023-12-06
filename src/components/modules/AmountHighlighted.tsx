import React, { useEffect, useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';

const AmountHighlighted = ({tabId}) => {
  const [[, setHighlightAmount], [, isSynced]] = useGlobalStorage(tabId, "highlightAmount")
  const [[decisionEps, setDecisionEps]] = useGlobalStorage(tabId, "decisionEps")
  const [amount_slider, set_amount_slider] = useState(100);
  const [quality_slider, set_quality_slider] = useState(50);

  useEffect(() => {
    if (!isSynced) return;
    console.log("decisioneps", decisionEps)
    if(decisionEps != null) set_quality_slider(decisionEps * 100);
  }, [isSynced])

  const handleAmountSlider = (event) => {
    set_amount_slider(event.target.value);
    setHighlightAmount(event.target.value/100);
  };

  const handleQualitySlider = (event) => {
    set_quality_slider(event.target.value);
    setDecisionEps(event.target.value/100);
  };

  return <div className="HighlightControls" style={{display: "flex", flexDirection: "column", rowGap:"1.5em"}}>
    <div className="slider">
    {/* <div style={{textAlign: "left", fontWeight: "bold", marginBottom: "0.2em"}}>Search Accuracy: {quality_slider}%</div> */}
    <input
      type="range"
      min="0"
      max="100"
      value={quality_slider}
      onChange={handleQualitySlider}
      onMouseUp={handleQualitySlider}
    />
    <div style={{width: "100%", display: "flex", textTransform: "uppercase", fontSize: "90%", marginTop: "0.5em"}}>
      <span>Precise Search</span>
      <span style={{marginLeft: "auto"}}>Broader Search</span>
    </div>
    </div>
    <div className="slider">
      {/* <div style={{textAlign: "left", fontWeight: "bold", marginBottom: "0.2em"}}>Filter Results: Top {amount_slider}%</div> */}
      <input
        type="range"
        min="0"
        max="100"
        value={amount_slider}
        onChange={handleAmountSlider}
        onMouseUp={handleAmountSlider}
      />
      <div style={{width: "100%", display: "flex", textTransform: "uppercase", fontSize: "90%", marginTop: "0.5em"}}>
        <span>Fewer Results</span>
        <span style={{marginLeft: "auto"}}>More Results</span>
      </div>
    </div>
  </div>
};

export default AmountHighlighted;