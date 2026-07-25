import { AlertTriangle } from 'lucide-react';

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <div
      role="alert"
      className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30"
    >
      <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
      <p className="text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
