import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
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
    const gptversion = await storage.get("gpt_version");
    const chatgpt = true; //await storage.get("gpt_chat");
    const gpttemperature = await storage.get("gpt_temperature") as number;

    console.log("using llm:", gptversion, "with temperature", gpttemperature, "as", chatgpt ? "chat model" : "instruct model")
    const llm_params = {
        temperature: gpttemperature,
        modelName: gptversion,
        //verbose: true,
        ...(gptversion.startsWith("gpt-") ? {openAIApiKey: api_key} :  {openAIApiKey: "EMPTY"})
    }
    const llm_config = gptversion.startsWith("gpt-") ? null : {baseURL: openchat_api_base, modelName: gptversion}
    const llm = chatgpt ? new ChatOpenAI(llm_params, llm_config) : new OpenAI(llm_params, llm_config)

    const PROMPT = `Summarize the following paragraph as concise as possible for a knowledgable person. Use normally one bullet point to reduce the text text as much as possible while keeping the gist. For very long paragraphs you may use up to three bullet points.
Make sure to use only bullet points of up to 8 words.

${text}
`;

    const llmResult = await llm.predict(PROMPT);
    console.log("using", gptversion, chatgpt ? "ChatGPT" : "InstructGPT")
    return splitMarkdownList(llmResult);
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