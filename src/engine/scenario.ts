import type { GateName, Phase } from './types';

/** Computing pioneers — the kitchen staff. */
export const AGENT_NAMES = ['Ada', 'Grace', 'Linus', 'Barbara', 'Ken', 'Margaret'] as const;

/** Orders the simulation invents when auto-orders is on. */
export const ORDER_TITLES = [
  'Add CSV export to reports',
  'Fix flaky login test',
  'Paginate the audit log',
  'Dark mode for settings page',
  'Rate-limit the public API',
  'Cache avatar thumbnails',
  'Migrate config to TOML',
  'Keyboard shortcuts for search',
  'Retry webhooks with backoff',
  'Empty state for projects list',
  'Upgrade test runner',
  'Stream build logs over SSE',
  'Validate uploads server-side',
  'i18n for onboarding emails',
  'Debounce autosave',
  'Health check endpoint',
] as const;

export const PHASE_TICKS: Record<Phase, [min: number, max: number]> = {
  planning: [3, 5],
  coding: [6, 11],
  testing: [3, 3],
  reviewing: [2, 4],
};

export const GATE_ORDER: readonly GateName[] = ['typecheck', 'lint', 'tests'];

/** Chance that a single gate run fails on its own (before any human help). */
export const GATE_FAIL_CHANCE: Record<GateName, number> = {
  typecheck: 0.08,
  lint: 0.06,
  tests: 0.18,
};

/** Chance that planning stops to ask the human a question. */
export const AMBIGUITY_CHANCE = 0.14;
/** Chance per idle tick that a new order walks in (auto-orders mode). */
export const AUTO_ORDER_CHANCE = 0.12;

export const AMBIGUITY_QUESTIONS = [
  'Spec says "fast". What latency budget should I target?',
  'Two acceptance criteria contradict each other. Which one wins?',
  'Should this ship behind a feature flag?',
  'The ticket mentions an endpoint that does not exist yet. Stub it or wait?',
] as const;

/** What each phase says, in order, as it progresses. */
export const CHATTER: Record<Phase, readonly string[]> = {
  planning: [
    'reading the order and acceptance criteria',
    'mapping blast radius: {n} files across 2 layers',
    'querying the code graph for call sites',
    'drafting plan with test list',
    'plan reviewed by an independent agent: approved',
  ],
  coding: [
    'writing failing test first ({n} cases)',
    'red: {n} failing, as expected',
    'implementing the smallest change that passes',
    'green: {n} passing',
    'refactoring: extracting a helper',
    'touching {n} files, all inside the declared radius',
    'committing: feat: {slug}',
  ],
  testing: ['running gates in the worktree', 'no dev server needed, isolated run'],
  reviewing: [
    'self-review: diff matches the plan',
    'writing PR body with gate numbers',
    'pushing branch to origin',
    'waiting for CI: {n} checks',
  ],
};
