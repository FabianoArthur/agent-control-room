import type { Stats as StatsData } from '../engine/selectors';
import { percent } from './format';

export function Stats({ stats }: { stats: StatsData }) {
  const items = [
    { label: 'In the queue', value: String(stats.queued) },
    { label: 'Agents working', value: String(stats.running) },
    { label: 'Need you', value: String(stats.needsYou), alert: stats.needsYou > 0 },
    { label: 'PRs opened', value: String(stats.served) },
    { label: 'Gate pass rate', value: percent(stats.gatePassRate) },
  ];
  return (
    <dl className="stats">
      {items.map((item) => (
        <div key={item.label} className={item.alert ? 'stat is-alert' : 'stat'}>
          <dt>{item.label}</dt>
          <dd className="mono">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
