import { Storage } from "@plasmohq/storage"
const storage = new Storage()

export const eval_prompt = ({ url, title, query }) => {
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

    return { SYSTEM, USER };
}


export const getCurrentModel = async () => {
    const gptversion = await storage.get("gpt_version");
    const chatgpt = await storage.get("gpt_chat");
    const gpttemperature = await storage.get("gpt_temperature") as number;

    return {
        model: gptversion,
        chat: chatgpt,
        temperature: gpttemperature,
    }
}

export function parseInput(input: string) {
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
  

