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
| `npm run deploy` | node | Runs `scripts/deploy-webapp.mjs`, which branches on the current git branch: |

### `npm run deploy` — branch behaviour

`scripts/deploy-webapp.mjs` reads the current branch with
`git rev-parse --abbrev-ref HEAD` and behaves differently per branch.

**On `main` (production):**
1. Reads `APP_VERSION` from `config.js` via regex (logging only — version is not used).
2. Reads `scriptId` from `.clasp.json`.
3. Loads OAuth creds from `~/.clasprc.json` (`tokens.default`).
4. `script.projects.deployments.list` → find the deployment whose
   `deploymentId === EXPECTED_DEPLOYMENT_ID` (see §4). Throws if not found.
5. If current `versionNumber === LOCKED_VERSION` (9): no-op, just logs and opens URL.
6. Else: `script.projects.deployments.update` with body
   `{ deploymentConfig: { versionNumber: LOCKED_VERSION, description: "pinned to v9 (...)" } }`.
   This snaps the pinned deployment back to v9, regardless of what newer versions exist.
7. Logs deployment state and **web app URL**.
8. `spawn('open', [url])` — opens the URL in the default browser (macOS).

**On any other branch (preview):**
1. Reads `APP_VERSION` from `config.js` via regex.
2. Reads `scriptId` from `.clasp.json`.
3. Loads OAuth creds from `~/.clasprc.json` (`tokens.default`).
4. `script.projects.versions.create` — creates a new immutable version,
   `description = "${APP_VERSION} (${branch})"`.
5. `script.projects.deployments.create` with body
   `{ deploymentConfig: { versionNumber, description: "${APP_VERSION} (${branch})" } }`.
   This creates a fresh deployment (new URL) for the branch. The pinned main deployment
   is untouched. Each deploy on a non-main branch adds another deployment — clean up
   via the GAS editor or a separate `deployments.delete` script.
6. Logs new deployment id and **web app URL** (differs from main URL).
7. `spawn('open', [url])` — opens the URL in the default browser (macOS).

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

## 4. Pinned deployment + branch behaviour

The pipeline branches on `git rev-parse --abbrev-ref HEAD` and behaves
differently per branch.

**Production URL (frozen on `main`):**
- `EXPECTED_DEPLOYMENT_ID` is hardcoded at the top of `scripts/deploy-webapp.mjs`
- `LOCKED_VERSION = 9` is the version the main branch is pinned to
- On `main`, the script snaps the deployment back to v9 regardless of newer
  versions; it never creates a new version
- The public URL is preserved across every `main` deploy
- If the pinned deployment is missing, the script throws. It **never** silently
  creates a new one on main

**Preview URLs (non-main branches):**
- Each `npm run deploy` on a non-main branch creates a new immutable version
  and a new deployment (new URL) with description `${APP_VERSION} (${branch})`
- The pinned `main` deployment is untouched
- Non-main deployments accumulate — clean up via the GAS editor or a separate
  `deployments.delete` script
- Bumping `EXPECTED_DEPLOYMENT_ID` or `LOCKED_VERSION` is a deliberate operation,
  not an accident

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
