import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Nav from './Nav';

const useAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => useAuth() }));

const renderNav = () => render(<MemoryRouter><Nav /></MemoryRouter>);

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
