import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
import { HumanMessage, SystemMessage } from "langchain/dist/schema";
const storage = new Storage()


function parseInput(input: string) {
    // Split the input into lines
    const lines = input.split('\n').filter(lines => lines.trim());
    
    // Process each line
    const output = lines.map((line: string) => {
      // Check for the presence of "Outlier Class:"

      if (line.includes('Thought:')) {
        line = line.replace('Thought:', '').trim();
        return line
      } else if (line.includes('Scope:')) {
        line = line.replace('Scope:', '').trim();
        return line;
      } else if (line.includes('Interesting Class Topics:')) {
        line = line.replace('Interesting Class Topics:', '').trim();
        return line ? line.split("|") : [];
      } else if (line.includes('Outlier Class Topics:')) {
        line = line.replace('Outlier Class Topics:', '').trim();
        return line ? line.split("|") : [];
      }
      return line.trim()
      
    });
    
    return output;
  }
  


const llm2classes = async (url: string, title: string, query: string) => {

    const api_key = await storage.get("OPENAI_API_KEY");
    const openchat_api_base = await storage.get("OPENCHAT_API_BASE");
    const gptversion = await storage.get("gpt_version");
    const chatgpt = await storage.get("gpt_chat");
    const gpttemperature = await storage.get("gpt_temperature") as number;

    const Model = chatgpt ? ChatOpenAI : OpenAI;

    console.log("using llm:", gptversion, "with temperature", gpttemperature, "as", chatgpt ? "chat model" : "instruct model")
    const llm_params = {
        temperature: gpttemperature,
        modelName: gptversion,
        //verbose: true,
        ...(gptversion.startsWith("gpt-") ? {openAIApiKey: api_key} :  {openAIApiKey: "EMPTY"})
    }
    const llm_config = gptversion.startsWith("gpt-") ? null : {baseURL: openchat_api_base, modelName: gptversion}
    const llm = chatgpt ? new ChatOpenAI(llm_params, llm_config) : new OpenAI(llm_params, llm_config)

    //'Interesting' sentences are closer to specific topics within the query's context.
    //'General' sentences align with broader topics not specific to the query but related to the overall content.
    //'Outlier' sentences are those that align with miscellaneous or tangential topics, reflecting content not directly related to the main theme or query.

    const SYSTEM = `Classify sentences from a webpage as either 'interesting' or 'outlier'.
For this, use two categories: 'interesting' for sentences closely related to specific topics relevant to the user query, and 'outlier' for sentences that are only mildly related or unrelated.
Sentences are deemed 'interesting' if they are nearer to a topic in the 'interesting' category than to those in the 'outlier' category.
Conversely, classify a sentence as 'outlier' if it is broadly related to general topics but not closely aligned with the 'interesting' topics.
Classes are always positive and never in their negated form (e.g omit the words "Other" and "Non-" for all class topics).
The classification relies on a nearest neighbor approach, considering the sentence-topic distance.
The context of the query should guide the classification, ensuring sentences are appropriately grouped.
The number of negative topics may be higher than the number of positive topics.
For best results: balance the abstraction level of all topics to be more or less equal.

To balance abstraction level:
- broad scopes mark general topics as 'interesting'
- narrow scopes mark very specific topics as 'interesting'. if you have an idea what the answer is, use some forumlations of this answer as topics
- keep in mind that a large number of outlier topics prevents false positives. if overused, however, it may increase false negatives as well.

# Training Example
URL: www.llmperformance.com/2020s-trends
Title: LLM Performance Metrics and Improvements in the 2020s
Query: performance improvements 2023
Scope: middle (interesting are about 50% of the sentences)
Thought: Classify sentences as 'interesting' if they are about enhancing or optimizing LLM performance. Classify as 'outliers' sentences that discuss broader topics or are irrelevant to performance improvements. As this is time-sensitive I should narrow down uninteresting years into the outlier list.
Interesting Class Topics: Performance Enhancement|Optimization Strategies|Efficiency Increase
Outlier Class Topics: year 2020|year 2021|year 2024|Applications|Use Cases|Design Challenges|Technical Specifications|User Testimonials|Industry Trends|Regulatory Considerations|Market Analysis|Cost-Effectiveness|Website Navigation|Advertisements|General News|External Links|Website Updates|Miscellaneous Announcements

# Training Exampple
URL: www.myhealth.com/nutrition-tips
Title: Essential Nutrition Tips for a Healthy Lifestyle
Query: Nutritional benefit types in vegetables
Scope: broad (interesting are most sentences)
Thought: The user is interested in understanding the nutritional benefits of vegetables. Therefore, sentences that directly discuss this topic are 'interesting'. The scope is broad, thus, related nutritional topics can also be considered 'interesting' to some extent. Since this is a broad scope I will list all nutricion benefit types that could match the request. Topics that are tangentially related to nutrition but not directly about the nutritional benefits of vegetables, or general health tips without specific mention of nutrition, would be classified as 'outliers'.
Interesting Class Topics: Vitamins (A, C, K, and B-complex)|Minerals (iron, calcium, potassium, magnesium)|Dietary fiber|Antioxidants|Low calories|Low fat|Phytonutrients (flavonoids, carotenoids)|Water content|Folate|Protein (in some vegetables like legumes)
Outlier Class Topics: General Health Tips|Meat Nutrition|Fish Nutrition|Advertisements|Testimonials|External Links

# Training Example
URL: www.cppalgorithms.com/Rabin-Karp-algorithm
Title: Rabin-Karp string search algorithm
Query: Core Idea
Scope: narrow (interesting are only few sentences)
Thought: Since the page is about the Rabin-Karp algorithm and the user asks for it's core idea, I need to think around the corner to highlight the specific sentences. In this case I should reference hashing and string matching. At the same time I add close specific topics to the negative class to compensate for false positives.
Interesting Class Topics: Core Idea and Trick (Rolling Hash Mechanism)|Implementation of the Rabin-Karp Algorithm
Outlier Class Topics: Hashing|String Matching|Algorithm History|Algorithm Theory|String Matching Algorithms|Usage|Related Algorithms|Code Expression|Programming in C++|Site Navigation|External Links

# Training Example
URL: www.spaceexplorationnews.com/moon-landing
Title: The History of Moon Landings
Query: Source of "The Eagle has landed" quote
Scope: super-narrow (looking for specific information)
Thought: The user is specifically looking for the source of the quote "The Eagle has landed". Sentences that directly discuss this quote|its context|or its origin are 'interesting'. The focus should be extremely narrow|centered on the quote and its immediate context.
Interesting Class Topics: "The Eagle has landed"|Apollo 11 Moon Landing Quote
Outlier Class Topics: General Moon Landing History|Other Space Missions|Astronaut Biographies|Space Exploration Technology|Future Moon Missions|Advertisements|External Links|Site Navigation
`

    const USER = `# Incoming User Request (always use training example template)
URL: ${url}
Page title: ${title}
Query: ${query}
Scope: `;


    let parsed;
    if (!chatgpt) {
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