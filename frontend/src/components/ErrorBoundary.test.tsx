import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

let boom = true;
function Bomb() {
  if (boom) throw new Error('kaboom');
  return <p>recovered</p>;
}

// React logs caught render errors; keep the run output readable.
beforeEach(() => { boom = true; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('shows a fallback instead of a blank screen, and retry recovers', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    boom = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('un-latches when resetKey changes (navigating away from a broken page)', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a"><Bomb /></ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    boom = false;
    rerender(<ErrorBoundary resetKey="/b"><Bomb /></ErrorBoundary>);
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
