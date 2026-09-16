const fs = require('fs');
const net = require('net');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { URL } = require('url');

const winston = require('winston');

const ROOT = __dirname;
const CHECK_MODE = process.argv.includes('--check');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];
const SERVICE_START_TIMEOUT_MS = 30_000;
const DASHBOARD_START_TIMEOUT_MS = 120_000;
const BOT_READY_TIMEOUT_MS = 90_000;
const BIN_EXT = process.platform === 'win32' ? '.cmd' : '';

function bin(...segments) {
  const last = segments.length - 1;
  segments[last] = segments[last] + BIN_EXT;
  return path.join(ROOT, ...segments);
}

const serviceProcesses = [];
let shuttingDown = false;

const logger = createLogger();

void main();

async function main() {
  try {
    const envPath = path.join(ROOT, '.env');
    const loadedKeys = loadEnvFile(envPath);
    logger.ok(`Loaded ${loadedKeys.length} values from .env`);

    const config = validateEnvironment();
    await assertRequiredBinaries();
    await assertPortAvailable(config.apiPort, 'dashboard');
    await assertPortAvailable(config.apiInternalPort, 'API');
    await checkDatabaseConnectivity(config.databaseUrl);
    await runDatabaseMigrations();
    await buildRuntimeServices();

    process.env.API_INTERNAL_PORT = String(config.apiInternalPort);

    startService({
      name: 'api',
      cwd: path.join(ROOT, 'apps', 'api'),
      command: process.execPath,
      args: ['dist/main.js'],
      env: { ...process.env, API_PORT: String(config.apiInternalPort) },
    });
    await waitForHttp(config.apiHealthUrl, 'API health');

    startService({
      name: 'dashboard-redesign',
      cwd: path.join(ROOT, 'apps', 'dashboard-redesign'),
      command: bin('apps', 'dashboard-redesign', 'node_modules', '.bin', 'next'),
      args: ['dev', '-H', '127.0.0.1', '-p', String(config.apiPort)],
      env: { ...process.env, PORT: String(config.apiPort) },
    });
    await waitForHttp(
      `http://127.0.0.1:${config.apiPort}/`,
      'dashboard-redesign',
      DASHBOARD_START_TIMEOUT_MS,
    );

    const botState = { ready: false };
    const bot = startService({
      name: 'bot',
      cwd: path.join(ROOT, 'apps', 'bot'),
      command: bin('apps', 'bot', 'node_modules', '.bin', 'tsx'),
      args: ['dist/main.js'],
      onStdoutLine: (line) => {
        if (line.includes('Discord client is ready')) {
          botState.ready = true;
          logger.ok('Bot connected to Discord');
        }
      },
    });
    await waitForBotReady(bot, botState, { strict: CHECK_MODE });

    logger.ok('Vortex stack is up');
    logger.info(`API: ${config.apiHealthUrl}`);
    logger.info(`Dashboard: ${config.dashboardUrl}`);

    if (CHECK_MODE) {
      logger.ok('Check mode passed, stopping services');
      await shutdown(0);
      return;
    }

    logger.info('Press Ctrl+C to stop all services');
    registerSignalHandlers();
  } catch (error) {
    logger.err(formatError(error));
    await shutdown(1);
  }
}

function createLogger() {
  const levels = {
    err: 0,
    warn: 1,
    ok: 2,
    info: 3,
    child: 4,
  };

  winston.addColors({
    err: 'red bold',
    warn: 'yellow bold',
    ok: 'green bold',
    info: 'cyan',
    child: 'white',
  });

  return winston.createLogger({
    levels,
    level: 'child',
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level.toUpperCase()} ${message}`;
      }),
    ),
    transports: [new winston.transports.Console()],
  });
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env file at ${envPath}`);
  }

  const loadedKeys = [];
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!hasText(process.env[key])) {
      process.env[key] = stripWrappingQuotes(rawValue);
    }
    loadedKeys.push(key);
  }

  return loadedKeys;
}

function validateEnvironment() {
  const requiredKeys = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'OAUTH_TOKEN_ENCRYPTION_KEY',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI',
    'DISCORD_BOT_TOKEN',
    'DASHBOARD_URL',
  ];

  const missingKeys = requiredKeys.filter((key) => !hasText(process.env[key]));
  if (missingKeys.length > 0) {
    throw new Error(`Missing required .env keys: ${missingKeys.join(', ')}`);
  }

  if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must start with postgresql:// or postgres://');
  }

  if (process.env.SESSION_SECRET.trim().length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  const encryptionKey = decodeBase64Key(process.env.OAUTH_TOKEN_ENCRYPTION_KEY);
  if (encryptionKey.length !== 32) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY must decode to 32 bytes, received ${encryptionKey.length}`,
    );
  }

  const dashboardUrl = new URL(process.env.DASHBOARD_URL);
  const dashboardPort = getPortFromUrl(dashboardUrl);
  const apiPort = Number(process.env.API_PORT ?? 4000);
  const apiInternalPort = 4001;
  const apiHealthUrl = `http://127.0.0.1:${apiInternalPort}/api/v1/health`;
  const redirectUrl = new URL(process.env.DISCORD_REDIRECT_URI);

  if (!Number.isInteger(apiPort) || apiPort <= 0) {
    throw new Error('API_PORT must be a positive integer');
  }

  if (!LOCAL_HOSTS.has(dashboardUrl.hostname)) {
    logger.warn(
      `DASHBOARD_URL host is ${dashboardUrl.hostname}. Local terminal startup expects localhost or 127.0.0.1.`,
    );
  }

  if (redirectUrl.port && Number(redirectUrl.port) !== apiPort) {
    logger.warn('DISCORD_REDIRECT_URI port does not match API_PORT');
  }

  logger.ok('Environment validation passed');

  return {
    apiPort,
    apiInternalPort,
    apiHealthUrl,
    dashboardPort,
    dashboardUrl: process.env.DASHBOARD_URL,
    databaseUrl: process.env.DATABASE_URL,
  };
}

async function assertRequiredBinaries() {
  const binaries = [
    bin('packages', 'types', 'node_modules', '.bin', 'tsc'),
    bin('packages', 'shared', 'node_modules', '.bin', 'tsc'),
    bin('packages', 'database', 'node_modules', '.bin', 'drizzle-kit'),
    bin('packages', 'database', 'node_modules', '.bin', 'tsc'),
    bin('packages', 'ui', 'node_modules', '.bin', 'tsc'),
    bin('apps', 'api', 'node_modules', '.bin', 'tsc'),
    bin('apps', 'bot', 'node_modules', '.bin', 'tsc'),
    bin('apps', 'dashboard', 'node_modules', '.bin', 'tsc'),
    path.join(ROOT, 'apps', 'dashboard', 'node_modules', 'vite', 'bin', 'vite.js'),
    bin('apps', 'dashboard-redesign', 'node_modules', '.bin', 'next'),
  ];

  const checkMissing = () => binaries.filter((b) => !fs.existsSync(b));
  let missing = checkMissing();

  if (missing.length > 0) {
    logger.info('Workspace binaries missing, installing dependencies...');

    try {
      await runCommand({
        name: 'pnpm-install',
        cwd: ROOT,
        command: 'npx',
        args: ['-y', 'pnpm@10', 'install'],
      });
    } catch {
      logger.warn('pnpm install failed, workspace packages may be unavailable');
    }

    missing = checkMissing();
  }

  if (missing.length > 0) {
    throw new Error(`Missing required binaries: ${missing.join(', ')}`);
  }

  logger.ok('Local runtime binaries are present');
}

async function assertPortAvailable(port, label) {
  const loopbackHosts = ['127.0.0.1', '::1'];
  const availability = await Promise.all(loopbackHosts.map((host) => canBindPort(port, host)));
  if (availability.includes(false)) {
    throw new Error(`Port ${port} is already in use and blocks the ${label} service`);
  }

  logger.ok(`Port ${port} is available for ${label}`);
}

function canBindPort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => resolve(isUnavailableLoopback(error)));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function isUnavailableLoopback(error) {
  return error.code === 'EAFNOSUPPORT' || error.code === 'EADDRNOTAVAIL';
}

async function checkDatabaseConnectivity(databaseUrl) {
  const { Client } = require(path.join(ROOT, 'packages', 'database', 'node_modules', 'pg'));
  const url = databaseUrl.replace(/sslmode=(require|verify-full|verify-ca|prefer)/iu, 'sslmode=no-verify');
  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    const result = await client.query(
      'select current_database() as database_name, current_user as user_name',
    );
    const row = result.rows[0] ?? {};
    logger.ok(`Database connection succeeded (${row.database_name ?? 'unknown database'})`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function runDatabaseMigrations() {
  logger.info('Running database migrations');
  await runCommand({
    name: 'migrate',
    cwd: path.join(ROOT, 'packages', 'database'),
    command: bin('packages', 'database', 'node_modules', '.bin', 'drizzle-kit'),
    args: ['migrate'],
  });
  logger.ok('Database migrations are up to date');
}

async function buildRuntimeServices() {
  const packageBuilds = [
    { name: 'types', segments: ['packages', 'types'], config: 'tsconfig.json' },
    { name: 'core', segments: ['packages', 'core'], config: 'tsconfig.json' },
    { name: 'shared', segments: ['packages', 'shared'], config: 'tsconfig.build.json' },
    { name: 'database', segments: ['packages', 'database'], config: 'tsconfig.json' },
    { name: 'ui', segments: ['packages', 'ui'], config: 'tsconfig.json' },
  ];

  for (const { name, segments, config } of packageBuilds) {
    logger.info(`Building ${name} package`);
    const cwd = path.join(ROOT, ...segments);
    await runCommand({
      name: `build-${name}`,
      cwd,
      command: bin(...segments, 'node_modules', '.bin', 'tsc'),
      args: ['-p', config],
    });
  }

  logger.info('Building API runtime');
  await runCommand({
    name: 'build-api',
    cwd: path.join(ROOT, 'apps', 'api'),
    command: bin('apps', 'api', 'node_modules', '.bin', 'tsc'),
    args: ['-p', 'tsconfig.build.json'],
  });

  logger.info('Building bot runtime');
  await runCommand({
    name: 'build-bot',
    cwd: path.join(ROOT, 'apps', 'bot'),
    command: bin('apps', 'bot', 'node_modules', '.bin', 'tsc'),
    args: ['-p', 'tsconfig.build.json'],
  });

  logger.info('Checking dashboard types');
  await runCommand({
    name: 'typecheck-dashboard',
    cwd: path.join(ROOT, 'apps', 'dashboard'),
    command: bin('apps', 'dashboard', 'node_modules', '.bin', 'tsc'),
    args: ['-p', 'tsconfig.json', '--noEmit'],
  });

  logger.ok('Runtime builds are current');
}

function startService({ name, cwd, command, args, onStdoutLine, env }) {
  logger.info(`Starting ${name}`);
  const child = spawnCommand(command, args, cwd, env);
  const service = {
    name,
    child,
    exited: false,
  };
  serviceProcesses.push(service);

  pipeServiceLogs(name, child.stdout, 'child', onStdoutLine);
  pipeServiceLogs(name, child.stderr, 'warn');

  child.once('exit', (code, signal) => {
    service.exited = true;
    const state = signal ? `signal ${signal}` : `code ${code}`;
    if (shuttingDown) {
      logger.info(`${name} stopped`);
      return;
    }

    logger.err(`${name} exited unexpectedly with ${state}`);
    void shutdown(typeof code === 'number' ? code : 1);
  });

  child.once('error', (error) => {
    logger.err(`${name} failed to start: ${formatError(error)}`);
    void shutdown(1);
  });

  return service;
}

async function waitForHttp(url, label, timeoutMs = SERVICE_START_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        logger.ok(`${label} responded with ${response.status}`);
        return;
      }
    } catch {
      await sleep(500);
      continue;
    }

    await sleep(500);
  }

  throw new Error(`${label} did not become reachable at ${url}`);
}

async function waitForBotReady(bot, state, { strict }) {
  const deadline = Date.now() + BOT_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (state.ready) {
      return;
    }
    if (bot.exited) {
      throw new Error('Bot process exited before Discord reported readiness');
    }
    await sleep(500);
  }

  if (strict) {
    throw new Error('Timed out waiting for the bot to connect to Discord');
  }

  logger.warn(
    `Bot did not report ready within ${Math.round(BOT_READY_TIMEOUT_MS / 1_000)} seconds. Keeping the API and dashboard running while the bot continues to connect.`,
  );
}

async function runCommand({ name, cwd, command, args }) {
  const child = spawnCommand(command, args, cwd);
  pipeServiceLogs(name, child.stdout, 'child');
  pipeServiceLogs(name, child.stderr, 'warn');

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`${name} failed with exit code ${exitCode}`);
  }
}

function spawnCommand(command, args, cwd, envOverride) {
  const env = envOverride || process.env;
  const usesCommandShell = /\.cmd$/iu.test(command) || /\.bat$/iu.test(command);
  if (!usesCommandShell) {
    return spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  }

  return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], {
    cwd,
    env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function pipeServiceLogs(name, stream, level, onLine) {
  if (!stream) {
    return;
  }

  const reader = readline.createInterface({ input: stream });
  reader.on('line', (line) => {
    const text = line.trim();
    if (!text) {
      return;
    }

    if (typeof onLine === 'function') {
      onLine(text);
    }

    logger.log({
      level,
      message: `[${name}] ${text}`,
    });
  });
}

function registerSignalHandlers() {
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      logger.warn(`Received ${signal}, shutting down`);
      void shutdown(0);
    });
  }
}

async function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  const processes = [...serviceProcesses].reverse();
  for (const service of processes) {
    await terminateChild(service.child);
  }

  process.exit(exitCode);
}

async function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32' && child.pid) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
    });
    return;
  }

  child.kill('SIGTERM');
  await sleep(300);
}

function getPortFromUrl(url) {
  if (url.port) {
    return Number(url.port);
  }
  return url.protocol === 'https:' ? 443 : 80;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function decodeBase64Key(value) {
  const normalized = value.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
