'use strict';

const axios = require('axios');

class GitHubClient {
  /**
   * @param {object} options
   * @param {string} options.owner
   * @param {string} options.name
   * @param {string} [options.apiUrl='https://api.github.com']
   * @param {string} [options.token]
   */
  constructor({ owner, name, apiUrl = 'https://api.github.com', token }) {
    this.owner = owner;
    this.name = name;
    this.apiUrl = apiUrl;
    this.token = token;
  }

  /**
   * @returns {Promise<object>}
   */
  async getLatestRelease() {
    const url = `${this.apiUrl}/repos/${this.owner}/${this.name}/releases/latest`;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await axios.get(url, {
        headers,
        timeout: 30_000,
        responseType: 'json',
      });

      const data = response.data;

      return {
        version: normalizeVersion(data.tag_name),
        tagName: data.tag_name,
        notes: data.body || '',
        assets: (data.assets || []).map((asset) => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
        })),
        publishedAt: data.published_at,
        tarballUrl: data.tarball_url,
        zipballUrl: data.zipball_url,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`No releases found for ${this.owner}/${this.name}`);
      }

      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`GitHub API error: ${error.response.status} ${error.response.statusText}`);
      }

      throw new Error(`Failed to fetch latest release: ${error.message}`);
    }
  }
}

function normalizeVersion(tagName) {
  return String(tagName).replace(/^v/u, '').trim();
}

module.exports = { GitHubClient, normalizeVersion };
