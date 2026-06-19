export function PlantCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-sm border border-neutral-200/80 bg-white/70 backdrop-blur-xl dark:border-neutral-700/40 dark:bg-[#0b0e14]/90">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neutral-100/80 via-white/40 to-slate-100/60 dark:from-neutral-800/30 dark:via-[#0b0e14] dark:to-[#06080c]" />
      <div className="relative flex animate-pulse flex-col gap-3 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded-sm bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-2.5 w-20 rounded-sm bg-neutral-200/80 dark:bg-neutral-800/70" />
          </div>
          <div className="grid w-full grid-cols-3 gap-1 sm:max-w-[180px]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 rounded-sm bg-neutral-200/90 dark:bg-neutral-800" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="h-2 w-10 rounded-sm bg-neutral-200/80 dark:bg-neutral-800/70" />
            <div className="h-6 w-20 rounded-sm bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-1 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800/70" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-8 rounded-sm bg-neutral-200/80 dark:bg-neutral-800/70" />
            <div className="h-4 w-16 rounded-sm bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-neutral-200/60 pt-2.5 dark:border-white/[0.06]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded-sm bg-neutral-200/80 dark:bg-neutral-800/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
