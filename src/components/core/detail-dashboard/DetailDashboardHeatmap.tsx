import React, { useMemo } from "react";
import { CalendarDays, Grid2X2, LayoutGrid } from "lucide-react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import {
  DEFAULT_DETAIL_DASHBOARD_METRIC,
  filterDetailDashboardRows,
  formatMetricValue,
  readText,
  resolveDetailDashboardRows,
  resolveMetricValue,
} from "./detailDashboardData";
import type {
  DetailDashboardComponentType,
  DetailDashboardHeatmapConfig,
  DetailDashboardRow,
} from "./DetailDashboardTypes";

type DetailDashboardHeatmapProps = {
  plantId?: string;
  componentType?: DetailDashboardComponentType;
  rows?: DetailDashboardRow[];
  config?: DetailDashboardHeatmapConfig;
  dateLabel?: string;
  className?: string;
};

type HeatmapGroup = {
  label: string;
  secondary: string;
  rows: DetailDashboardRow[];
};

function colorForRatio(value: number, max: number, status?: unknown) {
  const normalizedStatus = String(status ?? "").toLowerCase();
  if (["offline", "fault", "error"].includes(normalizedStatus)) {
    return "border-neutral-500/30 bg-neutral-700/60 text-neutral-200";
  }

  const ratio = max > 0 && Number.isFinite(value) ? value / max : 0;
  if (ratio >= 0.76) return "border-emerald-500/35 bg-emerald-500/65 text-white";
  if (ratio >= 0.51) return "border-lime-500/35 bg-lime-600/60 text-white";
  if (ratio >= 0.26) return "border-amber-500/35 bg-amber-600/60 text-white";
  if (ratio > 0) return "border-orange-500/35 bg-orange-700/65 text-white";
  return "border-red-500/35 bg-red-800/70 text-white";
}

export const DetailDashboardHeatmap: React.FC<DetailDashboardHeatmapProps> = ({
  plantId,
  componentType = "inverter",
  rows,
  config,
  dateLabel,
  className = "",
}) => {
  const plantComponents = usePlantComponents({
    plantId,
    enabled: !rows?.length,
  });

  const metric = config?.metric ?? DEFAULT_DETAIL_DASHBOARD_METRIC;
  const groupBy = config?.groupBy ?? "inverter_name";
  const secondaryGroupBy = config?.secondaryGroupBy ?? "block_name";

  const dashboardRows = useMemo(
    () =>
      filterDetailDashboardRows(
        resolveDetailDashboardRows(rows, plantComponents.components),
        componentType,
      ),
    [componentType, plantComponents.components, rows],
  );

  const groupedRows = useMemo(() => {
    const groups = new Map<string, HeatmapGroup>();

    dashboardRows.forEach((row) => {
      const label =
        readText(row, String(groupBy)) ||
        readText(row, "component_name") ||
        readText(row, "component_id") ||
        "Equipment";
      const secondary = secondaryGroupBy
        ? readText(row, String(secondaryGroupBy))
        : "";
      const key = `${label}-${secondary}`;

      if (!groups.has(key)) {
        groups.set(key, { label, secondary, rows: [] });
      }
      groups.get(key)?.rows.push(row);
    });

    return Array.from(groups.values());
  }, [dashboardRows, groupBy, secondaryGroupBy]);

  const maxColumns = Math.max(1, ...groupedRows.map((group) => group.rows.length));
  const maxValue = Math.max(
    0,
    ...dashboardRows.map((row) => resolveMetricValue(row, metric)).filter(Number.isFinite),
  );

  return (
    <section
      className={`flex min-h-[320px] flex-col overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200/90 px-4 py-3 dark:border-neutral-dark-300/65">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Grid2X2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {config?.title ?? "Inverter Generation Heatmap"}
            </h3>
            <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              {config?.description ?? "Component generation matrix by selected type."}
            </p>
          </div>
        </div>
        {dateLabel ? (
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {groupedRows.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center rounded-sm border border-dashed border-neutral-300 text-center text-sm text-neutral-500 dark:border-neutral-dark-300 dark:text-neutral-dark-600">
            <LayoutGrid className="mb-2 h-7 w-7 text-brand-500" />
            No heatmap data available.
          </div>
        ) : (
          <div className="min-w-[560px]">
            {groupedRows.map((group, rowIndex) => (
              <div
                key={`${group.label}-${rowIndex}`}
                className="grid border-b border-neutral-900/10 last:border-b-0 dark:border-white/10"
                style={{
                  gridTemplateColumns: `72px repeat(${maxColumns}, minmax(56px, 1fr))`,
                }}
              >
                <div className="flex min-h-[46px] flex-col justify-center border-r border-neutral-900/10 pr-2 text-right dark:border-white/10">
                  <span className="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-dark-600">
                    {String(rowIndex).padStart(2, "0")}
                  </span>
                  <span className="truncate text-[10px] text-neutral-400 dark:text-neutral-dark-500">
                    {group.secondary || group.label}
                  </span>
                </div>
                {Array.from({ length: maxColumns }).map((_, columnIndex) => {
                  const row = group.rows[columnIndex];
                  if (!row) {
                    return (
                      <div
                        key={`empty-${columnIndex}`}
                        className="min-h-[46px] border-r border-neutral-900/10 bg-neutral-100/50 last:border-r-0 dark:border-white/10 dark:bg-neutral-dark-200/35"
                      />
                    );
                  }

                  const value = resolveMetricValue(row, metric);
                  return (
                    <div
                      key={String(row.id ?? `${group.label}-${columnIndex}`)}
                      className="border-r border-neutral-900/10 p-0.5 last:border-r-0 dark:border-white/10"
                    >
                      <div
                        title={`${readText(row, "component_name") || "Component"}: ${formatMetricValue(value, metric)}`}
                        className={`flex min-h-[42px] items-center justify-center rounded-[2px] border px-1 text-center text-[10px] font-semibold ${colorForRatio(value, maxValue, row.status)}`}
                      >
                        {formatMetricValue(value, metric)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DetailDashboardHeatmap;
