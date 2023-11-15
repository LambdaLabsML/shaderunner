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
      // Check for the presence of "Outlier Class:"

      if (line.includes('Thought:')) {
        line = line.replace('Thought:', '').trim();
        return line
      } else if (line.includes('Interesting Class Topics:')) {
        line = line.replace('Interesting Class Topics:', '').trim();
        return line ? line.split(',').map(part => part.trim()) : [];
      } else if (line.includes('Outlier Class Topics:')) {
        line = line.replace('Outlier Class Topics:', '').trim();
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

    //'Interesting' sentences are closer to specific topics within the query's context.
    //'General' sentences align with broader topics not specific to the query but related to the overall content.
    //'Outlier' sentences are those that align with miscellaneous or tangential topics, reflecting content not directly related to the main theme or query.

    const PROMPT = `Classify sentences from a webpage as either 'interesting' or 'outlier'.
For this, use two categories: 'interesting' for sentences closely related to specific topics relevant to the user query, and 'outlier' for sentences that are only mildly related or unrelated.
Sentences are deemed 'interesting' if they are nearer to a topic in the 'interesting' category than to those in the 'outlier' category.
Conversely, classify a sentence as 'outlier' if it is broadly related to general topics but not closely aligned with the 'interesting' topics.
Classes are always inclusive rather than exclusive.
The classification relies on a nearest neighbor approach, considering the sentence-topic distance.
The context of the query should guide the classification, ensuring sentences are appropriately grouped.
 
# Training Example
URL: www.llmperformance.com/2023-trends
Title: LLM Performance Metrics and Improvements in 2023
Query: performance improvements
Thought: Classify sentences as 'interesting' if they are specifically about enhancing or optimizing LLM performance. Classify as 'outliers' sentences that discuss broader topics or are irrelevant to performance improvements.
Interesting Class Topics: Performance Enhancement, Optimization Strategies, Efficiency Increase
Outlier Class Topics: LLM Applications, Technical Specifications, User Testimonials, Industry Trends, Regulatory Considerations, Market Analysis, Cost-Effectiveness, Website Navigation, Advertisements, General News, External Links, Website Updates, Miscellaneous Announcements

# Training Example
URL: en.wikipedia.org/wiki/Scientific_method
Title: Scientific method - Wikipedia
Query: Software Installation Instructions
Thought: Since the query is unrelated to the article's content, focus on separating the main content from miscellaneous or tangential information.
Interesting Class Topics: Scientific Software, Installation Instructions
Outlier Class Topics: Scientific Method Principles, Research Techniques, Experiment Design, Data Analysis, Hypothesis Testing, Scientific Inquiry, Theory Formulation, Scientific Method History, Research Methodologies, Wikipedia Navigation, External References, User Comments, Site Policies, Editing History, General Wikipedia Announcements

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