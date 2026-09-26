import { ArrowCounterClockwise, Moon, Pause, Play, SkipForward, Sun } from '@phosphor-icons/react';
import { SPEEDS, type Speed } from '../hooks/useSimulation';
import type { Theme } from '../hooks/useTheme';
import { clock } from './format';

interface Props {
  tick: number;
  seed: number;
  playing: boolean;
  speed: Speed;
  theme: Theme;
  autopilot: boolean;
  onAutopilot: (enabled: boolean) => void;
  onTogglePlay: () => void;
  onStep: () => void;
  onSpeed: (speed: Speed) => void;
  onReset: () => void;
  onToggleTheme: () => void;
}

export function Header(p: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <div>
          <h1>Agent Control Room</h1>
          <p className="muted small">
            Simulated run <span className="mono">seed {p.seed}</span>
          </p>
        </div>
      </div>

      <div className="controls" role="toolbar" aria-label="Simulation controls">
        <span className="clock mono" aria-label={`Simulated time ${clock(p.tick)}`}>
          {clock(p.tick)}
        </span>
        <button type="button" className="btn btn-primary" onClick={p.onTogglePlay} aria-pressed={p.playing}>
          {p.playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          {p.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn icon" onClick={p.onStep} disabled={p.playing} aria-label="Advance one tick">
          <SkipForward aria-hidden="true" />
        </button>
        <div className="segmented" role="group" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={p.speed === s} onClick={() => p.onSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={p.autopilot} onChange={(e) => p.onAutopilot(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          Autopilot
        </label>
        <button type="button" className="btn icon" onClick={p.onReset} aria-label="Restart with a new seed">
          <ArrowCounterClockwise aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn icon"
          onClick={p.onToggleTheme}
          aria-label={p.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {p.theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
