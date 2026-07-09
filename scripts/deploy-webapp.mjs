import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { google } from 'googleapis';

// 0. PINNED DEPLOYMENT (main branch only) — public URL preserved.
const EXPECTED_DEPLOYMENT_ID = 'AKfycbwgMUrixaicNVmbz7-jjc9vGHC6Ywu6sqTHWxcZi3-R607pPB_k1lgsn30rnidYjU92';
// Version the main branch is locked to. Non-main branches create fresh versions.
const LOCKED_VERSION = 20;

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

// 4. Detect current branch
const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const isMain = branch === 'main';
console.log(`Branch: ${branch}`);

if (isMain) {
  // MAIN: lock pinned deployment to v9, never create a new version
  const list = await script.projects.deployments.list({ scriptId });
  const webDeploy = (list.data.deployments || []).find(
    (d) => d.deploymentId === EXPECTED_DEPLOYMENT_ID,
  );
  if (!webDeploy) {
    throw new Error(
      `Pinned deployment ${EXPECTED_DEPLOYMENT_ID} not found. ` +
      `Refusing to create a new deployment on main (would change the public URL).`,
    );
  }

  const currentVersion = webDeploy.deploymentConfig?.versionNumber;
  if (currentVersion !== LOCKED_VERSION) {
    const updateRes = await script.projects.deployments.update({
      scriptId,
      deploymentId: EXPECTED_DEPLOYMENT_ID,
      requestBody: {
        deploymentConfig: {
          versionNumber: LOCKED_VERSION,
          description: `pinned to v${LOCKED_VERSION} (${VERSION})`,
        },
      },
    });
    const url = updateRes.data.entryPoints?.find((e) => e.webApp)?.webApp?.url;
    console.log(`[main] reset ${EXPECTED_DEPLOYMENT_ID} from v${currentVersion} -> v${LOCKED_VERSION}`);
    console.log(`Web app URL : ${url}`);
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    const url = webDeploy.entryPoints?.find((e) => e.webApp)?.webApp?.url;
    console.log(`[main] already at v${LOCKED_VERSION}, no change`);
    console.log(`Web app URL : ${url}`);
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
} else {
  // NON-MAIN: create new version, then update existing deployment for this branch
  // (or create a new one on first deploy of this branch)
  const versionRes = await script.projects.versions.create({
    scriptId,
    requestBody: { description: `${VERSION} (${branch})` },
  });
  const versionNumber = versionRes.data.versionNumber;
  console.log(`Created version ${versionNumber} (${VERSION}) on branch ${branch}`);

  const list = await script.projects.deployments.list({ scriptId });
  const branchSuffix = `(${branch})`;
  const existing = (list.data.deployments || []).find(
    (d) => typeof d.deploymentConfig?.description === 'string'
      && d.deploymentConfig.description.endsWith(branchSuffix),
  );

  let res;
  if (existing) {
    res = await script.projects.deployments.update({
      scriptId,
      deploymentId: existing.deploymentId,
      requestBody: {
        deploymentConfig: { versionNumber, description: `${VERSION} ${branchSuffix}` },
      },
    });
    console.log(`[${branch}] updated deployment ${existing.deploymentId} to v${versionNumber}`);
  } else {
    res = await script.projects.deployments.create({
      scriptId,
      requestBody: { versionNumber, description: `${VERSION} ${branchSuffix}` },
    });
    console.log(`[${branch}] created new deployment ${res.data.deploymentId} for v${versionNumber}`);
  }
  const url = res.data.entryPoints?.find((e) => e.webApp)?.webApp?.url;
  console.log(`Web app URL : ${url}`);
  spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
}
