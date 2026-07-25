import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  Lock,
  Unlock,
  Type,
  FileText,
  Image,
  ImageOff,
  Link,
  ExternalLink,
  HardDrive,
  ShieldCheck,
  BookOpen,
  Server,
} from 'lucide-react';
import ResultCard from '../components/ResultCard';
import { AuditResponse } from '../types/audit';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { result?: AuditResponse } | null;
  const result = state?.result;

  if (!result) {
    return (
      <main className="flex flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-lg text-slate-600 dark:text-slate-300">
          No audit results to show. Run an audit from the home page first.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="focus-ring rounded-xl bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-600"
        >
          Back to Home
        </button>
      </main>
    );
  }

  const { data, cached } = result;
  const securityHeaderCount = Object.values(data.securityHeaders).filter(Boolean).length;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Audit results for</p>
        <h1 className="break-all text-2xl font-bold sm:text-3xl">{data.url}</h1>
        {cached && (
          <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            Served from cache
          </span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <ResultCard
          label="HTTP Status"
          value={data.statusCode}
          icon={<Server className="h-4 w-4" />}
          tone={data.statusCode < 400 ? 'good' : 'bad'}
        />
        <ResultCard
          label="Response Time"
          value={`${data.responseTimeMs} ms`}
          icon={<Clock className="h-4 w-4" />}
          tone={data.responseTimeMs < 1000 ? 'good' : 'warn'}
        />
        <ResultCard
          label="HTTPS"
          value={data.httpsEnabled ? 'Enabled' : 'Disabled'}
          icon={data.httpsEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          tone={data.httpsEnabled ? 'good' : 'bad'}
        />
        <ResultCard label="Page Title" value={data.title ?? 'Not found'} icon={<Type className="h-4 w-4" />} />
        <ResultCard
          label="Meta Description"
          value={data.metaDescription ? 'Present' : 'Missing'}
          icon={<FileText className="h-4 w-4" />}
          tone={data.metaDescription ? 'good' : 'warn'}
        />
        <ResultCard label="Word Count" value={data.wordCount.toLocaleString()} icon={<BookOpen className="h-4 w-4" />} />
        <ResultCard label="Total Images" value={data.totalImages} icon={<Image className="h-4 w-4" />} />
        <ResultCard
          label="Broken Images"
          value={data.brokenImages}
          icon={<ImageOff className="h-4 w-4" />}
          tone={data.brokenImages > 0 ? 'bad' : 'good'}
        />
        <ResultCard label="Internal Links" value={data.internalLinks} icon={<Link className="h-4 w-4" />} />
        <ResultCard label="External Links" value={data.externalLinks} icon={<ExternalLink className="h-4 w-4" />} />
        <ResultCard
          label="Page Size"
          value={`${(data.pageSizeBytes / 1024).toFixed(1)} KB`}
          icon={<HardDrive className="h-4 w-4" />}
        />
        <ResultCard
          label="Security Headers"
          value={`${securityHeaderCount} / 6 present`}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={securityHeaderCount >= 4 ? 'good' : securityHeaderCount >= 2 ? 'warn' : 'bad'}
        />
      </motion.div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Security Header Details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(data.securityHeaders).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {key.replace(/([A-Z])/g, ' $1')}
              </dt>
              <dd className={`text-sm ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {value ?? 'Not set'}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="focus-ring self-start rounded-xl border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Audit another site
      </button>
    </main>
  );
}
