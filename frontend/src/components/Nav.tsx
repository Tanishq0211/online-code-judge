import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { currentTheme, applyTheme, type Theme } from '../lib/theme';
import Button, { buttonClasses } from './ui/Button';
import Logo from './ui/Logo';
import { cn } from './ui/cn';

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    isActive ? 'bg-accent-subtle text-accent' : 'text-fg-secondary hover:bg-bg hover:text-fg',
  );

/* Icon-only control: state is conveyed by aria-pressed + the icon glyph, not
   by color. The theme boots from the inline index.html script; this component
   only reflects and flips it. */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={theme === 'dark'}
      className="px-1.5 sm:px-2"
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 3.5a1 1 0 011 1V6a1 1 0 11-2 0V4.5a1 1 0 011-1zm0 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4.4 4.4a1 1 0 011.4 0l1.06 1.06a1 1 0 11-1.41 1.41L4.4 5.81a1 1 0 010-1.41zm8.74 8.74a1 1 0 011.41 0l1.06 1.06a1 1 0 11-1.41 1.41l-1.06-1.06a1 1 0 010-1.41zM3.5 9a1 1 0 000 2H5a1 1 0 100-2H3.5zm11.5 1a1 1 0 011-1h1.5a1 1 0 110 2H16a1 1 0 01-1-1zM4.4 15.6a1 1 0 010-1.41l1.06-1.06a1 1 0 111.41 1.41L5.81 15.6a1 1 0 01-1.41 0zm8.74-8.74a1 1 0 010-1.41l1.06-1.06a1 1 0 111.41 1.41l-1.06 1.06a1 1 0 01-1.41 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M12.3 3.1a1 1 0 011.02.16A7 7 0 1116.7 13.7a1 1 0 01-1.16 1.62A9 9 0 1012.3 3.1z" />
        </svg>
      )}
    </Button>
  );
}

export default function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-surface/80 backdrop-blur">
      {/* Tighter padding/gaps below sm so the whole bar fits 320px with no overflow. */}
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-0.5 px-3 sm:gap-1 sm:px-6">
        <Link
          to="/problems"
          className="mr-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:mr-2"
          aria-label="Verdict home"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/problems" className={navLink}>Problems</NavLink>
          {user && <NavLink to="/submissions" className={navLink}>Submissions</NavLink>}
        </nav>
        <span className="flex-1" />
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-fg-secondary sm:inline">{user.username}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="whitespace-nowrap">Log out</Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <NavLink to="/login" className={navLink}>Log in</NavLink>
            <Link to="/register" className={buttonClasses('primary', 'sm', 'px-2 sm:px-3')}>Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}
