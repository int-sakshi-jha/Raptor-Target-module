import { Activity } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPowerMeterSummary } from "../power-meter/powerMeter";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface MeterAnalyticsWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

function formatMw(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)} MW`;
}

function formatMwh(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export function MeterAnalyticsWidget({
  plantId,
  title = "Meter Analytics",
  embedded = false,
}: MeterAnalyticsWidgetProps) {
  const live = usePlantLiveData({ plantId });

  const summary = useMemo(
    () =>
      buildPowerMeterSummary({
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }),
    [live.componentById, live.processedByComponentId],
  );

  const liveMetrics = [
    { label: "Solar Generation", value: formatMw(summary.liveSolarGenerationMw) },
    { label: "Aux Consumption", value: formatMw(summary.liveAuxConsumptionMw) },
    { label: "Total Export", value: formatMw(summary.liveTotalExportMw) },
  ];

  const comparisonRows = [
    { label: "Solar Generation", today: summary.solarGeneration.todayMwh, yesterday: summary.solarGeneration.yesterdayMwh },
    { label: "Aux Consumption", today: summary.auxConsumption.todayMwh, yesterday: summary.auxConsumption.yesterdayMwh },
    { label: "Total Export", today: summary.totalExport.todayMwh, yesterday: summary.totalExport.yesterdayMwh },
  ];

  return (
    <PlantDashboardCard
      icon={Activity}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {liveMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xs border border-emerald-500/20 bg-emerald-500/5 px-2 py-2 text-center dark:bg-emerald-500/10"
            >
              <p className="text-[9px] text-neutral-500">{metric.label}</p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-neutral-200/80 text-neutral-500 dark:border-neutral-dark-300/60">
                <th className="py-1.5 font-medium">Metric</th>
                <th className="py-1.5 font-medium">Today (MWh)</th>
                <th className="py-1.5 font-medium">Yesterday (MWh)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-neutral-100 dark:border-neutral-dark-300/40"
                >
                  <td className="py-1.5 text-neutral-700 dark:text-neutral-dark-800">{row.label}</td>
                  <td className="py-1.5 font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMwh(row.today)}
                  </td>
                  <td className="py-1.5 tabular-nums text-neutral-600 dark:text-neutral-dark-700">
                    {formatMwh(row.yesterday)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlantDashboardCard>
  );
}
