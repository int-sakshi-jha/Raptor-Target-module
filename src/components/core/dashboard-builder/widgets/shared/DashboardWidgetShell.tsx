import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PLANT_DASHBOARD_GRID_CELL } from "@/components/core/plant-dashboard/shared/plantDashboardTheme";

interface DashboardWidgetShellProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  embedded?: boolean;
  fillHeight?: boolean;
  showHeading?: boolean;
  className?: string;
}

function ShellHeader({
  icon: Icon,
  title,
  description,
  badge,
  headerRight,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-neutral-200/90 pb-1.5 dark:border-neutral-dark-300/65">
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-xs font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {title}
            </h2>
            {badge}
          </div>
          {description ? (
            <p className="mt-0.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-dark-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
    </div>
  );
}

export function DashboardWidgetShell({
  icon: Icon,
  title,
  description,
  badge,
  headerRight,
  children,
  embedded = false,
  fillHeight = true,
  showHeading = false,
  className = "",
}: DashboardWidgetShellProps) {
  const fillsCell = fillHeight || embedded;
  const showHeader = showHeading === true && Boolean(title);
  const contentPadding = showHeader ? "px-2.5 py-2" : "p-2";

  if (embedded) {
    return (
      <section
        className={`flex h-full min-h-0 flex-col bg-transparent shadow-none ${contentPadding} ${className}`}
      >
        {showHeader ? (
          <ShellHeader
            icon={Icon}
            title={title}
            description={description}
            badge={badge}
            headerRight={headerRight}
          />
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`h-full ${PLANT_DASHBOARD_GRID_CELL} ${contentPadding} ${
        fillsCell ? "flex flex-col" : ""
      } ${className}`}
    >
      {showHeader ? (
        <ShellHeader
          icon={Icon}
          title={title}
          description={description}
          badge={badge}
          headerRight={headerRight}
        />
      ) : null}
      {fillsCell ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
