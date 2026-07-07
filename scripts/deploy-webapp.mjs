import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { google } from 'googleapis';

// 0. PINNED DEPLOYMENT — do not change without explicit user approval.
// This is the public web app URL:
//   https://script.google.com/macros/s/<EXPECTED_DEPLOYMENT_ID>/exec
// The pipeline only UPDATES this deployment. It will never create a new one
// (creating would generate a new URL). If this deployment is missing, the
// script fails loudly instead of silently creating a new one.
const EXPECTED_DEPLOYMENT_ID = 'AKfycbwgMUrixaicNVmbz7-jjc9vGHC6Ywu6sqTHWxcZi3-R607pPB_k1lgsn30rnidYjU92';

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

// 5. Find the pinned deployment (refuse to create a new one)
const list = await script.projects.deployments.list({ scriptId });
const webDeploy = (list.data.deployments || []).find(
  (d) => d.deploymentId === EXPECTED_DEPLOYMENT_ID,
);

if (!webDeploy) {
  throw new Error(
    `Pinned deployment ${EXPECTED_DEPLOYMENT_ID} not found in script ${scriptId}. ` +
    `Refusing to create a new deployment (would change the public URL). ` +
    `Restore the deployment via the Apps Script editor, or update EXPECTED_DEPLOYMENT_ID in scripts/deploy-webapp.mjs.`
  );
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
