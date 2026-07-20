#!/usr/bin/env node
import { spawn } from 'node:child_process';

const WATCHDOG_TIMEOUT_EXIT_CODE = 124;
const DEFAULT_TIMEOUT_MS = 10_000;
const GRACEFUL_SHUTDOWN_MS = 250;

const allowedStages = [
  'HARNESS_PRECHECK_START',
  'HARNESS_PRECHECK_OK',
  'HARNESS_CLIENT_READY',
  'HARNESS_RUNTIME_READY',
  'HARNESS_EXECUTE_START',
  'HARNESS_READ_STARTED',
  'HARNESS_READ_SETTLED',
  'HARNESS_ENGINE_SETTLED',
  'HARNESS_AGGREGATE_READY',
  'HARNESS_COMPLETED',
  'HARNESS_TIMEOUT',
  'HARNESS_BLOCKED',
];

const forbiddenOutput = /(sb_publishable_|sb_secret_|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|https:\/\/[a-z0-9-]+\.supabase\.co|Bearer\s+[A-Za-z0-9._-]+|Trouve-moi des commerces locaux)/;

const timeoutMs = Number.parseInt(process.env.YOOTCHAT_WATCHDOG_TIMEOUT_MS ?? '', 10) || DEFAULT_TIMEOUT_MS;
let lastStage = null;
let timedOut = false;
let closed = false;

const childArgsFor = () => {
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'EXIT_0') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({stage:'HARNESS_COMPLETED'}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'LEAK_EXIT') {
    return [process.execPath, ['-e', "console.log(['sb','publishable','forbidden'].join('_')); console.log(JSON.stringify({stage:'HARNESS_COMPLETED'}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'HANG') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({stage:'HARNESS_EXECUTE_START'})); setInterval(()=>{}, 1000);"]];
  }
  return [
    'npx',
    [
      '--no-install',
      'jest',
      '--watchman=false',
      '--testRegex',
      'scripts/yootchat/runtime-live\\.manual\\.ts$',
      '--runTestsByPath',
      'scripts/yootchat/runtime-live.manual.ts',
      '--runInBand',
    ],
  ];
};

const sanitizeAndForward = (chunk) => {
  for (const rawLine of chunk.toString('utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || forbiddenOutput.test(line)) continue;
    const stage = allowedStages.find((item) => line.includes(item));
    if (stage) {
      lastStage = stage;
      process.stdout.write(`${line}\n`);
      continue;
    }
    if (line.includes('"aggregate"') && !forbiddenOutput.test(line)) process.stdout.write(`${line}\n`);
  }
};

const [command, args] = childArgsFor();
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', sanitizeAndForward);
child.stderr.on('data', sanitizeAndForward);

const timer = setTimeout(() => {
  timedOut = true;
  if (!closed) child.kill('SIGTERM');
  setTimeout(() => {
    if (!closed) child.kill('SIGKILL');
  }, GRACEFUL_SHUTDOWN_MS).unref();
}, timeoutMs);

child.on('close', (code, signal) => {
  closed = true;
  clearTimeout(timer);
  if (timedOut) {
    process.stdout.write(JSON.stringify({
      watchdog: 'TIMEOUT',
      exitCode: WATCHDOG_TIMEOUT_EXIT_CODE,
      childTerminated: true,
      lastStage,
    }) + '\n');
    process.exit(WATCHDOG_TIMEOUT_EXIT_CODE);
  }
  process.stdout.write(JSON.stringify({
    watchdog: 'COMPLETED',
    exitCode: code ?? 1,
    signal,
    lastStage,
  }) + '\n');
  process.exit(code ?? 1);
});
