import type { FinalResponse, ValidationResult } from './contracts';

export const SAFE_FALLBACKS = {
  INVALID: 'CLARIFICATION_REQUIRED',
  EMPTY: 'NO_RESULT',
  UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export function createSafeFallback(
  reason: 'INVALID' | 'EMPTY' | 'UNAVAILABLE',
): FinalResponse {
  const topic = reason === 'INVALID' ? 'CLARIFICATION' : 'NO_RESULT';
  return {
    topic,
    message: { template: SAFE_FALLBACKS[reason], variables: {} },
    recommendations: [],
    limitations: reason === 'EMPTY' ? ['INSUFFICIENT_EVIDENCE'] : [],
    interfaceActions: [],
  };
}

export function safeResultOrFallback(
  result: ValidationResult<FinalResponse>,
): FinalResponse {
  return result.ok ? result.value : createSafeFallback('INVALID');
}
