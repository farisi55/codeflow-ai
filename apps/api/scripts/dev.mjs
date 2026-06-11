import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const tscPath = require.resolve('typescript/lib/tsc.js');
const mainPath = join(appDirectory, 'dist', 'main.js');
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;

let compiler;
let server;
let compilerOutput = '';
let isStopping = false;
let isRestarting = false;
let restartRequested = false;
let restartTimer;

function launchServer() {
  if (isStopping) {
    return;
  }

  const nextServer = spawn(process.execPath, [mainPath], {
    cwd: appDirectory,
    env: process.env,
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });
  server = nextServer;

  nextServer.once('error', (error) => {
    console.error(`[dev] Failed to start API: ${error.message}`);
  });
  nextServer.once('exit', () => {
    if (server === nextServer) {
      server = undefined;
    }
  });
}

function restartServer() {
  if (isStopping) {
    return;
  }

  restartRequested = true;
  if (server && server.exitCode === null) {
    if (isRestarting) {
      return;
    }

    isRestarting = true;
    const previousServer = server;
    previousServer.once('exit', () => {
      isRestarting = false;
      if (restartRequested && !isStopping) {
        restartRequested = false;
        launchServer();
      }
    });
    previousServer.kill();
    return;
  }

  restartRequested = false;
  launchServer();
}

function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restartServer, 100);
}

function inspectCompilerOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  compilerOutput += text;

  const lines = compilerOutput.split(/\r?\n/);
  compilerOutput = lines.pop() ?? '';

  for (const line of lines) {
    const cleanLine = line.replace(ansiPattern, '');
    if (/Found 0 errors?\. Watching for file changes\./.test(cleanLine)) {
      scheduleRestart();
    }
  }
}

function stopProcess(child) {
  if (child && child.exitCode === null) {
    child.kill();
  }
}

function shutdown(exitCode = 0) {
  if (isStopping) {
    return;
  }

  isStopping = true;
  clearTimeout(restartTimer);
  stopProcess(server);
  stopProcess(compiler);
  process.exitCode = exitCode;
}

compiler = spawn(
  process.execPath,
  [
    tscPath,
    '--project',
    'tsconfig.build.json',
    '--watch',
    '--preserveWatchOutput',
  ],
  {
    cwd: appDirectory,
    env: process.env,
    shell: false,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

compiler.stdout.on('data', inspectCompilerOutput);
compiler.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});
compiler.once('error', (error) => {
  console.error(`[dev] TypeScript compiler failed: ${error.message}`);
  shutdown(1);
});
compiler.once('exit', (code) => {
  if (!isStopping) {
    shutdown(code ?? 1);
  }
});

process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
