/**
 * Vortex auto-deploy watcher.
 *
 * Polls the GitHub remote for new commits on `main` every POLL_MS.
 * Whenever the local HEAD differs from the last deployed commit (and after
 * fast-forwarding a clean working tree), it:
 *   1. kills the running launcher tree,
 *   2. starts a fresh `node index.js` (which rebuilds and boots every service),
 *   3. waits for the dashboard/API port to come up,
 *   4. records the deployed commit in .deploy-state.json.
 *
 * Run it in the background (e.g. `node deploy-watcher.js`) alongside the
 * launcher. It survives launcher restarts because it is not a child of it.
 */

'use strict';

const { execFile, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');

const ROOT = __dirname;
const GIT = 'C:\\Users\\mohmm\\Downloads\\download (14)\\Git\\cmd\\git.exe';
const API_PUBLIC_PORT = Number(process.env.API_PORT || 24934);
const API_INTERNAL_PORT = 4001;
const POLL_MS = 30_000;
const BOOT_TIMEOUT_MS = 120_000;
const PORT_WAIT_MS = 30_000;

const STATE_FILE = path.join(ROOT, '.deploy-state.json');
const LAUNCH_LOG = path.join(process.env.TEMP || os.tmpdir(), 'opencode', 'vortex.log');
const WATCH_LOG = path.join(ROOT, '.deploy-watcher.log');

let deploying = false;

/* --------------------------------- utils ---------------------------------- */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logLine(message) {
  const line = `${new Date().toISOString().replace('T', ' ').slice(0, 19)} ${message}`;
  try {
    fs.appendFileSync(WATCH_LOG, `${line}\n`);
  } catch {
    // ignore log failures
  }
  console.log(line);
}

function git(args) {
  return new Promise((resolve, reject) => {
    execFile(
      GIT,
      ['-C', ROOT, ...args],
      { maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GCM_INTERACTIVE: 'never' } },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || '').trim() || error.message;
          reject(new Error(`git ${args[0]} failed: ${detail}`));
        } else {
          resolve(String(stdout).trim());
        }
      },
    );
  });
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitTcp(port, expected, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await canConnect(port)) === expected) return true;
    await sleep(1500);
  }
  return false;
}

async function healthUp() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`http://127.0.0.1:${API_INTERNAL_PORT}/api/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

function listLauncherPids() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'index\\.js' } | ForEach-Object { $_.ProcessId }",
      ],
      (error, stdout) => {
        if (error) return resolve([]);
        resolve(
          String(stdout)
            .trim()
            .split(/[\r\n]+/u)
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n)),
        );
      },
    );
  });
}

async function killLauncher() {
  let pids = await listLauncherPids();
  for (let attempt = 0; attempt < 3 && pids.length > 0; attempt++) {
    for (const pid of pids) {
      await new Promise((resolve) => {
        execFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], () => resolve());
      });
    }
    await sleep(1200);
    pids = await listLauncherPids();
  }
  if (pids.length > 0) {
    logLine('[deploy] WARN launcher processes still alive after kill');
  }
}

function startLauncher() {
  let logFd;
  try {
    logFd = fs.openSync(LAUNCH_LOG, 'a');
  } catch (error) {
    logLine(`[deploy] WARN cannot open launcher log: ${error.message}`);
  }
  const child = spawn(process.execPath, ['index.js'], {
    cwd: ROOT,
    detached: true,
    windowsHide: true,
    stdio: logFd ? ['ignore', logFd, logFd] : 'ignore',
  });
  child.unref();
  logLine(`[deploy] launcher started (pid ${child.pid})`);
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).deployed ?? '';
  } catch {
    return '';
  }
}

function writeState(sha) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ deployed: sha }, null, 2));
  } catch (error) {
    logLine(`[deploy] WARN could not persist state: ${error.message}`);
  }
}

/* --------------------------------- deploy --------------------------------- */

async function deploy(sha) {
  if (deploying) return;
  deploying = true;
  try {
    logLine(`[deploy] deploying ${sha.slice(0, 8)}`);
    await killLauncher();

    if (!(await waitTcp(API_PUBLIC_PORT, false, PORT_WAIT_MS))) {
      logLine('[deploy] abort: public port still busy after launcher kill');
      return;
    }
    if (!(await waitTcp(API_INTERNAL_PORT, false, PORT_WAIT_MS))) {
      logLine('[deploy] abort: internal API port still busy');
      return;
    }
    if (await healthUp()) {
      logLine('[deploy] abort: a server is already up (concurrent deploy)');
      return;
    }

    startLauncher();
    const up = await waitTcp(API_PUBLIC_PORT, true, BOOT_TIMEOUT_MS);
    if (up) {
      writeState(sha);
      logLine(`[deploy] deployed ${sha.slice(0, 8)} OK on port ${API_PUBLIC_PORT}`);
    } else {
      logLine('[deploy] server did not come up within the timeout; will retry next poll');
    }
  } catch (error) {
    logLine(`[deploy] ERR ${error.message}`);
  } finally {
    deploying = false;
  }
}

/* ---------------------------------- loop ---------------------------------- */

async function poll() {
  if (deploying) return;
  try {
    await git(['fetch', 'origin', 'main']);
    const originSha = await git(['rev-parse', 'origin/main']);
    const localSha = await git(['rev-parse', 'HEAD']);

    if (originSha !== localSha) {
      const dirty = (await git(['status', '--porcelain']))
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('??')).length > 0;
      if (dirty) {
        logLine('[watch] origin/main advanced but tracked files are modified locally; pull skipped');
      } else {
        await git(['pull', '--ff-only', 'origin', 'main']);
        logLine(`[watch] pulled origin/main -> ${originSha.slice(0, 8)}`);
      }
    }

    const head = await git(['rev-parse', 'HEAD']);
    const deployedSha = readState();
    if (deployedSha !== head) {
      logLine(
        `[watch] update detected: ${deployedSha ? deployedSha.slice(0, 8) : 'none'} -> ${head.slice(0, 8)}`,
      );
      await deploy(head);
    } else if (!(await healthUp())) {
      logLine('[watch] server is down; redeploying current commit');
      await deploy(head);
    }
  } catch (error) {
    logLine(`[watch] ERR ${error.message}`);
  }
}

async function main() {
  const head = await git(['rev-parse', 'HEAD']);
  const stored = readState();
  if (stored === head && (await healthUp())) {
    logLine(`[watch] up to date at ${head.slice(0, 8)}; watching origin/main every ${POLL_MS / 1000}s`);
  } else {
    logLine(`[watch] initial deploy of ${head.slice(0, 8)}`);
    await deploy(head);
  }
  setInterval(poll, POLL_MS);
}

main().catch((error) => {
  logLine(`[watch] FATAL ${error.message}`);
  process.exit(1);
});