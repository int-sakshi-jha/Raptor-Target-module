import React, { useCallback, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  buildComponentMetricSection,
  colorForHeatmapCellState,
  formatHeatmapValue,
  HEATMAP_INITIAL_ROWS,
  HEATMAP_MAX_ROWS_PER_SECTION,
  isHeatmapDisconnected,
  resolveHeatmapCellState,
  resolveHeatmapMetricValue,
  type ComponentMetricEntry,
  type ComponentMetricSection,
  type EquipmentHeatmapRow,
} from "@/lib/plant/equipmentHeatmapUtils";
import {
  toTitleCaseLabel,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";

export interface PlantEquipmentHeatmapPanelProps {
  rows: EquipmentHeatmapRow[];
  componentType: EquipmentFilterComponentType;
  componentById?: ReadonlyMap<string, PlantComponentRow>;
  loading?: boolean;
  search?: string;
}

type HoverState = {
  entry: ComponentMetricEntry;
  metricLabel: string;
  value: string;
  x: number;
  y: number;
};

const SCALE_LEGEND = [
  { label: "No data", className: "bg-neutral-200/50 dark:bg-neutral-dark-400/25" },
  { label: "Zero", className: "bg-neutral-300/60 dark:bg-neutral-dark-400/35" },
  { label: "Low", className: "bg-orange-600/80" },
  { label: "Mid", className: "bg-amber-500/80" },
  { label: "High", className: "bg-lime-600/80" },
  { label: "Peak", className: "bg-emerald-500/85" },
] as const;

function matchesSearch(entry: { label: string; secondary: string }, query: string): boolean {
  if (!query) return true;
  const haystack = `${entry.label} ${entry.secondary}`.toLowerCase();
  return haystack.includes(query);
}

function MetricMatrix({
  section,
  search,
}: {
  section: ComponentMetricSection;
  search: string;
}) {
  const [visibleCount, setVisibleCount] = useState(HEATMAP_INITIAL_ROWS);
  const [hover, setHover] = useState<HoverState | null>(null);

  const filteredEntries = useMemo(
    () => section.entries.filter((entry) => matchesSearch(entry, search)),
    [search, section.entries],
  );

  const displayEntries = filteredEntries.slice(
    0,
    Math.min(visibleCount, HEATMAP_MAX_ROWS_PER_SECTION),
  );

  const canLoadMore =
    filteredEntries.length > displayEntries.length &&
    displayEntries.length < HEATMAP_MAX_ROWS_PER_SECTION;

  const hideHover = useCallback(() => setHover(null), []);

  if (filteredEntries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-dark-600">
        No components match your search.
      </p>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto rounded-xs border border-neutral-200/70 dark:border-neutral-dark-300/60">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `minmax(148px, 180px) repeat(${section.metrics.length}, 56px)`,
          }}
        >
          <div className="sticky left-0 top-0 z-30 border-b border-r border-neutral-200/70 bg-neutral-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200 dark:text-neutral-dark-600">
            Component
          </div>
          {section.metrics.map((metric) => (
            <div
              key={metric.key}
              className="sticky top-0 z-20 border-b border-r border-neutral-200/70 bg-neutral-50 px-1 py-1.5 text-center last:border-r-0 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200"
              title={metric.label}
            >
              <span className="mx-auto block max-w-[64px] text-[9px] font-medium leading-[1.15] text-neutral-600 dark:text-neutral-dark-700">
                {metric.label}
              </span>
            </div>
          ))}

          {displayEntries.map((entry, rowIndex) => (
            <React.Fragment key={entry.id}>
              <div
                className={`sticky left-0 z-10 border-b border-r border-neutral-200/60 bg-neutral-0 px-2 py-1.5 dark:border-neutral-dark-300/50 dark:bg-neutral-dark-100 ${
                  rowIndex % 2 === 0 ? "" : "bg-neutral-50/60 dark:bg-neutral-dark-200/20"
                }`}
              >
                <div
                  className="truncate text-[11px] font-medium text-neutral-900 dark:text-neutral-dark-950"
                  title={entry.label}
                >
                  {entry.label}
                </div>
                {entry.secondary ? (
                  <div
                    className="truncate text-[9px] text-neutral-500 dark:text-neutral-dark-600"
                    title={entry.secondary}
                  >
                    {entry.secondary}
                  </div>
                ) : null}
              </div>

              {section.metrics.map((metric) => {
                const value = resolveHeatmapMetricValue(
                  entry.row,
                  metric.key,
                  entry.row.tracker_index ?? undefined,
                );
                const max = section.columnMax[metric.key] ?? 0;
                const disconnected = isHeatmapDisconnected(entry.row);
                const cellState = resolveHeatmapCellState(value, disconnected);
                const ratio =
                  cellState === "value" && max > 0 && !Number.isNaN(value) ? value / max : 0;
                const displayVal = formatHeatmapValue(value);
                const colorClass = colorForHeatmapCellState(cellState, ratio);
                const showValue = cellState === "value" || cellState === "zero";

                return (
                  <div
                    key={`${entry.id}-${metric.key}`}
                    className={`border-b border-r border-neutral-200/50 p-[3px] last:border-r-0 dark:border-neutral-dark-300/40 ${
                      rowIndex % 2 === 0 ? "" : "bg-neutral-50/40 dark:bg-neutral-dark-200/10"
                    }`}
                  >
                    <button
                      type="button"
                      onMouseEnter={(event) =>
                        setHover({
                          entry,
                          metricLabel: metric.label,
                          value: disconnected ? "Offline" : displayVal,
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      onMouseMove={(event) =>
                        setHover((prev) =>
                          prev ? { ...prev, x: event.clientX, y: event.clientY } : prev,
                        )
                      }
                      onMouseLeave={hideHover}
                      className={`flex h-[30px] w-full items-center justify-center rounded-xs border text-[9px] font-semibold tabular-nums transition-transform hover:z-10 hover:scale-105 ${colorClass}`}
                    >
                      {showValue ? (
                        <span className="max-w-full truncate px-0.5">{displayVal}</span>
                      ) : (
                        <span className="opacity-0">-</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {canLoadMore ? (
        <div className="shrink-0 pt-2">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + HEATMAP_INITIAL_ROWS, HEATMAP_MAX_ROWS_PER_SECTION),
              )
            }
            className="rounded-xs border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-dark-300 dark:text-neutral-dark-700 dark:hover:bg-neutral-dark-200"
          >
            Load more ({filteredEntries.length - displayEntries.length} remaining)
          </button>
        </div>
      ) : null}

      {hover ? (
        <div
          className="pointer-events-none fixed z-[200] min-w-[200px] rounded-xs border border-neutral-200/90 bg-white px-3 py-2 shadow-lg dark:border-neutral-dark-300 dark:bg-neutral-dark-100"
          style={{ left: hover.x + 14, top: hover.y + 12 }}
        >
          <p className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950">
            {hover.entry.label}
          </p>
          <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {hover.metricLabel}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400">
            {hover.value}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const PlantEquipmentHeatmapPanel: React.FC<PlantEquipmentHeatmapPanelProps> = ({
  rows,
  componentType,
  componentById,
  loading = false,
  search = "",
}) => {
  const query = search.trim().toLowerCase();

  const section = useMemo(
    () =>
      buildComponentMetricSection({
        rows,
        componentType,
        componentById,
      }),
    [componentById, componentType, rows],
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xs border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
        <div className="text-sm text-neutral-500 dark:text-neutral-dark-600">Loading heatmap…</div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xs border border-dashed border-neutral-300 bg-neutral-0 px-4 text-center dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
        <div className="mb-2 rounded-xs border border-brand-500/30 bg-brand-500/10 p-2 text-brand-500">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-dark-600">
          No live telemetry for {toTitleCaseLabel(componentType || "this category")}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200/80 px-3 py-2 dark:border-neutral-dark-300/65">
        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-dark-950">
          {section.typeLabel}
        </span>
        <span className="text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          {section.entries.length} components · {section.metrics.length} parameters
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {SCALE_LEGEND.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600"
            >
              <span className={`h-2.5 w-2.5 rounded-xs ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <MetricMatrix section={section} search={query} />
      </div>
    </div>
  );
};

export default PlantEquipmentHeatmapPanel;
