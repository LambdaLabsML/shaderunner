


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