import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { consistentColor } from '~util/DOM'
import SwitchInput from "~components/basic/SwitchInput";


const Modes = ({tabId}) => {
  const [
    [ mode, setMode ]
    ] = useGlobalStorage(tabId, "highlightMode")


  // ------ //
  // render //
  // ------ //

  return <div className="ShadeRunner Modes">
    <div className="header">Modes</div>
    <SwitchInput
        label=""
        options={['highlight', "focus"]}
        selected={mode || "highlight"}
        onChange={(value: string) => setMode(value)}
      />
  </div>
}


export default Modes;