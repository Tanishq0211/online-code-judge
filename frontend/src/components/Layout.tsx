import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav';
import ErrorBoundary from './ErrorBoundary';

export default function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  // Skip the initial mount: stealing focus at boot would yank it from whatever
  // the user was already interacting with (e.g. a restored form field).
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) { booted.current = true; return; }
    // Route change = new page context: move focus to the content region so
    // keyboard and screen-reader users start at the page, not the nav.
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg focus:shadow-md focus:outline-none"
      >
        Skip to content
      </a>
      <Nav />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="focus:outline-none"
      >
        {/* Keyed by route: a page that throws never takes the shell with it, and
            navigating elsewhere clears the fallback. */}
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
