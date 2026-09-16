'use strict';

const { DownloadService } = require('../download-service');

describe('DownloadService', () => {
  it('picks a zip asset from a release object', () => {
    const service = new DownloadService();

    const asset = service.pickAsset({
      tagName: 'v1.2.3',
      assets: [
        { name: 'readme.txt', url: 'https://example.com/readme.txt', size: 10 },
        { name: 'vortex-v1.2.3.zip', url: 'https://example.com/vortex.zip', size: 100 },
      ],
      zipballUrl: 'https://example.com/source.zip',
    });

    expect(asset.name).toBe('vortex-v1.2.3.zip');
    expect(asset.url).toBe('https://example.com/vortex.zip');
  });

  it('falls back to GitHub zipball URL when release has no assets', () => {
    const service = new DownloadService();

    const asset = service.pickAsset({
      tagName: 'v1.2.3',
      assets: [],
      zipballUrl: 'https://api.github.com/repos/owner/repo/zipball/v1.2.3',
    });

    expect(asset).toEqual({
      name: 'v1.2.3.zip',
      url: 'https://api.github.com/repos/owner/repo/zipball/v1.2.3',
      size: 0,
    });
  });

  it('throws a clear error when release has no zip source', () => {
    const service = new DownloadService();

    expect(() => service.pickAsset({ tagName: 'v1.2.3', assets: [] })).toThrow(
      'Release has no downloadable assets',
    );
  });
});
