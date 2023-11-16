

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



function longestMatchingSubstring(str1, str2) {

  // Heuristic check
  if (str1.startsWith(str2)) return str2;
  if (str2.startsWith(str1)) return str1;

  // Find the length of the longest matching substring
  let maxLength = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (str1[i] === str2[i]) {
          maxLength++;
      } else {
          break; // Stop if characters don't match
      }
  }

  // Extract the matching substring
  return str1.substring(0, maxLength);
}


// given a list of textnodes, find the subset of textnodes that contain a string
function findTextSlow(textNodes, sentence) {
  let pos_sentence = 0; // Current position in the sentence
  let nodes = []; // The text nodes containing the sentence parts
  let texts = []; // The actual strings contained in each text node

  textNodeLoop:
  for (let i = 0; i < textNodes.length && pos_sentence < sentence.length; i++) {
    // Reset for each new starting node
    let temp_nodes = [];
    let temp_texts = [];
    let temp_pos_sentence = pos_sentence;

    for (let j = i; j < textNodes.length && temp_pos_sentence < sentence.length; j++) {
      const node = textNodes[j];
      const textContent = node.textContent.trim();
      if (textContent.length == 0) continue;
      const sentence_substr = sentence.substr(temp_pos_sentence)
      const sentence_substr_trimmed = sentence_substr.trim()

      // Get longest string match from the current position of the sentence
      const longestMatch = longestMatchingSubstring(textContent, sentence_substr.trim());

      // If no match or partial match without continuation, restart search with next node
      if (longestMatch.length === 0) {//} || (longestMatch.length < textContent.length && !sentence.startsWith(longestMatch, temp_pos_sentence))) {
        continue textNodeLoop;
      }

      // Update temporary lists
      const len_whitespace = sentence_substr.length - sentence_substr_trimmed.length;
      temp_texts.push(longestMatch);
      temp_nodes.push(node);
      temp_pos_sentence += longestMatch.length + len_whitespace;

      // If the whole sentence is found, update the final lists
      if (temp_pos_sentence === sentence.length) {
        texts = temp_texts;
        nodes = temp_nodes;
        break textNodeLoop;
      }
    }
  }

  return [texts, nodes];
}


// given a list of textnodes, find the subset of textnodes that contain a string
function findTextFast(textNodes, sentence_str) {
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


const defaultHighlightClass = 'shaderunner-highlight'

function highlightText(texts, nodes, highlightClass, title=null, markingClass = defaultHighlightClass) {
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
        span.classList.add(markingClass); // Add a specific class for easy identification
        span.classList.add(`highlightclass-${highlightClass}`); // Add a specific class for easy identification
        if (title)
          span.title = title
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


function resetHighlights(markingClass = defaultHighlightClass) {
  const markedElements = document.querySelectorAll(`span.${markingClass}`);
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
    'main', // The main HTML5 tag
    '#content', // Common ID for content
    '.main-content', // Common class name for main content
    '.content', // Another common class name
    '.app-main',
    'article', // HTML5 tag for article content
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


let colors = {}
const consistentColor = (s, alpha, saturation) => {
    alpha = alpha || 0.7;
    saturation = saturation || 80; 
    const S = JSON.stringify([s,alpha,saturation])
    if (S in colors)
        return colors[S];

    // Use a more complex hash function
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = s.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }

    // Improved hue calculation
    const hue = Math.abs(hash % 360); 

    // Varying saturation and lightness
    const lightness = 80;

    // Return the HSL color value
    let color = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    colors[S] = color;
    return color;
}


export { textNodesUnderElem, splitIntoWords, findTextSlow, findTextFast, highlightText, resetHighlights, findMainContent, consistentColor, defaultHighlightClass };