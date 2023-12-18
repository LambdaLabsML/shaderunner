import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';



// the actual shaderunner bar
const MainInput = ({tabId}) => {
    const [ [ savedHighlightQuery, setSavedHighlightQuery ], [, isSynced]] = useGlobalStorage(tabId, "savedHighlightQuery")


    // ------ //
    // events //
    // ------ //

    const onEnterPress = async (ev) => {
      const highlightQuery = ev.target.value;

      if (ev.keyCode == 13 && ev.shiftKey == false) {
        ev.preventDefault(); 
        setSavedHighlightQuery(highlightQuery)
      }
    }


    // ------ //
    // render //
    // ------ //

    return <div className="MainInput">
      <textarea
        className="text-box"
        placeholder="What do you want to find here?"
        defaultValue={savedHighlightQuery}
        onKeyDown={onEnterPress}
        rows={4}
      />
    </div>
}

export default MainInput;