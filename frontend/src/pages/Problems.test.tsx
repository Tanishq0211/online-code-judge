import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Problems from './Problems';

vi.mock('../lib/api');
import * as api from '../lib/api';

it('renders problem titles and the difficulty filter', async () => {
  vi.mocked(api.listProblems).mockResolvedValue({
    data: [{
      id: '1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy',
      time_limit_ms: 1000, memory_limit_mb: 256, is_public: true,
      created_by: null, created_at: '', updated_at: '',
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Problems /></MemoryRouter>
    </QueryClientProvider>,
  );
  // Stage 4 renders two presentations of the same data: the mobile card list
  // and the desktop table (CSS decides which shows). jsdom keeps both in the
  // DOM, so each title appears exactly twice.
  const table = await waitFor(() => screen.getByRole('table'));
  expect(within(table).getByText('Two Sum')).toBeInTheDocument();
  expect(screen.getAllByText('Two Sum')).toHaveLength(2);
  expect(screen.getByText('All difficulties')).toBeInTheDocument();
});

test('shows a skeleton region (not plain text) while loading', async () => {
  vi.mocked(api.listProblems).mockReturnValue(new Promise<never>(() => {}));
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Problems /></MemoryRouter>
    </QueryClientProvider>,
  );
  // one polite status region with an accessible name; the actual skeletons are
  // aria-hidden so screen readers hear a single short announcement
  const status = screen.getByRole('status', { name: 'Loading problems' });
  expect(status).toBeInTheDocument();
  expect(screen.getByText('Loading problems…')).toHaveClass('sr-only');
});
