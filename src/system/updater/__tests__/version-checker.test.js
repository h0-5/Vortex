'use strict';

const { compareVersions } = require('../version-checker');

describe('compareVersions', () => {
  it('returns no update when current equals latest', () => {
    const result = compareVersions('1.1.0', '1.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.current).toBe('1.1.0');
    expect(result.latest).toBe('1.1.0');
  });

  it('returns no update when current is greater than latest', () => {
    const result = compareVersions('1.2.0', '1.1.0');
    expect(result.hasUpdate).toBe(false);
  });

  it('detects patch update', () => {
    const result = compareVersions('1.1.0', '1.1.1');
    expect(result.hasUpdate).toBe(true);
    expect(result.diff).toBe('patch');
    expect(result.isMajor).toBe(false);
  });

  it('detects minor update', () => {
    const result = compareVersions('1.0.0', '1.1.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.diff).toBe('minor');
    expect(result.isMajor).toBe(false);
  });

  it('detects major update', () => {
    const result = compareVersions('1.2.1', '2.0.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.diff).toBe('major');
    expect(result.isMajor).toBe(true);
  });

  it('strips leading v from versions', () => {
    const result = compareVersions('v1.0.0', 'v1.0.1');
    expect(result.hasUpdate).toBe(true);
    expect(result.current).toBe('1.0.0');
    expect(result.latest).toBe('1.0.1');
  });
});
