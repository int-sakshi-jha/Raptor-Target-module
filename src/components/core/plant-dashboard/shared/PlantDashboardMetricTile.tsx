import type { LucideIcon } from "lucide-react";
import type { PlantDashboardAccent } from "./plantDashboardTheme";
import {
  PLANT_DASHBOARD_ACCENT_BAR,
  PLANT_DASHBOARD_FIELD_LABEL,
  PLANT_DASHBOARD_FIELD_UNIT,
  PLANT_DASHBOARD_FIELD_VALUE_PROMINENT,
  PLANT_DASHBOARD_TILE_SHELL,
  PLANT_DASHBOARD_TILE_SHINE,
} from "./plantDashboardTheme";

interface PlantDashboardMetricTileProps {
  label: string;
  value: string;
  unit?: string;
  accent?: PlantDashboardAccent;
  icon?: LucideIcon;
  compact?: boolean;
  layout?: "stack" | "row";
  /** `inline` drops nested card chrome for metrics inside an already-framed grid cell. */
  variant?: "tile" | "inline";
  className?: string;
}

export function PlantDashboardMetricTile({
  label,
  value,
  unit,
  accent = "neutral",
  icon: Icon,
  compact = false,
  layout = "stack",
  variant = "tile",
  className = "",
}: PlantDashboardMetricTileProps) {
  const isRow = layout === "row";
  const isInline = variant === "inline";
  const isTile = !isInline;

  return (
    <article
      className={[
        isInline
          ? "relative flex min-h-[3.75rem] min-w-0 flex-col justify-center gap-0.5"
          : PLANT_DASHBOARD_TILE_SHELL,
        isTile && (compact ? "p-2.5" : "p-3"),
        isTile && (isRow ? "flex min-w-0 items-center" : "flex min-h-[5rem] min-w-0 flex-col justify-between"),
        isInline && isRow ? "flex-row items-center justify-between gap-3 px-3 py-2.5" : "",
        isInline && !isRow ? "px-3 py-2.5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isTile ? (
        <div className={`absolute inset-y-0 left-0 w-0.5 rounded-l-sm ${PLANT_DASHBOARD_ACCENT_BAR[accent]}`} />
      ) : null}
      {isTile ? <div className={PLANT_DASHBOARD_TILE_SHINE} /> : null}
      {Icon && isTile ? (
        <Icon
          className={[
            "pointer-events-none absolute text-neutral-400/15 dark:text-neutral-dark-400/20",
            isRow ? "right-2.5 top-1/2 h-7 w-7 -translate-y-1/2" : "right-2 top-2.5 h-8 w-8",
          ].join(" ")}
          strokeWidth={1.25}
          aria-hidden
        />
      ) : null}

      <div
        className={`relative z-10 min-w-0 ${
          isRow
            ? "flex flex-1 items-center justify-between gap-3 pl-2"
            : "flex flex-col justify-between gap-1.5 pl-2"
        }`}
      >
        <p className={`truncate ${PLANT_DASHBOARD_FIELD_LABEL}`} title={label}>
          {label}
        </p>
        <p
          className={[
            "truncate tabular-nums leading-none",
            isRow ? "text-right" : "",
            compact ? "text-sm font-bold" : PLANT_DASHBOARD_FIELD_VALUE_PROMINENT,
            "text-neutral-900 dark:text-neutral-dark-950",
          ].join(" ")}
          title={unit ? `${value} ${unit}` : value}
        >
          {value}
          {unit ? (
            <span className={`ml-1 ${PLANT_DASHBOARD_FIELD_UNIT}`}>{unit}</span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
