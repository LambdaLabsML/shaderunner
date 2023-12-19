import levenshtein from 'fast-levenshtein';
import nlp from 'compromise'
import plg from 'compromise-paragraphs'
nlp.plugin(plg)


// get main content parent element of page
const getMainContent = () => {
  return document.body;
}



// Function to process and split content
const extractSplits = (type: string, element: HTMLElement) => {

  // extract splits on innerText
  const currentText = element.innerText;

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


const mapSplitsToTextnodes = (splits: string[], element: HTMLElement, lookAheadAdditional=-1) => {

  // extract merged text from textContent
  let allText = '';
  let textNodes = [];
  let nodePositions = [];
  let currentTextLength = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {

    // Skip over comment nodes
    if (node.nodeType === Node.COMMENT_NODE) {
      continue;
    }

    const parentNode = node.parentNode;

    // Skip if the node is inside <style>, <script>, <iframe>, <object>, or <embed> elements
    if (parentNode && (parentNode.nodeName === 'STYLE' || parentNode.nodeName === 'SCRIPT' ||
      parentNode.nodeName === 'IFRAME' || parentNode.nodeName === 'OBJECT' || parentNode.nodeName === 'NOSCRIPT' ||
      parentNode.nodeName === 'EMBED')) {
      continue;
    }

    // skip if parent node not visible
    if (!parentNode.innerText || !parentNode.innerText.trim())
      continue;

    const text = node.textContent.toLowerCase();
    nodePositions.push({ start: currentTextLength, end: currentTextLength + text.length, length: text.length });
    allText += text;
    currentTextLength += text.length;
    textNodes.push(node);
  }

  let previousEnd = 0;
  let foundprevious = false;
  const splitDetails = splits.map(split => {

    // Limit the search to the maximum length of the split
    const searchSpace = !foundprevious || lookAheadAdditional < 0 ? allText.substring(previousEnd) : allText.substring(previousEnd, previousEnd + split.length + lookAheadAdditional); // assuming splits contain whitespace
    const match = fuzzyMatch(searchSpace, split.trim().toLowerCase());

    // skip textnode if distance is greater than 10% of the split
    // in this case we try to find the next position of the next textnode
    // TODO: see english_people wiki page. alternatively: use fastTextFind method
    if (match.distance >= split.length * 0.1) {
        foundprevious = false;
        return null;
    }
    foundprevious = true;

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

    if (distance == 0 || split.length > 50 && distance <= 2) {
      return bestMatch;
    }
  }

  return bestMatch;
};


export { getMainContent, extractSplits, mapSplitsToTextnodes };
