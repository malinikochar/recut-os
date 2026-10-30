export default function WorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading workshop data...</span>
      <div className="space-y-2">
        <div className="h-4 w-36 rounded bg-accent-soft" />
        <div className="h-7 w-64 rounded-md bg-bg-elevated" />
        <div className="h-4 w-96 max-w-full rounded-md bg-bg-subtle" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-28 rounded-xl border border-border-subtle bg-bg-card p-5 cc-card"
          />
        ))}
      </div>
      <div className="h-72 rounded-xl border border-border-subtle bg-bg-card cc-card" />
    </div>
  );
}
