export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section aria-labelledby="title" className="w-full max-w-lg rounded-xl border border-border bg-surface p-8">
        <div aria-hidden="true" className="mb-6 h-1 w-10 rounded-full bg-lime" />
        <h1 id="title" className="text-2xl font-semibold tracking-tight text-sidebar">Work Track</h1>
        <p className="mt-3 text-sm leading-6 text-muted">A focused recruitment workspace.</p>
        <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted">Work Track is being built. Recruitment features are not available yet.</p>
      </section>
    </main>
  );
}
