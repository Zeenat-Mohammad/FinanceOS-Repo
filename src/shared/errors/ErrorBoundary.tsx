import React from 'react';
import { Logger } from '@/core/logging/Logger';
import { Button, ErrorState } from '@/shared/components';
import { toAppError, type AppError } from './AppError';

type ErrorBoundaryState = {
  error: AppError | null;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toAppError(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    Logger.error('Unhandled React error', { error, componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <GlobalErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ error: null })}
        />
      );
    }

    return this.props.children;
  }
}

export function GlobalErrorFallback({ error, onReset }: { error: AppError; onReset?: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <ErrorState
        title="Something needs attention"
        message={error.userMessage}
        action={onReset ? <Button onClick={onReset}>Try again</Button> : undefined}
      />
    </div>
  );
}
