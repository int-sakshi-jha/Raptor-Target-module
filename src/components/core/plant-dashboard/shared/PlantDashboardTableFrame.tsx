import type { ReactNode } from "react";
import { PLANT_DASHBOARD_TABLE_FRAME } from "./plantDashboardTheme";

interface PlantDashboardTableFrameProps {
  children: ReactNode;
  className?: string;
}

/** Wraps CommonTable so its fixed ag-grid background blends with the dashboard surface. */
export function PlantDashboardTableFrame({
  children,
  className = "",
}: PlantDashboardTableFrameProps) {
  return (
    <div className={`min-h-0 flex-1 ${PLANT_DASHBOARD_TABLE_FRAME} ${className}`}>
      {children}
    </div>
  );
}
