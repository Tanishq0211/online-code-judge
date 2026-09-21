import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Container from './ui/Container';
import Card from './ui/Card';
import Button from './ui/Button';

type Props = {
  children: ReactNode;
  /** When this changes the boundary un-latches — pass the pathname so
      navigating away from a broken page recovers on its own. */
  resetKey?: string;
};
type State = { error: Error | null; shownFor?: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  /* Un-latch during render rather than in componentDidUpdate, so recovering
     costs one render instead of two. */
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey === state.shownFor) return null;
    return { error: null, shownFor: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Container size="prose" className="py-16">
        <Card className="p-8">
          <h1 className="text-xl">Something went wrong</h1>
          <p className="mt-2 text-sm text-fg-secondary">
            This page hit an unexpected error. Nothing you submitted was lost — try again, or
            reload if the problem sticks around.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs text-fg-muted">
                Technical details (development only)
              </summary>
              <pre className="mt-2 overflow-auto rounded-md border bg-bg p-3 text-xs text-fg-secondary">
                {error.stack ?? error.message}
              </pre>
            </details>
          )}
        </Card>
      </Container>
    );
  }
}
