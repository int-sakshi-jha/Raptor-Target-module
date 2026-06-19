import type { LucideIcon } from "lucide-react";
import { type ReactNode, useContext } from "react";
import { PlantDashboardWidgetChromeContext } from "./PlantDashboardWidgetChromeContext";
import {
  PLANT_DASHBOARD_GRID_CELL,
  PLANT_DASHBOARD_PADDING_CARD,
  PLANT_DASHBOARD_PADDING_COMPACT,
  PLANT_DASHBOARD_SECTION_DIVIDER,
} from "./plantDashboardTheme";

interface PlantDashboardCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  fillHeight?: boolean;
  /** Tighter padding for 2×2 performance grid cells. */
  compact?: boolean;
  /** Strip outer card chrome when the grid cell already provides the frame. */
  embedded?: boolean;
}

function CardHeader({
  icon: Icon,
  title,
  description,
  badge,
  headerRight,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div
      className={`plant-dashboard-card-header mb-2.5 flex shrink-0 items-start justify-between gap-2 pb-2.5 ${PLANT_DASHBOARD_SECTION_DIVIDER}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-brand-500/40 bg-brand-500/10 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-dark-950">
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

export function PlantDashboardCard({
  icon: Icon,
  title,
  description,
  badge,
  headerRight,
  children,
  className = "",
  fillHeight = false,
  compact = false,
  embedded: embeddedProp = false,
}: PlantDashboardCardProps) {
  const chrome = useContext(PlantDashboardWidgetChromeContext);
  const embedded = embeddedProp || chrome.embedded === true;
  const displayTitle = chrome.titleOverride?.trim() || title;
  const showHeader = chrome.showHeading === true;
  const fillsCell = fillHeight || embedded;
  const contentPadding = showHeader
    ? PLANT_DASHBOARD_PADDING_CARD
    : compact
      ? "p-2"
      : PLANT_DASHBOARD_PADDING_COMPACT;
  const showDescription = showHeader && Boolean(description);

  if (embedded) {
    return (
      <section
        className={`flex h-full min-h-0 flex-col bg-transparent shadow-none ${contentPadding} ${className}`}
      >
        {showHeader ? (
          <CardHeader
            icon={Icon}
            title={displayTitle}
            description={showDescription ? description : undefined}
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
      className={`${PLANT_DASHBOARD_GRID_CELL} ${contentPadding} ${
        fillsCell ? "flex flex-col" : ""
      } ${className}`}
    >
      {showHeader ? (
        <CardHeader
          icon={Icon}
          title={displayTitle}
          description={showDescription ? description : undefined}
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
