export default function LoadingSkeleton() {
  return (
    <div
      className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Auditing website, please wait"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
        />
      ))}
      <span className="sr-only">Loading audit results...</span>
    </div>
  );
}
