import { beforeEach, test, expect, vi } from 'vitest';
import { applyTheme, currentTheme, toggleTheme, THEME_COLOR } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  // The index.html ships this meta; tests create it explicitly.
  if (!document.querySelector('meta[name="theme-color"]')) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
  }
});

test('applyTheme syncs the theme-color meta with the theme (Stage 9)', () => {
  applyTheme('dark');
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEME_COLOR.dark);
  applyTheme('light');
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEME_COLOR.light);
});

test('theme-color sync survives a missing meta element without throwing', () => {
  document.querySelector('meta[name="theme-color"]')?.remove();
  expect(() => applyTheme('dark')).not.toThrow();
  expect(document.documentElement).toHaveClass('dark');
});

test('applyTheme dark: sets the .dark class and persists the choice', () => {
  applyTheme('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(currentTheme()).toBe('dark');
});

test('applyTheme light: removes the .dark class and persists the choice', () => {
  document.documentElement.classList.add('dark');
  applyTheme('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(localStorage.getItem('theme')).toBe('light');
  expect(currentTheme()).toBe('light');
});

test('toggleTheme flips the current theme and persists it', () => {
  expect(currentTheme()).toBe('light');
  expect(toggleTheme()).toBe('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(toggleTheme()).toBe('light');
  expect(localStorage.getItem('theme')).toBe('light');
});

test('a persisted theme survives a simulated reload (class re-applied)', () => {
  applyTheme('dark');
  // simulate what the index.html boot script does on the next load
  document.documentElement.classList.remove('dark');
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') document.documentElement.classList.add('dark');
  expect(currentTheme()).toBe('dark');
});

test('applyTheme tolerates unavailable localStorage', () => {
  vi.stubGlobal('localStorage', { setItem: () => { throw new Error('blocked'); }, getItem: () => null, removeItem: () => {} });
  expect(() => applyTheme('dark')).not.toThrow();
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  vi.unstubAllGlobals();
});
