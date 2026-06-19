import React, { type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import toast from "react-hot-toast";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    this.props.onError?.(error, errorInfo);

    toast.error(error.message || "An unexpected error occurred");

    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  setError = (error: Error): void => {
    this.setState({ hasError: true, error });
  };

  handleRetry = (): void => {
    // safest retry = full reload
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-dvh w-full flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-dark-50 text-neutral-900 dark:text-neutral-dark-950"
          role="alert"
        >
          <div className="max-w-md w-full text-center border border-neutral-200 dark:border-neutral-dark-200 p-4 md:p-6 rounded-xs">
            <div className="w-16 h-16 rounded-xs bg-error-50 dark:bg-error-dark-50 flex items-center justify-center mx-auto mb-6 border border-error-100 dark:border-error-dark-100">
              <AlertTriangle className="w-8 h-8 text-error-600 dark:text-error-dark-600" />
            </div>

            <h1 className="text-xl font-semibold mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mb-6">
              An unexpected error occurred. Try refreshing or go to dashboard.
            </p>

            {import.meta.env.DEV && (
              <pre className="text-left text-xs bg-neutral-100 dark:bg-neutral-dark-200 p-4 rounded-xs mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="btn btn-md btn-primary gap-2 rounded-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-md btn-secondary gap-2 rounded-xs"
              >
                <Home className="w-4 h-4" />
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}