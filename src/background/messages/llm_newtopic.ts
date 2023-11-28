import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


const llmNewTopic = async (url: string, pos_topics: string[], neg_topics: string[]) => {

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

    const PROMPT = `We are currently looking at the webpage: ${url}
Assume these are interesting topics: ${pos_topics.join(",")}.
Assume these are uninteresting topics: ${neg_topics.join(",")}.
This is another interesting topic that matches the theme: `;

    const llmResult = await llm.predict(PROMPT);
    console.log("using", gptversion, chatgpt ? "ChatGPT" : "InstructGPT")
    console.log(PROMPT, llmResult)

    const newTopic = String(llmResult)
    return newTopic;
}


type RequestBody = {
  url: string,
  interesting: string[],
  uninteresting: string[]
};

 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const body = req.body as RequestBody;
    const llmResult = await llmNewTopic(body.url, body.interesting, body.uninteresting)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
export default handler