'use strict';

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

class DownloadService {
  /**
   * @param {object} [options]
   * @param {number} [options.timeout=300000]
   */
  constructor({ timeout = 300_000 } = {}) {
    this.timeout = timeout;
  }

  /**
   * @param {object} release
   * @param {string} destDir
   * @returns {Promise<{ zipPath: string; asset: object }>}
   */
  async downloadRelease(release, destDir) {
    await fs.ensureDir(destDir);
    const asset = this.pickAsset(release);
    const zipPath = path.join(destDir, 'release.zip');

    await this.downloadFile(asset.url, zipPath);
    const stat = await fs.stat(zipPath);

    if (stat.size === 0) {
      throw new Error('Downloaded release archive is empty');
    }

    return { zipPath, asset };
  }

  /**
   * @param {string} zipPath
   * @param {string} destDir
   * @returns {Promise<{ extractedDir: string }>}
   */
  async extract(zipPath, destDir) {
    await fs.ensureDir(destDir);

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, /* overwrite */ true);
    } catch (error) {
      throw new Error(`Failed to extract release archive: ${error.message}`);
    }

    const entries = await fs.readdir(destDir);
    const topDir = entries.find((entry) => {
      const fullPath = path.join(destDir, entry);
      return entry !== 'release.zip' && fs.statSync(fullPath).isDirectory();
    });

    return {
      extractedDir: topDir ? path.join(destDir, topDir) : destDir,
    };
  }

  /**
   * @param {object} release
   * @returns {object}
   */
  pickAsset(release) {
    const assets = Array.isArray(release?.assets) ? release.assets : [];

    if (assets.length === 0 && release?.zipballUrl) {
      return { name: `${release.tagName || 'source'}.zip`, url: release.zipballUrl, size: 0 };
    }

    if (assets.length === 0) {
      throw new Error('Release has no downloadable assets');
    }

    const preferred =
      assets.find((asset) => /^vortex[._-].*\.zip$/iu.test(asset.name)) ||
      assets.find((asset) => /^source\.zip$/iu.test(asset.name)) ||
      assets.find((asset) => /^.*\.zip$/iu.test(asset.name));

    if (!preferred) {
      throw new Error('Release does not contain a zip asset');
    }

    return preferred;
  }

  /**
   * @param {string} url
   * @param {string} destPath
   * @returns {Promise<void>}
   */
  async downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: this.timeout,
        headers: {
          Accept: 'application/octet-stream',
        },
        maxRedirects: 5,
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });
    } catch (error) {
      writer.destroy();
      await fs.remove(destPath).catch(() => {});

      if (axios.isAxiosError(error)) {
        throw new Error(`Download failed: ${error.message}`);
      }

      throw error;
    }
  }
}

module.exports = { DownloadService };
