import { Gauge } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPowerMeterSummary, type PowerMeterComparisonRow } from "./powerMeter";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PLANT_DASHBOARD_SECTION_DIVIDER } from "../shared/plantDashboardTheme";
import { PowerMeterFlowDiagram } from "./PowerMeterFlowDiagram";

interface PowerMeterWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center rounded-xs border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
      Live
    </span>
  );
}

function formatMwh(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function ComparisonGrid({
  solarGeneration,
  auxConsumption,
  totalExport,
}: {
  solarGeneration: PowerMeterComparisonRow;
  auxConsumption: PowerMeterComparisonRow;
  totalExport: PowerMeterComparisonRow;
}) {
  const columns = [
    { label: "Solar Generation", data: solarGeneration },
    { label: "Aux Consumption", data: auxConsumption },
    { label: "Total Export", data: totalExport },
  ];

  return (
    <div className={`mt-2.5 pt-2.5 ${PLANT_DASHBOARD_SECTION_DIVIDER}`}>
      <div className="grid grid-cols-3 gap-2">
        {columns.map((column) => (
          <div key={column.label} className="min-w-0 text-center">
            <p className="truncate text-[9px] font-medium text-neutral-600 dark:text-neutral-dark-700">
              {column.label}
            </p>
            <div className="mt-1 space-y-0.5">
              <div>
                <p className="text-[8px] uppercase tracking-wide text-neutral-500 dark:text-neutral-dark-600">
                  Today
                </p>
                <p className="text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMwh(column.data.todayMwh)}{" "}
                  <span className="text-[8px] font-normal uppercase">MWh</span>
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-wide text-neutral-500 dark:text-neutral-dark-600">
                  Yesterday
                </p>
                <p className="text-[10px] tabular-nums text-neutral-700 dark:text-neutral-dark-800">
                  {formatMwh(column.data.yesterdayMwh)}{" "}
                  <span className="text-[8px] uppercase">MWh</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PowerMeterWidget({ plantId, embedded = false }: PowerMeterWidgetProps) {
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
      icon={Gauge}
      title="Power Meter"
      badge={<LiveBadge />}
      embedded={embedded}
      fillHeight
      className="h-full"
    >
      <div className="flex h-full flex-col justify-between gap-1">
        <PowerMeterFlowDiagram
          solarMw={summary.liveSolarGenerationMw}
          auxMw={summary.liveAuxConsumptionMw}
          exportMw={summary.liveTotalExportMw}
        />
        <ComparisonGrid
          solarGeneration={summary.solarGeneration}
          auxConsumption={summary.auxConsumption}
          totalExport={summary.totalExport}
        />
      </div>
    </PlantDashboardCard>
  );
}
