import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the not-found stub for an unknown route', () => {
  render(
    <MemoryRouter initialEntries={['/no-such-route']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByTestId('page')).toHaveTextContent('notfound');
});
