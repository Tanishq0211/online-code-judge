import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Submissions from './Submissions';

vi.mock('../lib/api');
import * as api from '../lib/api';

it('renders submission rows with verdict badges linking to detail', async () => {
  vi.mocked(api.listSubmissions).mockResolvedValue({
    data: [{
      id: '42', user_id: '1', problem_id: '1', language_id: '1',
      status: 'accepted', runtime_ms: 12, memory_kb: 2048,
      compiler_output: null, stdout: null, stderr: null,
      submitted_at: '2026-08-29T00:00:00.000Z', completed_at: null,
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Submissions /></MemoryRouter>
    </QueryClientProvider>,
  );
  // Stage 4 renders two presentations of each submission: the mobile card list
  // (link name = whole card text) and the desktop table (link name = '#42').
  // jsdom keeps both in the DOM; both links point at the same detail route.
  const links = await waitFor(() => screen.getAllByRole('link', { name: /#42/ }));
  expect(links).toHaveLength(2);
  for (const link of links) expect(link).toHaveAttribute('href', '/submissions/42');
  expect(screen.getAllByText('Accepted')).toHaveLength(2);
});

test('shows a skeleton region (not plain text) while loading', async () => {
  vi.mocked(api.listSubmissions).mockReturnValue(new Promise<never>(() => {}));
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Submissions /></MemoryRouter>
    </QueryClientProvider>,
  );
  const status = screen.getByRole('status', { name: 'Loading submissions' });
  expect(status).toBeInTheDocument();
  expect(screen.getByText('Loading submissions…')).toHaveClass('sr-only');
});
