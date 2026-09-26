import { describe, expect, it } from 'vitest';
import { createSimulation, reduce } from './engine';
import { selectStats } from './selectors';

describe('selectStats', () => {
  it('counts queued, running, blocked and served work', () => {
    let s = createSimulation({ seed: 1, agentCount: 2, maxParallel: 2, initialOrders: 0, autoOrders: false });
    for (const title of ['A', 'B', 'C']) s = reduce(s, { type: 'addOrder', title });
    s = reduce(s, { type: 'tick' });

    s = {
      ...s,
      agents: s.agents.map((a, i) => (i === 0 ? { ...a, status: 'needs_you' as const, blockedReason: 'why' } : a)),
      orders: [...s.orders, { id: 'o-x', title: 'Done', slug: 'done', createdAt: 0, status: 'served', agentId: null, pr: 7 }],
      gateRuns: 4,
      gatePasses: 3,
    };

    expect(selectStats(s)).toEqual({ queued: 1, running: 1, needsYou: 1, served: 1, gatePassRate: 0.75 });
  });

  it('reports a null pass rate before any gate has run', () => {
    const s = createSimulation({ seed: 1, initialOrders: 0, autoOrders: false });
    expect(selectStats(s).gatePassRate).toBeNull();
  });
});
