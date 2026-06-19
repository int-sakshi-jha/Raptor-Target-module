import React, { useMemo, useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import { toTitleCaseLabel, type EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import {
  buildHeatmapGroups,
  colorForHeatmapRatio,
  discoverHeatmapMetrics,
  extractNumber,
  formatHeatmapValue,
  getHeatmapMaxColumns,
  isHeatmapDisconnected,
  resolveHeatmapMetricValue,
  type EquipmentHeatmapRow,
} from "@/lib/plant/equipmentHeatmapUtils";

export type { EquipmentHeatmapRow } from "@/lib/plant/equipmentHeatmapUtils";

export interface EquipmentHeatmapProps {
  data: EquipmentHeatmapRow[];
  componentType?: EquipmentFilterComponentType;
  componentById?: ReadonlyMap<string, PlantComponentRow>;
  loading?: boolean;
}

type TooltipState = {
  cellLabel: string;
  groupLabel: string;
  row: EquipmentHeatmapRow;
  value: string;
};

const PERFORMANCE_BANDS = [
  { label: "0%", className: "bg-red-600/80" },
  { label: "1-25%", className: "bg-orange-500/80" },
  { label: "26-50%", className: "bg-amber-500/80" },
  { label: "51-75%", className: "bg-lime-500/80" },
  { label: "76-100%", className: "bg-emerald-500/80" },
] as const;

function formatTooltipValue(value: unknown): string {
  const parsed = extractNumber(value);
  if (!Number.isNaN(parsed)) return formatHeatmapValue(parsed);
  if (value == null || value === "") return "-";
  return String(value);
}

export const EquipmentHeatmap: React.FC<EquipmentHeatmapProps> = ({
  data,
  componentType,
  componentById,
  loading = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const availableMetrics = useMemo(
    () => discoverHeatmapMetrics(data),
    [data],
  );

  const activeMetricKey = useMemo(() => {
    if (selectedMetric && availableMetrics.some((metric) => metric.key === selectedMetric)) {
      return selectedMetric;
    }
    return availableMetrics[0]?.key ?? "";
  }, [availableMetrics, selectedMetric]);

  const groupedData = useMemo(
    () =>
      buildHeatmapGroups({
        rows: data,
        componentType,
        componentById,
      }),
    [componentById, componentType, data],
  );

  const maxColumns = useMemo(() => getHeatmapMaxColumns(groupedData), [groupedData]);

  const maxValue = useMemo(() => {
    let max = 0;
    if (!activeMetricKey) return max;

    for (const group of groupedData) {
      for (const cell of group.cells) {
        const value = resolveHeatmapMetricValue(cell.row, activeMetricKey, cell.index);
        if (!Number.isNaN(value) && value > max) max = value;
      }
    }
    return max;
  }, [activeMetricKey, groupedData]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xs border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
        <div className="text-sm text-neutral-500 dark:text-neutral-dark-600">Loading live data…</div>
      </div>
    );
  }

  if (data.length === 0 || groupedData.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xs border border-dashed border-neutral-300 bg-neutral-0 px-4 text-center dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
        <div className="mb-2 rounded-xs border border-brand-500/30 bg-brand-500/10 p-2 text-brand-500">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-dark-600">
          Waiting for live telemetry to render the heatmap.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
      {availableMetrics.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 px-3 py-2 dark:border-neutral-dark-300/65">
          <div className="hide-scrollbar flex max-w-full flex-1 overflow-x-auto rounded-xs border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-dark-300 dark:bg-neutral-dark-200/80">
            {availableMetrics.map((metric) => {
              const active = activeMetricKey === metric.key;
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`shrink-0 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-brand-500 text-white"
                      : "text-neutral-600 hover:bg-white hover:text-neutral-900 dark:text-neutral-dark-700 dark:hover:bg-neutral-dark-100 dark:hover:text-neutral-dark-950"
                  }`}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {PERFORMANCE_BANDS.map((band) => (
              <span
                key={band.label}
                className={`rounded-xs px-1.5 py-0.5 text-[10px] font-medium text-white ${band.className}`}
              >
                {band.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="min-w-fit rounded-xs border border-neutral-200/80 bg-white dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
          <div
            className="grid sticky top-0 z-10 border-b border-neutral-200/80 bg-neutral-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
            style={{
              gridTemplateColumns: `minmax(88px, 120px) repeat(${maxColumns}, minmax(44px, 1fr))`,
            }}
          >
            <div className="border-r border-neutral-200/80 px-2 py-1.5 text-[10px] font-medium text-neutral-500 dark:border-neutral-dark-300 dark:text-neutral-dark-600" />
            {Array.from({ length: maxColumns }, (_, index) => (
              <div
                key={`header-${index + 1}`}
                className="border-r border-neutral-200/80 px-1 py-1.5 text-center text-[10px] font-medium text-neutral-500 last:border-r-0 dark:border-neutral-dark-300 dark:text-neutral-dark-600"
              >
                {index + 1}
              </div>
            ))}
          </div>

          {groupedData.map((group) => (
            <div
              key={`${group.label}-${group.secondary}`}
              className="grid border-b border-neutral-200/80 last:border-b-0 dark:border-neutral-dark-300"
              style={{
                gridTemplateColumns: `minmax(88px, 120px) repeat(${maxColumns}, minmax(44px, 1fr))`,
              }}
            >
              <div className="border-r border-neutral-200/80 px-2 py-1.5 dark:border-neutral-dark-300">
                <div
                  className="truncate text-[11px] font-medium text-neutral-900 dark:text-neutral-dark-950"
                  title={group.label}
                >
                  {group.label}
                </div>
                {group.secondary ? (
                  <div
                    className="truncate text-[10px] text-neutral-500 dark:text-neutral-dark-600"
                    title={group.secondary}
                  >
                    {group.secondary}
                  </div>
                ) : null}
              </div>

              {Array.from({ length: maxColumns }, (_, columnOffset) => {
                const columnIndex = columnOffset + 1;
                const cell = group.cells.find((item) => item.index === columnIndex);

                if (!cell) {
                  return (
                    <div
                      key={`empty-${group.label}-${columnIndex}`}
                      className="border-r border-neutral-200/80 bg-neutral-50/80 p-0.5 last:border-r-0 dark:border-neutral-dark-300 dark:bg-neutral-dark-200/30"
                    />
                  );
                }

                const value = activeMetricKey
                  ? resolveHeatmapMetricValue(cell.row, activeMetricKey, cell.index)
                  : Number.NaN;
                const displayVal = formatHeatmapValue(value);
                const disconnected = isHeatmapDisconnected(cell.row);
                const ratio = maxValue > 0 && !Number.isNaN(value) ? value / maxValue : 0;
                const colorClass = colorForHeatmapRatio(ratio, disconnected);

                return (
                  <div
                    key={`${group.label}-${cell.index}`}
                    className="border-r border-neutral-200/80 p-0.5 last:border-r-0 dark:border-neutral-dark-300"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setTooltip({
                          cellLabel: cell.label,
                          groupLabel: group.label,
                          row: cell.row,
                          value: displayVal,
                        })
                      }
                      className={`flex min-h-[40px] w-full items-center justify-center rounded-xs border px-0.5 text-[10px] font-semibold transition-transform hover:scale-[1.03] ${colorClass}`}
                      title={`${group.label} · ${cell.label}: ${displayVal}`}
                    >
                      {disconnected ? "—" : displayVal}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip ? (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/35"
            onClick={() => setTooltip(null)}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-xl dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
              <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-dark-300">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                    {tooltip.groupLabel} · {tooltip.cellLabel}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-dark-600">
                    {activeMetricKey ? toTitleCaseLabel(activeMetricKey) : "Value"}: {tooltip.value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTooltip(null)}
                  className="rounded-xs p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[280px] overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(tooltip.row)
                    .filter(([key]) => !key.endsWith("_id") && key !== "id")
                    .slice(0, 18)
                    .map(([key, value]) => (
                      <div key={key} className="rounded-xs bg-neutral-50 px-2 py-1.5 dark:bg-neutral-dark-200/50">
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-dark-600">
                          {toTitleCaseLabel(key)}
                        </div>
                        <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-dark-950">
                          {formatTooltipValue(value)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
