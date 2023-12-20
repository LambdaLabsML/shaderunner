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

  const SYSTEM = `You work as a assistant for an important person who doesn't have much time to read, but needs to know the essence of what's going on.
Your task is to break down text passages given by html text into the key points.
Make the text as digestible as possible while keeping the essence of the text.
Your answer shall only provide the transformed html.

USE <strong> and <emph> html tags to highlight important words (to make reading easier). if a sentence does not contain such, consider removing that, otherwise make sure that important words are marked.

USE <ul> and <li> tags if the text given has multiple key points, otherwise don't use any surrounding tags at all.

DO NOT create long texts as these take time to be read. instead break down long sentences into digestable chunks


KEEP links and inline-images if appropriate, but shorten the link text
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