import { useStorage } from '@plasmohq/storage/hook';
import React from 'react';
import {useSessionStorage as _useSessionStorage} from '~util/misc';

const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

const Advanced = ({tabId}) => {
  const [classifierData] = useSessionStorage("classifierData:"+tabId, {});


  console.log(classifierData)
  // ------ //
  // render //
  // ------ //

  return <div className="ShadeRunner Advanced">
    <div className="header">Thought</div>
    <span><b>Scope</b> {classifierData?.scope}</span>
    <span><b>Thought</b> {classifierData?.thought}</span>
  </div>
}


export default Advanced;

/*

    // apply class change when user changes inputs
    const onClassChange = (classList, c_new, pos) => {
      setClassifierData(oldData => {
        const list = (classList == classifierData.classes_pos) ? "classes_pos" : "classes_neg"
        let newClasses = oldData[list]
        if (!c_new)
          newClasses = newClasses.filter((c,i) => i != pos)
        else if (pos < 0)
          newClasses.push(c_new)
        else
          newClasses[pos] = c_new;
        return {...oldData, [list]: newClasses}
      })
    }


{!isThinking && classifierData.thought && Array.isArray(classifierData.classes_pos) && Array.isArray(classifierData.classes_neg) ? (
    <CollapsibleBox title="Highlight Classes">
      <h3>Scope:</h3>
      {classifierData.scope}
      <h3>Thought:</h3>
      {classifierData.thought}
      <ClassModifierList title="Positive Terms" classList={classifierData.classes_pos} onSubmit={onClassChange}/>
      <ClassModifierList title="Negative Terms" classList={classifierData.classes_neg} onSubmit={onClassChange}/>
    </CollapsibleBox>
  ) : ""}
  {!isThinking && scores.length > 0 && scores[0].length > 0 ? ( 
    <CollapsibleBox title="Histograms">
      <div className="histograms" style={{display: "flex", flexDirection: "row"}}>
        <div style={{ flex: "1" }}>
          <b style={{display: "block", width: "100%", textAlign: "center"}}>Scores of Positive Class</b>
          <Histogram scores={scores[0]} lines={poseps} />
        </div>
        <div style={{ flex: "1" }}>
          <b style={{display: "block", width: "100%", textAlign: "center"}}>Score Differences (score_plus - score_minus)</b>
          <Histogram scores={scores[1]} lines={decisioneps > 0 ? [decisioneps] : []} />
        </div>
      </div>
    </CollapsibleBox>
  ) : ""}
  */