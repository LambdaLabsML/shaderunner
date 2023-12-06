import React, { useEffect, useState } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';

const AmountHighlighted = ({tabId}) => {
  const [[highlightAmount, setHighlightAmount], [highlightClassify], [highlightRetrieval], [retrievalK, setRetrievalK], [, isSynced]] = useGlobalStorage(tabId, "highlightAmount", "highlightClassify", "highlightRetrieval", "retrievalK")
  const [[decisionEps, setDecisionEps]] = useGlobalStorage(tabId, "decisionEps")
  const [amount_slider, set_amount_slider] = useState(100);
  const [quality_slider, set_quality_slider] = useState(50);
  const [retrieval_slider, set_retrieval_slider] = useState(1);

  useEffect(() => {
    if (!isSynced) return;
    if(decisionEps != null) set_quality_slider(decisionEps * 100);
    if(retrievalK != null) set_retrieval_slider(retrievalK);
    if(highlightAmount != null) set_amount_slider(highlightAmount * 100);
  }, [isSynced])

  const handleAmountSlider = (event) => {
    set_amount_slider(event.target.value);
    setHighlightAmount(event.target.value/100);
  };

  const handleQualitySlider = (event) => {
    set_quality_slider(event.target.value);
    setDecisionEps(event.target.value/100);
  };

  const handleRetrievalSlider = (event) => {
    set_retrieval_slider(event.target.value);
    setRetrievalK(event.target.value);
  };

  return <div className="HighlightControls" style={{display: "flex", flexDirection: "column", rowGap:"1.5em"}}>
    {highlightClassify ? <>
    <div className="slider">
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
    </> : ""}
    {highlightRetrieval ? <>
      <div className="slider">
      <input
        type="range"
        min="0"
        max="100"
        value={retrieval_slider}
        onChange={handleRetrievalSlider}
        onMouseUp={handleRetrievalSlider}
      />
      <div style={{width: "100%", display: "flex", textTransform: "uppercase", fontSize: "90%", marginTop: "0.5em"}}>
        <span>Retrieve 1</span>
        <span style={{marginLeft: "auto"}}>Retrieve 100</span>
      </div>
    </div>
    </> : ""}
  </div>
};

export default AmountHighlighted;