import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, MAX_FAST_FORWARD, parseParams } from './params';

describe('parseParams', () => {
  it('reads seed and fast-forward ticks', () => {
    expect(parseParams('?seed=7&t=120')).toEqual({ seed: 7, fastForward: 120 });
  });

  it('falls back to defaults when params are missing', () => {
    expect(parseParams('')).toEqual({ seed: DEFAULT_SEED, fastForward: 0 });
  });

  it('ignores garbage and negative values', () => {
    expect(parseParams('?seed=abc&t=-5')).toEqual({ seed: DEFAULT_SEED, fastForward: 0 });
    expect(parseParams('?seed=1.5&t=2e3')).toEqual({ seed: DEFAULT_SEED, fastForward: 0 });
  });

  it('caps fast-forward so a crafted link cannot freeze the tab', () => {
    expect(parseParams('?t=999999').fastForward).toBe(MAX_FAST_FORWARD);
  });

  it('keeps seeds inside the uint32 range', () => {
    expect(parseParams('?seed=4294967296').seed).toBe(DEFAULT_SEED);
    expect(parseParams('?seed=4294967295').seed).toBe(4294967295);
  });
});
