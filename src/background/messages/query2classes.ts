import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


function parseInput(input) {
    // Split the input into lines
    const lines = input.split('\n');
    
    // Process each line
    const output = lines.map(line => {
      // Check for the presence of "Negative Class:"

      if (line.includes('Though:')) {
        line = line.replace('Thought:', '').trim();
        return line
      } else if (line.includes('Positive Class Topics:')) {
        line = line.replace('Positive Class Topics:', '').trim();
        return line ? line.split(',').map(part => part.trim()) : [];
      } else if (line.includes('Negative Class Topics:')) {
        line = line.replace('Negative Class Topics:', '').trim();
        return line ? line.split(',').map(part => part.trim()) : [];
      }
      return line.trim()
      
    });
    
    return output;
  }
  


const llm2classes = async (url, title, query) => {

    const api_key = await storage.get("OPENAI_API_KEY");
    const gptversion = await storage.get("gpt_version");
    const chatgpt = await storage.get("gpt_chat");

    const Model = chatgpt ? ChatOpenAI : OpenAI;

    const llm = new Model({
        openAIApiKey: api_key,
        temperature: 0.0,
        model: gptversion
    });


    const PROMPT = `We are partitioning a large number of sentences on a webpage into two groups: those that are interesting for the user and those that aren't.
To do that we need two classes of topics that we can use to classify all sentences using distance based measures.
I.e. we suceeed if any topic in positive classs is nearer than any other topic of the negative class.

# Training Example
URL: www.globalpoliticstoday.com/october-2021-summary
Title: Major Political Events and Changes - 2021 Roundup
Query: What were the major political events in October 2021?
Thought: The page is about political events in 2021, the user is looking for specific information related to October 2021. I should exclude previous years and other months. To reduce false positives, I mix general topics related to politics into the negative class.
Positive Class Topics: October 2021 Election Results, Political Decisions October 2021, Legislation Passed in October 2021, Summits and Meetings October 2021, Government Changes in October 2021, Policy Changes October 2021, International Relations in October 2021
Negative Class Topics: Political Events October 2020, October 2019 Government Policies, Summits October 2018, Elections Results October 2022, Legislation Updates October 2017, Political Landscape October 2016, International Agreements October 2023

# Training Example
URL: en.wikipedia.org/wiki/Scientific_method
Title: Scientific method - Wikipedia
Query: Software Installation Instructions
Thought: Wikipedia article is about research techniques, but the user asked for installation instructions. I should give no positive classes here.
Positive Class Topics: 
Negative Class Topics: anything


# Incoming User Request
URL: ${url}
Page title: ${title}
Query: ${query}
Thought:`;

    const llmResult = await llm.predict(PROMPT);
    console.log("using", gptversion, chatgpt ? "ChatGPT" : "InstructGPT")
    console.log(llmResult)
    const parsed = parseInput(llmResult)

    return {
        "thought": parsed[0],
        "classes_plus": parsed[1],
        "classes_minus": parsed[2]
    }
}



 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const llmResult = await llm2classes(req.url, req.title, req.query)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
  export default handler