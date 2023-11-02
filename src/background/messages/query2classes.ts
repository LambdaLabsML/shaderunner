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

      if (line.includes('Though:')) {
        line = line.replace('Thought', '').trim();
        return line
      } else if (line.includes('Positive Class Topics:')) {
        line = line.replace('Positive Class Topics', '').trim();
        return line.split(',').map(part => part.trim());
      } else if (line.includes('Negative Class Topics:')) {
        line = line.replace('Negative Class Topics:', '').trim();
        return line.split(',').map(part => part.trim());
      }
      return line.trim()
      
    });
    
    return output;
  }
  



const llm2classes = async (url, title, query) => {

    const api_key = await storage.get("OPENAI_API_KEY");
    const llm = new OpenAI({
        openAIApiKey: api_key,
        temperature: 0.0,
    });


    const PROMPT = `We are partitioning a large number of sentences on a webpage into two groups: those that are interesting for the user and those that aren't.
To do that we need two classes of topics that we can use to classify all sentences using distance based measures.
I.e. we suceeed if any topic in positive classs is nearer than any other topic of the negative class.

# Training Example
URL: www.spacefrontiernews.com/latest-discoveries
Title: "Latest Discoveries in Space Exploration - What's Out There?"
Query: What's new in space exploration?
Thought: The page is about discoveries, the user seems to be only interested about the most recent advancements.
Positive Class Topics: Recent Satellite Launches, New Space Probes, Latest Findings from Mars, Current Astronomical Phenomena, Updates on Space Telescopes, Active Space Missions, Newly Discovered Exoplanets
Negative Class Topics: Historical Space Missions, General Astronomy, Sci-Fi Movies and Books, Celestial Events from Previous Years, Discontinued Space Programs, General Physics, Famous Astronauts from History

# Training Example
URL: www.globalpoliticstoday.com/october-2021-summary
Title: Major Political Events and Changes - 2021 Roundup
Query: What were the major political events in October 2021?
Thought: The page is about political events in 2021, the user is looking for specific information related to October 2021, indicating a need for information that is both topically and temporally specific.
Positive Class Topics: October 2021 Election Results, Political Decisions October 2021, Legislation Passed in October 2021, Summits and Meetings October 2021, Government Changes in October 2021, Policy Changes October 2021, International Relations in October 2021
Negative Class Topics: Political Events October 2020, October 2019 Government Policies, Summits October 2018, Elections Results October 2022, Legislation Updates October 2017, Political Landscape October 2016, International Agreements October 2023

# Incoming User Request
URL: ${url}
Page title: ${title}
Query: ${query}
Thought:`;

    const llmResult = await llm.predict(PROMPT);
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