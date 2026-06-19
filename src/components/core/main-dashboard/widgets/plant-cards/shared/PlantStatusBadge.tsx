import type { PlantOperationalStatus } from "@/components/core/main-dashboard/types/dashboard.types";
import { PLANT_STATUS_COLORS } from "@/components/core/main-dashboard/constants/statusColors";

interface PlantStatusBadgeProps {
  status: PlantOperationalStatus;
  compact?: boolean;
}

export function PlantStatusBadge({ status, compact = false }: PlantStatusBadgeProps) {
  const colors = PLANT_STATUS_COLORS[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide",
        colors.bg,
        colors.border,
        colors.text,
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {colors.label}
    </span>
  );
}
