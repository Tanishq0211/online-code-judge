import { render, screen, waitFor } from '@testing-library/react';
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
  await waitFor(() => expect(screen.getByText('Two Sum')).toBeInTheDocument());
  expect(screen.getByText('All difficulties')).toBeInTheDocument();
});
