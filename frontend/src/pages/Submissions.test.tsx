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
  const link = await waitFor(() => screen.getByRole('link', { name: '#42' }));
  expect(link).toHaveAttribute('href', '/submissions/42');
  expect(screen.getByText('Accepted')).toBeInTheDocument();
});
