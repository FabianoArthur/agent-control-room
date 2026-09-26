import { useMemo } from 'react';
import { parseParams, type SimParams } from './engine/params';
import { selectStats } from './engine/selectors';
import type { LogLine } from './engine/types';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './hooks/useTheme';
import { Activity } from './ui/Activity';
import { AgentCard } from './ui/AgentCard';
import { Header } from './ui/Header';
import { Orders } from './ui/Orders';
import { Stats } from './ui/Stats';

const LINES_PER_AGENT = 4;
const REPO_URL = 'https://github.com/FabianoArthur/agent-control-room';

const readParams = (): SimParams => parseParams(typeof location === 'undefined' ? '' : location.search);

export default function App({ params = readParams() }: { params?: SimParams }) {
  const sim = useSimulation(params);
  const { theme, toggle } = useTheme();
  const { state } = sim;
  const stats = selectStats(state);

  const linesByAgent = useMemo(() => {
    const map = new Map<string, LogLine[]>();
    for (const line of state.log) {
      if (!line.agentId) continue;
      const list = map.get(line.agentId) ?? [];
      list.push(line);
      if (list.length > LINES_PER_AGENT) list.shift();
      map.set(line.agentId, list);
    }
    return map;
  }, [state.log]);

  const restart = () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    sim.reset(seed);
    const url = new URL(location.href);
    url.searchParams.set('seed', String(seed));
    url.searchParams.delete('t');
    history.replaceState(null, '', url);
  };

  return (
    <div className="app">
      <Header
        tick={state.tick}
        seed={state.config.seed}
        playing={sim.playing}
        speed={sim.speed}
        theme={theme}
        autopilot={state.config.autoResolveAfter !== null}
        onAutopilot={sim.setAutopilot}
        onTogglePlay={() => sim.setPlaying(!sim.playing)}
        onStep={sim.step}
        onSpeed={sim.setSpeed}
        onReset={restart}
        onToggleTheme={toggle}
      />

      <main>
        <section className="intro">
          <p>
            Coding agents working in parallel, each in its own git worktree, from order to pull request. Everything
            here is simulated in your browser from a seed. No backend, no API key.{' '}
            <a href={REPO_URL}>Source on GitHub</a>
          </p>
        </section>

        <Stats stats={stats} />
        <p className="sr-only" aria-live="polite">
          {stats.needsYou === 0
            ? 'No agent is waiting for you.'
            : `${stats.needsYou} ${stats.needsYou === 1 ? 'agent needs' : 'agents need'} you.`}
        </p>

        <div className="layout">
          <section className="agents" aria-labelledby="agents-h">
            <h2 id="agents-h" className="sr-only">
              Agents
            </h2>
            {state.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                order={state.orders.find((o) => o.id === agent.orderId)}
                lines={linesByAgent.get(agent.id) ?? []}
                onResolve={sim.resolve}
              />
            ))}
          </section>
          <Orders orders={state.orders} agents={state.agents} onAdd={sim.addOrder} />
          <Activity log={state.log} agents={state.agents} />
        </div>
      </main>
    </div>
  );
}
