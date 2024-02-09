import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
import { getCurrentModel } from "~llm_classify_prompt";
import { ChatPromptTemplate } from "langchain/prompts";
const storage = new Storage()


function splitMarkdownList(markdown) {
  const lines = markdown.split('\n');
  return lines
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(2).trim());
}



const llmSummarize = async (texts: string) => {
  const api_key = await storage.get("OPENAI_API_KEY");
  const openchat_api_base = await storage.get("OPENCHAT_API_BASE");

  const { model, temperature, chat } = await getCurrentModel();

  console.log("using llm:", model, "with temperature", temperature, "as", chat ? "chat model" : "instruct model")
  const llm_params = {
    temperature: temperature,
    modelName: model,
    //verbose: true,
    ...(model.startsWith("gpt-") ? { openAIApiKey: api_key } : { openAIApiKey: "EMPTY" })
  }
  const llm_config = model.startsWith("gpt-") ? null : { baseURL: openchat_api_base, modelName: model }

  let llm, llmResult;
  try {
    llm = chat ? new ChatOpenAI(llm_params, llm_config) : new OpenAI(llm_params, llm_config)
  } catch (e) {
    console.error(e);
    await storage.set("apiworks", false)
  }

  let SYSTEM = `As an expert in information processing, your task is to simplify HTML text for a busy individual, focusing on key content.

### Instructions:
- Summary: Provide a brief overview of main points.
- Key Elements: Use <strong> and <emph> tags for emphasis.
- Organization: Format multiple points with <ul> and <li> tags; for single points, no tags.
- Simplification: Break down complex sentences into shorter segments.
- Links and Images: Keep links and essential images, with concise text.
- CSS Classes: Keep css classes if appropriate (e.g. for links and images)

### Constraints:
- Brevity: Aim for concise responses.
- Selective Emphasis: Highlight only crucial words. Remove non-essential sentences.
- Context Preservation: Retain the essence of the original text.

### Example:
Original Text: "Our company has seen <a class="directlink" href="./stats">remarkable growth</a> in the last quarter, with a 25% increase in sales, due to our new marketing strategy..."

Transformed HTML:
<a class="directlink" href="./stats"><strong>Remarkable growth</strong></a> last quarter - <emph>25% sales increase</emph>, due to <strong>new marketing strategy</strong>...
`
  if (model.includes("3.5"))
    SYSTEM += `
### Example:
If appropriate use lists as in the following example.

Original Text: Apart from heat engines, <a href="/wiki/Electric_motor" title="Electric motor">electric motors</a> convert electrical energy into <a href="/wiki/Machine_(mechanical)" class="mw-redirect" title="Machine (mechanical)">mechanical</a> motion, <a href="/wiki/Pneumatic_motor" title="Pneumatic motor">pneumatic motors</a> use <a href="/wiki/Compressed_air" title="Compressed air">compressed air</a>, and <a href="/wiki/Clockwork_motor" class="mw-redirect" title="Clockwork motor">clockwork motors</a> in <a href="/wiki/Wind-up_toy" title="Wind-up toy">wind-up toys</a> use <a href="/wiki/Elastic_energy" title="Elastic energy">elastic energy</a>. In biological systems, <a href="/wiki/Molecular_motor" title="Molecular motor">molecular motors</a>, like <a href="/wiki/Myosin" title="Myosin">myosins</a> in <a href="/wiki/Muscle" title="Muscle">muscles</a>, use <a href="/wiki/Chemical_energy" title="Chemical energy">chemical energy</a> to create forces and ultimately motion (a chemical engine, but not a heat engine).

Transformed HTML:
<ul><li><a href="/wiki/Electric_motor" title="Electric motor"><strong>Electric motors</strong></a>: convert electrical to <a href="/wiki/Machine_(mechanical)" class="mw-redirect" title="Machine (mechanical)"><emph>mechanical motion</emph></a>.</li><li><a href="/wiki/Pneumatic_motor" title="Pneumatic motor"><strong>Pneumatic motors</strong></a>: use <a href="/wiki/Compressed_air" title="Compressed air"><emph>compressed air</emph></a>.</li><li><a href="/wiki/Clockwork_motor" class="mw-redirect" title="Clockwork motor"><strong>Clockwork motors</strong></a>: in <a href="/wiki/Wind-up_toy" title="Wind-up toy"><emph>wind-up toys</emph></a> use <a href="/wiki/Elastic_energy" title="Elastic energy"><emph>elastic energy</emph></a>.</li><li><a href="/wiki/Molecular_motor" title="Molecular motor"><strong>Molecular motors</strong></a>: like <a href="/wiki/Myosin" title="Myosin"><emph>myosins in muscles</emph></a> use <a href="/wiki/Chemical_energy" title="Chemical energy"><emph>chemical energy</emph></a> for motion.</li></ul>
`

  if (!chat) {
    new Error("not implemented, yet")
  } else {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM],
      ["human", "{text}"],
    ])
    const chain = promptTemplate.pipe(llm);
    const llmResults = await chain.batch(texts.map(t => ({text: t})));
    return llmResults.map(result => result.content)
  }
}


type RequestBody = {
  texts: string[]
};

 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const body = req.body as RequestBody;
    console.log(body)
    const llmResult = await llmSummarize(body.texts)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
export default handler