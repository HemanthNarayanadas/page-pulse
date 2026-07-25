import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Activity, Moon, Sun } from 'lucide-react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('pp-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('pp-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Primary">
        <NavLink to="/" className="flex items-center gap-2 font-semibold text-lg focus-ring rounded-md">
          <Activity className="h-6 w-6 text-brand-500" aria-hidden="true" />
          <span>Page Pulse</span>
        </NavLink>
        <div className="flex items-center gap-6">
          <ul className="hidden sm:flex items-center gap-6 text-sm font-medium">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `focus-ring rounded-md px-1 py-1 transition-colors ${
                      isActive ? 'text-brand-500' : 'text-slate-600 hover:text-brand-500 dark:text-slate-300'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="focus-ring rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </nav>
    </header>
  );
}
