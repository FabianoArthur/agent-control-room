import { useCallback, useEffect, useReducer, useState } from 'react';
import { createSimulation, fastForward, reduce } from '../engine/engine';
import type { SimParams } from '../engine/params';

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];
const BASE_TICK_MS = 800;

/** Owns the simulation state and the clock that drives it. */
export function useSimulation({ seed, fastForward: ticks }: SimParams) {
  const [state, dispatch] = useReducer(reduce, undefined, () => fastForward(createSimulation({ seed }), ticks));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!playing || hidden) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), BASE_TICK_MS / speed);
    return () => window.clearInterval(id);
  }, [playing, hidden, speed]);

  const addOrder = useCallback((title: string) => dispatch({ type: 'addOrder', title }), []);
  const resolve = useCallback((agentId: string) => dispatch({ type: 'resolve', agentId }), []);
  const reset = useCallback((nextSeed: number) => dispatch({ type: 'reset', seed: nextSeed }), []);
  const step = useCallback(() => dispatch({ type: 'tick' }), []);
  const setAutopilot = useCallback((enabled: boolean) => dispatch({ type: 'setAutopilot', enabled }), []);

  return { state, playing, setPlaying, speed, setSpeed, addOrder, resolve, reset, step, setAutopilot };
}
