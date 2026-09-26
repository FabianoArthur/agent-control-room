/** Each tick stands for 15 simulated seconds. */
const SECONDS_PER_TICK = 15;

export function clock(tick: number): string {
  const total = tick * SECONDS_PER_TICK;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export const percent = (value: number | null): string => (value === null ? '-' : `${Math.round(value * 100)}%`);
