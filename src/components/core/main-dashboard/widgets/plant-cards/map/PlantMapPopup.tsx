import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, X } from "lucide-react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import {
  formatCapacityKw,
  formatEnergyKwh,
  formatPlantMetricValue,
  formatPowerKw,
} from "@/components/core/main-dashboard/utils/plantMetricUtils";
import { formateDateTime } from "@/utils/gridFormatters";
import { PlantStatusBadge } from "@/components/core/main-dashboard/widgets/plant-cards/shared/PlantStatusBadge";

interface PlantMapPopupProps {
  plant: PlantDashboardMetrics;
  onClose: () => void;
  isDark?: boolean;
}

function MiniGenerationChart({
  plant,
  isDark,
}: {
  plant: PlantDashboardMetrics;
  isDark: boolean;
}) {
  const textColor = isDark ? "#d4d4d4" : "#525252";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: "areaspline",
        height: 100,
        backgroundColor: "transparent",
        margin: [4, 4, 20, 36],
        spacing: [0, 0, 0, 0],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: ["06", "09", "12", "15", "18"],
        labels: { style: { color: textColor, fontSize: "9px" } },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: gridColor,
        labels: { style: { color: textColor, fontSize: "9px" } },
      },
      tooltip: {
        shared: true,
        valueSuffix: " kWh",
        backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)",
        style: { fontSize: "10px" },
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.2,
          lineWidth: 2,
          marker: { enabled: false },
          color: "#10b981",
        },
      },
      series: [
        {
          type: "areaspline",
          name: "Generation",
          data: [
            (plant.todayGenerationKwh ?? 0) * 0.08,
            (plant.todayGenerationKwh ?? 0) * 0.22,
            (plant.todayGenerationKwh ?? 0) * 0.45,
            (plant.todayGenerationKwh ?? 0) * 0.68,
            plant.todayGenerationKwh ?? 0,
          ],
        },
      ],
    }),
    [plant.todayGenerationKwh, textColor, gridColor, isDark],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export function PlantMapPopup({ plant, onClose, isDark = false }: PlantMapPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      className="w-[min(92vw,340px)] overflow-hidden rounded-sm border border-neutral-200/80 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-neutral-dark-400/60 dark:bg-neutral-dark-100/95"
    >
      <div className="flex items-start justify-between gap-2 border-b border-neutral-200/70 px-3 py-2.5 dark:border-neutral-dark-400/50">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-dark-950">
            {plant.plantName}
          </h3>
          <div className="mt-1">
            <PlantStatusBadge status={plant.status} compact />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300/50"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Power</p>
            <p className="font-semibold tabular-nums">{formatPowerKw(plant.currentPowerKw)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Yield</p>
            <p className="font-semibold tabular-nums">{formatPlantMetricValue("yield", plant.yield)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Revenue</p>
            <p className="font-semibold tabular-nums">{formatPlantMetricValue("revenue", plant.revenue)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Generation</p>
            <p className="font-semibold tabular-nums">{formatEnergyKwh(plant.todayGenerationKwh)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Export</p>
            <p className="font-semibold tabular-nums">{formatPowerKw(plant.exportPowerKw)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">Import</p>
            <p className="font-semibold tabular-nums">{formatPowerKw(plant.importPowerKw)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">AC Cap</p>
            <p className="font-semibold tabular-nums">{formatCapacityKw(plant.acCapacityKw)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wide text-neutral-500">DC Cap</p>
            <p className="font-semibold tabular-nums">{formatCapacityKw(plant.dcCapacityKw)}</p>
          </div>
        </div>

        <div className="rounded-sm border border-neutral-200/70 bg-white/50 p-2 dark:border-neutral-dark-400/40 dark:bg-neutral-dark-200/30">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
            Generation Trend
          </p>
          <MiniGenerationChart plant={plant} isDark={isDark} />
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {plant.lastUpdated ? formateDateTime(plant.lastUpdated) : "—"}
          </span>
          <span>Alerts: {plant.alertsCount}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Link
            to={`/plants/${plant.plantId}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-sm bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Go To Plant
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
