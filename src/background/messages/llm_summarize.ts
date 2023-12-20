import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
import { HumanMessage, SystemMessage } from "langchain/dist/schema";
import { eval_prompt, getCurrentModel } from "~llm_classify_prompt copy";
const storage = new Storage()


function splitMarkdownList(markdown) {
  const lines = markdown.split('\n');
  return lines
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(2).trim());
}



const llmSummarize = async (text: string) => {
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

  const SYSTEM = `As an expert in efficient information processing, your task is to condense and clarify HTML text for a busy individual who requires quick understanding of key content.

### Instructions:
- **Begin with a summary:** Start by providing a concise overview of the HTML text's main points.
- **Highlighting key elements:** Utilize \`<strong>\` and \`<emph>\` tags to emphasize critical words or phrases, aiding in rapid comprehension.
- **Organizing information:** When the text contains multiple points, format them as a bullet list using \`<ul>\` and \`<li>\` tags. In cases of singular key points, omit these tags.
- **Simplifying sentences:** Break down complex or lengthy sentences into shorter, easily digestible fragments.
- **Maintaining essential links and images:** Preserve relevant links and inline images, but ensure link text is succinct.

### Constraints:
- **Brevity is key:** Aim for short, clear responses. Avoid lengthy explanations.
- **Selective emphasis:** Only highlight words that significantly contribute to the understanding of the text. If a sentence lacks such words, consider its removal.
- **Preservation of context:** Ensure that the essence of the original text is retained, even in its condensed form.

### Example:
Original Text: "Our company has seen a remarkable growth in the last quarter, with a 25% increase in sales, mainly due to our new marketing strategy..."

Transformed HTML:
"<strong>Remarkable growth</strong> in the last quarter - <emph>25% increase in sales</emph>, attributed to <strong>new marketing strategy</strong>..."
`
  const USER =`${text}`;

  try {
    if (!chat) {
      llmResult = await llm.predict(SYSTEM + "\n" + USER);
    } else {
      llmResult = (await llm.call([
        new SystemMessage(SYSTEM),
        new HumanMessage(USER)
      ])).content;
    }
  } catch (e) {
    console.error(e);
    console.error("Error code:", e.code);
    if (e.code == "invalid_api_key")
      await storage.set("apiworks", false)
  }

  return llmResult;
    //return splitMarkdownList(llmResult);
}


type RequestBody = {
  text: string
};

 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const body = req.body as RequestBody;
    console.log(body)
    const llmResult = await llmSummarize(body.text)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
export default handler