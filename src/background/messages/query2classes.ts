import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


function splitStringIgnoringParentheses(input) {
  let results = [];
  let currentSegment = '';
  let insideParentheses = false;

  for (let char of input) {
      if (char === '(') {
          insideParentheses = true;
      } else if (char === ')') {
          insideParentheses = false;
      }

      if (char === ',' && !insideParentheses) {
          results.push(currentSegment.trim());
          currentSegment = '';
      } else {
          currentSegment += char;
      }
  }

  // Add the last segment if it's not empty
  if (currentSegment) {
      results.push(currentSegment.trim());
  }

  return results;
}



function parseInput(input) {
    // Split the input into lines
    const lines = input.split('\n');
    
    // Process each line
    const output = lines.map(line => {
      // Check for the presence of "Outlier Class:"

      if (line.includes('Thought:')) {
        line = line.replace('Thought:', '').trim();
        return line
      } else if (line.includes('Scope:')) {
        line = line.replace('Scope:', '').trim();
        return line;
      } else if (line.includes('Interesting Class Topics:')) {
        line = line.replace('Interesting Class Topics:', '').trim();
        return line ? splitStringIgnoringParentheses(line).map(part => part.trim()) : [];
      } else if (line.includes('Outlier Class Topics:')) {
        line = line.replace('Outlier Class Topics:', '').trim();
        return line ? splitStringIgnoringParentheses(line).map(part => part.trim()) : [];
      }
      return line.trim()
      
    });
    
    return output;
  }
  


const llm2classes = async (url, title, query) => {

    const api_key = await storage.get("OPENAI_API_KEY");
    const openchat_api_base = await storage.get("OPENCHAT_API_BASE");
    const gptversion = await storage.get("gpt_version");
    const chatgpt = await storage.get("gpt_chat");
    const gpttemperature = await storage.get("gpt_temperature");

    const Model = chatgpt ? ChatOpenAI : OpenAI;

    console.log("using llm:", gptversion, "with temperature", gpttemperature, "as", chatgpt ? "chat model" : "instruct model")
    const llm = new Model({
        temperature: gpttemperature,
        modelName: gptversion,
        //verbose: true,
        ...(gptversion.startsWith("gpt-") ? {openAIApiKey: api_key} :  {openAIApiKey: "EMPTY"}),
    }, gptversion.startsWith("gpt-") ? null : {baseURL: openchat_api_base, modelName: gptversion});

    //'Interesting' sentences are closer to specific topics within the query's context.
    //'General' sentences align with broader topics not specific to the query but related to the overall content.
    //'Outlier' sentences are those that align with miscellaneous or tangential topics, reflecting content not directly related to the main theme or query.

    const PROMPT = `Classify sentences from a webpage as either 'interesting' or 'outlier'.
For this, use two categories: 'interesting' for sentences closely related to specific topics relevant to the user query, and 'outlier' for sentences that are only mildly related or unrelated.
Sentences are deemed 'interesting' if they are nearer to a topic in the 'interesting' category than to those in the 'outlier' category.
Conversely, classify a sentence as 'outlier' if it is broadly related to general topics but not closely aligned with the 'interesting' topics.
Classes are always positive and never in their negated form (e.g omit the words "Other" and "Non-" for all class topics).
The classification relies on a nearest neighbor approach, considering the sentence-topic distance.
The context of the query should guide the classification, ensuring sentences are appropriately grouped.
The number of negative topics may be higher than the number of positive topics.
For best results: balance the abstraction level of all topics to be more or less equal.

# Training Example
URL: www.llmperformance.com/2020s-trends
Title: LLM Performance Metrics and Improvements in the 2020s
Query: performance improvements 2023
Scope: narrow
Thought: Classify sentences as 'interesting' if they are about enhancing or optimizing LLM performance. Classify as 'outliers' sentences that discuss broader topics or are irrelevant to performance improvements. As this is time-sensitive I should narrow down uninteresting years into the outlier list.
Interesting Class Topics: Performance Enhancement, Optimization Strategies, Efficiency Increase
Outlier Class Topics: year 2020, year 2021, year 2024, Applications, Use Cases, Design Challenges, Technical Specifications, User Testimonials, Industry Trends, Regulatory Considerations, Market Analysis, Cost-Effectiveness, Website Navigation, Advertisements, General News, External Links, Website Updates, Miscellaneous Announcements

# Training Exampple
URL: www.myhealth.com/nutrition-tips
Title: Essential Nutrition Tips for a Healthy Lifestyle
Query: Nutritional benefit types in vegetables
Scope: middle
Thought: The user is interested in understanding the nutritional benefits of vegetables. Therefore, sentences that directly discuss this topic are 'interesting'. The scope is broad, thus, related nutritional topics can also be considered 'interesting' to some extent. Since this is a broad scope I will list all nutricion benefit types that could match the request. Topics that are tangentially related to nutrition but not directly about the nutritional benefits of vegetables, or general health tips without specific mention of nutrition, would be classified as 'outliers'.
Interesting Class Topics: Vitamins (A, C, K, and B-complex), Minerals (iron, calcium, potassium, magnesium), Dietary fiber, Antioxidants, Low calories, Low fat, Phytonutrients (flavonoids, carotenoids), Water content, Folate, Protein (in some vegetables like legumes)
Outlier Class Topics: General Health Tips, Meat Nutrition, Fish Nutrition, Advertisements, Testimonials, External Links

# Training Example
URL: www.cppalgorithms.com/Rabin-Karp-algorithm
Title: Rabin-Karp string search algorithm
Query: Core Idea
Scope: narrow
Thought: Since the page is about the Rabin-Karp algorithm and the user asks for it's core idea, I need to think around the corner to highlight the specific sentences. In this case I should reference hashing and string matching. At the same time I add close specific topics to the negative class to compensate for false positives.
Interesting Class Topics: Core Idea and Trick (Rolling Hash Mechanism), String Matching Efficiency, Specifics of Algorithm Implementation, Performance Analysis or Complexity (O-notation)
Outlier Class Topics: Hashing, String Matching, Algorithm History, Algorithm Theory, String Matching Algorithms, Usage, Related Algorithms, Code Expression, Programming in C++, Site Navigation, External Links

# Incoming User Request (always use training example template)
URL: ${url}
Page title: ${title}
Query: ${query}
Scope: `;

    const llmResult = await llm.predict(PROMPT);
    console.log("using", gptversion, chatgpt ? "ChatGPT" : "InstructGPT")
    console.log(llmResult)
    const parsed = parseInput(llmResult)

    return {
        "scope": parsed[0],
        "thought": parsed.slice(1,-2).join(" "),
        "classes_pos": parsed[parsed.length-2],
        "classes_neg": parsed[parsed.length-1]
    }
}



 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const llmResult = await llm2classes(req.url, req.title, req.query)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
  export default handler