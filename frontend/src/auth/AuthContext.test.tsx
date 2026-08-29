import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, ready, login } = useAuth();
  if (!ready) return <div>loading</div>;
  return <div>
    <span data-testid="user">{user?.username ?? 'anon'}</span>
    <button onClick={() => login('bob', 'pw')}>login</button>
  </div>;
}
beforeEach(() => { localStorage.clear(); });

it('starts anon when no refresh token, logs in on demand', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200,
    json: async () => String(url).endsWith('/login')
      ? { user: { id: '1', username: 'bob', email: 'b@x.io', role: 'user' }, accessToken: 'A', refreshToken: 'R' }
      : {},
  })));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anon'));
  await userEvent.click(screen.getByText('login'));
  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('bob'));
  expect(localStorage.getItem('refreshToken')).toBe('R');
});
