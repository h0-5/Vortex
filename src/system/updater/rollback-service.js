'use strict';

const fs = require('fs-extra');
const path = require('path');

class RollbackService {
  /**
   * @param {object} options
   * @param {string} options.root
   * @param {string} options.backupDir
   * @param {string[]} options.protectedPaths
   */
  constructor({ root, backupDir, protectedPaths }) {
    this.root = root;
    this.backupDir = backupDir;
    this.protectedPaths = protectedPaths;
  }

  /**
   * @returns {Promise<boolean>}
   */
  canRollback() {
    return fs.pathExists(this.backupDir);
  }

  /**
   * @returns {Promise<void>}
   */
  async rollback() {
    const canRollback = await this.canRollback();
    if (!canRollback) {
      throw new Error('No backup available for rollback');
    }

    const items = await fs.readdir(this.backupDir);

    for (const item of items) {
      if (this.isProtected(item)) {
        continue;
      }

      const source = path.join(this.backupDir, item);
      const destination = path.join(this.root, item);

      await fs.remove(destination);
      await fs.copy(source, destination, { preserveTimestamps: true });
    }
  }

  /**
   * @param {string} relativePath
   * @returns {boolean}
   */
  isProtected(relativePath) {
    const normalized = relativePath.replace(/\\/gu, '/');

    for (const pattern of this.protectedPaths) {
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

module.exports = { RollbackService };
