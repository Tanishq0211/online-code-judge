import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the problems page at /problems', () => {
  render(
    <MemoryRouter initialEntries={['/problems']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByTestId('page')).toHaveTextContent('problems');
});
