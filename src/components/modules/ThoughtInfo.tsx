import React from 'react';
import { useGlobalStorage } from '~util/useGlobalStorage';


const ThoughtInfo = ({tabId}) => {
  const [[classifierData]] = useGlobalStorage(tabId , "classifierData");

  return [
    <span><b>Scope</b> {classifierData?.scope}</span>,
    <span><b>Thought</b> {classifierData?.thought}</span>
  ];
}

export default ThoughtInfo;