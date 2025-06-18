
'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error and errorInfo to the console for more detailed debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    console.error('Error Message:', error.toString());
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-center">
          <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
          <p className="text-destructive/80">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <details className="mt-2 text-xs text-left text-muted-foreground p-2 bg-muted/50 rounded">
            <summary>Error Details (for debugging)</summary>
            <pre className="whitespace-pre-wrap">
              {this.state.error?.toString()}
              {'\n\nComponent Stack:\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="mt-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
