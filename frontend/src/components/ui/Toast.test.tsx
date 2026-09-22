import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Trigger() {
  const toast = useToast();
  return <button onClick={() => toast('Saved!', 'success')}>push</button>;
}

describe('Toast', () => {
  it('shows a pushed message and dismisses it on demand', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Saved!')).toBeNull();
  });

  it('is a no-op without a provider, so a subtree never breaks on it', () => {
    render(<Trigger />);
    fireEvent.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByRole('button', { name: 'push' })).toBeInTheDocument();
  });
});
