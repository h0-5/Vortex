'use strict';

const semver = require('semver');

/**
 * @param {string} current
 * @param {string} latest
 * @returns {{ hasUpdate: boolean; current: string; latest: string; isMajor?: boolean; diff?: semver.ReleaseType | null }}
 */
function compareVersions(current, latest) {
  const cleanCurrent = semver.clean(current) || current;
  const cleanLatest = semver.clean(latest) || latest;

  if (!semver.valid(cleanCurrent)) {
    throw new Error(`Current version "${current}" is not valid semver`);
  }

  if (!semver.valid(cleanLatest)) {
    throw new Error(`Latest version "${latest}" is not valid semver`);
  }

  if (semver.gte(cleanCurrent, cleanLatest)) {
    return {
      hasUpdate: false,
      current: cleanCurrent,
      latest: cleanLatest,
    };
  }

  return {
    hasUpdate: true,
    current: cleanCurrent,
    latest: cleanLatest,
    isMajor: semver.major(cleanLatest) > semver.major(cleanCurrent),
    diff: semver.diff(cleanCurrent, cleanLatest),
  };
}

module.exports = { compareVersions };
