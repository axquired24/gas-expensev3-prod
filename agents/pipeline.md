# Pipeline

The current end‑to‑end pipeline for shipping a change to the live web app and the GitHub mirror.

## 1. Pre‑flight

Before any deploy, **bump the version** in two places (project rule):
- `config.js` → `const APP_VERSION = 'x.y.z';`
- `Index.html` → inline `<span class="version-inline">vx.y.z</span>`

## 2. Local flow

```bash
git add .
git commit -m "type(scope): summary"
npx clasp push
npm run deploy
```

| Step | Tool | Effect |
|---|---|---|
| `git add .` / `git commit` | git | Records the change locally. |
| `npx clasp push` | clasp | Uploads every project file (HTML, JS, JSON) to the Apps Script project. |
| `npm run deploy` | node | Runs `scripts/deploy-webapp.mjs`, which: |

### `npm run deploy` (detailed)

1. Reads `APP_VERSION` from `config.js` via regex.
2. Reads `scriptId` from `.clasp.json`.
3. Loads OAuth creds from `~/.clasprc.json` (`tokens.default`).
4. `script.projects.versions.create` — creates a new immutable version of the code, `description = APP_VERSION`.
5. `script.projects.deployments.list` → find the deployment whose
   `deploymentId === EXPECTED_DEPLOYMENT_ID` (see §4). Throws if not found.
6. `script.projects.deployments.update` with body:
   ```js
   { deploymentConfig: { versionNumber, description: APP_VERSION } }
   ```
   This edits the existing web‑app deployment to point at the new version — same URL, new code.
7. Logs `Updated deployment <id> to version <n>` and the **web app URL**.
8. `spawn('open', [url])` — opens the URL in the default browser (macOS).

### `postdeploy` (automatic)

Defined in `package.json`:
```json
"postdeploy": "git push -u github HEAD:main --force || true"
```
Runs immediately after `npm run deploy` and force‑pushes the current commit to the `github` remote (which points to `git@github.com:axquired24/gas-expensev3.git`).

## 3. The three remotes / files that matter

- `.clasp.json` — `{ "scriptId": "…" }`
- `~/.clasprc.json` — OAuth token (`tokens.default`) for the Apps Script API
- `package.json` — `deploy` + `postdeploy` scripts
- `scripts/deploy-webapp.mjs` — the deploy logic

## 4. Pinned deployment ID

The pipeline **only updates** one specific deployment. Creating a new deployment
would generate a new public URL, which we never want.

- `EXPECTED_DEPLOYMENT_ID` is hardcoded at the top of `scripts/deploy-webapp.mjs`
- The script looks up the deployment by ID, then calls `deployments.update` —
  same `deploymentId` → same URL, new code
- If the pinned deployment is missing, the script throws. It **never** silently
  creates a new one
- Bumping `EXPECTED_DEPLOYMENT_ID` is a deliberate operation, not an accident

## 5. Client‑side safeguards against stale data

- `fetchSheet(param)` calls `getDevSheet(param, Date.now())`. The second arg is ignored server‑side but changes the call signature, busting Apps Script’s 6‑hour script cache.
- The server function `getDevSheet` reads `EXPENSE_SHEET_ID` from `config.js` (single source of truth).
- `Index.html` ships no `<meta http-equiv="Cache-Control">` (stripped by sanitisation); cache‑busting relies on the `Date.now()` arg + the deployment update.

## 6. Mobile responsiveness

- `expense_api.js` `doGet` adds `<meta name="viewport" …>` via `addMetaTag` (the only way that survives Apps Script HTML sanitisation).
- Static `<meta>` tags in `Index.html` are ignored by `HtmlService`.

## 7. One‑shot summary

```bash
# 1. edit code
# 2. bump version in config.js + Index.html
git add . && git commit -m "feat: …"
npx clasp push
npm run deploy    # creates version, updates web‑app deployment, opens URL
# postdeploy: force‑pushes the commit to github/main
```

---

**TODO / known gaps** (for you to review):
- `--force` on `main` is destructive if the remote has divergent history; acceptable while the repo is single‑user.
- No CI / lint step.
- `postdeploy` only pushes the current branch to `main` on `github`; if you ever work on a different branch, decide whether to push it as `main` or to a named branch.
- Versioning is manual; could be automated (e.g. `npm version` + script that writes into `config.js` and `Index.html`).
