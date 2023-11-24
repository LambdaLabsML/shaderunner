import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";

const DEV = process.env.NODE_ENV == "development";

const Modes = ({tabId}) => {
  const [
    [ mode, setMode ]
    ] = useGlobalStorage(tabId, "highlightMode")


  // ------ //
  // render //
  // ------ //

  return <div className="Modes">
    <SwitchInput
        label=""
        options={['highlight', "focus", ...(DEV ? ["testset helper"] : [])]}
        selected={mode || "highlight"}
        onChange={(value: string) => setMode(value)}
      />
  </div>
}


export default Modes;