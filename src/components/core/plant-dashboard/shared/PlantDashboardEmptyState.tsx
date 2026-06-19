import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { PLANT_DASHBOARD_EMPTY_STATE, PLANT_DASHBOARD_INSET_PANEL } from "./plantDashboardTheme";

interface PlantDashboardEmptyStateProps {
  message: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function PlantDashboardEmptyState({
  message,
  description,
  icon: Icon = Inbox,
  className = "",
}: PlantDashboardEmptyStateProps) {
  return (
    <div
      className={`flex flex-1 items-center justify-center p-4 ${className}`}
    >
      <div
        className={`flex max-w-[240px] flex-col items-center gap-2 rounded-sm px-5 py-6 text-center ${PLANT_DASHBOARD_INSET_PANEL}`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-200/60 bg-white/80 dark:border-neutral-dark-300/45 dark:bg-neutral-dark-100/80">
          <Icon className="h-4 w-4 text-neutral-400 dark:text-neutral-dark-500" strokeWidth={1.5} />
        </div>
        <p className={`font-medium ${PLANT_DASHBOARD_EMPTY_STATE}`}>{message}</p>
        {description ? (
          <p className="text-[10px] leading-snug text-neutral-400 dark:text-neutral-dark-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
