import type { Agent, LogLine } from '../engine/types';
import { clock } from './format';

export function Activity({ log, agents }: { log: LogLine[]; agents: Agent[] }) {
  const recent = log.slice(-12).reverse();
  const name = (id: string | null) => (id ? (agents.find((a) => a.id === id)?.name ?? id) : 'kitchen');
  return (
    <section className="activity" aria-labelledby="activity-h">
      <h2 id="activity-h">Activity</h2>
      <ol className="feed mono">
        {recent.map((line) => (
          <li key={line.id} className={`log-${line.level}`}>
            <time className="muted">{clock(line.tick)}</time>
            <span className="who">{name(line.agentId)}</span>
            <span className="what">{line.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
