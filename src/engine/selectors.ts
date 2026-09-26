import type { SimState } from './types';

export interface Stats {
  queued: number;
  running: number;
  needsYou: number;
  served: number;
  /** Share of gate runs that passed, or null before the first run. */
  gatePassRate: number | null;
}

export function selectStats(s: SimState): Stats {
  return {
    queued: s.orders.filter((o) => o.status === 'queued').length,
    running: s.agents.filter((a) => a.orderId !== null && a.status !== 'needs_you').length,
    needsYou: s.agents.filter((a) => a.status === 'needs_you').length,
    served: s.orders.filter((o) => o.status === 'served').length,
    gatePassRate: s.gateRuns === 0 ? null : s.gatePasses / s.gateRuns,
  };
}
