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

const allowedReadErrorCodes = [
  'LIMIT_OUT_OF_RANGE',
  'SUPABASE_UNAVAILABLE',
  'SUPABASE_AUTH_REJECTED',
  'SUPABASE_RETRY_BLOCKED',
  'SUPABASE_TIMEOUT',
  'SUPABASE_RLS_DENIED',
  'SUPABASE_NETWORK_ERROR',
  'MALFORMED_RESPONSE',
  'SCHEMA_INCOMPATIBLE',
  'TOO_MANY_INVALID_ROWS',
  'NO_ACTIVE_ROWS',
  'NO_MATCHING_CANDIDATES',
  'LOCATION_UNUSABLE',
  'ENGINE_UNCERTIFIED',
  'HARNESS_TIMEOUT',
  'HARNESS_BLOCKED',
];

const allowedQuarantineReasons = [
  'UNKNOWN_PROPERTY',
  'INVALID_ID',
  'NON_PUBLISHABLE_STATUS',
  'INVALID_ACTIVE_FLAG',
  'INVALID_NAME',
  'INVALID_CATEGORY',
  'INVALID_CITY',
  'INVALID_COORDINATES',
  'INVALID_RATING',
  'INVALID_OPENING_HOURS',
  'INVALID_OFFICIAL_COMMITMENT',
  'DUPLICATE_ID',
];

const allowedTopics = [
  'DISCOVER_LOCAL',
  'COMPARE_OPTIONS',
  'MERCHANT_DETAILS',
  'ACCESSIBILITY',
  'ROUTE_AND_MOBILITY',
  'CLARIFICATION',
  'NO_RESULT',
  'OUT_OF_SCOPE',
];

const allowedMessageTemplates = [
  'RESULTS_FOUND',
  'CLARIFICATION_REQUIRED',
  'NO_RESULT',
  'OUT_OF_SCOPE',
  'SERVICE_UNAVAILABLE',
];

const allowedLimitations = [
  'UNKNOWN_HOURS',
  'UNKNOWN_ACCESSIBILITY',
  'UNKNOWN_DISTANCE',
  'INSUFFICIENT_EVIDENCE',
];

const allowedDurationBuckets = ['0-50', '51-250', '251-1000', '1001+'];
const allowedTransportOutcomes = ['HTTP_RESPONSE', 'TYPE_ERROR', 'ABORTED', 'OTHER_ERROR', 'NONE'];
const allowedTransportStatusClasses = ['HTTP_2XX', 'HTTP_4XX', 'HTTP_5XX', 'HTTP_OTHER', 'NONE'];

const exactKeys = (value, keys) => {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const oneOf = (value, allowed) => allowed.includes(value);

const validateReasonCounts = (value) => {
  if (!isRecord(value)) return null;
  const result = {};
  for (const [key, count] of Object.entries(value)) {
    if (!oneOf(key, allowedQuarantineReasons) || !isNonNegativeInteger(count)) return null;
    result[key] = count;
  }
  return result;
};

const validateStringArray = (value, allowed, maxLength) => {
  if (!Array.isArray(value) || value.length > maxLength) return null;
  const result = [];
  for (const item of value) {
    if (!oneOf(item, allowed) || result.includes(item)) return null;
    result.push(item);
  }
  return result;
};

const statusClass = (status) => {
  if (status === null) return 'NONE';
  if (status >= 200 && status <= 299) return 'HTTP_2XX';
  if (status >= 400 && status <= 499) return 'HTTP_4XX';
  if (status >= 500 && status <= 599) return 'HTTP_5XX';
  return 'HTTP_OTHER';
};

const sanitizeStage = (value) => {
  if (!exactKeys(value, ['stage']) || !oneOf(value.stage, allowedStages)) return null;
  return { stage: value.stage };
};

const sanitizeAggregate = (value) => {
  if (!exactKeys(value, ['aggregate']) || !isRecord(value.aggregate)) return null;
  const aggregate = value.aggregate;
  const keys = [
    'requestCount',
    'readOk',
    'readErrorCode',
    'rowCount',
    'acceptedCount',
    'quarantinedCount',
    'quarantineReasonCounts',
    'engineOk',
    'topic',
    'messageTemplate',
    'recommendationCount',
    'limitationCodes',
    'interfaceActionCount',
    'durationBucketMs',
    'terminalStage',
  ];
  if (!exactKeys(aggregate, keys)) return null;
  const quarantineReasonCounts = validateReasonCounts(aggregate.quarantineReasonCounts);
  const limitationCodes = validateStringArray(aggregate.limitationCodes, allowedLimitations, allowedLimitations.length);
  const readErrorCode = aggregate.readErrorCode;
  const topic = aggregate.topic;
  const messageTemplate = aggregate.messageTemplate;
  const durationBucketMs = aggregate.durationBucketMs;
  if (
    !isNonNegativeInteger(aggregate.requestCount) ||
    typeof aggregate.readOk !== 'boolean' ||
    !(readErrorCode === null || oneOf(readErrorCode, allowedReadErrorCodes)) ||
    !isNonNegativeInteger(aggregate.rowCount) ||
    !isNonNegativeInteger(aggregate.acceptedCount) ||
    !isNonNegativeInteger(aggregate.quarantinedCount) ||
    quarantineReasonCounts === null ||
    typeof aggregate.engineOk !== 'boolean' ||
    !(topic === null || oneOf(topic, allowedTopics)) ||
    !(messageTemplate === null || oneOf(messageTemplate, allowedMessageTemplates)) ||
    !isNonNegativeInteger(aggregate.recommendationCount) ||
    limitationCodes === null ||
    !isNonNegativeInteger(aggregate.interfaceActionCount) ||
    !(durationBucketMs === null || oneOf(durationBucketMs, allowedDurationBuckets)) ||
    !oneOf(aggregate.terminalStage, allowedStages)
  ) {
    return null;
  }
  return {
    aggregate: {
      requestCount: aggregate.requestCount,
      readOk: aggregate.readOk,
      readErrorCode,
      rowCount: aggregate.rowCount,
      acceptedCount: aggregate.acceptedCount,
      quarantinedCount: aggregate.quarantinedCount,
      quarantineReasonCounts,
      engineOk: aggregate.engineOk,
      topic,
      messageTemplate,
      recommendationCount: aggregate.recommendationCount,
      limitationCodes,
      interfaceActionCount: aggregate.interfaceActionCount,
      durationBucketMs,
      terminalStage: aggregate.terminalStage,
    },
  };
};

const sanitizeTransport = (value) => {
  if (!exactKeys(value, ['transport']) || !isRecord(value.transport)) return null;
  const transport = value.transport;
  const keys = [
    'logicalCallCount',
    'physicalCallCount',
    'retryBlocked',
    'firstOutcome',
    'firstHttpStatus',
    'firstHttpStatusClass',
  ];
  if (!exactKeys(transport, keys)) return null;
  const firstHttpStatus = transport.firstHttpStatus;
  if (
    !isNonNegativeInteger(transport.logicalCallCount) ||
    !isNonNegativeInteger(transport.physicalCallCount) ||
    transport.physicalCallCount > 1 ||
    typeof transport.retryBlocked !== 'boolean' ||
    !oneOf(transport.firstOutcome, allowedTransportOutcomes) ||
    !(firstHttpStatus === null || (Number.isInteger(firstHttpStatus) && firstHttpStatus >= 0 && firstHttpStatus <= 599)) ||
    !oneOf(transport.firstHttpStatusClass, allowedTransportStatusClasses) ||
    statusClass(firstHttpStatus) !== transport.firstHttpStatusClass
  ) {
    return null;
  }
  return {
    transport: {
      logicalCallCount: transport.logicalCallCount,
      physicalCallCount: transport.physicalCallCount,
      retryBlocked: transport.retryBlocked,
      firstOutcome: transport.firstOutcome,
      firstHttpStatus,
      firstHttpStatusClass: transport.firstHttpStatusClass,
    },
  };
};

const sanitizeJsonLine = (line) => {
  let value;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const rootKeys = Object.keys(value);
  if (rootKeys.length !== 1) return null;
  if (rootKeys[0] === 'stage') return sanitizeStage(value);
  if (rootKeys[0] === 'aggregate') return sanitizeAggregate(value);
  if (rootKeys[0] === 'transport') return sanitizeTransport(value);
  return null;
};

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
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'TRANSPORT_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({stage:'HARNESS_COMPLETED'})); console.log(JSON.stringify({transport:{logicalCallCount:1,physicalCallCount:1,retryBlocked:false,firstOutcome:'HTTP_RESPONSE',firstHttpStatus:200,firstHttpStatusClass:'HTTP_2XX'}}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'TRANSPORT_REORDERED_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({transport:{firstHttpStatusClass:'HTTP_2XX',firstHttpStatus:200,firstOutcome:'HTTP_RESPONSE',retryBlocked:false,physicalCallCount:1,logicalCallCount:1}}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'STAGE_WITH_EXTRA_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({stage:'HARNESS_COMPLETED',extra:'SAFE_BUT_FORBIDDEN'}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'TRANSPORT_WITH_EXTRA_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({transport:{logicalCallCount:1,physicalCallCount:1,retryBlocked:false,firstOutcome:'HTTP_RESPONSE',firstHttpStatus:200,firstHttpStatusClass:'HTTP_2XX',extra:'SAFE_BUT_FORBIDDEN'}}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'INVALID_JSON_STAGE_EXIT') {
    return [process.execPath, ['-e', "console.log('HARNESS_COMPLETED but not json');"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'ARRAY_JSON_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify([{stage:'HARNESS_COMPLETED'}]));"]];
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

const createSafeForwarder = () => {
  let pending = '';
  return (chunk) => {
    const lines = `${pending}${chunk.toString('utf8')}`.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const sanitized = sanitizeJsonLine(line);
      if (sanitized === null) continue;
      if ('stage' in sanitized) {
        lastStage = sanitized.stage;
      }
      process.stdout.write(`${JSON.stringify(sanitized)}\n`);
    }
  };
};

const [command, args] = childArgsFor();
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', createSafeForwarder());
child.stderr.on('data', createSafeForwarder());

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
