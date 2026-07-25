import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gauge, ShieldCheck, Link2, ImageOff } from 'lucide-react';
import AuditForm from '../components/AuditForm';
import { useAudit } from '../hooks/useAudit';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorScreen from '../components/ErrorScreen';

const features = [
  { icon: Gauge, title: 'Performance', desc: 'Response time and page size at a glance.' },
  { icon: ShieldCheck, title: 'Security', desc: 'HTTPS status and key security headers.' },
  { icon: Link2, title: 'Link Health', desc: 'Internal vs. external link breakdown.' },
  { icon: ImageOff, title: 'Broken Images', desc: 'Spot missing or failing image assets.' },
];

export default function Home() {
  const navigate = useNavigate();
  const audit = useAudit();

  function handleSubmit(url: string) {
    audit.mutate(url, {
      onSuccess: (res) => {
        navigate('/results', { state: { result: res } });
      },
    });
  }

  return (
    <main className="flex flex-col items-center px-4 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-3xl flex-col items-center gap-6 pt-16 text-center sm:pt-24"
      >
        <span className="rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          Instant website audits
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Know your page's pulse in <span className="text-brand-500">seconds</span>
        </h1>
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
          Enter any public URL and get performance, SEO, and security metrics — instantly.
        </p>
        <AuditForm onSubmit={handleSubmit} isLoading={audit.isPending} />
      </motion.section>

      {audit.isPending && (
        <div className="mt-12 w-full flex justify-center">
          <LoadingSkeleton />
        </div>
      )}

      {audit.isError && (
        <div className="mt-12 flex justify-center">
          <ErrorScreen message={audit.error.message} onRetry={() => audit.reset()} />
        </div>
      )}

      <section className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <Icon className="h-8 w-8 text-brand-500" aria-hidden="true" />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
