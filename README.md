# Authenticator — 2FA TOTP

A lightweight, private generator for two-factor TOTP codes, hosted on Cloudflare Workers and installable as a PWA.

Live demo: [2live.ir](https://2live.ir)

## Features

- 6-digit TOTP codes with a 30-second period and HMAC-SHA1 (RFC 6238).
- **Codes are generated entirely in the browser** with Web Crypto — secrets are never sent to any server.
- Accepts Base32 secrets with spaces, lowercase letters or `=` padding; input is normalized before use.
- Keeps up to 10 keys. Each key gets a card with a live code and a countdown ring, and can be given a name.
- The selected key's code is shown on six large tiles with a digit-roll animation and a time-left bar that turns orange in the last 5 seconds.
- Copy the code with one click or the <kbd>C</kbd> key, or copy the full result (`SECRET | CODE`).
- Shortcuts: <kbd>/</kbd> focuses the input, and <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere on the page adds a secret directly.
- **PWA**: installable on mobile and desktop, runs in its own window, and works fully offline.
- Secrets are stored in the browser's `localStorage`; generated codes are never stored.
- Secrets saved by the previous version (`totp-history-v1`) are migrated automatically.
- Responsive layout for desktop and mobile, and respects the system "reduce motion" setting.

## Project structure

```text
cf-worker/
├── public/
│   ├── index.html              # Main page
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # Service worker (offline cache)
│   ├── icons/                  # App icons (192, 512, maskable, Apple)
│   └── v2/
│       ├── vault.css
│       └── vault.js            # App logic and TOTP generation
├── src/index.js                # Worker (serves assets + legacy /api/totp)
└── wrangler.jsonc
```

> `POST /api/totp` still exists in the Worker, but the current page does not use it.

## Run locally

Requirements: Node.js and a Cloudflare account.

```powershell
npm install
npm run dev
```

Then open the local address Wrangler prints (default `http://localhost:8787`).

## Deploy to Cloudflare

```powershell
npx wrangler login
npm run deploy
```

Wrangler prints the Worker URL after deploying.

## Install as an app (PWA)

- **Android / Chrome / Edge:** use the "Install app" button at the top of the page, or Install from the browser menu.
- **iPhone / iPad:** in Safari, tap Share → Add to Home Screen.

After the first visit, the app opens and generates codes without an internet connection.

### Updating app files

The page itself is always fetched from the network when online, while CSS/JS are served from cache and refreshed in the background. After changing those files, bump `CACHE` in [`public/sw.js`](public/sw.js) (e.g. `authenticator-v2`) so the old cache is cleared.

## Privacy

Codes are generated in the browser and secrets never leave the device. The list of secrets lives only in that browser's `localStorage`. To remove it, use the `Clear all` button on the page or clear the site data in your browser settings.

The only external request is loading the fonts (Space Grotesk and JetBrains Mono) from Google Fonts.
