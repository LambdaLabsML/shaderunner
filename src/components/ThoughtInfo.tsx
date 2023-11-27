import { useStorage } from '@plasmohq/storage/hook';
import React from 'react';
import {useSessionStorage as _useSessionStorage} from '~util/misc';

const useSessionStorage = process.env.NODE_ENV == "development" && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;

const ThoughtInfo = ({tabId}) => {
  const [classifierData] = useSessionStorage("classifierData:"+tabId, {});

  return [
    <span><b>Scope</b> {classifierData?.scope}</span>,
    <span><b>Thought</b> {classifierData?.thought}</span>
  ];
}

export default ThoughtInfo;