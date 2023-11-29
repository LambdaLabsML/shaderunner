import levenshtein from 'fast-levenshtein';
import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)


// get main content parent element of page
const getMainContent = () => {
  return document.body;
}



const splitContent = (bodyElement: HTMLElement, type: string) => {

  // Function to process and split content
  const processAndSplit = (type: string, currentText: string) => {
    const doc = nlp(currentText);
    if (type === 'sentences') {
      return doc.sentences().out('array');
    } else if (type === 'paragraphs') {
      return (doc as any).paragraphs().map(p => p.text()).views;
    } else if (type === 'terms') {
      return doc.terms().out('array');
    } else {
      throw new Error(`Cannot split into ${type}. (Not known)`);
    }
  };

  // extract splits on innerText
  const currentInnerText = bodyElement.innerText;
  const splits = processAndSplit(type, currentInnerText);

  // extract merged text from textContent
  let allText = '';
  let textNodes = [];
  let nodePositions = [];
  let currentTextLength = 0;
  const walker = document.createTreeWalker(bodyElement, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {

    // Check if the node is inside a <style> or <script> element
    let parentNode = node.parentNode;
    if (parentNode && parentNode.nodeName === 'STYLE' || parentNode.nodeName === 'SCRIPT')
      continue;

    const text = node.textContent.toLowerCase();
    nodePositions.push({ start: currentTextLength, end: currentTextLength + text.length, length: text.length });
    allText += text;
    currentTextLength += text.length;
    textNodes.push(node);
  }

  let previousEnd = 0;
  const splitDetails = splits.map(split => {

    // Limit the search to the maximum length of the split
    const lookAhead = split.length + 1000;
    const searchSpace = allText.substring(previousEnd, previousEnd + lookAhead); // assuming splits contain whitespace
    const match = fuzzyMatch(searchSpace, split.trim().toLowerCase());

    // skip if distance is greater than 10% of the split
    if (match.distance >= splits.length * 0.2)
      return null;

    const globalStart = previousEnd + match.start;
    const globalEnd = previousEnd + match.end;
    previousEnd = globalEnd; // Update for next iteration

    const details = {
      from_text_node: findTextNodeIndex(nodePositions, globalStart),
      to_text_node: findTextNodeIndex(nodePositions, globalEnd),
      from_text_node_char_start: globalStart - nodePositions[findTextNodeIndex(nodePositions, globalStart)].start,
      to_text_node_char_end: globalEnd - nodePositions[findTextNodeIndex(nodePositions, globalEnd)].start
    };

    // if we would split at start of node, take previous node's end instead
    if (details.to_text_node_char_end == 0) {
      details.to_text_node = findTextNodeIndex(nodePositions, globalEnd - 1),
        details.to_text_node_char_end = nodePositions[details.to_text_node].length;
    }

    return details;
  });

  return { splits, splitDetails, textNodes };
};


const findTextNodeIndex = (nodePositions: string | any[], charIndex: number) => {
  for (let i = 0; i < nodePositions.length; i++) {
    if (charIndex >= nodePositions[i].start && charIndex < nodePositions[i].end) {
      return i;
    }
  }
  return nodePositions.length - 1; // if not found
};


const fuzzyMatch = (text: string, split: string | any[]) => {
  let bestMatch = { start: 0, end: split.length, distance: Number.MAX_VALUE };

  for (let i = 0; i <= text.length - split.length; i++) {
    const textSegment = text.substring(i, i + split.length);
    const distance = levenshtein.get(textSegment, split);

    if (distance < bestMatch.distance) {
      bestMatch = { start: i, end: i + split.length, distance };
    }

    if (distance == 0)
      return bestMatch;
  }

  return bestMatch;
};


export { getMainContent, splitContent };
