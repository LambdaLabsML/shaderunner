

// find all text nodes under an DOM element
function textNodesUnderElem(el){
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}


// split into words, whitespace & separate symbols
function splitIntoWords(str) {
  return str.match(/\w+|\s|\S/g) || [];
}


// given a list of textnodes, find the subset of textnodes that contain a string
function findSentence(textNodes, sentence_str) {
  const results = [];
  const domElements = [];
  const sentence = splitIntoWords(sentence_str)

  // find textNode-interval that contains the sentence
  let pos_sentence = 0;
  let nodes = []; // the text nodes containing the sentence
  let texts = []; // the actual strings contained in each text node
  textNodeLoop:
  for (let i = 0; i < textNodes.length && pos_sentence < sentence.length; i++) {
    const node = textNodes[i];
    const textContent = splitIntoWords(node.textContent);

    // get index of first word
    const word = sentence[pos_sentence];
    const wordIndex = textContent.indexOf(word);

    // if starting word not found in same node, we haven't found the actual sentence
    // i.e. restart search with next node
    if (wordIndex < 0) {
      pos_sentence = 0;
      nodes = [];
      texts = [];
      continue textNodeLoop;
    }

    // we found already one word from the sentence
    texts.push(word)
    nodes.push(node)
    pos_sentence += 1;

    // otherwise check equalness of all succeeding words
    for (let j = 1; pos_sentence < sentence.length && wordIndex + j < textContent.length; j++) {
      const word = sentence[pos_sentence]

      // if the next word of the node differs from the sentence, we haven't found the actual sentence
      // i.e. restart search with next node
      if (word != textContent[wordIndex + j]) {
        pos_sentence = 0;
        nodes = [];
        texts = [];
        continue textNodeLoop;
      }

      // we found a word from the sentence
      //nodes.push(node)
      texts[texts.length-1] += word
      pos_sentence += 1;

    }
  }

  return [texts, nodes];
}


// given the pair of texts and nodes, mark that text in its respective node
function markSentence(texts, nodes) {
  if (nodes.length !== texts.length) {
    throw new Error('The length of nodes and texts should be the same.');
  }

  const backgroundColor = "rgba(255,0,0,0.2)";

  nodes.forEach((node, i) => {
    const text = texts[i];
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent;
      const index = textContent.indexOf(text);
      
      if (index !== -1) {
        const beforeText = textContent.substring(0, index);
        const afterText = textContent.substring(index + text.length);
        
        if (beforeText) {
          const beforeSpan = document.createElement('span');
          beforeSpan.textContent = beforeText;
          node.parentNode.insertBefore(beforeSpan, node);
        }
        
        const span = document.createElement('span');
        span.textContent = text;
        span.style.backgroundColor = backgroundColor; // Set the background color
        node.parentNode.insertBefore(span, node);
        
        if (afterText) {
          const afterSpan = document.createElement('span');
          afterSpan.textContent = afterText;
          node.parentNode.insertBefore(afterSpan, node.nextSibling);
        }
        
        node.parentNode.removeChild(node);
      }
    } else {
      throw new Error(`Node at position ${i} is not a text node.`);
    }
  });
}


export { textNodesUnderElem, splitIntoWords, findSentence, markSentence };