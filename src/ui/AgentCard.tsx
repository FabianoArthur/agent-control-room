import { memo } from 'react';
import { CheckCircle, CircleNotch, FolderSimple, GitBranch, HandPalm, XCircle, Circle } from '@phosphor-icons/react';
import type { Agent, GateStatus, LogLine, Order, Phase } from '../engine/types';

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'planning', label: 'Plan' },
  { phase: 'coding', label: 'Code' },
  { phase: 'testing', label: 'Gates' },
  { phase: 'reviewing', label: 'Review' },
];

const STATUS_LABEL: Record<Agent['status'], string> = {
  idle: 'Idle',
  planning: 'Planning',
  coding: 'Coding',
  testing: 'Running gates',
  reviewing: 'Opening PR',
  needs_you: 'Needs you',
};

function GateIcon({ status }: { status: GateStatus }) {
  if (status === 'passed') return <CheckCircle weight="fill" aria-hidden="true" />;
  if (status === 'failed') return <XCircle weight="fill" aria-hidden="true" />;
  if (status === 'running') return <CircleNotch className="spin" aria-hidden="true" />;
  return <Circle aria-hidden="true" />;
}

interface Props {
  agent: Agent;
  order: Order | undefined;
  lines: LogLine[];
  onResolve: (agentId: string) => void;
}

export const AgentCard = memo(function AgentCard({ agent, order, lines, onResolve }: Props) {
  const current = agent.status === 'needs_you' ? agent.resumePhase : agent.status;
  const currentIndex = STEPS.findIndex((s) => s.phase === current);
  const progress =
    agent.phaseTicksTotal > 0 ? 1 - agent.phaseTicksLeft / agent.phaseTicksTotal : 0;
  const busy = agent.orderId !== null;

  return (
    <article className={`agent status-${agent.status}`} aria-labelledby={`${agent.id}-name`}>
      <header className="agent-head">
        <span className="avatar" aria-hidden="true">
          {agent.name[0]}
        </span>
        <div className="agent-title">
          <h3 id={`${agent.id}-name`}>{agent.name}</h3>
          <p className="muted small">{agent.served} PRs so far</p>
        </div>
        <span className={`pill pill-${agent.status}`}>{STATUS_LABEL[agent.status]}</span>
      </header>

      {busy && order ? (
        <>
          <p className="order-title">{order.title}</p>
          <dl className="where mono">
            <div>
              <dt>
                <GitBranch aria-hidden="true" />
                <span className="sr-only">Branch</span>
              </dt>
              <dd>{agent.branch}</dd>
            </div>
            <div>
              <dt>
                <FolderSimple aria-hidden="true" />
                <span className="sr-only">Worktree</span>
              </dt>
              <dd>{agent.worktree}</dd>
            </div>
          </dl>

          <ol className="steps" aria-label="Progress">
            {STEPS.map((step, i) => {
              const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
              return (
                <li key={step.phase} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className="step-bar">
                    <span
                      className="step-fill"
                      style={{ transform: `scaleX(${state === 'done' ? 1 : state === 'current' ? Math.max(progress, 0.06) : 0})` }}
                    />
                  </span>
                  <span className="step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>

          <ul className="gates" aria-label="Gates">
            {agent.gates.map((gate) => (
              <li key={gate.name} className={`gate gate-${gate.status}`}>
                <GateIcon status={gate.status} />
                <span>{gate.name}</span>
                {gate.detail && <span className="gate-detail">{gate.detail}</span>}
              </li>
            ))}
          </ul>

          {agent.status === 'needs_you' && (
            <div className="callout" role="group" aria-label={`${agent.name} is waiting for you`}>
              <HandPalm weight="duotone" aria-hidden="true" />
              <p>{agent.blockedReason}</p>
              <button type="button" className="btn btn-primary" onClick={() => onResolve(agent.id)}>
                Unblock {agent.name}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="empty">Waiting for the next order.</p>
      )}

      <ol className="agent-log mono" aria-label={`${agent.name} log`}>
        {lines.map((line) => (
          <li key={line.id} className={`log-${line.level}`}>
            {line.text}
          </li>
        ))}
      </ol>
    </article>
  );
});
