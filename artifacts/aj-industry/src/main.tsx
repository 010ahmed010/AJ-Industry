import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught and recoverable errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.warn('Caught by error boundary:', error, errorInfo?.componentStack);
  },
  onUncaughtError: (error, errorInfo) => {
    console.warn('Uncaught error handled:', error, errorInfo?.componentStack);
  },
  onRecoverableError: (error, errorInfo) => {
    console.warn('Recoverable error handled:', error, errorInfo?.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
