# Tenomtu

A browser-based number guessing game in Bahasa Melayu and English. Choose one
of six ranges, guess the hidden number, and get higher/lower hints. Best guess
counts are saved per difficulty in the browser; active games are not saved.
Switch between light and dark themes at any time.

## Requirements

- Node.js 22.12 or newer
- npm

## Run locally

```sh
npm install
npm run dev
```

## Test and build

```sh
npm test
npm run build
```

## Deploy to Cloudflare Workers

1. Sign in to Cloudflare with Wrangler: `npx wrangler login`.
2. Build and deploy the static site: `npm run cf:deploy`.

The Worker serves the built `dist` files. There is no game API, database, or
account service in this phase. To preview through the Workers runtime locally,
run `npm run cf:dev`.
