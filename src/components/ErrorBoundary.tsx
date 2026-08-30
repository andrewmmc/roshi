import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { translate } from '@/i18n';
import { useLanguageStore } from '@/stores/language-store';

interface Props {
  children: ReactNode;
  panel?: boolean;
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
      const t = (
        key: Parameters<typeof translate>[1],
        vars?: Parameters<typeof translate>[2],
      ) => translate(useLanguageStore.getState().language, key, vars);
      const containerClass = this.props.panel
        ? 'flex flex-col items-center justify-center h-full gap-3 p-6 text-center'
        : 'flex flex-col items-center justify-center h-screen gap-4 p-8 text-center';

      return (
        <div className={containerClass}>
          <h1 className="text-destructive text-lg font-semibold">
            {t('common.errorTitle')}
          </h1>
          <p className="text-muted-foreground max-w-lg font-mono text-sm break-all">
            {this.state.error.message}
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
