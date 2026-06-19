import React, { useMemo } from "react";
import { CalendarDays, LineChart as LineChartIcon } from "lucide-react";
import ChartCard, {
  type ChartSeries,
  type ChartType,
} from "@/components/core/charts/ChartCard";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import {
  DEFAULT_DETAIL_DASHBOARD_METRIC,
  filterDetailDashboardRows,
  readText,
  resolveDetailDashboardRows,
  resolveMetricValue,
} from "./detailDashboardData";
import type {
  DetailDashboardChartConfig,
  DetailDashboardComponentType,
  DetailDashboardRow,
} from "./DetailDashboardTypes";

type DetailDashboardChartProps = {
  plantId?: string;
  componentType?: DetailDashboardComponentType;
  rows?: DetailDashboardRow[];
  config?: DetailDashboardChartConfig;
  dateLabel?: string;
  className?: string;
};

function resolveFieldArray(row: DetailDashboardRow, aliases: string[]): unknown[] | null {
  for (const alias of aliases) {
    const val = row[alias];
    if (Array.isArray(val) && val.length > 0) return val;
    const foundKey = Object.keys(row).find((k) => k.toLowerCase() === alias.toLowerCase());
    if (foundKey) {
      const v = row[foundKey];
      if (Array.isArray(v) && v.length > 0) return v;
    }
  }
  return null;
}

function resolveTimestampArray(row: DetailDashboardRow): unknown[] | null {
  for (const key of ["CDT", "timestamp", "timestamps", "time"]) {
    const val = row[key];
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return null;
}

function buildSeries(rows: DetailDashboardRow[], metric = DEFAULT_DETAIL_DASHBOARD_METRIC): ChartSeries[] {
  // Single row with array data → time-series chart
  if (rows.length === 1) {
    const row = rows[0];
    const powerArray = resolveFieldArray(row, metric.aliases);
    if (powerArray && powerArray.length > 0) {
      const tsArray = resolveTimestampArray(row);
      const data = powerArray.map((v, i) => {
        const rawVal = v == null || v === "" ? null : Number(v);
        const label = tsArray?.[i] != null ? String(tsArray[i]) : `${i + 1}`;
        return {
          name: label,
          value: rawVal != null && Number.isFinite(rawVal) ? rawVal : 0,
        };
      });
      return [{ name: readText(row, "component_name") || metric.label, data }];
    }
  }

  // Multiple rows → one point per component (snapshot)
  return [
    {
      name: metric.label,
      data: rows.map((row, index) => ({
        name:
          readText(row, "component_name") ||
          readText(row, "component_code") ||
          `Component ${index + 1}`,
        value: Number.isFinite(resolveMetricValue(row, metric))
          ? resolveMetricValue(row, metric)
          : 0,
      })),
    },
  ];
}

export const DetailDashboardChart: React.FC<DetailDashboardChartProps> = ({
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

  const isTimeSeries = useMemo(() => {
    if (!rows || rows.length !== 1) return false;
    const row = rows[0];
    return metric.aliases.some((alias) => {
      const val = row[alias];
      if (Array.isArray(val) && val.length > 0) return true;
      const key = Object.keys(row).find((k) => k.toLowerCase() === alias.toLowerCase());
      return key ? Array.isArray(row[key]) && (row[key] as unknown[]).length > 0 : false;
    });
  }, [metric.aliases, rows]);

  const chartRows = useMemo(
    () =>
      isTimeSeries
        ? (rows ?? [])
        : filterDetailDashboardRows(
            resolveDetailDashboardRows(rows, plantComponents.components),
            componentType,
          ).slice(0, 24),
    [componentType, isTimeSeries, plantComponents.components, rows],
  );

  const series = useMemo(() => buildSeries(chartRows, metric), [chartRows, metric]);

  const categories = useMemo(
    () =>
      series[0]?.data.map((point) => point.name) ??
      chartRows.map((row, index) =>
        readText(row, "component_name") ||
        readText(row, "component_code") ||
        `${index + 1}`,
      ),
    [chartRows, series],
  );
  const allowedChartTypes: ChartType[] = ["line"];

  return (
    <section
      className={`overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200/90 px-4 py-3 dark:border-neutral-dark-300/65">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <LineChartIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {config?.title ?? "Generation Graph"}
            </h3>
            <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              {config?.description ?? "Generation values for the selected component type."}
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

      {chartRows.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center px-4 text-sm text-neutral-500 dark:text-neutral-dark-600">
          No chart data available.
        </div>
      ) : (
        <div className="[&_.glass-morphism-card]:rounded-none [&_.glass-morphism-card]:border-0 [&_.glass-morphism-card]:bg-transparent [&_.glass-morphism-card]:shadow-none">
          <ChartCard
            title={config?.title ?? "Generation Graph"}
            storageKey={`detail-dashboard-${plantId ?? "plant"}-${componentType}`}
            allowedChartTypes={allowedChartTypes}
            defaultChartType={config?.defaultChartType ?? allowedChartTypes[0]}
            categories={categories}
            series={series}
            yAxisTitle={config?.yAxisTitle ?? metric.label}
            yAxisSuffix={metric.unit ? ` ${metric.unit}` : ""}
            tooltipSuffix={metric.unit ? ` ${metric.unit}` : ""}
            xAxisTitle={config?.xAxisTitle ?? "Component"}
            areaFillOpacity={0.28}
            barShowLegend={false}
          />
        </div>
      )}
    </section>
  );
};

export default DetailDashboardChart;
