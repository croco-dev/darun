export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16 md:px-6 lg:px-8">
        <div className="liquid-glass mb-12 rounded-[var(--radius-glass-panel)] p-8 md:p-10">
          <div className="mb-2 h-10 w-48 animate-pulse rounded-[var(--radius-glass-input)] bg-[var(--glass-surface-strong)]"></div>
          <div className="h-6 w-64 animate-pulse rounded-[var(--radius-glass-input)] bg-[var(--glass-surface-soft)]"></div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="liquid-glass-soft flex h-14 w-14 items-center justify-center rounded-full">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--glass-border)] border-t-[color:var(--glass-border-strong)]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
