import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { HumanMessage, SystemMessage } from "langchain/dist/schema";
import { eval_prompt, getCurrentModel, parseInput } from "~llm_classify_prompt";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


export async function llm2classes(url: string, title: string, query: string) {

    const api_key = await storage.get("OPENAI_API_KEY");
    const openchat_api_base = await storage.get("OPENCHAT_API_BASE");


    const {model, temperature, chat} = await getCurrentModel();
    const {USER, SYSTEM} = eval_prompt({url, title, query})

    console.log("using llm:", model, "with temperature", temperature, "as", chat ? "chat model" : "instruct model")
    const llm_params = {
        temperature: temperature,
        modelName: model,
        //verbose: true,
        ...(model.startsWith("gpt-") ? {openAIApiKey: api_key} :  {openAIApiKey: "EMPTY"})
    }
    const llm_config = model.startsWith("gpt-") ? null : {baseURL: openchat_api_base, modelName: model}
    const llm = chat ? new ChatOpenAI(llm_params, llm_config) : new OpenAI(llm_params, llm_config)

    //'Interesting' sentences are closer to specific topics within the query's context.
    //'General' sentences align with broader topics not specific to the query but related to the overall content.
    //'Outlier' sentences are those that align with miscellaneous or tangential topics, reflecting content not directly related to the main theme or query.


    let parsed;
    if (!chat) {
      const llmResult = await llm.predict(SYSTEM + "\n" + USER);
      console.log(llmResult)
      parsed = parseInput(llmResult)
    } else {
      const llmResult = await llm.call([
        new SystemMessage(SYSTEM),
        new HumanMessage(USER)
      ]);
      console.log(llmResult.content)
      parsed = parseInput(llmResult.content)
    }

    return {
        "scope": parsed[0],
        "thought": parsed.slice(1,-2).join(" "),
        "classes_pos": parsed[parsed.length-2],
        "classes_neg": parsed[parsed.length-1]
    }
}



type RequestBody = {
  url: string,
  title: string,
  query: string,
};

 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const body = req.body as RequestBody;
    const llmResult = await llm2classes(body.url, body.title, body.query)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   

export default handler