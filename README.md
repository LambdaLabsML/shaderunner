<h1 align="center">
ShadeRunner
</h1>


<h3 align="center">
    <br/>
    <img src="./assets/icon.png" width="100" alt="Logo"/><br/><br/>
    a smart highlighting chrome plugin<br/>
    (pre-alpha release - really, a WIP)
</h3>


<p align="center">
  Jump To:
  <a href="#setup">Setup</a>,
  <a href="#contributing">Contributing</a>,
  <a href="#license">License</a>
</p>


<p align="center">
    <a href="https://github.com/LambdalabsML/shaderunner/releases"><img src="https://img.shields.io/github/v/release/LambdalabsML/shaderunner?colorA=363a4f&colorB=a6da95&style=for-the-badge"/></a>
    <a href="https://github.com/LambdalabsML/shaderunner/commits"><img src="https://img.shields.io/github/commit-activity/m/LambdalabsML/shaderunner?colorA=363a4f&colorB=0099ff&style=for-the-badge"/></a>
    <a href="https://github.com/LambdalabsML/shaderunner/releases"><img src="https://img.shields.io/github/downloads/LambdalabsML/shaderunner/total?colorA=363a4f&colorB=60b9f4&style=for-the-badge"/></a>
</p>


<p align="center">
  <img src="https://github.com/LambdaLabsML/shaderunner/assets/142889449/fea21a41-8448-40dc-a2f5-51eee5264f9b"/>
</p>

## Setup

**Precompiled**:
1. Download the newest release.
2. Unpack the zip file.
3. In Chrome go to "Manage Extensions > Load Unpacked" and choose the unpacked folder.
4. Activate the plugin
5. Add your openai api-key in the plugin settings.
6. (Optional:) Pin shaderunner to your toolbar bar.


**Build From Source**:
To create a production build, run the following:
(If you want to develop yourself, see below.)

```bash
pnpm build
# or
npm run build
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.


## Contributing
First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.


Now restart the development server.

## License
MIT License