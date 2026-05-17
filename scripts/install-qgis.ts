/**
 * install-qgis.ts
 * Downloads and installs QGIS via the OSGeo4W weekly MSI.
 * Run: npx tsx scripts/install-qgis.ts
 */

import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TEMP_DIR = process.env.TEMP || process.env.TMP || '/tmp';
const INSTALL_DIR = 'C:\\Program Files\\QGIS';
const MSI_URL = 'https://download.osgeo.org/qgis/windows/weekly/QGIS-OSGeo4W-4.1.0-1143-3a91a340936-1.msi';
const MSI_PATH = join(TEMP_DIR, 'qgis-install.msi');
const LOG_PATH = join(__dirname, '../logs/qgis-install.log');

function log(msg: string) {
  console.log(`[$(new Date().toISOString())] ${msg}`);
  try {
    const dir = join(__dirname, '../logs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'qgis-install.log'), `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' });
  } catch { /* best effort */ }
}

function run(cmd: string, opts?: Record<string, unknown>): { exit: number; stdout: string; stderr: string } {
  try {
    const r = execSync(cmd, { timeout: 300000, ...opts, encoding: 'utf8' } as Record<string, unknown>);
    return { exit: 0, stdout: r as string, stderr: '' };
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return { exit: err.status || 1, stdout: '', stderr: err.message || String(e) };
  }
}

function isQGISInstalled(): boolean {
  // Check multiple possible install locations
  const paths = [
    'C:\\Program Files\\QGIS\\4.1\\bin\\qgis-bin.exe',
    'C:\\Program Files\\QGIS 3.34\\bin\\qgis-bin.exe',
    'C:\\Program Files\\QGIS 3.28\\bin\\qgis-bin.exe',
    'C:\\OSGeo4W\\apps\\qgis-ltr\\bin\\qgis-bin.exe',
  ];
  return paths.some(p => {
    try { require('fs').existsSync(p.replace(/\\/g, '\\\\')); return true; } catch { return false; }
  });
}

function checkQGISInstalled(): { installed: boolean; version: string; path: string } {
  const paths = [
    { path: 'C:\\Program Files\\QGIS\\4.1\\bin\\qgis-bin.exe', version: '4.1 (weekly)' },
    { path: 'C:\\Program Files\\QGIS 3.34\\bin\\qgis-bin.exe', version: '3.34 LTR' },
    { path: 'C:\\Program Files\\QGIS 3.28\\bin\\qgis-bin.exe', version: '3.28' },
    { path: 'C:\\OSGeo4W\\apps\\qgis-ltr\\bin\\qgis-bin.exe', version: 'OSGeo4W qgis-ltr' },
  ];
  for (const p of paths) {
    try {
      if (require('fs').existsSync(p.path.replace(/\\/g, '\\\\'))) {
        return { installed: true, version: p.version, path: p.path };
      }
    } catch { /* try next */ }
  }
  return { installed: false, version: '', path: '' };
}

async function downloadMSI(url: string, dest: string): Promise<boolean> {
  log(`Downloading QGIS MSI from ${url}`);
  // Use PowerShell to download with authentication bypass for redirects
  const ps = `
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri "${url}" -OutFile "${dest.replace(/\\/g, '\\\\')}" -UseBasicParsing -TransferTimeout 300
if ((Get-Item "${dest.replace(/\\/g, '\\\\')}").Length -lt 1024) { throw "Downloaded file too small" }
Write-Output "OK"
`;
  const result = run(`powershell -ExecutionPolicy Bypass -Command "${ps.replace(/\n/g, '; ')}"`, { maxBuffer: 1024 * 1024 });
  if (result.exit !== 0 || !result.stdout.includes('OK')) {
    log(`Download failed: ${result.stderr}`);
    return false;
  }
  log(`Download complete: ${dest}`);
  return true;
}

function installMSI(msiPath: string): boolean {
  log('Installing QGIS MSI (this may take 10-20 minutes)...');
  // /qb = quiet with basic UI, /norestart = don't auto-restart
  const result = run(
    `msiexec /i "${msiPath}" /qb INSTALLDIR="C:\\Program Files\\QGIS" PERUSER=1 /norestart`,
    { maxBuffer: 1024 * 1024 }
  );
  // Exit code 0 or 3010 (success, restart required) are both ok
  if (result.exit === 0 || result.exit === 3010) {
    log(`MSI install completed with exit code ${result.exit}`);
    return true;
  }
  log(`MSI install failed: ${result.stderr}`);
  return false;
}

function cleanup(path: string) {
  try { unlinkSync(path); } catch { /* ignore */ }
}

async function main() {
  log('=== QGIS Install Script Starting ===');
  
  const status = checkQGISInstalled();
  if (status.installed) {
    log(`QGIS is already installed: ${status.version} at ${status.path}`);
    log('Skipping installation.');
    return;
  }

  // Ensure temp dir exists
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  // Download
  const downloaded = await downloadMSI(MSI_URL, MSI_PATH);
  if (!downloaded) {
    log('FATAL: Could not download QGIS MSI');
    process.exit(1);
  }

  // Install
  const installed = installMSI(MSI_PATH);
  cleanup(MSI_PATH);

  if (!installed) {
    log('FATAL: QGIS installation failed');
    process.exit(1);
  }

  // Verify
  const finalStatus = checkQGISInstalled();
  if (finalStatus.installed) {
    log(`SUCCESS: QGIS ${finalStatus.version} installed at ${finalStatus.path}`);
  } else {
    log('WARNING: Install reported success but QGIS not found at expected paths');
  }
  
  log('=== QGIS Install Script Complete ===');
}

main().catch(e => { log(`FATAL: ${e}`); process.exit(1); });