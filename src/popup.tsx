import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
const storage = new Storage()

function IndexPopup() {
  const [openaikey, setOpenaiKey] = useState('')

  useEffect(() => {
    async function getKey() {
      setOpenaiKey(await storage.get('OPENAI_API_KEY'))
    }

    if (!openaikey)
      getKey();
  }, [])

  useEffect(() => {
    async function setKey() {
      await storage.set('OPENAI_API_KEY', openaikey)
    }

    setKey();
  }, [openaikey])

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
    </div>
  )
}

export default IndexPopup
