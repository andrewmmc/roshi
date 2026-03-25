import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold text-destructive">Something went wrong</h1>
          <p className="text-sm text-muted-foreground font-mono max-w-lg break-all">
            {this.state.error.message}
          </p>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
