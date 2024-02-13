<h1 align="center">
ShadeRunner
</h1>


<h3 align="center">
    <br/>
    <img src="./assets/icon.png" width="100" alt="Logo"/><br/><br/>
    Chrome plugin for enhanced on-page research 
    (still in alpha, btw)
</h3>
<p align="center" style="font-weight:normal">
    text highlighting, paragraph summarization, and topic suggestions
</p>


<p align="center">
    <a href="https://github.com/LambdalabsML/shaderunner/releases"><img src="https://img.shields.io/github/v/release/LambdalabsML/shaderunner?colorA=363a4f&colorB=a6da95&style=for-the-badge"/></a>
    <a href="https://github.com/LambdalabsML/shaderunner/commits"><img src="https://img.shields.io/github/commit-activity/m/LambdalabsML/shaderunner?colorA=363a4f&colorB=0099ff&style=for-the-badge"/></a>
    <a href="https://github.com/LambdalabsML/shaderunner/releases"><img src="https://img.shields.io/github/downloads/LambdalabsML/shaderunner/total?colorA=363a4f&colorB=60b9f4&style=for-the-badge"/></a>
</p>

<p align="center">
  Jump To:
  <a href="#about----improve-your-online-research-">About</a>,
  <a href="#features">Features</a>,
  <a href="#getting-started">Getting Started</a>,
  <a href="#contributing">Contributing</a>,
  <a href="#license">License</a>
</p>


<p align="center">
  <img src="https://github.com/LambdaLabsML/shaderunner/assets/142889449/fea21a41-8448-40dc-a2f5-51eee5264f9b"/>
</p>


## About -- Improve Your Online Research 🚀
How do you know if a Large Language Model (LLM) response is right or wrong? 🤔  
Well, in general, we don't – if an answer matters to us, we need to check the source material!  
So, how about we make the browsing experience a bit more fun? 🎉

Check out what our plugin brings to the table:
- **Quick Source Finding**: 🦸‍♂️ Fly right to the source of a search term like a superhero.
- **Colorful Topic Explorer**: 🌈 Highlights related topics in vibrant colors, just like those fifth-grade textbooks, but smarter.
- **Dynamic Summarizer**: 📝 Shrinks down long paragraphs for a quick read. Curious for more while skim-reading? Just click to unfold the full story."

Ready for a sneak peek of these cool features? Just scroll down! 👀  
And if you're eager to dive right in, check the installation instructions right away. 🛠️

Let's get started! 🚀


## Features

### Source Finding 🔍
This feature is like "Ctrl + F, but on steroids". ✨
Just enter your question or a summary from another source, and find the most relevant sentence on the page in a snap.

**How does it work?**:
- First, it processes all sentences on the page, converting them into vectors and storing them in a local database. This happens while you type.
- When you send the request, the plugin also converts your question
- Finally, the plugin identifies the nearest sentence to your question's vector and highlights it. Efficient, precise and handy.

See it in action below.
![sr_retrieval](https://github.com/LambdaLabsML/shaderunner/assets/142889449/24d4768f-2f7c-41d1-a353-be2a1089d0e7)

### Topic Explorer 🌐
Sometimes, the answer isn't straightforward, and you're more in an exploratory mood, right?  
That's where our Topic Explorer shines!

**How does it work?**:
- Like before, it turns all the sentences on the page into vectors. Think of them as unique fingerprints.
- Now, here's the twist: instead of hunting for the closest match to your query, the plugin consults a Large Language Model (LLM) to brainstorm topics related to your input.
- The LLM plays a game of "Hot or Not" with topics. Searching for "engine types"? It'll tag "combustion engine" and "electric engine" as hot (interesting) topics. Cold (uninteresting) ones are things like "general mechanical components", "vehicle brands" or "site navigation".
- The plugin then matches each sentence on the page with the nearest hot topic and highlights them in a burst of colors. It's like watching a firework of insights!

See it in action below.  
(Note: Footage sped-up as LLM response may take very long - but the Highlighting is fast 😅).
![topic_explorer](https://github.com/LambdaLabsML/shaderunner/assets/142889449/bc3794a2-56cf-4202-99b8-fd56bf1e5245)


### Dynamic Summarizer 📚
Ready to dive deep but want to skip the swimming lessons? Our Dynamic Summarizer is your snorkel gear!  
Why wade through pages when you can get the gist first? This nifty tool is like having a personal assistant who reads all the heavy stuff and gives you the highlights.

Hit the "Summarize Paragraphs" button, and watch as the LLM munches through lengthy texts, turning them into bite-sized summaries. Want the full story? A simple click toggles between the nutshell version and the original text. It's like having a book and its cliff notes side by side!

(Note: The demo footage skips the waiting time for the LLM response. Well, LLMs like to think things through .... 😅)
![sr_summarize](https://github.com/LambdaLabsML/shaderunner/assets/142889449/c2648bef-6e4d-4015-b800-0046736f8a52)


## Getting Started

**Installation Instructions**:
1. Download the [latest release](https://github.com/LambdaLabsML/shaderunner/releases/latest/download/build.zip).
2. Unpack the zip file.
3. In Chrome go to "Manage Extensions > Load Unpacked" and choose the unpacked folder.
4. Activate the plugin.
5. Add your openai api-key in the plugin settings.
6. (Optional:) Pin shaderunner to your toolbar.

Or, if you want to **build From Source** yourself:  
To create a production build, run the following:
(If you want to develop yourself, see below.)

```bash
pnpm build
# or
npm run build
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-prod`.


## Contributing
Want to make a feature suggestion? 

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.
You can start editing the files - It should auto-update as you make changes. Check out the documentation for the used framework: https://docs.plasmo.com/.

Your contributions are welcome!

## License
MIT License
