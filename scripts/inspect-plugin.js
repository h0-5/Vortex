#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const archivePath = process.argv[2];

if (!archivePath) {
  console.error('Usage: node scripts/inspect-plugin.js <plugin.vortex|plugin.codenexus>');
  process.exit(1);
}

if (!existsSync(archivePath)) {
  console.error(`Package not found: ${archivePath}`);
  process.exit(1);
}

function isZip(filePath) {
  const header = readFileSync(filePath).subarray(0, 4);
  return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
}

function isUnsafeArchiveEntry(entryName) {
  const normalized = path.normalize(entryName);
  return (
    entryName.includes('..') ||
    entryName.startsWith('/') ||
    entryName.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/u.test(entryName) ||
    normalized.startsWith('..') ||
    normalized.startsWith('/') ||
    normalized.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/u.test(normalized)
  );
}

function normalizePluginRoot(files) {
  const manifests = files.filter((file) => path.basename(file) === 'plugin.json');
  if (manifests.length !== 1) {
    return { manifestPath: null, root: null, reason: manifests.length === 0 ? 'plugin.json missing' : 'multiple plugin.json files' };
  }
  const manifestPath = manifests[0];
  const root = path.posix.dirname(manifestPath).replace(/^\.$/u, '');
  return { manifestPath, root, reason: null };
}

function joinArchivePath(root, file) {
  return root ? `${root}/${file}` : file;
}

function print(label, value) {
  console.log(`${label}: ${value}`);
}

const packageType = isZip(archivePath) ? 'zip' : 'unknown';
print('package', archivePath);
print('package type', packageType);

if (packageType !== 'zip') {
  print('validation result', 'failed: package is not a ZIP archive');
  process.exit(1);
}

let zip;
try {
  zip = new AdmZip(archivePath);
} catch (error) {
  print('validation result', `failed: ${error instanceof Error ? error.message : 'unable to open archive'}`);
  process.exit(1);
}

const entries = zip.getEntries();
const files = entries
  .filter((entry) => !entry.isDirectory)
  .map((entry) => entry.entryName.replace(/\\/gu, '/'))
  .sort();
const unsafeEntries = files.filter(isUnsafeArchiveEntry);
const rootInfo = normalizePluginRoot(files);
let manifest = null;
let manifestError = null;

if (rootInfo.manifestPath) {
  try {
    const entry = zip.getEntry(rootInfo.manifestPath);
    manifest = JSON.parse(entry.getData().toString('utf8'));
  } catch (error) {
    manifestError = error instanceof Error ? error.message : 'manifest is not valid JSON';
  }
}

const schemaPath = rootInfo.root !== null ? joinArchivePath(rootInfo.root, 'dashboard.schema.json') : null;
const schemaFound = schemaPath ? files.includes(schemaPath) : false;
const dashboardEnabled = Boolean(manifest?.dashboard?.enabled || manifest?.capabilities?.dashboard);

print('manifest found', rootInfo.manifestPath ? 'yes' : 'no');
print('manifest path', rootInfo.manifestPath ?? 'n/a');
print('normalized root', rootInfo.root || '.');
print('plugin id', manifest?.id ?? 'n/a');
print('dashboard enabled', dashboardEnabled ? 'yes' : 'no');
print('dashboard schema found', schemaFound ? 'yes' : 'no');
print('dashboard schema path', schemaFound ? schemaPath : 'n/a');
print('unsafe entries', unsafeEntries.length ? unsafeEntries.join(', ') : 'none');
console.log('file tree:');
for (const file of files) {
  console.log(`- ${file}`);
}

if (unsafeEntries.length) {
  print('validation result', 'failed: unsafe archive entries');
  process.exit(1);
}
if (rootInfo.reason) {
  print('validation result', `failed: ${rootInfo.reason}`);
  process.exit(1);
}
if (manifestError) {
  print('validation result', `failed: ${manifestError}`);
  process.exit(1);
}
if (dashboardEnabled && !schemaFound) {
  print('validation result', 'failed: dashboard.schema.json missing');
  process.exit(1);
}

print('validation result', 'passed');
