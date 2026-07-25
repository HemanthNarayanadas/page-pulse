export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Page Pulse. All rights reserved.</p>
        <p>
          Built for Digital Heroes Training Task &middot;{' '}
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noreferrer noopener"
            className="focus-ring rounded-sm underline decoration-dotted underline-offset-2 hover:text-brand-500"
          >
            digitalheroesco.com
          </a>
        </p>
      </div>
    </footer>
  );
}
