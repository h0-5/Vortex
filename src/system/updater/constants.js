'use strict';

const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = 'h05';
const REPO_NAME = 'Vortex';

const TMP_UPDATE_DIR = '.tmp-update';
const BACKUPS_DIR = 'backups';

const PROTECTED_PATHS = [
  '.env',
  '.env.example',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.*',
  'uploads',
  'storage',
  'plugins/custom',
  'backups',
  TMP_UPDATE_DIR,
  'node_modules',
  'dist',
  '.turbo',
  '.git',
  '.pnpm-store',
  'coverage',
  '*.log',
];

const IGNORED_FOR_BACKUP = [
  'node_modules',
  'dist',
  '.turbo',
  '.pnpm-store',
  'coverage',
  '.tmp-update',
  'backups',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
];

const OFFICIAL_PLUGIN_IDS = new Set(['welcome', 'tickets', 'moderation']);

const UPDATE_STEPS = [
  'Checking version',
  'Creating backup',
  'Downloading update',
  'Extracting update',
  'Replacing files',
  'Installing dependencies',
  'Running database migrations',
  'Building project',
  'Validating installation',
  'Generating report',
];

module.exports = {
  GITHUB_API_URL,
  REPO_OWNER,
  REPO_NAME,
  TMP_UPDATE_DIR,
  BACKUPS_DIR,
  PROTECTED_PATHS,
  IGNORED_FOR_BACKUP,
  OFFICIAL_PLUGIN_IDS,
  UPDATE_STEPS,
};
