import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import SwitchInput from "~components/basic/SwitchInput";


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
        options={['highlight', "focus"]}
        selected={mode || "highlight"}
        onChange={(value: string) => setMode(value)}
      />
  </div>
}


export default Modes;