/* Theme state (Stage 8). The `.dark` class on <html> drives every token via
   the ADR-013 mechanism; index.html's inline boot script applies the class
   before first paint (explicit choice wins, else OS preference). */

export type Theme = 'light' | 'dark';

const KEY = 'theme';

/* Browser-chrome tint, kept in lockstep with the --bg token values in
   index.css (light slate-50 / dark slate-950). Stage 9. */
export const THEME_COLOR: Record<Theme, string> = {
  light: '#f8fafc',
  dark: '#020617',
};

function syncThemeColor(theme: Theme): void {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme]);
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Persists the explicit choice and applies it immediately. */
export function applyTheme(theme: Theme): void {
  try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable — apply anyway */ }
  document.documentElement.classList.toggle('dark', theme === 'dark');
  syncThemeColor(theme);
}

/** Toggles and returns the resulting theme. */
export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
