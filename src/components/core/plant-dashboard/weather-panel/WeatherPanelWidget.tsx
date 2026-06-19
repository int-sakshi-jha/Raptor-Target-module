import { CloudRain } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { buildWeatherForecastSummary } from "../weather-forecast/weatherForecast";

interface WeatherPanelWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

function formatTemp(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}°C`;
}

export function WeatherPanelWidget({
  plantId,
  title = "Weather Panel",
  embedded = false,
}: WeatherPanelWidgetProps) {
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

  return (
    <PlantDashboardCard
      icon={CloudRain}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      {!summary.hasData ? (
        <div className="flex flex-1 items-center justify-center text-center text-[11px] text-neutral-500">
          No weather station data available.
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="rounded-xs border border-brand-500/20 bg-brand-500/5 px-3 py-2 text-center dark:bg-brand-500/10">
            <p className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950">
              {formatTemp(summary.currentTempC)}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500">{summary.displayDate}</p>
            {summary.stationName ? (
              <p className="mt-1 truncate text-[9px] text-neutral-400">{summary.stationName}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {summary.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xs border border-neutral-200/80 bg-neutral-50/70 px-2 py-1.5 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30"
              >
                <p className="text-[9px] text-neutral-500">{metric.label}</p>
                <p className="mt-0.5 text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-dark-950">
                  {metric.value}
                  {metric.unit ? (
                    <span className="ml-0.5 text-[9px] font-normal text-neutral-500">{metric.unit}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto flex justify-center gap-4 border-t border-neutral-200/80 pt-2 text-[9px] text-neutral-500 dark:border-neutral-dark-300/60">
            <span>Sunrise: {summary.sunrise ?? "-"}</span>
            <span>Sunset: {summary.sunset ?? "-"}</span>
          </div>
        </div>
      )}
    </PlantDashboardCard>
  );
}
