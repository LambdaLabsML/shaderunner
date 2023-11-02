import { useStorage } from "@plasmohq/storage/hook"

function IndexPopup() {
  const [openaikey, setOpenaiKey] = useStorage('OPENAI_API_KEY', (v) => v === undefined ? "": v)
  const [isActiveOn, setIsActiveOn] = useStorage('isActiveOn', (v) => v === undefined ? []: v)
  const [url, setUrl] = useStorage('current_url', (v) => v === undefined ? undefined: v)

  const toggleItem = (item) => {
    setIsActiveOn((prevIsActiveOn) => {
      // Check if the item is already in the array
      if (prevIsActiveOn.includes(item)) {
        // Item is already in the array, so we remove it
        return prevIsActiveOn.filter(currentItem => currentItem !== item);
      } else {
        // Item is not in the array, so we add it
        return [...prevIsActiveOn, item];
      }
    });
  };

  const isActive = isActiveOn.includes(url);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: "300px",
        height: "300px",
      }}>
      <h1>ShadeRunner</h1>
      OPENAI_API_KEY: <input onChange={(e) => setOpenaiKey(e.target.value)} value={openaikey} />
      <br/>
      <br/>
      <br/>
      <b>Current Status:</b>
      {isActive ? `Active on ${url}. Search for the violet box on any webpage.` : `Inactive. Press the button below to activate.`}
      <button onClick={(ev) => toggleItem(url)}>{isActive ? "Deactivate" : "Activate"}</button>
    </div>
  )
}

export default IndexPopup
