export const DEFAULT_SEED = 2026;
/** Upper bound for `?t=` so a shared link cannot freeze the tab. */
export const MAX_FAST_FORWARD = 5000;
const UINT32_MAX = 0xffffffff;

export interface SimParams {
  seed: number;
  fastForward: number;
}

const toInt = (raw: string | null): number | null =>
  raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

/** Reads `?seed=<uint32>&t=<ticks>` from a query string; anything invalid falls back. */
export function parseParams(search: string): SimParams {
  const params = new URLSearchParams(search);
  const seed = toInt(params.get('seed'));
  const t = toInt(params.get('t'));
  return {
    seed: seed !== null && seed <= UINT32_MAX ? seed : DEFAULT_SEED,
    fastForward: t === null ? 0 : Math.min(t, MAX_FAST_FORWARD),
  };
}
