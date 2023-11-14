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


    const PROMPT = `Classify sentences on a webpage into 'interesting' and 'uninteresting' categories.
Use two classes of topics for classification, based on distance measures.
A sentence is 'interesting' if it is closer to any topic in the 'positive' class than to any in the 'negative' class.
Ensure sufficient distance between the two classes.
Define specific topics for the 'positive' class and broader ones for the 'negative' class, if the query permits.
 
# Training Example
URL: www.llmperformance.com/2023-trends
Title: LLM Performance Metrics and Improvements in 2023
Query: performance improvements
Thought: This page likely discusses both performance metrics and improvements for LLMs. Since the user is interested specifically in improvements, I will focus on sentences highlighting enhancements, optimizations, or advancements in LLM performance. Topics that simply measure performance or are not directly related to improvements fall into the negative class. The terms 'LLM' and '2023' are omitted as they are implied in the context of the page.
Positive Class Topics: Speed Optimization, Efficiency Enhancements, Scalability Upgrades, Cost-Effectiveness Strategies, Response Time Reduction, Advanced Inference Techniques
Negative Class Topics: LLM, Usage, Metrics, Companies, General

# Training Example
URL: en.wikipedia.org/wiki/Scientific_method
Title: Scientific method - Wikipedia
Query: Software Installation Instructions
Thought: Wikipedia article is about research techniques, but the user asked for installation instructions. I should give no positive classes here.
Positive Class Topics: 
Negative Class Topics: Scientific Method Principles, Research Techniques, Experiment Design, Data Analysis Methods, Hypothesis Testing, Scientific Inquiry Process, Theory Formulation and Verification, History of Scientific Method, Scientific Research Methodologies

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
        "classes_pos": parsed[1],
        "classes_neg": parsed[2]
    }
}



 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const llmResult = await llm2classes(req.url, req.title, req.query)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
  export default handler