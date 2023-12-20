import { useEffect, useState } from 'react';


// Runs effect when all conditions are true
const useTabId = () => {
  const [tabId, setTabId] = useState(null);

  // init (make sure tabId is known, needed for messaging with other parts of this application)
  useEffect(() => {
    async function init() {
      const tabId = await chrome.runtime.sendMessage("get_tabid")
      setTabId(tabId);
    }
    init();
  }, [])

  return tabId;
};


export default useTabId;