import { describe, expect, it } from 'vitest';
import { createSimulation, fastForward, LOG_LIMIT, MAX_TITLE_LENGTH, RECENT_TITLE_WINDOW, reduce } from './engine';
import { CHATTER } from './scenario';
import type { SimState } from './types';

const quiet = (seed = 1, overrides: Partial<Parameters<typeof createSimulation>[0]> = {}) =>
  createSimulation({ seed, agentCount: 3, maxParallel: 3, initialOrders: 0, autoOrders: false, ...overrides });

/** Ticks until `done(state)` holds, resolving every "needs you" pause like a human would. */
function runUntil(state: SimState, done: (s: SimState) => boolean, limit = 2000): SimState {
  let s = state;
  for (let i = 0; i < limit; i++) {
    if (done(s)) return s;
    for (const agent of s.agents) {
      if (agent.status === 'needs_you') s = reduce(s, { type: 'resolve', agentId: agent.id });
    }
    s = reduce(s, { type: 'tick' });
  }
  throw new Error(`condition not reached within ${limit} ticks`);
}

describe('determinism', () => {
  it('replays the exact same timeline for the same seed and actions', () => {
    const a = fastForward(createSimulation({ seed: 2026 }), 150);
    const b = fastForward(createSimulation({ seed: 2026 }), 150);
    expect(a).toEqual(b);
  });

  it('diverges for a different seed', () => {
    const a = fastForward(createSimulation({ seed: 1 }), 150);
    const b = fastForward(createSimulation({ seed: 2 }), 150);
    expect(a).not.toEqual(b);
  });

  it('does not mutate the previous state', () => {
    const before = createSimulation({ seed: 5 });
    const snapshot = structuredClone(before);
    reduce(before, { type: 'tick' });
    reduce(before, { type: 'addOrder', title: 'Something new' });
    expect(before).toEqual(snapshot);
  });
});

describe('scheduler', () => {
  it('never runs more agents than maxParallel', () => {
    let s = createSimulation({ seed: 3, agentCount: 5, maxParallel: 2, initialOrders: 8, autoOrders: false });
    for (let i = 0; i < 300; i++) {
      s = reduce(s, { type: 'tick' });
      const busy = s.agents.filter((a) => a.orderId !== null).length;
      expect(busy).toBeLessThanOrEqual(2);
    }
  });

  it('picks queued orders in FIFO order', () => {
    let s = quiet(4, { maxParallel: 1, agentCount: 1 });
    s = reduce(s, { type: 'addOrder', title: 'First order' });
    s = reduce(s, { type: 'addOrder', title: 'Second order' });
    s = reduce(s, { type: 'tick' });
    const busy = s.agents.find((a) => a.orderId !== null);
    expect(s.orders.find((o) => o.id === busy?.orderId)?.title).toBe('First order');
  });

  it('assigns a branch and worktree derived from the order title', () => {
    let s = quiet(6, { agentCount: 1, maxParallel: 1 });
    s = reduce(s, { type: 'addOrder', title: 'Add CSV export' });
    s = reduce(s, { type: 'tick' });
    const agent = s.agents[0]!;
    expect(agent.branch).toBe('feat/add-csv-export');
    expect(agent.worktree).toBe('.worktrees/add-csv-export');
  });
});

describe('order lifecycle', () => {
  it('serves every order with a unique PR number once pauses are resolved', () => {
    let s = quiet(11);
    for (const title of ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']) {
      s = reduce(s, { type: 'addOrder', title });
    }
    s = runUntil(s, (st) => st.orders.every((o) => o.status === 'served'));
    const prs = s.orders.map((o) => o.pr);
    expect(prs.every((n) => typeof n === 'number')).toBe(true);
    expect(new Set(prs).size).toBe(prs.length);
    expect(s.agents.every((a) => a.status === 'idle')).toBe(true);
  });

  it('walks each order through planning, coding, testing and reviewing', () => {
    let s = quiet(12, { agentCount: 1, maxParallel: 1 });
    s = reduce(s, { type: 'addOrder', title: 'Walk the phases' });
    const seen = new Set<string>();
    runUntil(s, (st) => {
      seen.add(st.agents[0]!.status);
      return st.orders[0]!.status === 'served';
    });
    for (const phase of ['planning', 'coding', 'testing', 'reviewing']) expect(seen).toContain(phase);
  });

  it('keeps a "needs you" agent frozen until a human resolves it', () => {
    // Find a seed/tick where an agent pauses, then prove ticks alone never unblock it.
    let s = createSimulation({ seed: 8, agentCount: 4, maxParallel: 4, initialOrders: 12, autoOrders: false, autoResolveAfter: null });
    for (let i = 0; i < 2000 && !s.agents.some((a) => a.status === 'needs_you'); i++) {
      s = reduce(s, { type: 'tick' });
    }
    const blocked = s.agents.find((a) => a.status === 'needs_you');
    expect(blocked).toBeDefined();
    expect(blocked!.blockedReason).toBeTruthy();
    expect(blocked!.phaseTicksTotal).toBe(0);

    for (let i = 0; i < 50; i++) s = reduce(s, { type: 'tick' });
    const still = s.agents.find((a) => a.id === blocked!.id)!;
    expect(still.status).toBe('needs_you');
    expect(still.orderId).toBe(blocked!.orderId);

    s = reduce(s, { type: 'resolve', agentId: blocked!.id });
    const resumed = s.agents.find((a) => a.id === blocked!.id)!;
    expect(resumed.status).not.toBe('needs_you');
    expect(resumed.blockedReason).toBeNull();
  });

  it('autopilot answers a paused agent after the configured number of ticks', () => {
    let s = createSimulation({ seed: 8, initialOrders: 12, autoOrders: false, autoResolveAfter: 5 });
    for (let i = 0; i < 2000 && !s.agents.some((a) => a.status === 'needs_you'); i++) {
      s = reduce(s, { type: 'tick' });
    }
    const blocked = s.agents.find((a) => a.status === 'needs_you')!;
    for (let i = 0; i < 4; i++) s = reduce(s, { type: 'tick' });
    expect(s.agents.find((a) => a.id === blocked.id)!.status).toBe('needs_you');
    s = reduce(s, { type: 'tick' });
    expect(s.agents.find((a) => a.id === blocked.id)!.status).not.toBe('needs_you');
    expect(s.log.some((l) => l.agentId === blocked.id && l.text.includes('autopilot'))).toBe(true);
  });

  it('setAutopilot turns the simulated human on and off', () => {
    const s = createSimulation({ seed: 1, autoResolveAfter: null });
    const on = reduce(s, { type: 'setAutopilot', enabled: true });
    expect(on.config.autoResolveAfter).toBeGreaterThan(0);
    expect(reduce(on, { type: 'setAutopilot', enabled: false }).config.autoResolveAfter).toBeNull();
    expect(reduce(on, { type: 'setAutopilot', enabled: true })).toBe(on);
  });

  it('ignores resolve for an agent that is not blocked', () => {
    const s = quiet(13);
    expect(reduce(s, { type: 'resolve', agentId: s.agents[0]!.id })).toBe(s);
    expect(reduce(s, { type: 'resolve', agentId: 'nope' })).toBe(s);
  });

  it('records gate runs and passes', () => {
    let s = quiet(14);
    for (const title of ['One', 'Two', 'Three']) s = reduce(s, { type: 'addOrder', title });
    s = runUntil(s, (st) => st.orders.every((o) => o.status === 'served'));
    expect(s.gateRuns).toBeGreaterThanOrEqual(9);
    expect(s.gatePasses).toBeLessThanOrEqual(s.gateRuns);
    expect(s.gatePasses).toBeGreaterThan(0);
  });
});

describe('addOrder', () => {
  it('trims the title and queues it', () => {
    const s = reduce(quiet(), { type: 'addOrder', title: '  Ship it  ' });
    expect(s.orders).toHaveLength(1);
    expect(s.orders[0]).toMatchObject({ title: 'Ship it', status: 'queued', slug: 'ship-it' });
  });

  it('rejects empty and over-long titles by returning the same state', () => {
    const s = quiet();
    expect(reduce(s, { type: 'addOrder', title: '   ' })).toBe(s);
    expect(reduce(s, { type: 'addOrder', title: 'x'.repeat(MAX_TITLE_LENGTH + 1) })).toBe(s);
  });
});

describe('auto orders and log', () => {
  it('keeps the kitchen busy with generated orders when enabled', () => {
    const s = fastForward(createSimulation({ seed: 21, initialOrders: 0, autoOrders: true }), 200);
    expect(s.orders.length).toBeGreaterThan(3);
  });

  it('does not repeat a generated title among the recent orders', () => {
    const s = fastForward(createSimulation({ seed: 23, initialOrders: 6, autoOrders: true }), 400);
    for (let i = 0; i < s.orders.length; i++) {
      const window = s.orders.slice(Math.max(0, i - RECENT_TITLE_WINDOW), i).map((o) => o.title);
      expect(window).not.toContain(s.orders[i]!.title);
    }
  });

  it('narrates each phase in script order', () => {
    let s = quiet(24, { agentCount: 1, maxParallel: 1 });
    s = reduce(s, { type: 'addOrder', title: 'Narrated order' });
    s = runUntil(s, (st) => st.orders[0]!.status === 'served');
    const coding = CHATTER.coding.map((t) => t.split('{')[0]!.trim());
    const indices = s.log
      .map((l) => coding.findIndex((prefix) => l.text.startsWith(prefix)))
      .filter((i) => i >= 0);
    expect(indices.length).toBeGreaterThan(2);
    // Within one coding round the script only moves forward; each retry may restart it once.
    const drops = indices.filter((v, i) => i > 0 && v < indices[i - 1]!).length;
    expect(drops).toBeLessThanOrEqual(2);
  });

  it('caps the log so it never grows without bound', () => {
    const s = fastForward(createSimulation({ seed: 22 }), 1500);
    expect(s.log.length).toBeLessThanOrEqual(LOG_LIMIT);
    const ids = s.log.map((l) => l.id);
    expect(ids).toEqual([...ids].sort((x, y) => x - y));
  });

  it('reset starts a fresh simulation with the given seed', () => {
    const used = fastForward(createSimulation({ seed: 30 }), 40);
    const fresh = reduce(used, { type: 'reset', seed: 31 });
    expect(fresh).toEqual(createSimulation({ ...used.config, seed: 31 }));
  });
});
