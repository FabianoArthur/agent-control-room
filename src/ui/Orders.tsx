import { useId, useState, type FormEvent } from 'react';
import { GitPullRequest, Plus } from '@phosphor-icons/react';
import { MAX_TITLE_LENGTH } from '../engine/engine';
import type { Agent, Order } from '../engine/types';

interface Props {
  orders: Order[];
  agents: Agent[];
  onAdd: (title: string) => void;
}

export function Orders({ orders, agents, onAdd }: Props) {
  const inputId = useId();
  const hintId = useId();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queued = orders.filter((o) => o.status === 'queued');
  const cooking = orders.filter((o) => o.status === 'cooking');
  const served = orders
    .filter((o) => o.status === 'served')
    .sort((a, b) => (b.pr ?? 0) - (a.pr ?? 0))
    .slice(0, 6);
  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name ?? '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setError('Describe the order first.');
      return;
    }
    onAdd(clean);
    setTitle('');
    setError(null);
  };

  return (
    <aside className="orders" aria-label="Orders">
      <form className="order-form" onSubmit={submit} noValidate>
        <label htmlFor={inputId}>New order</label>
        <div className="field">
          <input
            id={inputId}
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Add CSV export"
            aria-describedby={hintId}
            aria-invalid={error !== null}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary">
            <Plus weight="bold" aria-hidden="true" />
            Queue
          </button>
        </div>
        <p id={hintId} className={error ? 'hint hint-error' : 'hint'}>
          {error ?? 'The next free agent picks it up.'}
        </p>
      </form>

      <section aria-labelledby="queue-h">
        <h2 id="queue-h">
          Queue <span className="count mono">{queued.length}</span>
        </h2>
        {queued.length === 0 ? (
          <p className="empty">Nothing waiting. Add an order above.</p>
        ) : (
          <ol className="list">
            {queued.map((o) => (
              <li key={o.id}>
                <span className="mono muted">{o.id}</span> {o.title}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="cooking-h">
        <h2 id="cooking-h">
          In progress <span className="count mono">{cooking.length}</span>
        </h2>
        {cooking.length === 0 ? (
          <p className="empty">No agent is working right now.</p>
        ) : (
          <ol className="list">
            {cooking.map((o) => (
              <li key={o.id}>
                {o.title} <span className="muted small">with {agentName(o.agentId)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="served-h">
        <h2 id="served-h">Pull requests</h2>
        {served.length === 0 ? (
          <p className="empty">The first PR shows up here.</p>
        ) : (
          <ol className="list prs">
            {served.map((o) => (
              <li key={o.id}>
                <GitPullRequest aria-hidden="true" />
                <span className="mono">#{o.pr}</span> {o.title}
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
