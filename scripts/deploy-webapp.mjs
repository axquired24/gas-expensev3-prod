import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { google } from 'googleapis';

// 1. Read version from config.js
const configSrc = readFileSync('config.js', 'utf8');
const versionMatch = configSrc.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) throw new Error('APP_VERSION not found in config.js');
const VERSION = versionMatch[1];

// 2. Read scriptId from .clasp.json
const { scriptId } = JSON.parse(readFileSync('.clasp.json', 'utf8'));

// 3. Load OAuth creds from ~/.clasprc.json
const { tokens } = JSON.parse(
  readFileSync(join(process.env.HOME, '.clasprc.json'), 'utf8'),
);
const t = tokens.default;

const auth = new google.auth.OAuth2(t.client_id, t.client_secret);
auth.setCredentials({
  refresh_token: t.refresh_token,
  access_token: t.access_token,
  expiry_date: t.expiry_date,
  token_type: t.token_type,
  id_token: t.id_token,
});

const script = google.script({ version: 'v1', auth });

// 4. Create new version
const versionRes = await script.projects.versions.create({
  scriptId,
  requestBody: { description: VERSION },
});
const versionNumber = versionRes.data.versionNumber;
console.log(`Created version ${versionNumber} (${VERSION})`);

// 5. Find existing versioned web app deployment (skip HEAD)
const list = await script.projects.deployments.list({ scriptId });
let webDeploy = null;
const candidates = (list.data.deployments || [])
  .filter((d) => d.deploymentConfig && d.deploymentConfig.versionNumber)
  .sort((a, b) => b.deploymentConfig.versionNumber - a.deploymentConfig.versionNumber);
for (const d of candidates) {
  const eps = d.entryPoints || [];
  if (Array.isArray(eps) && eps.some((ep) => ep.webApp)) {
    webDeploy = d;
    break;
  }
}

if (!webDeploy) {
  throw new Error('No versioned web app deployment found. Create one via the UI first.');
}

const updateRes = await script.projects.deployments.update({
  scriptId,
  deploymentId: webDeploy.deploymentId,
  requestBody: {
    deploymentConfig: {
      versionNumber,
      description: VERSION,
    },
  },
});

const deploymentId = updateRes.data.deploymentId;
const url = updateRes.data.entryPoints?.find((ep) => ep.webApp)?.webApp?.url;
console.log(`Updated deployment ${deploymentId} to version ${versionNumber} (${VERSION})`);
console.log(`Web app URL : ${url}`);

// 6. Open URL in default browser
spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
