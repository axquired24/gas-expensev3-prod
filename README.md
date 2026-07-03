# Gas Expense v3 (prod)

A mobile‑first expense dashboard served as an **Apps Script Web App**, built with **Preact** + **HTM** (no build step) and persisted in Google Sheets.

## Features
- Three tabs: **Expenses**, **Utang** (debts), **Hashtag** summaries.
- Month selector pill (top‑right) with native month picker; auto‑fetches on change.
- Per‑category / per‑hashtag / per‑utang‑type sum chips.
- Sticky **Amount** column in a horizontally scrollable table.
- Dark theme, safe‑area aware, optimised for iPhone‑class screens.
- Auto‑refresh, no client caching (Apps Script `addMetaTag('viewport')` + cache‑bust arg).

## Tech stack
- **Apps Script** (server: `doGet`, `getDevSheet`, `getSheetRows`)
- **Preact 10** + **HTM** (client, loaded via import map from esm.sh)
- **clasp** for push / version / deploy
- **Node script** (`scripts/deploy-webapp.mjs`) to create a version and update the web‑app deployment via the Apps Script API

## Local setup
```bash
npm install
npx clasp login          # one‑time
npx clasp clone <scriptId>
```

## Deploy
The project uses an `npm` pipeline:
```bash
git add . && git commit -m "..."
npx clasp push
npm run deploy           # creates version, updates web‑app, pushes to GitHub
```
`postdeploy` automatically force‑pushes the current commit to `github/main`.

## Config
- `config.js` — sheet ID, version, telegram keys, webhook URL.
- `expense_api.js` — server entry points.
- `Index.html` — single‑page client (Preact + HTM, import map, inline styles).

## Versioning
Bump `APP_VERSION` in `config.js` and the inline `<span class="version-inline">` in `Index.html` before any deploy.
