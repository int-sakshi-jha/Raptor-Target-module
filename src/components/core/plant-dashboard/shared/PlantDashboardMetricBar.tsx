import {
  PLANT_DASHBOARD_FIELD_LABEL,
  PLANT_DASHBOARD_FIELD_VALUE_PROMINENT,
} from "../shared/plantDashboardTheme";
type MetricTone = "success" | "warning" | "danger" | "info" | "neutral";

interface PlantDashboardMetricBarProps {
  label: string;
  value: string;
  percent: number | null;
  tone?: MetricTone;
}

function toneClass(tone: MetricTone): string {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-red-500";
  if (tone === "info") return "bg-sky-500";
  return "bg-neutral-400 dark:bg-neutral-dark-400";
}

function resolveToneFromPercent(percent: number | null, invert = false): MetricTone {
  if (percent == null || !Number.isFinite(percent)) return "neutral";
  const value = invert ? 100 - percent : percent;
  if (value >= 70) return "success";
  if (value >= 40) return "warning";
  return "danger";
}

export function PlantDashboardMetricBar({
  label,
  value,
  percent,
  tone,
}: PlantDashboardMetricBarProps) {
  const width = percent == null || !Number.isFinite(percent) ? 0 : Math.max(0, Math.min(100, percent));
  const barTone = tone ?? resolveToneFromPercent(percent);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`truncate ${PLANT_DASHBOARD_FIELD_LABEL}`}>{label}</span>
        <span className={`shrink-0 tabular-nums ${PLANT_DASHBOARD_FIELD_VALUE_PROMINENT}`}>
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-dark-300/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneClass(barTone)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function toneForMetric(
  label: string,
  percent: number | null,
): MetricTone {
  if (label.toLowerCase().includes("pr")) {
    return resolveToneFromPercent(percent);
  }
  if (label.toLowerCase().includes("cuf")) {
    return resolveToneFromPercent(percent);
  }
  return resolveToneFromPercent(percent);
}
