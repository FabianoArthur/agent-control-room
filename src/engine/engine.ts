import { createRng, type Rng } from './rng';
import {
  AGENT_NAMES,
  AMBIGUITY_CHANCE,
  AMBIGUITY_QUESTIONS,
  AUTO_ORDER_CHANCE,
  CHATTER,
  GATE_FAIL_CHANCE,
  GATE_ORDER,
  ORDER_TITLES,
  PHASE_TICKS,
} from './scenario';
import { slugify } from './slug';
import type { Action, Agent, Gate, LogLevel, Phase, SimConfig, SimState } from './types';

export const LOG_LIMIT = 300;
export const MAX_TITLE_LENGTH = 80;
/** Failed gate rounds an agent retries by itself before asking for help. */
const SELF_RETRIES = 1;
const FIRST_PR = 101;
export const AUTOPILOT_TICKS = 14;
/** A generated title is not reused while it is among this many most recent orders. */
export const RECENT_TITLE_WINDOW = 8;

const DEFAULT_CONFIG: SimConfig = {
  seed: 2026,
  agentCount: 4,
  maxParallel: 4,
  initialOrders: 5,
  autoOrders: true,
  autoResolveAfter: AUTOPILOT_TICKS,
};

const freshGates = (): Gate[] => GATE_ORDER.map((name) => ({ name, status: 'pending', detail: null }));

function idleAgent(id: string, name: string): Agent {
  return {
    id,
    name,
    status: 'idle',
    resumePhase: null,
    orderId: null,
    branch: null,
    worktree: null,
    phaseTicksLeft: 0,
    phaseTicksTotal: 0,
    gates: freshGates(),
    retries: 0,
    forcePass: false,
    blockedReason: null,
    blockedAt: null,
    served: 0,
  };
}

// ---------------------------------------------------------------------------
// Mutable helpers. `reduce` clones the state once, then these edit the draft.
// ---------------------------------------------------------------------------

function log(s: SimState, agentId: string | null, level: LogLevel, text: string) {
  s.log.push({ id: s.nextLogId++, tick: s.tick, agentId, level, text });
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
}

function queueOrder(s: SimState, title: string) {
  const id = `o-${s.nextOrderId++}`;
  s.orders.push({ id, title, slug: slugify(title), createdAt: s.tick, status: 'queued', agentId: null, pr: null });
  log(s, null, 'info', `order ${id} queued: "${title}"`);
}

function pickTitle(s: SimState, rng: Rng): string {
  const recent = new Set(s.orders.slice(-RECENT_TITLE_WINDOW).map((o) => o.title));
  const fresh = ORDER_TITLES.filter((t) => !recent.has(t));
  return rng.pick(fresh.length > 0 ? fresh : ORDER_TITLES);
}

function enterPhase(agent: Agent, phase: Phase, rng: Rng) {
  const [min, max] = PHASE_TICKS[phase];
  agent.status = phase;
  agent.phaseTicksTotal = rng.int(min, max);
  agent.phaseTicksLeft = agent.phaseTicksTotal;
  if (phase === 'testing') {
    agent.gates = GATE_ORDER.map((name, i) => ({ name, status: i === 0 ? 'running' : 'pending', detail: null }));
  }
}

function block(s: SimState, agent: Agent, resumePhase: Phase, reason: string) {
  agent.status = 'needs_you';
  agent.resumePhase = resumePhase;
  agent.blockedReason = reason;
  agent.blockedAt = s.tick;
  // Nothing is in progress while paused; the resumed phase starts from zero.
  agent.phaseTicksLeft = 0;
  agent.phaseTicksTotal = 0;
  log(s, agent.id, 'warn', `needs you: ${reason}`);
}

function fill(template: string, agent: Agent, rng: Rng, s: SimState): string {
  const slug = s.orders.find((o) => o.id === agent.orderId)?.slug ?? 'task';
  return template.replace('{n}', String(rng.int(2, 24))).replace('{slug}', slug);
}

function dispatch(s: SimState, rng: Rng) {
  const busy = () => s.agents.filter((a) => a.orderId !== null).length;
  for (const agent of s.agents) {
    if (busy() >= s.config.maxParallel) return;
    if (agent.orderId !== null) continue;
    const order = s.orders.find((o) => o.status === 'queued');
    if (!order) return;
    order.status = 'cooking';
    order.agentId = agent.id;
    agent.orderId = order.id;
    agent.branch = `feat/${order.slug}`;
    agent.worktree = `.worktrees/${order.slug}`;
    agent.retries = 0;
    agent.forcePass = false;
    agent.gates = freshGates();
    enterPhase(agent, 'planning', rng);
    log(s, agent.id, 'info', `picked ${order.id} → worktree ${agent.worktree} on ${agent.branch}`);
  }
}

/** Runs the gate whose turn it is (one per testing tick). Returns false if it failed. */
function runNextGate(s: SimState, agent: Agent, rng: Rng): boolean {
  const gate = agent.gates.find((g) => g.status === 'running' || g.status === 'pending');
  if (!gate) return true;
  s.gateRuns++;
  const failed = !agent.forcePass && rng.chance(GATE_FAIL_CHANCE[gate.name]);
  if (failed) {
    gate.status = 'failed';
    gate.detail = gate.name === 'tests' ? `${rng.int(1, 4)} failing` : `${rng.int(1, 6)} errors`;
    log(s, agent.id, 'error', `gate ${gate.name}: ${gate.detail}`);
    return false;
  }
  s.gatePasses++;
  gate.status = 'passed';
  gate.detail = gate.name === 'tests' ? `${rng.int(40, 320)} passed` : '0 errors';
  log(s, agent.id, 'ok', `gate ${gate.name}: ${gate.detail}`);
  const upcoming = agent.gates.find((g) => g.status === 'pending');
  if (upcoming) upcoming.status = 'running';
  return true;
}

function finishOrder(s: SimState, agent: Agent) {
  const order = s.orders.find((o) => o.id === agent.orderId);
  if (order) {
    order.status = 'served';
    order.pr = s.nextPr++;
    log(s, agent.id, 'ok', `PR #${order.pr} opened on ${agent.branch}, ready for review`);
  }
  Object.assign(agent, idleAgent(agent.id, agent.name), { served: agent.served + 1 });
}

function unblock(s: SimState, agent: Agent, rng: Rng, who: 'you' | 'autopilot') {
  const wasGate = agent.gates.some((g) => g.status === 'failed');
  agent.blockedReason = null;
  agent.blockedAt = null;
  agent.forcePass = wasGate;
  enterPhase(agent, agent.resumePhase ?? 'coding', rng);
  agent.resumePhase = null;
  log(s, agent.id, 'ok', `unblocked by ${who}, ${wasGate ? 'fixing the gate' : 'answer received'}`);
}

function advance(s: SimState, agent: Agent, rng: Rng) {
  const wait = s.config.autoResolveAfter;
  if (agent.status === 'needs_you' && wait !== null && agent.blockedAt !== null && s.tick - agent.blockedAt >= wait) {
    unblock(s, agent, rng, 'autopilot');
    return;
  }
  if (agent.orderId === null || agent.status === 'needs_you' || agent.status === 'idle') return;
  const phase = agent.status;

  if (phase === 'testing') {
    if (!runNextGate(s, agent, rng)) {
      if (agent.retries < SELF_RETRIES) {
        agent.retries++;
        log(s, agent.id, 'warn', 'gate failed, back to coding to fix it');
        enterPhase(agent, 'coding', rng);
      } else {
        block(s, agent, 'coding', 'a gate keeps failing after one retry. Take a look?');
      }
      return;
    }
    agent.phaseTicksLeft--;
    if (agent.gates.every((g) => g.status === 'passed')) enterPhase(agent, 'reviewing', rng);
    return;
  }

  // Walk the phase's script in order, one beat each time progress crosses into the next line.
  const script = CHATTER[phase];
  const done = agent.phaseTicksTotal - agent.phaseTicksLeft;
  const beat = Math.floor((done * script.length) / agent.phaseTicksTotal);
  const previous = done === 0 ? -1 : Math.floor(((done - 1) * script.length) / agent.phaseTicksTotal);
  const line = script[beat];
  if (beat !== previous && line) log(s, agent.id, 'info', fill(line, agent, rng, s));
  agent.phaseTicksLeft--;
  if (agent.phaseTicksLeft > 0) return;

  if (phase === 'planning') {
    if (rng.chance(AMBIGUITY_CHANCE)) block(s, agent, 'coding', rng.pick(AMBIGUITY_QUESTIONS));
    else enterPhase(agent, 'coding', rng);
  } else if (phase === 'coding') {
    enterPhase(agent, 'testing', rng);
  } else {
    finishOrder(s, agent);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createSimulation(partial: Partial<SimConfig> = {}): SimState {
  const config = { ...DEFAULT_CONFIG, ...partial };
  const agentCount = Math.min(Math.max(config.agentCount, 1), AGENT_NAMES.length);
  const rng = createRng(config.seed);
  const s: SimState = {
    config,
    rngState: 0,
    tick: 0,
    agents: AGENT_NAMES.slice(0, agentCount).map((name, i) => idleAgent(`a-${i + 1}`, name)),
    orders: [],
    log: [],
    nextOrderId: 1,
    nextPr: FIRST_PR,
    nextLogId: 1,
    gateRuns: 0,
    gatePasses: 0,
  };
  log(s, null, 'info', `kitchen open: seed ${config.seed}, ${agentCount} agents, max ${config.maxParallel} in parallel`);
  for (let i = 0; i < config.initialOrders; i++) queueOrder(s, pickTitle(s, rng));
  s.rngState = rng.state;
  return s;
}

export function reduce(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'reset':
      return createSimulation({ ...state.config, seed: action.seed });

    case 'addOrder': {
      const title = action.title.trim();
      if (!title || title.length > MAX_TITLE_LENGTH) return state;
      const s = structuredClone(state);
      queueOrder(s, title);
      return s;
    }

    case 'resolve': {
      const target = state.agents.find((a) => a.id === action.agentId);
      if (!target || target.status !== 'needs_you') return state;
      const s = structuredClone(state);
      const rng = createRng(s.rngState);
      const agent = s.agents.find((a) => a.id === action.agentId);
      if (agent) unblock(s, agent, rng, 'you');
      s.rngState = rng.state;
      return s;
    }

    case 'setAutopilot': {
      const autoResolveAfter = action.enabled ? AUTOPILOT_TICKS : null;
      if (state.config.autoResolveAfter === autoResolveAfter) return state;
      return { ...state, config: { ...state.config, autoResolveAfter } };
    }

    case 'tick': {
      const s = structuredClone(state);
      const rng = createRng(s.rngState);
      s.tick++;
      const hasQueue = s.orders.some((o) => o.status === 'queued');
      if (s.config.autoOrders && !hasQueue && rng.chance(AUTO_ORDER_CHANCE)) {
        queueOrder(s, pickTitle(s, rng));
      }
      for (const agent of s.agents) advance(s, agent, rng);
      dispatch(s, rng);
      s.rngState = rng.state;
      return s;
    }
  }
}

export function fastForward(state: SimState, ticks: number): SimState {
  let s = state;
  for (let i = 0; i < ticks; i++) s = reduce(s, { type: 'tick' });
  return s;
}
