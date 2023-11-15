This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, install & run a chromadb instance
```bash
git clone git@github.com:chroma-core/chroma.git
cd chroma
docker-compose up -d --build
```

Next, to create a production build, run the following:
(If you want to develop yourself, see below.)

```bash
pnpm build
# or
npm run build
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.


## Developing
First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.


By default the settings are stored on a per-session basis.
For debugging it may make sense to use persistent storage instead.
To enable this, create a file `.env.development` with the following contents:

```bash
PLASMO_PUBLIC_STORAGE="persistent"
```

Now restart the development server.