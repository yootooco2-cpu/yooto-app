/** Logique PURE de santé du cockpit — aucun import lourd (testable isolément). */

export type SignalStatus = 'up' | 'degraded' | 'down';

/** Score de santé global (0-100), pondéré : services 50 %, qualité données 25 %, stabilité 25 %. */
export function computeHealthScore(input: {
  servicesUp: number;
  servicesDegraded: number;
  servicesTotal: number;
  coverage: number;
  hasError: boolean;
}): number {
  const svc = input.servicesTotal > 0 ? (input.servicesUp + input.servicesDegraded * 0.5) / input.servicesTotal : 0;
  const data = Math.max(0, Math.min(1, input.coverage / 100));
  const stability = input.hasError ? 0.5 : 1;
  return Math.round((svc * 0.5 + data * 0.25 + stability * 0.25) * 100);
}

export function healthTone(score: number): SignalStatus {
  return score >= 90 ? 'up' : score >= 70 ? 'degraded' : 'down';
}
