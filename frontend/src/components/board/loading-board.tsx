export function LoadingBoard() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="h-4 w-40 animate-pulse rounded bg-surface" />
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      </div>
      <div className="grid flex-1 grid-cols-4 gap-px overflow-hidden p-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2 p-1.5">
            <div className="h-16 animate-pulse rounded-lg bg-surface/60" />
            {i % 2 === 0 && (
              <div className="h-16 animate-pulse rounded-lg bg-surface/40" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
