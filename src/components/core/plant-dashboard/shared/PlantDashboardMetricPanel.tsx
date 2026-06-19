import type { ReactNode } from "react";

interface PlantDashboardMetricPanelProps {
  children: ReactNode;
  className?: string;
}

/** Evenly fills a compact grid cell without excess vertical whitespace. */
export function PlantDashboardMetricPanel({
  children,
  className = "",
}: PlantDashboardMetricPanelProps) {
  return (
    <div className={`flex h-full min-h-0 flex-col justify-evenly gap-1.5 ${className}`}>
      {children}
    </div>
  );
}
