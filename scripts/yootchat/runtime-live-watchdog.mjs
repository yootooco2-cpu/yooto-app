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
const isBoundedInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
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

const sumValues = (value) => Object.values(value).reduce((total, count) => total + count, 0);

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
  const readOkErrorConsistent = aggregate.readOk
    ? readErrorCode === null
    : readErrorCode !== null && oneOf(readErrorCode, allowedReadErrorCodes);
  if (
    !isBoundedInteger(aggregate.requestCount, 0, 1) ||
    typeof aggregate.readOk !== 'boolean' ||
    !readOkErrorConsistent ||
    !isBoundedInteger(aggregate.rowCount, 0, 5) ||
    !isBoundedInteger(aggregate.acceptedCount, 0, 5) ||
    aggregate.acceptedCount > aggregate.rowCount ||
    !isBoundedInteger(aggregate.quarantinedCount, 0, 5) ||
    aggregate.quarantinedCount > aggregate.rowCount ||
    quarantineReasonCounts === null ||
    sumValues(quarantineReasonCounts) !== aggregate.quarantinedCount ||
    typeof aggregate.engineOk !== 'boolean' ||
    !(topic === null || oneOf(topic, allowedTopics)) ||
    !(messageTemplate === null || oneOf(messageTemplate, allowedMessageTemplates)) ||
    !isBoundedInteger(aggregate.recommendationCount, 0, 3) ||
    limitationCodes === null ||
    !isBoundedInteger(aggregate.interfaceActionCount, 0, 3) ||
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
    !isBoundedInteger(transport.physicalCallCount, 0, 1) ||
    transport.logicalCallCount < transport.physicalCallCount ||
    typeof transport.retryBlocked !== 'boolean' ||
    transport.retryBlocked !== (transport.logicalCallCount > transport.physicalCallCount) ||
    !oneOf(transport.firstOutcome, allowedTransportOutcomes) ||
    !(firstHttpStatus === null || isBoundedInteger(firstHttpStatus, 100, 599)) ||
    (transport.firstOutcome === 'HTTP_RESPONSE') !== (firstHttpStatus !== null) ||
    (transport.physicalCallCount === 0 && transport.firstOutcome !== 'NONE') ||
    (transport.physicalCallCount === 1 && transport.firstOutcome === 'NONE') ||
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
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'AGGREGATE_EXIT') {
    return [process.execPath, ['-e', "console.log(JSON.stringify({aggregate:{requestCount:1,readOk:true,readErrorCode:null,rowCount:2,acceptedCount:2,quarantinedCount:0,quarantineReasonCounts:{},engineOk:true,topic:'DISCOVER_LOCAL',messageTemplate:'RESULTS_FOUND',recommendationCount:2,limitationCodes:[],interfaceActionCount:2,durationBucketMs:'0-50',terminalStage:'HARNESS_COMPLETED'}}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD?.startsWith('INVALID_AGGREGATE_')) {
    const patches = {
      INVALID_AGGREGATE_REQUEST_COUNT: "requestCount:2",
      INVALID_AGGREGATE_ROW_COUNT: "rowCount:6",
      INVALID_AGGREGATE_ACCEPTED_GT_ROW: "rowCount:1,acceptedCount:2",
      INVALID_AGGREGATE_QUARANTINE_SUM: "quarantinedCount:2,quarantineReasonCounts:{UNKNOWN_PROPERTY:1}",
      INVALID_AGGREGATE_RECOMMENDATION_COUNT: "recommendationCount:4",
    };
    const patch = patches[process.env.YOOTCHAT_WATCHDOG_TEST_CHILD];
    return [process.execPath, ['-e', `const aggregate={requestCount:1,readOk:true,readErrorCode:null,rowCount:2,acceptedCount:2,quarantinedCount:0,quarantineReasonCounts:{},engineOk:true,topic:'DISCOVER_LOCAL',messageTemplate:'RESULTS_FOUND',recommendationCount:2,limitationCodes:[],interfaceActionCount:2,durationBucketMs:'0-50',terminalStage:'HARNESS_COMPLETED'}; Object.assign(aggregate,{${patch}}); console.log(JSON.stringify({aggregate}));`]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD?.startsWith('INVALID_TRANSPORT_')) {
    const patches = {
      INVALID_TRANSPORT_LOGICAL_LT_PHYSICAL: "logicalCallCount:0,physicalCallCount:1",
      INVALID_TRANSPORT_RETRY_INCOHERENT: "logicalCallCount:2,physicalCallCount:1,retryBlocked:false",
      INVALID_TRANSPORT_STATUS_ZERO: "firstHttpStatus:0,firstHttpStatusClass:'NONE'",
      INVALID_TRANSPORT_HTTP_RESPONSE_NULL: "firstOutcome:'HTTP_RESPONSE',firstHttpStatus:null,firstHttpStatusClass:'NONE'",
      INVALID_TRANSPORT_TYPE_ERROR_WITH_STATUS: "firstOutcome:'TYPE_ERROR',firstHttpStatus:500,firstHttpStatusClass:'HTTP_5XX'",
    };
    const patch = patches[process.env.YOOTCHAT_WATCHDOG_TEST_CHILD];
    return [process.execPath, ['-e', `const transport={logicalCallCount:1,physicalCallCount:1,retryBlocked:false,firstOutcome:'HTTP_RESPONSE',firstHttpStatus:200,firstHttpStatusClass:'HTTP_2XX'}; Object.assign(transport,{${patch}}); console.log(JSON.stringify({transport}));`]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'REMAINDER_VALID_EXIT') {
    return [process.execPath, ['-e', "process.stdout.write(JSON.stringify({stage:'HARNESS_COMPLETED'}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'REMAINDER_INVALID_EXIT') {
    return [process.execPath, ['-e', "process.stdout.write(JSON.stringify({stage:'HARNESS_COMPLETED',extra:'SAFE_BUT_FORBIDDEN'}));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'FRAGMENTED_STDOUT_EXIT') {
    return [process.execPath, ['-e', "const line=JSON.stringify({transport:{logicalCallCount:1,physicalCallCount:1,retryBlocked:false,firstOutcome:'HTTP_RESPONSE',firstHttpStatus:200,firstHttpStatusClass:'HTTP_2XX'}}); process.stdout.write(line.slice(0,20)); process.stdout.write(line.slice(20));"]];
  }
  if (process.env.YOOTCHAT_WATCHDOG_TEST_CHILD === 'FRAGMENTED_STDERR_EXIT') {
    return [process.execPath, ['-e', "const line=JSON.stringify({stage:'HARNESS_COMPLETED'}); process.stderr.write(line.slice(0,10)); process.stderr.write(line.slice(10));"]];
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
  const forwardLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const sanitized = sanitizeJsonLine(trimmed);
    if (sanitized === null) return;
    if ('stage' in sanitized) {
      lastStage = sanitized.stage;
    }
    process.stdout.write(`${JSON.stringify(sanitized)}\n`);
  };

  return {
    push(chunk) {
    const lines = `${pending}${chunk.toString('utf8')}`.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const rawLine of lines) {
        forwardLine(rawLine);
      }
    },
    flush() {
      if (!pending) return;
      const line = pending;
      pending = '';
      forwardLine(line);
    }
  };
};

const [command, args] = childArgsFor();
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stdoutForwarder = createSafeForwarder();
const stderrForwarder = createSafeForwarder();

child.stdout.on('data', (chunk) => stdoutForwarder.push(chunk));
child.stderr.on('data', (chunk) => stderrForwarder.push(chunk));

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
  stdoutForwarder.flush();
  stderrForwarder.flush();
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
