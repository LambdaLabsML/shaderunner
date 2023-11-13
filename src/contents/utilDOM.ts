

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
function findText(textNodes, sentence_str) {
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
      const word_sentence = sentence[pos_sentence]
      const word_node = textContent[wordIndex + j]

      // if the next word of the node differs from the sentence, we haven't found the actual sentence
      // i.e. restart search with next node
      // (also, if we would skip because of a whitespace, just skip it)
      if (word_sentence != word_node && !(word_sentence == "-" && word_node == "—")) {
        if (word_node.trim().length > 0) {
          pos_sentence = 0;
          nodes = [];
          texts = [];
          continue textNodeLoop;
        }
        continue;
      }

      // we found a word from the sentence
      //nodes.push(node)
      texts[texts.length-1] += word_node
      pos_sentence += 1;

    }
  }

  return [texts, nodes];
}



function highlightText(texts, nodes, backgroundColor, markingClass = 'marked-text') {
  if (nodes.length !== texts.length) {
    throw new Error('The length of nodes and texts should be the same.');
  }

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
        span.style.backgroundColor = backgroundColor;
        span.classList.add(markingClass); // Add a specific class for easy identification
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


function resetHighlights(markingClass = 'marked-text') {
  const markedElements = document.querySelectorAll(`.${markingClass}`);
  markedElements.forEach(element => {
    element.replaceWith(document.createTextNode(element.textContent));
  });
}




function isElementVisible(element) {
  // Check if the element or any of its parents have display:none
  function isDisplayed(el) {
    while (el) {
      if (getComputedStyle(el).display === 'none') {
        return false;
      }
      el = el.parentElement;
    }
    return true;
  }

  // Check if the element or any of its parents have visibility:hidden or opacity:0
  function isVisible(el) {
    while (el) {
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      el = el.parentElement;
    }
    return true;
  }

  // Check if the element is removed from the document
  function isInDocument(el) {
    return document.contains(el);
  }

  return isInDocument(element) && isDisplayed(element) && isVisible(element);
}



function findMainContent() {

  // A list of selectors that often contain the main content of the page
  const selectors = [
    'article', // HTML5 tag for article content
    'main', // The main HTML5 tag
    '.main-content', // Common class name for main content
    '.app-main',
    '.content', // Another common class name
    '#content', // Common ID for content
    '.post', // Blogs often use the class "post" for main content
    'section.content', // Sometimes content is within a section tag
    'div.content' // Div tags with a content class
  ];

  // Try to find the main content using the selectors above
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      return element;
    }
  }

  // As a last resort, we can look for a large block of text within the body
  // This is a very rough heuristic and may not always work well
  const allParagraphs = document.querySelectorAll('body p');
  let maxTextLength = 0;
  let mainContentElement = null;

  allParagraphs.forEach(p => {
    const textLength = p.innerText.trim().length;
    // Here, you might also want to check if this paragraph is not inside a footer, sidebar, etc.
    if (textLength > maxTextLength) {
      maxTextLength = textLength;
      mainContentElement = p.closest('div'); // Assuming the main content is in a div
    }
  });

  return mainContentElement;
}



export { textNodesUnderElem, splitIntoWords, findText, highlightText, resetHighlights, findMainContent };