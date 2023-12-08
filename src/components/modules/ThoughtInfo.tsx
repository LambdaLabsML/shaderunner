import { useStorage } from '@plasmohq/storage/hook';
import React from 'react';
import {useStorage as _useStorage} from '~util/misc';


const ThoughtInfo = ({tabId}) => {
  const [classifierData] = useStorage("classifierData:"+tabId, {});

  return [
    <span><b>Scope</b> {classifierData?.scope}</span>,
    <span><b>Thought</b> {classifierData?.thought}</span>
  ];
}

export default ThoughtInfo;