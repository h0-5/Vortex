'use strict';

const { runUpdate } = require('./update-engine');
const { GitHubClient } = require('./github-client');
const { compareVersions } = require('./version-checker');
const { BackupService } = require('./backup-service');
const { DownloadService } = require('./download-service');
const { FileReplacer } = require('./file-replacer');
const { PluginDetector } = require('./plugin-detector');
const { InstallService } = require('./install-service');
const { RollbackService } = require('./rollback-service');
const { ConsoleReporter, SilentReporter } = require('./reporter');
const { UpdateError } = require('./errors');

module.exports = {
  runUpdate,
  GitHubClient,
  compareVersions,
  BackupService,
  DownloadService,
  FileReplacer,
  PluginDetector,
  InstallService,
  RollbackService,
  ConsoleReporter,
  SilentReporter,
  UpdateError,
};
