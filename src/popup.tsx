import { useStorage } from "@plasmohq/storage/hook"

function IndexPopup() {
  const [openaikey, setOpenaiKey] = useStorage('OPENAI_API_KEY', (v) => v === undefined ? "": v)

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
