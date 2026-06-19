import { CloudSun, Cloud, Sun } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardEmptyState } from "../shared/PlantDashboardEmptyState";
import { PlantDashboardField } from "../shared/PlantDashboardField";
import {
  PLANT_DASHBOARD_INSET_PANEL,
  PLANT_DASHBOARD_SECTION_DIVIDER,
  PLANT_DASHBOARD_SECTION_LABEL,
} from "../shared/plantDashboardTheme";
import { buildWeatherForecastSummary } from "./weatherForecast";

interface WeatherForecastWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function formatTemp(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}°C`;
}

function ForecastPill({ label, temp }: { label: string; temp: string }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2.5 ${PLANT_DASHBOARD_INSET_PANEL}`}
    >
      <Sun className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
      <span className="text-[9px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-600">
        {label}
      </span>
      <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-neutral-dark-950">
        {temp}
      </span>
    </div>
  );
}

export function WeatherForecastWidget({ plantId, embedded = false }: WeatherForecastWidgetProps) {
  const live = usePlantLiveData({ plantId });

  const summary = useMemo(
    () =>
      buildWeatherForecastSummary({
        plantLive: live.plantLive,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
        deviceNameById: live.deviceNameById,
      }),
    [live.componentById, live.deviceNameById, live.plantLive, live.processedByComponentId],
  );

  const minMaxLabel =
    summary.minTempC != null || summary.maxTempC != null
      ? `${formatTemp(summary.minTempC)} – ${formatTemp(summary.maxTempC)}`
      : null;

  return (
    <PlantDashboardCard
      icon={CloudSun}
      title="Weather Forecast"
      embedded={embedded}
      fillHeight
      className="h-full"
      badge={
        live.hasLiveData ? (
          <span className="rounded-xs border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Live
          </span>
        ) : null
      }
    >
      {!summary.hasData ? (
        <PlantDashboardEmptyState
          icon={Cloud}
          message="No live weather station data"
          description="Weather metrics will appear when a station is connected."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className={`shrink-0 rounded-sm px-3 py-3 text-center ${PLANT_DASHBOARD_INSET_PANEL}`}>
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-sm border border-amber-400/25 bg-amber-500/10">
              <Sun className="h-6 w-6 text-amber-500" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-dark-950">
              {formatTemp(summary.currentTempC)}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
              {summary.displayDate}
            </p>
            {minMaxLabel ? (
              <p className="mt-1 text-[10px] tabular-nums text-neutral-600 dark:text-neutral-dark-700">
                {minMaxLabel}
              </p>
            ) : null}
            {summary.stationName ? (
              <p className="mt-1 truncate text-[9px] text-neutral-400 dark:text-neutral-dark-500">
                {summary.stationName}
              </p>
            ) : null}
            <div className="mt-2.5 flex justify-center gap-5 text-[9px] text-neutral-500 dark:text-neutral-dark-600">
              <span>Sunrise: {summary.sunrise ?? "–"}</span>
              <span>Sunset: {summary.sunset ?? "–"}</span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <ForecastPill label="Yesterday" temp={formatTemp(summary.yesterdayTempC)} />
            <ForecastPill label="Tomorrow" temp={formatTemp(summary.tomorrowTempC)} />
          </div>

          <div className="min-h-0 flex-1">
            <p className={`mb-2 ${PLANT_DASHBOARD_SECTION_LABEL}`}>Live Metrics</p>
            <div
              className={`grid grid-cols-2 content-start gap-x-3 gap-y-2.5 pt-2.5 ${PLANT_DASHBOARD_SECTION_DIVIDER}`}
            >
              {summary.metrics.map((metric) => (
                <PlantDashboardField
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                />
              ))}
            </div>
          </div>

          {summary.timestamp ? (
            <p className="shrink-0 text-center text-[9px] text-neutral-400 dark:text-neutral-dark-500">
              Updated {summary.timestamp}
            </p>
          ) : null}
        </div>
      )}
    </PlantDashboardCard>
  );
}
