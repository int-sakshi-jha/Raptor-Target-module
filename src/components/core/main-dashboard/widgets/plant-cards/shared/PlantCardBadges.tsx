import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardBreakpoints } from "@/components/core/main-dashboard/hooks/useMainDashboardBreakpoints";
import { formatPlantMetricValue } from "@/components/core/main-dashboard/utils/plantMetricUtils";

type PillVariant = "yield" | "inactive" | "alerts";

const PILL_GLASS: Record<
  PillVariant,
  { shell: string; value: string; label: string; glow: string }
> = {
  yield: {
    shell:
      "border-violet-400/35 bg-violet-500/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-violet-400/30 dark:bg-violet-500/15 dark:shadow-none",
    glow: "bg-[radial-gradient(circle_at_30%_0%,rgba(139,92,246,0.2),transparent_70%)]",
    value: "text-violet-800 dark:text-violet-200",
    label: "text-violet-600/90 dark:text-violet-300/85",
  },
  inactive: {
    shell:
      "border-amber-400/35 bg-amber-500/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-amber-400/30 dark:bg-amber-500/15 dark:shadow-none",
    glow: "bg-[radial-gradient(circle_at_30%_0%,rgba(245,158,11,0.2),transparent_70%)]",
    value: "text-amber-800 dark:text-amber-200",
    label: "text-amber-700/90 dark:text-amber-300/85",
  },
  alerts: {
    shell:
      "border-red-400/35 bg-red-500/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-red-400/30 dark:bg-red-500/15 dark:shadow-none",
    glow: "bg-[radial-gradient(circle_at_30%_0%,rgba(239,68,68,0.2),transparent_70%)]",
    value: "text-red-800 dark:text-red-200",
    label: "text-red-600/90 dark:text-red-300/85",
  },
};

function StatusPill({
  value,
  label,
  variant,
  emphasize,
  compact,
}: {
  value: string;
  label: string;
  variant: PillVariant;
  emphasize?: boolean;
  compact?: boolean;
}) {
  const style = PILL_GLASS[variant];

  return (
    <div
      className={[
        "relative min-w-0 flex-1 overflow-hidden rounded-sm border text-center",
        compact ? "px-1 py-0.5" : "px-1.5 py-1",
        style.shell,
        emphasize && variant === "alerts" ? "animate-pulse" : "",
      ].join(" ")}
    >
      <div className={`pointer-events-none absolute inset-0 ${style.glow}`} />
      <p
        className={[
          "relative font-bold leading-tight tabular-nums",
          compact ? "text-[10px]" : "text-[11px]",
          style.value,
        ].join(" ")}
      >
        {value}
      </p>
      <p
        className={[
          "relative font-bold uppercase tracking-[0.12em]",
          compact ? "text-[6px]" : "text-[7px]",
          style.label,
        ].join(" ")}
      >
        {label}
      </p>
    </div>
  );
}

export function PlantCardBadges({ plant }: { plant: PlantDashboardMetrics }) {
  const { plantCardBadgesFullWidth, isMobile } = useMainDashboardBreakpoints();

  const yieldDisplay =
    plant.yield == null ? "—" : formatPlantMetricValue("yield", plant.yield);
  const inactiveDisplay = String(plant.inactiveComponentsCount);
  const alertDisplay = String(plant.alertsCount);

  return (
    <div
      className={[
        "grid grid-cols-3 gap-1",
        plantCardBadgesFullWidth ? "w-full" : "w-auto max-w-[180px] shrink-0",
      ].join(" ")}
    >
      <StatusPill value={yieldDisplay} label="Yield" variant="yield" compact={isMobile} />
      <StatusPill value={inactiveDisplay} label="Inactive" variant="inactive" compact={isMobile} />
      <StatusPill
        value={alertDisplay}
        label="Alerts"
        variant="alerts"
        emphasize={plant.alertsCount > 0}
        compact={isMobile}
      />
    </div>
  );
}
