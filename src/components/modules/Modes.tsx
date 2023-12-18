import React, { useEffect } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";

const DEV = process.env.NODE_ENV == "development";

const Modes = ({tabId}) => {
  const [
    [ highlightMode, setHighlightMode ],
    [ highlightRetrieval, setHighlightRetrieval ],
    [ highlightClassify, setHighlightClassify ],
    [ classifierData],
    [ , isSynced ]
    ] = useGlobalStorage(tabId, "highlightMode", "highlightRetrieval", "highlightClassify", "classifierData")

  // TODO: use these defaults
  //const [ textclassifier ] = useStorage('textclassifier')
  //const [ textretrieval ] = useStorage('textretrieval')

  useEffect(() => {
    if (!isSynced) return;

    setHighlightClassify(highlightClassify || false)
    setHighlightRetrieval(highlightRetrieval || true)
  }, [isSynced]);


  // ------ //
  // render //
  // ------ //

  const findBtn = "Find Reference";
  const suggestBtn = "Related Topics";
  const bothBtn = "Both";

  const highlightBtn = "Highlight";
  const FocusBtn = "Focus";
  const TestBtn = "Testset Helper";

  return <div className="Modes">
    <SwitchInput
        label=""
        options={[findBtn, suggestBtn, bothBtn]}
        selected={highlightRetrieval && highlightClassify ? bothBtn : highlightRetrieval ? findBtn : suggestBtn}
        onChange={(value: string) => {
          setHighlightRetrieval(value != suggestBtn)
          setHighlightClassify(value != findBtn)
        }}
      />
    {highlightClassify && classifierData ? (
      <SwitchInput
          label=""
          options={[highlightBtn, FocusBtn, ...(DEV ? [TestBtn] : [])]}
          selected={(highlightMode == "highlight" ? highlightBtn : highlightMode == "focus" ? FocusBtn : TestBtn) || highlightBtn}
          onChange={(value: string) => setHighlightMode((value == highlightBtn ? "highlight" : value == FocusBtn ? "focus" : "testset helper"))}
        />
    ) : ""}
  </div>
}


export default Modes;