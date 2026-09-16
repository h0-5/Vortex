'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class InstallService {
  /**
   * @param {object} [options]
   * @param {function} [options.onOutput]
   * @param {number} [options.commandTimeout=600000]
   */
  constructor({ onOutput, commandTimeout = 600_000 } = {}) {
    this.onOutput = onOutput;
    this.commandTimeout = commandTimeout;
  }

  /**
   * @param {string} root
   * @returns {Promise<void>}
   */
  async installDependencies(root) {
    await this.runCommand('pnpm', ['install', '--frozen-lockfile'], root);
  }

  /**
   * @param {string} root
   * @returns {Promise<void>}
   */
  async runMigrations(root) {
    await this.runCommand('pnpm', ['db:migrate'], root);
  }

  /**
   * @param {string} root
   * @returns {Promise<void>}
   */
  async build(root) {
    await this.runCommand('pnpm', ['build'], root);
  }

  /**
   * @param {string} root
   * @returns {Promise<{ version: string }>}
   */
  async readPackageVersion(root) {
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    if (!packageJson.version) {
      throw new Error('package.json is missing version field');
    }

    return { version: packageJson.version };
  }

  /**
   * @param {string} root
   * @returns {Promise<number>}
   */
  async countMigrations(root) {
    const drizzleDir = path.join(root, 'packages', 'database', 'drizzle');
    const exists = await fs.pathExists(drizzleDir);
    if (!exists) {
      return 0;
    }

    const entries = await fs.readdir(drizzleDir);
    return entries.filter((entry) => entry.endsWith('.sql')).length;
  }

  /**
   * @param {string} command
   * @param {string[]} args
   * @param {string} cwd
   * @returns {Promise<void>}
   */
  runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const binary = resolveBinary(command, cwd);
      const usesShell = /\.(cmd|bat)$/iu.test(binary);
      const child = usesShell
        ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', binary, ...args], {
            cwd,
            env: process.env,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          })
        : spawn(binary, args, {
            cwd,
            env: process.env,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          });

      const stdoutChunks = [];
      const stderrChunks = [];

      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          stdoutChunks.push(chunk);
          if (this.onOutput) {
            this.onOutput('stdout', chunk.toString());
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          stderrChunks.push(chunk);
          if (this.onOutput) {
            this.onOutput('stderr', chunk.toString());
          }
        });
      }

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(
          new Error(
            `Command timed out after ${this.commandTimeout}ms: ${command} ${args.join(' ')}`,
          ),
        );
      }, this.commandTimeout);

      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start ${command}: ${error.message}`));
      });

      child.once('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
          return;
        }

        const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim();
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        const output = stdout || stderr;
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${code}${
              output ? `\n${output.slice(-500)}` : ''
            }`,
          ),
        );
      });
    });
  }
}

function resolveBinary(command, cwd) {
  if (command !== 'pnpm') {
    return command;
  }

  const candidates = [
    path.join(cwd, 'node_modules', '.bin', 'pnpm.cmd'),
    path.join(cwd, 'node_modules', '.bin', 'pnpm'),
    'pnpm.cmd',
    'pnpm',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

module.exports = { InstallService };
