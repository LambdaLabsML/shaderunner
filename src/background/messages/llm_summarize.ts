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

  const SYSTEM = `As an expert in information processing, your task is to simplify HTML text for a busy individual, focusing on key content.

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