'use strict';

const fs = require('fs-extra');
const path = require('path');

class FileReplacer {
  /**
   * @param {object} options
   * @param {string} options.root
   * @param {string[]} options.protectedPaths
   */
  constructor({ root, protectedPaths }) {
    this.root = root;
    this.protectedPaths = protectedPaths;
  }

  /**
   * @param {object} options
   * @param {string} options.sourceDir
   * @param {function} [options.onProgress]
   * @returns {Promise<{ updatedFiles: number; operations: Array<{ source: string; target: string; previous?: string }> }>}
   */
  async replaceFiles({ sourceDir, onProgress }) {
    const exists = await fs.pathExists(sourceDir);
    if (!exists) {
      throw new Error(`Extracted release directory not found: ${sourceDir}`);
    }

    const operations = [];
    const files = await this.walk(sourceDir);

    for (const sourceFile of files) {
      const relativePath = path.relative(sourceDir, sourceFile);

      if (this.isProtected(relativePath)) {
        continue;
      }

      const targetPath = path.join(this.root, relativePath);
      const previous = await fs.pathExists(targetPath);
      const previousHash = previous ? await hashFile(targetPath) : null;

      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourceFile, targetPath, { preserveTimestamps: true });

      const newHash = await hashFile(targetPath);
      const changed = previousHash !== newHash;

      if (changed) {
        operations.push({ source: sourceFile, target: targetPath, previous: previousHash });
        if (onProgress) {
          onProgress(relativePath);
        }
      }
    }

    return { updatedFiles: operations.length, operations };
  }

  /**
   * @param {string} dir
   * @returns {Promise<string[]>}
   */
  async walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.walk(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * @param {string} relativePath
   * @returns {boolean}
   */
  isProtected(relativePath) {
    const normalized = relativePath.replace(/\\/gu, '/');

    for (const pattern of this.protectedPaths) {
      if (matchesProtectedPattern(normalized, pattern)) {
        return true;
      }
    }

    return false;
  }
}

function matchesProtectedPattern(value, pattern) {
  if (pattern.includes('*')) {
    const regex = new RegExp(`^${pattern.replace(/\./gu, '\\.').replace(/\*/gu, '.*')}$`, 'u');
    return regex.test(value) || value.startsWith(pattern.replace('*', ''));
  }

  return value === pattern || value.startsWith(`${pattern}/`);
}

async function hashFile(filePath) {
  const crypto = require('crypto');
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

module.exports = { FileReplacer };
