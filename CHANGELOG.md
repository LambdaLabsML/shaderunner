


## ShadeRunner Version 0.9.0

**Features**:
- opening plugin does nothing -- let's user decide on mode to use

**Refactor**:
- streamlined IndexedDB database (using dexie)

**Bugfixes**:
- embedding not computed on startup


-------



## ShadeRunner Version 0.8.0

**Features**:
- **new feature**: summarize all paragraphs on a page
- **new feature**: jump/scroll to first result after highlight has been applied
- **defaults**: find source / retrieval is now the default option (and much faster)
- automatic removal of old embedding databases

**Minor**:
- faster / more stable message passing of all plugin components
- simplified sidepanel ui appearance by hiding/showing switches depending on mode
- new active status: plugin is now active when sidepanel is open
- adapted background color to match new chrome version
- replaced localStorage with background script storage

**Bugfixes**:
- throttled calls to highlight (when user changes setting during computations)
- minified calls to highlight
- fixed error regarding missing class embeddings


-------



## ShadeRunner Version 0.7.0

**Features**:
- Retrieval Mode readded
    - Added retrieval-k slider for control of amount highlighted
- Control highlight quality with a "precision-vs-recall" slider

**Minor**:
- Added version to sidepanel and options tab
- styling:
    - Added dark-mode style to options
    - Adapted options page color
    - Added logo to sidepanel
- Improved efficiency of mouse hover events in Legend 
- Replaced useSessionStorage with useStorage for improved storage handling 
- Updated global storage handling 
- Testing:
    - Implemented batchwise method in `llm_classify`
    - Implemented evaluation and visualization improvements in `tabs/testing`


**Bugfixes**:
- Fixed visual bug for inactive topics in legend 
- Fixed collapsible box in light-mode 
- Bugfix for highlighting not starting without clicking a button 
- Fixed scroller to exclude hidden elements 
- Resolved issue with precise search limit not working 
- Bugfix for amount highlighter not using score 
- Addressed multiple highlight update issues in different modes 
- Fixed issue with status display 
- Corrected error handling in sidepanel when not connected to a webpage 
- Bugfixes for issues with bad classifierData 


-------



## ShadeRunner Version 0.6.1

**Minor**:
- content extraction now searches till the end of the document

**Bugfixes**:
- content extraction bug: cannot trim undefined
- Testsethelper: did not save `document.title`
- race conditions for status messages
- fixed embedding "commputing" status indicator (percentage was not showing up)

-------




## ShadeRunner Version 0.6.0

**Features**:
- **Reimplementation of core highlighting mechanism**
    - to increase quality uses precomputed fuzzy string distances on text nodes for matching `innerText` to `textContent`
    - better text Node selection (only actually visible text nodes)
- **Performance**:
    - parallel embedding of classifier and content
    - replaced ChromaDB by local IndexedDB

**Minor**:
- TestsetHelper: disabled any click events other than those of shaderunner in this mode 

**Bugfixes**:
- Legend: "show all" after "focus on" did not show all highlights
- TestsetHelper: fixed interference with other highlighting modes
- LLM Classifier:
    - fixed chat models
    - using more stable class delimiter (`|` instead of `,`)
- saved url was missing `window.location.search`

-------



## ShadeRunner Version 0.5.0

**Features**:
- **Advanced/Amount Highlighted added**: steer percentage of top highlights to highlight
- **Advanced/ThoughtInfo added**: shows thought process of llm (scope & reasoning)
- **Advanced/Class Similarities added**: force-spring plot to show similarities of classes on mouse-hover
- **Suggest missing topic**-buttton added to legend

**Minor**:
- **Mouseover on highlights**: now shows closest interesting and closest uninteresting class
- **Options**: obfuscate openai api key
- **Legend**: inactivate topics without any matches
- **Sidebar**: Adapted style of collapsible boxes + nested collapsible boxes
- **Testing**: started working on testing tab
- **More Stable Highlighting**: more sentences found by using `innerText` on `document.body`

**Bugfixes**:
- Highlighter:
    - fixed caching of class embeddings (on sidebar reopen, on page refresh)
    - fixed status indicator not updating for highlights
    - fixed highlight reset not resetting all highlights
    - fixed text finding when sentence starts later in a text node
- Background service worker:
    - fixed "invalid URL" errors in various cases
- Legend:
    - filterSelector not working
    - fixed removal of topics not updating immediately



-------


## ShadeRunner Version 0.4.0

**Features**:
- complete reimplementation / restructure of project (files, methods & functionality)
- complete redesign (with dark-mode!)
- plugin sidepanel instead of embedded controls
- batch-wise embedding
- improved speed of highlighting
- next/prev highlight buttons

**Minor**:
- added ui for outlier topics
- showing dynamic status of computations
- show number of finds per class
- caching of class embeddings
- simple testset helper added

**Code**:
- many ts type mismatches fixed
- detached messaging from position of code using useGlobalStorage
- added boxicons icons


-------


## ShadeRunner Version 0.3.0

**Features**:
- cache llm response & allow user to change topics
- improved string matching (first try by-word matching, then slower by-char matching)
- improved topic prompt by introducing concept of "interesting", "outliers" and "scope". also improved training examples
- new color for each positive topic added
- added floating legend + click/hover effects to toggle highlight topics
- added focus mode (only preview, removes all but highlighted text)

**Settings**:
- ensure settings are set upon installation
- disable threshold values by default
- added gpt temperature
- added custom/openchat api endpoint
- added gpt-4 turbo preview
- disabled retrieval mode by default

**Minor**:
- mousehover on highlight shows assigned class and score
- update plugin icon status on tab change & startup
- reset highlights before next query
- use session storage for query data (also on a per-url basis)
- verbose-mode prints error when text not found on page
- cached embeddings not found sometimes
- dev-mode: enabled persistent storage for debugging
- collapsed view of thought process & histograms
- clear data on empty input
- slight visualization improvement to show when computations are ongoing
- input field more responsive
- increased highlight color variance
- changed default highlight class names (`shaderunner-highlight`)

**Bugfixes**:
- prevent concurrent highlights on startup
- force plasmo-inline to be visible (fixes reddit)
- fixed color not updating in some cases
- fixed retrieval text color
- storage quota exceed errors fixed (by moving scores from storage to state)
- do not highlight when not active
- `minimaleps` not working in all cases
- enable partial classifierData objects in rendering
- highlight-update did not use async to call highlightUsingX methods

-------


## ShadeRunner Version 0.2.0

**Features**:
- clicking icon enables/disables plugin on current tab
- added keyboard shortcut (Ctrl/Command + B)
- replace popup with options-page
- added many tweaking options of algorithm: threshold (minimal, decision, always)
- added retrieval mode
- added gpt model & version options
- improved histogram visualization (showing diffs & positive class scores)
- improved anchor (should be showing up on more websites now)

-------

## ShadeRunner Version 0.1.0

**Features**:
- basic funcitonality to highlight on any webpage using LLM-based class embeddings

-------