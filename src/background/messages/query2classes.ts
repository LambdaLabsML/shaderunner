import type { PlasmoMessaging } from "@plasmohq/messaging"
import { OpenAI } from "langchain/llms/openai";
import { Storage } from "@plasmohq/storage"
const storage = new Storage()


function parseInput(input) {
    // Split the input into lines
    const lines = input.split('\n');
    
    // Process each line
    const output = lines.map(line => {
      // Check for the presence of "Negative Class:"
      if (line.includes('Negative Class Topics:')) {
        // Remove the "Negative Class:" part and trim the remaining string
        line = line.replace('Negative Class Topics:', '').trim();
      }
      
      // Split the line by commas and trim each resulting string
      return line.split(',').map(part => part.trim());
    });
    
    return output;
  }
  



const llm2classes = async (url, title, query) => {

    const api_key = await storage.get("OPENAI_API_KEY");
    const llm = new OpenAI({
        openAIApiKey: api_key,
        temperature: 0.9,
    });


    const PROMPT = `We are partitioning a large number of sentences on a webpage into two groups: those that are interesting for the user and those that aren't.
To do that we need two classes of topics that we can use to classify all sentences using distance based measures.
I.e. we suceeed if any topic in positive classs is nearer than any other topic of the negative class.

# Training Example
URL: www.techgamenews.com/latest-updates
Page Title: Latest in Tech & Gaming | Today's Technology and Gaming News
Query: What's new in technology and gaming?
Positive Class Topics: Artificial Intelligence, Virtual Reality, Cybersecurity, Blockchain, Console Releases, eSports, Game Development
Negative Class Topics: Horticulture, Medieval History, Knitting, Corporate Law, Space Weather, Deep Sea Biology, Sand Sculpture

# Training Example
URL: www.financetrendwatcher.com/market-insights
Page Title: Finance & Economy Trends | Market Insights & Theories
Query: Trends in finance and new economic theories
Positive Class Topics: Financial Markets, Behavioral Economics, Investment Strategies, Fintech Innovations, Global Trade, Monetary Policy, Economic Indicators
Negative Class Topics: Paleontology, Astrology, Amateur Radio, Ice Sculpting, Paranormal Investigations, Sitcom Recaps, Exotic Pets

# Incoming User Request
URL: ${url}
Page title: ${title}
user: ${query}
Positive Class Topics:`;

    const llmResult = await llm.predict(PROMPT);
    const parsed = parseInput(llmResult)

    return {
        "classes_plus": parsed[0],
        "classes_minus": parsed[1]
    }
}




 
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("query", req);
    const llmResult = await llm2classes(req.url, req.title, req.query)
    console.log("response", llmResult)
    res.send(llmResult)
  }
   
  export default handler