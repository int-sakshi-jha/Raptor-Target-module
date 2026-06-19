import type { LucideIcon } from "lucide-react";
import type { PlantDashboardAccent } from "../shared/plantDashboardTheme";
import {
  PLANT_DASHBOARD_FIELD_LABEL,
  PLANT_DASHBOARD_FIELD_UNIT,
  PLANT_DASHBOARD_TILE_SHINE,
} from "../shared/plantDashboardTheme";
import { PLANT_STAT_GLASS_SHELL, PLANT_STAT_GLASS_THEME } from "./plantStatCardTheme";

interface PlantStatCardProps {
  label: string;
  value: string;
  unit?: string;
  accent: PlantDashboardAccent;
  icon: LucideIcon;
  compact?: boolean;
}

export function PlantStatCard({
  label,
  value,
  unit,
  accent,
  icon: Icon,
  compact = false,
}: PlantStatCardProps) {
  const theme = PLANT_STAT_GLASS_THEME[accent];

  return (
    <article
      className={[
        PLANT_STAT_GLASS_SHELL,
        theme.border,
        compact ? "min-h-[4.75rem] p-2.5" : "min-h-[5.25rem] p-3",
        "group flex min-w-0 flex-col justify-between",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 ${theme.gradient}`}
      />
      <div className={PLANT_DASHBOARD_TILE_SHINE} />
      <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-white/25 blur-2xl transition-opacity duration-200 group-hover:opacity-80 dark:bg-white/[0.04]" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          <p className={`truncate ${PLANT_DASHBOARD_FIELD_LABEL}`} title={label}>
            {label}
          </p>
          <p
            className={[
              "truncate tabular-nums leading-none",
              compact ? "text-sm font-bold" : "text-base font-bold",
              theme.value,
            ].join(" ")}
            title={unit ? `${value} ${unit}` : value}
          >
            {value}
            {unit ? (
              <span className={`ml-1 ${PLANT_DASHBOARD_FIELD_UNIT} ${theme.unit}`}>
                {unit}
              </span>
            ) : null}
          </p>
        </div>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border ${theme.iconBg}`}
        >
          <Icon className={`h-3.5 w-3.5 ${theme.iconFg}`} strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </article>
  );
}
