

// find all text nodes under an DOM element
function textNodesUnderElem(el){
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}


// find all text nodes that are not highlighted
function textNodesNotUnderHighlight(el) {
  var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);

  while (n = walk.nextNode()) {
    let parent = n.parentNode;
    let isUnderHighlight = false;

    // Traverse up the DOM tree to check if any parent is a span.highlight
    while (parent !== el) {
      if (parent.matches && parent.matches(`span.${defaultHighlightClass}, header, nav, h1, h2, h3, h4, h5, h6`)) {
        isUnderHighlight = true;
        break;
      }
      parent = parent.parentNode;
    }

    // If not under a span.highlight, add to the array
    if (!isUnderHighlight) {
      a.push(n);
    }
  }

  return a;
}


// split into words, whitespace & separate symbols
function splitIntoWords(str) {
  return str.match(/\w+|\s|\S/g) || [];
}



const defaultHighlightClass = 'shaderunner-highlight'

function highlightText(details: { from_text_node_char_start: any; to_text_node_char_end: any; from_text_node: any; to_text_node: any; }, nodes: Text[], highlightClass: any, transform=(el) => {}, markingClass = defaultHighlightClass) {
  if ((1 + details.to_text_node - details.from_text_node) !== nodes.length) {
    throw new Error('The length of nodes and texts should be the same.');
  }

  const replacedNodes = [] as Text[];
  let nextTextOffset = 0;
  nodes.forEach((node, i) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    nextTextOffset = 0;
    const textContent = node.textContent;
    const beforeText = textContent.substring(0, i == details.from_text_node ? details.from_text_node_char_start : 0);
    const afterText = textContent.substring(i == details.to_text_node ? details.to_text_node_char_end : textContent.length);
    const text = textContent.substring(beforeText.length, textContent.length - afterText.length);

    if (beforeText) {
      const beforeSpan = document.createElement('span');
      beforeSpan.textContent = beforeText;
      nextTextOffset += beforeText.length;
      node.parentNode.insertBefore(beforeSpan, node);
      if (beforeSpan.childNodes && beforeSpan.childNodes.length > 0)
        replacedNodes.push(beforeSpan.childNodes[0] as Text);
    }

    const span = document.createElement('span');
    span.textContent = text;
    span.classList.add(markingClass); // Add a specific class for easy identification
    span.classList.add(highlightClass); // Add a specific class for easy identification
    transform(span)
    node.parentNode.insertBefore(span, node);
    replacedNodes.push(span.childNodes[0] as Text);
    nextTextOffset += text.length;

    if (afterText) {
      const afterSpan = document.createElement('span');
      afterSpan.textContent = afterText;
      node.parentNode.insertBefore(afterSpan, node.nextSibling);
      if (afterSpan.childNodes && afterSpan.childNodes.length > 0)
        replacedNodes.push(afterSpan.childNodes[0] as Text);
    }

    node.parentNode.removeChild(node);
  });
  return {replacedNodes, nextTextOffset};
}


function surroundTextNode(node, highlightClass) {
    const textContent = node.textContent;
    const span = document.createElement('span');
    span.textContent = textContent;
    span.classList.add(defaultHighlightClass); // Add a specific class for easy identification
    span.classList.add(`highlightclass-${highlightClass}`); // Add a specific class for easy identification
    node.parentNode.insertBefore(span, node);
    node.parentNode.removeChild(node);
}


function resetHighlights(markingClass = defaultHighlightClass) {
  let markedElements = document.querySelectorAll(`span.${markingClass}`);
  while (markedElements.length) {
    markedElements.forEach(element => {
      element.replaceWith(document.createTextNode(element.textContent));
    });
    markedElements = document.querySelectorAll(`span.${markingClass}`);
  }
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
const consistentColor = (s: string, alpha=0.7, saturation=80) => {
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


export { textNodesUnderElem, splitIntoWords, findTextSlow, findTextFast, highlightText, resetHighlights, findMainContent, consistentColor, defaultHighlightClass, textNodesNotUnderHighlight, surroundTextNode };