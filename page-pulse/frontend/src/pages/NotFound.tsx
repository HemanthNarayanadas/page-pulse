import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-slate-500 dark:text-slate-400">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="focus-ring rounded-xl bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-600"
      >
        Back to Home
      </Link>
    </main>
  );
}
