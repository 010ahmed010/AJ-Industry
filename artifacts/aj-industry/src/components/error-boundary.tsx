import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  const message = error?.message || (typeof error === 'string' ? error : String(error || ''));
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#071126] p-6 text-foreground" dir="rtl">
      <div className="max-w-lg w-full text-center border border-border/80 bg-card/90 p-8 shadow-2xl">
        <span className="font-code text-[10px] text-primary font-bold tracking-widest uppercase">
          SYSTEM RECOVERY / 00
        </span>
        <h1 className="mt-3 font-display text-xl font-bold text-white">
          حدث خطأ غير متوقع / Unexpected error
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-6">
          تعذر تحميل هذا الجزء مؤقتاً. بقية أقسام الموقع وأنظمته تعمل بصورة طبيعية.
        </p>
        {import.meta.env.DEV && message ? (
          <pre className="mt-4 max-h-48 overflow-x-auto border border-red-500/30 bg-red-950/20 p-3 text-left font-code text-xs text-red-300">
            {message}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetError}
            className="h-10 border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            إعادة المحاولة / Try again
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center border border-border bg-secondary/60 px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary"
          >
            الرئيسية / Home
          </a>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info?: ErrorInfo): void {
    console.warn(
      'ErrorBoundary caught an error:',
      toError(error),
      info?.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps?.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}

export default ErrorBoundary;
