import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

// Seed 2026 has an agent paused on "needs you" from tick 4 on (autopilot waits 14 ticks).
const PAUSED = { seed: 2026, fastForward: 6 };

async function renderPaused() {
  const user = userEvent.setup();
  render(<App params={PAUSED} />);
  await user.click(screen.getByRole('button', { name: 'Pause' }));
  return user;
}

describe('App', () => {
  it('renders the control room with one card per agent', async () => {
    await renderPaused();
    expect(screen.getByRole('heading', { level: 1, name: 'Agent Control Room' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('seed 2026')).toBeInTheDocument();
  });

  it('queues a new order from the form', async () => {
    const user = await renderPaused();
    await user.type(screen.getByLabelText('New order'), 'Ship the changelog page');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    const queue = screen.getByRole('heading', { name: /Queue/ }).closest('section')!;
    expect(within(queue).getByText(/Ship the changelog page/)).toBeInTheDocument();
    expect(screen.getByLabelText('New order')).toHaveValue('');
  });

  it('explains an empty order instead of queueing it', async () => {
    const user = await renderPaused();
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(screen.getByText('Describe the order first.')).toBeInTheDocument();
    expect(screen.getByLabelText('New order')).toHaveAttribute('aria-invalid', 'true');
  });

  it('lets you unblock an agent that needs you', async () => {
    const user = await renderPaused();
    const unblock = screen.getAllByRole('button', { name: /^Unblock / });
    const before = unblock.length;
    await user.click(unblock[0]!);
    expect(screen.queryAllByRole('button', { name: /^Unblock / })).toHaveLength(before - 1);
  });

  it('steps one tick at a time while paused', async () => {
    const user = await renderPaused();
    const clock = screen.getByLabelText(/Simulated time/);
    const before = clock.textContent;
    await user.click(screen.getByRole('button', { name: 'Advance one tick' }));
    expect(clock.textContent).not.toBe(before);
  });
});
