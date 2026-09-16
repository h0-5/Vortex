#!/usr/bin/env node
// scripts/pack-plugin.js — Official Vortex Plugin Packager
// Usage: node scripts/pack-plugin.js <plugin-id> [--output-dir <dir>]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const AdmZip = require('adm-zip');

const args = process.argv.slice(2);
const pluginId = args[0];
const outputDirFlag = args.indexOf('--output-dir');
const outputDir = outputDirFlag >= 0 ? args[outputDirFlag + 1] : 'dist/plugins';

if (!pluginId) {
  console.error('Usage: node scripts/pack-plugin.js <plugin-id> [--output-dir <dir>]');
  process.exit(1);
}

const pluginRoot = path.resolve('plugins', pluginId);
if (!fs.existsSync(pluginRoot)) {
  console.error(`Plugin not found: ${pluginRoot}`);
  process.exit(1);
}

const manifestPath = path.join(pluginRoot, 'plugin.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing plugin.json in ${pluginRoot}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Validate manifest
if (!manifest.id || !manifest.version || !manifest.entry) {
  console.error('Invalid plugin manifest: id, version, and entry are required');
  process.exit(1);
}

if (manifest.id !== pluginId) {
  console.error(`Manifest id "${manifest.id}" does not match plugin directory "${pluginId}"`);
  process.exit(1);
}

// Validate dashboard schema if dashboard is enabled
if (manifest.dashboard?.enabled) {
  const schemaPath = path.join(pluginRoot, 'dashboard.schema.json');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Dashboard is enabled but dashboard.schema.json is missing in ${pluginRoot}`);
    console.error('Cannot generate package without dashboard schema.');
    process.exit(1);
  }

  // Validate schema JSON structure
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    if (!schema.version || !Array.isArray(schema.tabs)) {
      console.error('Invalid dashboard.schema.json: must have "version" and "tabs" array');
      process.exit(1);
    }

    // Check for hardcoded fake preview data (warn)
    const previewVars = JSON.stringify(schema.previewVariables || {});
    const fakePatterns = ['@Mira', 'Vortex Labs', 'Mira Vale', 'Test Server'];
    for (const pattern of fakePatterns) {
      if (previewVars.includes(pattern)) {
        console.warn(`WARNING: dashboard.schema.json contains fake preview data: "${pattern}"`);
        console.warn('         Preview variables should use neutral placeholders.');
      }
    }
  } catch (err) {
    console.error(`Invalid dashboard.schema.json: ${err.message}`);
    process.exit(1);
  }
}

// Get source commit hash
let sourceCommit = null;
try {
  sourceCommit = execSync('git rev-parse --short HEAD', {
    cwd: pluginRoot,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Not a git repo or no git
}

// Build file list
const requiredFiles = [
  'plugin.json',
  'package.json',
  manifest.entry,
];

const optionalIncludes = [
  'dashboard.schema.json',
  'README.md',
  'CHANGELOG.md',
];

const includeDirs = [
  'migrations',
  'schemas',
  'services',
  'commands',
  'events',
  'actions',
  'assets',
];

const excludePatterns = [
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  '.env',
  '.env.*',
  '*.log',
  '*.tmp',
  '*.temp',
  '.DS_Store',
  'Thumbs.db',
  'welcome.vortex',
  '.vortex',
];

function shouldExclude(filePath) {
  const parts = filePath.split(/[\\/]/);
  return excludePatterns.some((pattern) =>
    parts.some((part) =>
      part === pattern || part.startsWith(pattern.replace('*', '')),
    ),
  );
}

function collectFiles(dir, relPrefix = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (shouldExclude(relPath)) continue;

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, relPath));
    } else {
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

const collected = collectFiles(pluginRoot);
const fileMap = new Map(collected.map((f) => [f.relPath, f]));

// Ensure required files exist
for (const req of requiredFiles) {
  if (!fileMap.has(req)) {
    console.error(`Missing required file: ${req}`);
    process.exit(1);
  }
}

// Generate package metadata
const builtAt = new Date().toISOString();
const coreCompatibility = manifest.minCoreVersion || '0.2.5';

// Compute checksums
const hashes = {};
for (const { fullPath, relPath } of collected) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(fullPath));
  hashes[relPath] = hash.digest('hex');
}
const manifestHash = crypto.createHash('sha256');
manifestHash.update(fs.readFileSync(manifestPath));

const packageMetadata = {
  packageVersion: manifest.version,
  builtAt,
  sourceCommit,
  coreCompatibility,
  manifestHash: manifestHash.digest('hex'),
  fileCount: collected.length,
  checksums: hashes,
};

// Create enriched manifest
const enrichedManifest = {
  ...manifest,
  packageMetadata,
};

// Create output directory
const outDir = path.resolve(outputDir);
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, `${pluginId}-${manifest.version}.vortex`);

// Build ZIP
const zip = new AdmZip();

// Add enriched manifest as plugin.json
zip.addFile('plugin.json', Buffer.from(JSON.stringify(enrichedManifest, null, 2), 'utf-8'));

// Add all other files
for (const { fullPath, relPath } of collected) {
  if (relPath === 'plugin.json') continue; // Already added enriched version
  zip.addLocalFile(fullPath, path.posix.dirname(relPath) === '.' ? '' : path.posix.dirname(relPath));
}

zip.writeZip(outFile);

const stats = fs.statSync(outFile);

console.log(`\n✅ Package built successfully`);
console.log(`   Plugin: ${manifest.id} v${manifest.version}`);
console.log(`   Output: ${outFile}`);
console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`   Files: ${collected.length}`);
console.log(`   Built: ${builtAt}`);
console.log(`   Commit: ${sourceCommit || 'unknown'}`);
console.log(`   Core compat: ${coreCompatibility}`);

// Also copy to simple name for convenience
const simpleOut = path.join(outDir, `${pluginId}.vortex`);
fs.copyFileSync(outFile, simpleOut);
console.log(`   Also saved as: ${simpleOut}`);
