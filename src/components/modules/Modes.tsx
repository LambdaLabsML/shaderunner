import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";

const DEV = process.env.NODE_ENV == "development";

const Modes = ({tabId}) => {
  const [
    [ highlightMode, setHighlightMode ],
    [ highlightRetrieval, setHighlightRetrieval ]
    ] = useGlobalStorage(tabId, "highlightMode", "highlightRetrieval")


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
        options={['llm-topics', "llm-topics + direct retrieval"]}
        selected={highlightRetrieval ? "llm-topics + direct retrieval" : "llm-topics"}
        onChange={(value: string) => setHighlightRetrieval(value != "llm-topics")}
      />
  </div>
}


export default Modes;