import React, { useEffect } from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";

const DEV = process.env.NODE_ENV == "development";

const Modes = ({tabId}) => {
  const [
    [ highlightMode, setHighlightMode ],
    [ highlightRetrieval, setHighlightRetrieval ],
    [ highlightClassify, setHighlightClassify ],
    [ , isSynced ]
    ] = useGlobalStorage(tabId, "highlightMode", "highlightRetrieval", "highlightClassify")

  useEffect(() => {
    if (!isSynced) return;
    setHighlightClassify(highlightClassify || true)
    setHighlightRetrieval(highlightRetrieval || false)
  }, [isSynced]);

  // ------ //
  // render //
  // ------ //

  return <div className="Modes">
    <SwitchInput
        label=""
        options={['highlight', "focus", ...(DEV ? ["testset helper"] : [])]}
        selected={highlightMode || "highlight"}
        onChange={(value: string) => setHighlightMode(value)}
      />
    <SwitchInput
        label=""
        options={['llm-topics', "retrieval", "both"]}
        selected={highlightRetrieval && highlightClassify ? "both" : highlightRetrieval ? "retrieval" : "llm-topics"}
        onChange={(value: string) => {
          setHighlightRetrieval(value != "llm-topics")
          setHighlightClassify(value != "retrieval")
        }}
      />
  </div>
}


export default Modes;