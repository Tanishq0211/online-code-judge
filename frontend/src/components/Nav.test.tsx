import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import Nav from './Nav';

const useAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => useAuth() }));

const renderNav = () => render(<MemoryRouter><Nav /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

it('shows Log in / Register when logged out', () => {
  useAuth.mockReturnValue({ user: null, logout: vi.fn() });
  renderNav();
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Submissions' })).not.toBeInTheDocument();
});

it('shows Submissions + username + Log out when logged in', () => {
  useAuth.mockReturnValue({ user: { username: 'bob' }, logout: vi.fn() });
  renderNav();
  expect(screen.getByRole('link', { name: 'Submissions' })).toBeInTheDocument();
  expect(screen.getByText('bob')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
});

it('theme toggle: aria-pressed reflects state, click flips theme + persists', async () => {
  const user = userEvent.setup();
  useAuth.mockReturnValue({ user: null, logout: vi.fn() });
  renderNav();
  const toggle = screen.getByRole('button', { name: 'Toggle dark mode' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement).not.toHaveClass('dark');
  expect(localStorage.getItem('theme')).toBe('light');
});

it('theme toggle reflects a dark boot (aria-pressed true from the start)', () => {
  document.documentElement.classList.add('dark');
  useAuth.mockReturnValue({ user: null, logout: vi.fn() });
  renderNav();
  expect(screen.getByRole('button', { name: 'Toggle dark mode' })).toHaveAttribute('aria-pressed', 'true');
});
