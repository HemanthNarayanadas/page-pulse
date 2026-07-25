import { FormEvent, useState } from 'react';

interface AuditFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const isValid = looksLikeUrl(value);
  const showError = touched && value.length > 0 && !isValid;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || isLoading) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl" noValidate>
      <label htmlFor="audit-url" className="sr-only">
        Website URL to audit
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="audit-url"
          type="text"
          inputMode="url"
          placeholder="https://example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? 'audit-url-error' : undefined}
          className="focus-ring flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="focus-ring inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Auditing...' : 'Audit Site'}
        </button>
      </div>
      {showError && (
        <p id="audit-url-error" role="alert" className="mt-2 text-sm text-red-500">
          Enter a full URL including http:// or https://
        </p>
      )}
    </form>
  );
}
