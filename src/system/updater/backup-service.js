'use strict';

const fs = require('fs-extra');
const path = require('path');
const { IGNORED_FOR_BACKUP } = require('./constants');

class BackupService {
  /**
   * @param {object} options
   * @param {string} options.root
   * @param {string} options.backupDir
   * @param {string[]} [options.extraIgnored]
   */
  constructor({ root, backupDir, extraIgnored = [] }) {
    this.root = root;
    this.backupDir = backupDir;
    this.ignoredPatterns = new Set([...IGNORED_FOR_BACKUP, ...extraIgnored]);
  }

  /**
   * @returns {Promise<{ backupDir: string; items: string[] }>}
   */
  async createBackup() {
    await fs.ensureDir(this.backupDir);
    const items = await this.getBackupItems();

    for (const item of items) {
      const source = path.join(this.root, item);
      const destination = path.join(this.backupDir, item);
      const stat = await fs.stat(source);

      if (stat.isDirectory()) {
        await fs.copy(source, destination, {
          preserveTimestamps: true,
          filter: (src) => !this.isIgnored(path.relative(this.root, src)),
        });
      } else {
        await fs.copy(source, destination, { preserveTimestamps: true });
      }
    }

    return { backupDir: this.backupDir, items };
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getBackupItems() {
    const exists = await fs.pathExists(this.root);
    if (!exists) {
      return [];
    }

    const entries = await fs.readdir(this.root);
    return entries.filter((entry) => !this.isIgnored(entry));
  }

  /**
   * @param {string} relativePath
   * @returns {boolean}
   */
  isIgnored(relativePath) {
    const normalized = relativePath.replace(/\\/gu, '/');

    for (const pattern of this.ignoredPatterns) {
      if (matchesPattern(normalized, pattern)) {
        return true;
      }
    }

    return false;
  }
}

function matchesPattern(value, pattern) {
  if (pattern.includes('*')) {
    const regex = new RegExp(`^${pattern.replace(/\./gu, '\\.').replace(/\*/gu, '.*')}$`, 'u');
    return regex.test(value) || value.startsWith(pattern.replace('*', ''));
  }

  return value === pattern || value.startsWith(`${pattern}/`);
}

module.exports = { BackupService };
