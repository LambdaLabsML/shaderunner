import React, { useEffect } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";

const DEV = process.env.NODE_ENV == "development";

const Modes = ({tabId}) => {
  const [
    [ highlightMode, setHighlightMode ],
    [ highlightRetrieval, setHighlightRetrieval ],
    [ highlightClassify, setHighlightClassify ],
    [ , setSummarizeParagraphs ],
    [ classifierData],
    [ setGlobalSorage, isSynced ]
    ] = useGlobalStorage(tabId, "highlightMode", "highlightRetrieval", "highlightClassify", "summarizeParagraphs", "classifierData")

  // TODO: use these defaults
  //const [ textclassifier ] = useStorage('textclassifier')
  //const [ textretrieval ] = useStorage('textretrieval')

  useEffect(() => {
    if (!isSynced) return;

    setGlobalSorage({
      highlightClassify: highlightClassify || false,
      highlightRetrieval: highlightRetrieval || true,
      summarizeParagraphs: false
    })
  }, [isSynced]);


  // ------ //
  // render //
  // ------ //

  const findBtn = "Find Reference";
  const suggestBtn = "Related Topics";
  const summarizeBtn = "Summarize Paragraphs";
  const bothBtn = "Both";

  const highlightBtn = "Highlight";
  const FocusBtn = "Focus";
  const TestBtn = "Testset Helper";

  return <div className="Modes">
    <SwitchInput
        label=""
        options={[findBtn, suggestBtn, summarizeBtn]}
        selected={highlightRetrieval && highlightClassify ? bothBtn : highlightRetrieval ? findBtn : highlightClassify ? suggestBtn : summarizeBtn}
        onChange={(value: string) => {
          setHighlightRetrieval(value != suggestBtn && value != summarizeBtn)
          setHighlightClassify(value != findBtn && value != summarizeBtn)
          setSummarizeParagraphs(value == summarizeBtn)
        }}
      />
    {highlightClassify && classifierData ? (
      <SwitchInput
          label=""
          options={[highlightBtn, FocusBtn, ...(DEV ? [TestBtn] : [])]}
          selected={(highlightMode == "highlight" ? highlightBtn : highlightMode == "focus" ? FocusBtn : highlightMode == "testset helper" ? TestBtn : highlightBtn) || highlightBtn}
          onChange={(value: string) => setHighlightMode((value == highlightBtn ? "highlight" : value == FocusBtn ? "focus" : "testset helper"))}
        />
    ) : ""}
  </div>
}


export default Modes;