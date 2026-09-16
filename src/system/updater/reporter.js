'use strict';

const chalk = require('chalk');
const ora = require('ora');

const ICONS = {
  success: chalk.green('✔'),
  error: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  arrow: chalk.cyan('→'),
};

class ConsoleReporter {
  constructor() {
    this.spinner = null;
  }

  /**
   * @param {number} current
   * @param {number} total
   * @param {string} message
   */
  step(current, total, message) {
    this.stopSpinner();
    console.log(`${chalk.cyan(`[${current}/${total}]`)} ${message}`);
  }

  /**
   * @param {string} message
   */
  success(message) {
    this.stopSpinner();
    console.log(`${ICONS.success} ${chalk.green(message)}`);
  }

  /**
   * @param {string} message
   */
  error(message) {
    this.stopSpinner();
    console.log(`${ICONS.error} ${chalk.red(message)}`);
  }

  /**
   * @param {string} message
   */
  warn(message) {
    this.stopSpinner();
    console.log(`${ICONS.warning} ${chalk.yellow(message)}`);
  }

  /**
   * @param {string} message
   */
  info(message) {
    this.stopSpinner();
    console.log(`${ICONS.info} ${chalk.blue(message)}`);
  }

  /**
   * @param {string} message
   */
  startSpinner(message) {
    this.stopSpinner();
    this.spinner = ora(message).start();
  }

  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * @param {object} report
   */
  finish(report) {
    this.stopSpinner();

    if (report.alreadyUpToDate) {
      console.log();
      console.log(chalk.green('Vortex is already up to date.'));
      return;
    }

    console.log();
    console.log(chalk.bold.green('╔════════════════════════════════════╗'));
    console.log(chalk.bold.green('║     Vortex Update Complete         ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════╝'));
    console.log();
    console.log(`${chalk.bold('Old version:')} ${report.oldVersion}`);
    console.log(`${chalk.bold('New version:')} ${report.newVersion}`);
    console.log(`${chalk.bold('Updated files:')} ${report.updatedFiles}`);
    console.log(`${chalk.bold('Migrations:')} ${report.migrationCount}`);
    console.log(`${chalk.bold('Build status:')} ${report.buildStatus}`);

    if (report.plugins.length > 0) {
      console.log();
      console.log(chalk.bold('Plugins:'));
      for (const plugin of report.plugins) {
        const status = plugin.updated ? chalk.green('updated') : chalk.gray('unchanged');
        console.log(
          `  ${chalk.cyan(plugin.id)} ${chalk.gray(plugin.version ?? 'unknown')} (${status})`,
        );
      }
    }

    if (report.backupDir) {
      console.log();
      console.log(`${chalk.bold('Backup saved to:')} ${report.backupDir}`);
    }
  }

  /**
   * @param {Error} error
   * @param {boolean} rolledBack
   */
  rollback(error, rolledBack) {
    this.stopSpinner();
    console.log();
    console.log(chalk.bold.red('╔════════════════════════════════════╗'));
    console.log(chalk.bold.red('║      Update Failed                 ║'));
    console.log(chalk.bold.red('╚════════════════════════════════════╝'));
    console.log();
    console.log(`${chalk.red('Error:')} ${error.message}`);

    if (rolledBack) {
      console.log();
      console.log(chalk.yellow('Installation has been rolled back to the previous version.'));
    } else {
      console.log();
      console.log(
        chalk.red('Rollback was not possible. You may need to restore from a backup manually.'),
      );
    }
  }
}

class SilentReporter {
  constructor() {
    this.messages = [];
  }

  step(_current, _total, message) {
    this.messages.push({ type: 'step', message });
  }

  success(message) {
    this.messages.push({ type: 'success', message });
  }

  error(message) {
    this.messages.push({ type: 'error', message });
  }

  warn(message) {
    this.messages.push({ type: 'warn', message });
  }

  info(message) {
    this.messages.push({ type: 'info', message });
  }

  startSpinner(message) {
    this.messages.push({ type: 'spinner', message });
  }

  stopSpinner() {}

  finish() {}

  rollback() {}
}

module.exports = { ConsoleReporter, SilentReporter, ICONS };
