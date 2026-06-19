import type { ComponentType, ReactNode } from "react";

interface DetailDashboardCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function DetailDashboardCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: DetailDashboardCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-xs border border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100 dark:text-neutral-dark-950 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4 dark:border-neutral-dark-200">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-brand-500 bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-dark-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-dark-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
