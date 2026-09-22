import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import App from './App';

test('renders the not-found page for an unknown route', () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/no-such-route']}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});
