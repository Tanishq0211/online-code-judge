import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import Problem from './Problem';

vi.mock('../lib/api');
import * as api from '../lib/api';

// The submit section only renders for a signed-in user; stub the auth hook —
// auth behaviour itself is covered by AuthContext.test.tsx.
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', username: 'tester', email: 't@example.com', role: 'user' } }),
}));

// Stub ONLY the CodeMirror surface (as CodeEditor.test.tsx does), NOT the
// CodeEditor module — the reset/draft tests must exercise the REAL
// persistence and restore effects through Problem.tsx.
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Source code editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  EditorView: {
    contentAttributes: { of: () => [] },
    theme: () => [],
  },
}));
vi.mock('@codemirror/state', () => ({ EditorState: { tabSize: { of: () => [] } } }));
vi.mock('@codemirror/view', () => ({ keymap: { of: () => [] } }));
vi.mock('@codemirror/commands', () => ({
  indentWithTab: { run: () => true },
  indentLess: () => true,
}));
vi.mock('@codemirror/language', () => ({
  HighlightStyle: { define: () => ({}) },
  syntaxHighlighting: () => [],
  bracketMatching: () => [],
  indentUnit: { of: () => [] },
}));
vi.mock('@codemirror/lang-cpp', () => ({ cpp: () => [] }));
vi.mock('@codemirror/lang-python', () => ({ python: () => [] }));
vi.mock('@codemirror/lang-java', () => ({ java: () => [] }));

const problem = {
  id: '22', slug: 'echo', title: 'Echo', difficulty: 'easy' as const,
  statement: 'Read one line, print it.', input_format: null, output_format: null,
  constraints: null, time_limit_ms: 1000, memory_limit_mb: 256, is_public: true,
  created_by: null, created_at: '', updated_at: '',
};

function renderProblem() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/problems/echo']}>
        <Routes><Route path="/problems/:slug" element={<Problem />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getProblem).mockResolvedValue({ problem });
  vi.mocked(api.listTestCases).mockResolvedValue({ data: [] });
  vi.mocked(api.listLanguages).mockResolvedValue({
    data: [{ id: '1', name: 'C++' }, { id: '2', name: 'Python' }],
  });
});

test('submit button enters a disabled pending state while the mutation runs', async () => {
  const user = userEvent.setup();
  vi.mocked(api.createSubmission).mockReturnValue(new Promise<never>(() => {}));
  renderProblem();

  await screen.findByRole('heading', { name: 'Echo' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Programming language' }), '2');
  await user.type(await screen.findByRole('textbox', { name: 'Source code editor' }), 'print(input())');

  const submit = screen.getByRole('button', { name: /Submitting…|Submit/ });
  expect(submit).toBeEnabled();
  await user.click(submit);

  // pending: disabled (no duplicate submissions), aria-busy for AT, new label
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Submitting…' })).toHaveAttribute('aria-busy', 'true');
  // exactly one create call despite the click
  expect(api.createSubmission).toHaveBeenCalledTimes(1);
});

test('submit button is restored after the mutation fails', async () => {
  const user = userEvent.setup();
  vi.mocked(api.createSubmission).mockRejectedValue(new Error('boom'));
  renderProblem();

  await screen.findByRole('heading', { name: 'Echo' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Programming language' }), '2');
  await user.type(await screen.findByRole('textbox', { name: 'Source code editor' }), 'print(input())');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
  // the Stage 2 error surface is preserved
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

test('reset draft: two-step confirm clears the editor and the persisted draft', async () => {
  const user = userEvent.setup();
  // Seed BEFORE render: the restore effect reads localStorage on mount.
  localStorage.setItem('problem:echo:source', 'print(input())');
  localStorage.setItem('problem:echo:language', '2');
  renderProblem();

  await screen.findByRole('heading', { name: 'Echo' });
  // draft restored into the editor
  const editor = (await screen.findByRole('textbox', { name: 'Source code editor' })) as HTMLInputElement;
  await waitFor(() => expect(editor.value).toBe('print(input())'));

  // step 1: arm the confirmation — the destructive action needs a second click
  await user.click(screen.getByRole('button', { name: 'Clear saved draft' }));
  expect(screen.getByRole('group', { name: 'Confirm draft reset' })).toBeInTheDocument();

  // step 2: confirm
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  await waitFor(() => expect(editor.value).toBe(''));
  // the persisted draft is gone too (ISSUE-008): no resurrection on reload
  expect(localStorage.getItem('problem:echo:source')).toBeNull();
  // the language choice is untouched by a draft reset
  expect(localStorage.getItem('problem:echo:language')).toBe('2');
});

test('reset confirmation can be cancelled without touching the draft', async () => {
  const user = userEvent.setup();
  renderProblem();
  localStorage.setItem('problem:echo:source', 'print(input())');

  await screen.findByRole('heading', { name: 'Echo' });
  await user.click(screen.getByRole('button', { name: 'Clear saved draft' }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(localStorage.getItem('problem:echo:source')).toBe('print(input())');
  expect(await screen.findByRole('textbox', { name: 'Source code editor' })).toHaveValue('print(input())');
  expect(screen.queryByRole('group', { name: 'Confirm draft reset' })).not.toBeInTheDocument();
});

test('changing language persists the language key without destroying the code draft', async () => {
  const user = userEvent.setup();
  renderProblem();

  await screen.findByRole('heading', { name: 'Echo' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Programming language' }), '2');
  await user.type(await screen.findByRole('textbox', { name: 'Source code editor' }), 'print(input())');

  expect(localStorage.getItem('problem:echo:language')).toBe('2');
  expect(localStorage.getItem('problem:echo:source')).toBe('print(input())');

  // switch to another language: the code stays, the language key follows
  await user.selectOptions(screen.getByRole('combobox', { name: 'Programming language' }), '1');
  expect(localStorage.getItem('problem:echo:language')).toBe('1');
  expect(localStorage.getItem('problem:echo:source')).toBe('print(input())');
  expect(await screen.findByRole('textbox', { name: 'Source code editor' })).toHaveValue('print(input())');
});
