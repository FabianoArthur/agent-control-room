export type Phase = 'planning' | 'coding' | 'testing' | 'reviewing';
export type AgentStatus = 'idle' | Phase | 'needs_you';
export type OrderStatus = 'queued' | 'cooking' | 'served';
export type GateName = 'typecheck' | 'lint' | 'tests';
export type GateStatus = 'pending' | 'running' | 'passed' | 'failed';
export type LogLevel = 'info' | 'ok' | 'warn' | 'error';

export interface Gate {
  name: GateName;
  status: GateStatus;
  detail: string | null;
}

export interface Order {
  id: string;
  title: string;
  slug: string;
  createdAt: number;
  status: OrderStatus;
  agentId: string | null;
  pr: number | null;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  /** Phase to return to after a "needs you" pause is resolved. */
  resumePhase: Phase | null;
  orderId: string | null;
  branch: string | null;
  worktree: string | null;
  phaseTicksLeft: number;
  phaseTicksTotal: number;
  gates: Gate[];
  /** Failed gate rounds on the current order. */
  retries: number;
  /** After a human unblocks a failing gate, the next run passes. */
  forcePass: boolean;
  blockedReason: string | null;
  /** Tick at which the agent paused, for the autopilot countdown. */
  blockedAt: number | null;
  served: number;
}

export interface LogLine {
  id: number;
  tick: number;
  agentId: string | null;
  level: LogLevel;
  text: string;
}

export interface SimConfig {
  seed: number;
  agentCount: number;
  maxParallel: number;
  initialOrders: number;
  autoOrders: boolean;
  /** Ticks before a simulated human answers a pause; null = only you can unblock. */
  autoResolveAfter: number | null;
}

export interface SimState {
  config: SimConfig;
  rngState: number;
  tick: number;
  agents: Agent[];
  orders: Order[];
  log: LogLine[];
  nextOrderId: number;
  nextPr: number;
  nextLogId: number;
  gateRuns: number;
  gatePasses: number;
}

export type Action =
  | { type: 'tick' }
  | { type: 'addOrder'; title: string }
  | { type: 'resolve'; agentId: string }
  | { type: 'setAutopilot'; enabled: boolean }
  | { type: 'reset'; seed: number };
