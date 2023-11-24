import React, { useEffect, useState } from 'react';
import Button from './basic/Button';
import { sendToBackground } from '@plasmohq/messaging';
import { useGlobalStorage } from '~util/useGlobalStorage';


const TestsetHelperControls = ({tabId}) => {
  const [ isOnline, setIsOnline ] = useState(false);
  const [ [ , setControlSend ] ] = useGlobalStorage(tabId, "testsethelperControlSend")

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (await sendToBackground({name: "testsethelper", body: {cmd: "check"}})) {
        setIsOnline(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [])

  return <div className="TestsetHelperControls">
      TestsetHelper Server is online: {isOnline ? "yes" : "no"}
      {isOnline ? (
        <Button onClick={() => setControlSend({cmd: "save now"})} >Write Testset</Button>
      ) : ""}
  </div>;
}

export default TestsetHelperControls;