export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">About Page Pulse</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        Page Pulse is a lightweight URL audit service that gives you a fast snapshot of any public
        webpage's performance, SEO fundamentals, and security posture — no sign-up required.
      </p>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        Under the hood, the backend fetches the target page, parses its HTML, inspects response
        headers, and checks linked images and links, all within a bounded time budget so results
        come back quickly and predictably. Frequently audited URLs are cached to keep repeat
        checks fast and reduce load on target sites.
      </p>
      <h2 className="mt-8 text-xl font-semibold">What we check</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
        <li>HTTP status, response time, and HTTPS usage</li>
        <li>Page title, meta description, and word count</li>
        <li>Image count and broken image detection</li>
        <li>Internal vs. external link counts</li>
        <li>Page size, content type, and security headers</li>
      </ul>
    </main>
  );
}
