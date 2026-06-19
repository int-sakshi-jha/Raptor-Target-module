import { GitBranch } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPowerMeterSummary } from "../power-meter/powerMeter";
import { PowerMeterFlowDiagram } from "../power-meter/PowerMeterFlowDiagram";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface EnergyFlowWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

function formatMwh(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export function EnergyFlowWidget({
  plantId,
  title = "Energy Flow",
  embedded = false,
}: EnergyFlowWidgetProps) {
  const live = usePlantLiveData({ plantId });

  const summary = useMemo(
    () =>
      buildPowerMeterSummary({
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }),
    [live.componentById, live.processedByComponentId],
  );

  return (
    <PlantDashboardCard
      icon={GitBranch}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-2">
        <PowerMeterFlowDiagram
          solarMw={summary.liveSolarGenerationMw}
          auxMw={summary.liveAuxConsumptionMw}
          exportMw={summary.liveTotalExportMw}
        />

        <div className="grid grid-cols-3 gap-1 border-t border-neutral-200/90 pt-2 dark:border-neutral-dark-300/65">
          {[
            { label: "Solar Gen.", data: summary.solarGeneration },
            { label: "Aux Cons.", data: summary.auxConsumption },
            { label: "Export", data: summary.totalExport },
          ].map((column) => (
            <div key={column.label} className="min-w-0 text-center">
              <p className="truncate text-[9px] font-medium text-neutral-600 dark:text-neutral-dark-700">
                {column.label}
              </p>
              <p className="mt-1 text-[8px] uppercase text-neutral-500">Today</p>
              <p className="text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMwh(column.data.todayMwh)} MWh
              </p>
              <p className="mt-1 text-[8px] uppercase text-neutral-500">Yesterday</p>
              <p className="text-[10px] tabular-nums text-neutral-700 dark:text-neutral-dark-800">
                {formatMwh(column.data.yesterdayMwh)} MWh
              </p>
            </div>
          ))}
        </div>
      </div>
    </PlantDashboardCard>
  );
}
