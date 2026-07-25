import { ReactNode } from 'react';

interface ResultCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'warn';
}

const toneClasses: Record<NonNullable<ResultCardProps['tone']>, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
};

export default function ResultCard({ label, value, icon, tone = 'default' }: ResultCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
