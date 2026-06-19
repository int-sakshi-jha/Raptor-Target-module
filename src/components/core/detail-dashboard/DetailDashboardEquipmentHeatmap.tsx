import React, { useMemo, useState } from "react";
import { Grid2X2, Info, LayoutGrid, X } from "lucide-react";
import { type EquipmentFilterComponentType, toTitleCaseLabel } from "@/utils/plantLiveFormatters";

export type EquipmentHeatmapRow = Record<string, unknown> & {
  id?: string;
  component_id?: string;
  component_code?: string;
  component_name?: string;
  component_type?: string;
  component_type_label?: string;
  block_name?: string | null;
  acdb_name?: string | null;
  inverter_name?: string | null;
  status?: string;
  timestamp?: string;
  dc_voltage?: unknown;
  dc_current?: unknown;
  dc_power?: unknown;
  dc_energy?: unknown;
  dc_capacity_kw?: unknown;
  ac_capacity_kw?: unknown;
  dc_generation_time?: unknown;
  power?: unknown;
};

interface HeatmapGroupingConfig {
  title: string;
  groupBy: keyof EquipmentHeatmapRow;
  secondaryGroupBy?: keyof EquipmentHeatmapRow;
}

export interface DetailDashboardEquipmentHeatmapProps {
  data: EquipmentHeatmapRow[];
  componentType?: EquipmentFilterComponentType;
}

type HeatmapGroup = {
  primary: string;
  secondary: string;
  components: EquipmentHeatmapRow[];
};

type TooltipState = {
  comp: EquipmentHeatmapRow;
  displayVal: string;
  visible: boolean;
};

const HEATMAP_METRICS = [
  {
    key: "power",
    label: "Power",
    aliases: ["dc_power", "dc_power_kw", "power", "act_power", "active_power", "power_kw", "kw"],
  },
  {
    key: "current",
    label: "Current",
    aliases: ["dc_current", "dc_i", "current", "line_current", "avg_current", "ir", "iy", "ib"],
  },
] as const;

const PERFORMANCE_BANDS = [
  { label: "0%", chip: "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30" },
  { label: "1-10%", chip: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30" },
  { label: "11-25%", chip: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30" },
  { label: "26-50%", chip: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30" },
  { label: "51-75%", chip: "bg-lime-500/10 text-lime-700 border-lime-500/20 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30" },
  { label: "76-100%", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30" },
] as const;

function getHeatmapGroupingConfig(componentType?: EquipmentFilterComponentType): HeatmapGroupingConfig {
  const normalizedType = (componentType || "").toLowerCase();
  if (normalizedType === "inverter" || normalizedType === "dc_channel" || normalizedType === "tracker" || normalizedType === "" || normalizedType === "all") {
    return { title: "Inverter Heatmap", groupBy: "inverter_name", secondaryGroupBy: "block_name" };
  }
  if (normalizedType === "acdb") return { title: "Inverter Heatmap", groupBy: "acdb_name", secondaryGroupBy: "block_name" };
  if (normalizedType === "block") return { title: "ACDB Heatmap", groupBy: "block_name" };
  if (normalizedType === "meter" || normalizedType === "mcr") return { title: "Meter Heatmap", groupBy: "component_type_label" };
  return { title: "Equipment Heatmap", groupBy: "component_type_label", secondaryGroupBy: "block_name" };
}

function filterRowsForComponentType(rows: EquipmentHeatmapRow[], componentType?: EquipmentFilterComponentType) {
  const normalizedType = (componentType || "").toLowerCase();
  if (!normalizedType || normalizedType === "all") return rows;
  if (normalizedType === "dc_channel" || normalizedType === "tracker" || normalizedType === "string") {
    return rows.filter((row) => { const type = String(row.component_type || "").toUpperCase(); return type === "DC" || type === "TRC" || type === "STR"; });
  }
  if (normalizedType === "inverter") return rows.filter((row) => String(row.component_type || "").toUpperCase() === "INV");
  if (normalizedType === "acdb") return rows.filter((row) => String(row.component_type || "").toUpperCase() === "AC");
  if (normalizedType === "block") return rows.filter((row) => String(row.component_type || "").toUpperCase() === "B");
  if (normalizedType === "meter" || normalizedType === "mcr") return rows.filter((row) => String(row.component_type || "").toUpperCase() === "M");
  return rows;
}

function getCellColor(value: number, max: number, disconnected = false) {
  const cellBase = "shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300";
  if (disconnected) return `${cellBase} bg-neutral-300/20 text-neutral-500 border-neutral-300/40 dark:bg-neutral-dark-300/30 dark:text-neutral-dark-600 dark:border-neutral-dark-400/40`;
  const ratio = calculatePerformanceRatio(value, max);
  if (ratio >= 0.76) return `${cellBase} bg-emerald-600/40 text-emerald-900 border-emerald-500/60 dark:bg-emerald-500/35 dark:text-emerald-100 dark:border-emerald-500/60`;
  if (ratio >= 0.51) return `${cellBase} bg-lime-500/40 text-lime-900 border-lime-500/60 dark:bg-lime-500/35 dark:text-lime-100 dark:border-lime-500/60`;
  if (ratio >= 0.26) return `${cellBase} bg-amber-400/40 text-amber-900 border-amber-500/60 dark:bg-amber-500/35 dark:text-amber-100 dark:border-amber-500/60`;
  if (ratio >= 0.11) return `${cellBase} bg-orange-500/40 text-orange-900 border-orange-500/60 dark:bg-orange-500/35 dark:text-orange-100 dark:border-orange-500/60`;
  if (ratio >= 0.01 || (value > 0 && max > 0)) return `${cellBase} bg-rose-500/40 text-rose-900 border-rose-500/60 dark:bg-rose-500/35 dark:text-rose-100 dark:border-rose-500/60`;
  return `${cellBase} bg-red-600/35 text-red-900 border-red-500/50 dark:bg-red-500/30 dark:text-red-200 dark:border-red-500/60`;
}

function extractNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (typeof value === "number") return value;
  if (typeof value === "string") { const parsed = Number(value.replace(/,/g, "").trim()); return Number.isNaN(parsed) ? Number.NaN : parsed; }
  if (Array.isArray(value)) { const valid = value.filter((item) => item !== null && item !== undefined && item !== ""); return valid.length > 0 ? extractNumber(valid[valid.length - 1]) : Number.NaN; }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if ("value" in source) return extractNumber(source.value);
    if ("val" in source) return extractNumber(source.val);
    const values = Object.values(source);
    return values.length > 0 ? extractNumber(values[values.length - 1]) : Number.NaN;
  }
  return Number.NaN;
}

function calculatePerformanceRatio(value: number, max: number): number {
  if (!max || Number.isNaN(value) || value <= 0) return 0;
  return value / max;
}

function formatTimestamp(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB");
}

function formatTextValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isDisconnected(row: EquipmentHeatmapRow) {
  const status = String(row.status ?? "").toLowerCase();
  return status === "offline" || status === "error" || status === "fault";
}

function resolveMetricValue(row: EquipmentHeatmapRow, metricKey: string) {
  const metric = HEATMAP_METRICS.find((item) => item.key === metricKey);
  const candidates = metric?.aliases ?? [metricKey];
  let fallback = Number.NaN;
  for (const candidate of candidates) {
    const value = row[candidate];
    const parsed = extractNumber(value);
    if (!Number.isNaN(parsed)) { if (parsed > 0) return parsed; if (Number.isNaN(fallback)) fallback = parsed; }
  }
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    const foundKey = rowKeys.find((k) => k.toLowerCase() === lowerCandidate);
    if (foundKey) {
      const parsed = extractNumber(row[foundKey]);
      if (!Number.isNaN(parsed)) { if (parsed > 0) return parsed; if (Number.isNaN(fallback)) fallback = parsed; }
    }
  }
  return fallback;
}

const TooltipField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-dark-600">{label}</div>
    <div className="text-[15px] font-semibold leading-tight text-neutral-900 dark:text-neutral-dark-950">{value}</div>
  </div>
);

function getTooltipValue(row: EquipmentHeatmapRow, key: string, digits = 2) {
  const value = row[key];
  const parsed = extractNumber(value);
  if (!Number.isNaN(parsed)) {
    const lowerKey = key.toLowerCase();
    let unit = "";
    if (lowerKey.includes("voltage") || lowerKey.includes("_v") || lowerKey === "v") unit = "V";
    else if (lowerKey.includes("current") || lowerKey.includes("_i") || lowerKey === "i") unit = "A";
    else if (lowerKey.includes("power") || lowerKey.includes("kw")) unit = "kW";
    else if (lowerKey.includes("energy")) unit = "kWh";
    else if (lowerKey.includes("frequency") || lowerKey === "hz") unit = "Hz";
    else if (lowerKey.includes("temp") || lowerKey === "temperature") unit = "°C";
    else if (lowerKey.includes("time") || lowerKey.includes("minute")) unit = "min";
    return `${parsed.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
  }
  return String(value ?? "-");
}

const SYSTEM_KEYS = new Set([
  "id", "component_id", "component_code", "component_name", "component_type", "component_type_label",
  "device_id", "device_name", "block_id", "block_name", "acdb_id", "acdb_name", "inverter_id",
  "inverter_name", "timestamp", "last_communication_at", "communication_status", "status", "health",
  "meter_type", "connected",
]);

export const DetailDashboardEquipmentHeatmap: React.FC<DetailDashboardEquipmentHeatmapProps> = ({ data, componentType }) => {
  const availableMetrics = useMemo(() => HEATMAP_METRICS.map((m) => ({ key: m.key, label: m.label })), []);
  const [selectedMetric, setSelectedMetric] = useState<string>("power");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const activeMetric = availableMetrics.find((m) => m.key === selectedMetric) ?? availableMetrics[0] ?? null;
  const activeMetricKey = activeMetric?.key ?? "power";

  const groupingConfig = useMemo(() => getHeatmapGroupingConfig(componentType), [componentType]);
  const visibleRows = useMemo(() => filterRowsForComponentType(data, componentType), [componentType, data]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, HeatmapGroup>();
    for (const row of visibleRows) {
      const primary = String(row[groupingConfig.groupBy] || row.component_type_label || "Other");
      const secondary = groupingConfig.secondaryGroupBy ? String(row[groupingConfig.secondaryGroupBy] || "") : "";
      const key = `${primary}-${secondary}`;
      if (!groups.has(key)) groups.set(key, { primary, secondary, components: [] });
      groups.get(key)?.components.push(row);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const numA = parseInt(a.primary.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.primary.replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.primary.localeCompare(b.primary);
    });
  }, [groupingConfig, visibleRows]);

  const maxCols = useMemo(() => Math.max(0, ...groupedData.map((g) => g.components.length)), [groupedData]);
  const columnHeaders = useMemo(() => Array.from({ length: maxCols }, (_, i) => `${i + 1}`), [maxCols]);

  const matrixSizing = useMemo(() => {
  if (maxCols >= 18) return { labelWidth: 120, colWidth: 36, cellHeight: 28 };
  if (maxCols >= 12) return { labelWidth: 126, colWidth: 42, cellHeight: 30 };
  if (maxCols >= 8)  return { labelWidth: 130, colWidth: 48, cellHeight: 34 };
  if (maxCols >= 4)  return { labelWidth: 134, colWidth: 56, cellHeight: 38 };
  return             { labelWidth: 138, colWidth: 56, cellHeight: 38 }; // ← was 96/62
}, [maxCols]);


  const maxValue = useMemo(() => {
    let max = 0;
    for (const group of groupedData) for (const comp of group.components) {
      const value = resolveMetricValue(comp, activeMetricKey);
      if (!Number.isNaN(value) && value > max) max = value;
    }
    return max;
  }, [activeMetricKey, groupedData]);

  if (visibleRows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100 px-4 text-center">
        <div className="mb-3 rounded-sm border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
          <LayoutGrid className="h-7 w-7 text-brand-500 dark:text-brand-400" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">Connecting heatmap</h3>
        <p className="mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-dark-600">
          Waiting for live equipment telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
      {/* ── Header – compact, matching other StatSection headers ── */}
      <div className="border-b border-neutral-200/90 px-4 py-3 dark:border-neutral-dark-300/65">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Grid2X2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {groupingConfig.title}
            </h3>
            <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              Component generation matrix by selected type.
            </p>
          </div>
        </div>

        {/* Metric switcher + performance scale */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="hide-scrollbar flex overflow-x-auto rounded-xs border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-dark-300 dark:bg-neutral-dark-200/80">
            {availableMetrics.map((metric) => {
              const active = activeMetricKey === metric.key;
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`shrink-0 rounded-xs px-2.5 py-1 text-xs font-semibold transition-all ${active ? "bg-brand-500 text-white shadow-sm dark:bg-brand-500" : "text-neutral-600 hover:bg-white hover:text-neutral-900 dark:text-neutral-dark-700 dark:hover:bg-neutral-dark-100 dark:hover:text-neutral-dark-950"}`}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PERFORMANCE_BANDS.map((band) => (
              <span key={band.label} className={`rounded-xs border px-1.5 py-0.5 text-[10px] font-semibold ${band.chip}`}>
                {band.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable matrix ── */}
      <div className="min-h-0 flex-1 overflow-scroll bg-neutral-50/70 p-3 dark:bg-neutral-dark-50/40">
        {groupedData.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-sm border border-dashed border-neutral-300 bg-white/70 text-sm text-neutral-500 dark:border-neutral-dark-300 dark:bg-neutral-dark-100/70 dark:text-neutral-dark-600">
            No components match the current filter.
          </div>
        ) : (
          <div className="min-w-fit rounded-sm border border-neutral-200 bg-white shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
            <div
              className="grid border-b border-neutral-200/60 bg-neutral-50 dark:border-white/5 dark:bg-neutral-dark-200"
              style={{ gridTemplateColumns: `${matrixSizing.labelWidth}px repeat(${Math.max(maxCols, 1)}, ${matrixSizing.colWidth}px)` }}
            >
              <div className="border-r border-neutral-200 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:border-neutral-dark-200 dark:text-neutral-dark-600">
                Equipment
              </div>
              {columnHeaders.length > 0 ? (
                columnHeaders.map((header) => (
                  <div key={header} className="border-r border-neutral-200 px-0.5 py-1 text-center text-[8px] font-semibold text-neutral-500 last:border-r-0 dark:border-neutral-dark-200 dark:text-neutral-dark-600">
                    {header}
                  </div>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-dark-600">No channels</div>
              )}
            </div>

            {groupedData.map((group, idx) => (
              <div
                key={`${group.primary}-${group.secondary}-${idx}`}
                className="grid border-b border-neutral-200 last:border-b-0 dark:border-neutral-dark-200"
                style={{ gridTemplateColumns: `${matrixSizing.labelWidth}px repeat(${Math.max(maxCols, 1)}, ${matrixSizing.colWidth}px)` }}
              >
                <div className="border-r border-neutral-200/60 bg-neutral-50 px-2 py-1.5 dark:border-white/5 dark:bg-neutral-dark-200/20">
                  <div className="truncate text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950" title={group.primary}>{group.primary}</div>
                  {group.secondary ? (
                    <div className="mt-0.5 truncate text-[9px] text-neutral-500 dark:text-neutral-dark-600" title={group.secondary}>{group.secondary}</div>
                  ) : null}
                </div>

                {Array.from({ length: Math.max(maxCols, 1) }, (_, index) => {
                  const comp = group.components[index];
                  if (!comp) {
                    return (
                      <div key={`empty-${group.primary}-${index}`} className="border-r border-neutral-200 bg-neutral-50/60 px-0.5 py-0.5 last:border-r-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/30" />
                    );
                  }
                  const value = resolveMetricValue(comp, activeMetricKey);
                  const displayVal = !Number.isNaN(value) ? value.toFixed(2) : "0.00";
                  const disconnected = isDisconnected(comp);
                  const bgColor = getCellColor(value, maxValue, disconnected);
                  return (
                    <div key={String(comp.id ?? `${group.primary}-${index}`)} className="border-r border-b border-neutral-200/30 p-[1px] dark:border-white/5 last:border-r-0">
                      <button
                        type="button"
                        onClick={() => setTooltip({ comp, displayVal, visible: true })}
                        className={`group/cell relative h-full w-full rounded-[2px] border transition-all duration-300 hover:z-10 hover:scale-[1.08] hover:shadow-xl ${bgColor}`}
                        style={{ minHeight: `${matrixSizing.cellHeight - 2}px` }}
                      >
                        {disconnected ? (
                          <div className="flex flex-col items-center justify-center text-center leading-tight">
                            <span className="text-[5px] font-semibold uppercase opacity-60">Not</span>
                            <span className="text-[5px] font-semibold uppercase opacity-60">Connected</span>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center">
                            <span className="font-mono text-[10px] font-bold leading-none tracking-tight">{displayVal}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tooltip modal (unchanged from EquipmentHeatmap) ── */}
      {tooltip ? (
        <>
          <div
            className={`fixed inset-0 z-[90] bg-black/40 transition-opacity duration-300 ${tooltip.visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={() => setTooltip(null)}
          />
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${tooltip.visible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <div className="pointer-events-auto w-full max-w-[540px] overflow-hidden rounded-[24px] border border-neutral-300 bg-white shadow-2xl dark:border-neutral-dark-300 dark:bg-[#343434]">
              <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4 dark:border-white/10 dark:bg-transparent">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-brand-50 p-2 text-brand-600 dark:bg-[#4a2c16] dark:text-[#ff8d38]">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[18px] font-semibold text-neutral-900 dark:text-white">Channel Details</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-300">Live telemetry snapshot</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTooltip(null)}
                  className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 px-5 py-5">
                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                    <TooltipField label="Channel" value={formatTextValue(tooltip.comp.component_code ?? tooltip.comp.component_id ?? tooltip.comp.id ?? tooltip.comp.component_name)} />
                    <TooltipField label="Name" value={formatTextValue(tooltip.comp.component_name)} />
                    {Object.keys(tooltip.comp)
                      .filter((key) => !SYSTEM_KEYS.has(key))
                      .map((key) => (
                        <TooltipField key={key} label={toTitleCaseLabel(key)} value={getTooltipValue(tooltip.comp, key)} />
                      ))}
                  </div>
                </div>
                <div className="border-t border-neutral-200 pt-4 dark:border-white/10">
                  <TooltipField label="TimeStamp" value={formatTimestamp(tooltip.comp.timestamp)} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DetailDashboardEquipmentHeatmap;
