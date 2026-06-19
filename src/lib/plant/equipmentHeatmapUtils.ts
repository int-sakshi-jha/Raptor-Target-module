import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  resolveEquipmentViewFromCode,
  toTitleCaseLabel,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";

export type EquipmentHeatmapRow = Record<string, unknown> & {
  id?: string;
  component_id?: string;
  component_name?: string;
  component_type?: string;
  block_name?: string | null;
  acdb_name?: string | null;
  inverter_name?: string | null;
  tracker_index?: number;
  status?: string;
  timestamp?: string;
};

const INDEXED_FIELD_PATTERN = /^(.+?)(\d+)$/i;

const SKIP_INDEXED_BASES = new Set([
  "timestamp",
  "timestamps",
  "time",
  "time_stamp",
  "datetime",
  "date_time",
  "index",
]);

const SYSTEM_KEYS = new Set([
  "id",
  "component_id",
  "component_code",
  "component_name",
  "component_type",
  "component_type_label",
  "device_id",
  "device_name",
  "block_id",
  "block_name",
  "acdb_id",
  "acdb_name",
  "inverter_id",
  "inverter_name",
  "timestamp",
  "last_communication_at",
  "communication_status",
  "status",
  "health",
  "meter_type",
  "connected",
  "tracker_index",
  "tracker_name",
]);

export interface HeatmapMetricOption {
  key: string;
  label: string;
}

export interface HeatmapCell {
  index: number;
  label: string;
  row: EquipmentHeatmapRow;
}

export interface HeatmapGroup {
  label: string;
  secondary: string;
  cells: HeatmapCell[];
  columnCount: number;
}

export function extractNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }
  if (Array.isArray(value)) {
    const valid = value.filter((item) => item != null && item !== "");
    return valid.length > 0 ? extractNumber(valid[valid.length - 1]) : Number.NaN;
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if ("value" in source) return extractNumber(source.value);
    if ("val" in source) return extractNumber(source.val);
  }
  return Number.NaN;
}

function isNumericFieldValue(value: unknown): boolean {
  return !Number.isNaN(extractNumber(value));
}

function readRowField(row: EquipmentHeatmapRow, key: string): unknown {
  if (key in row) return row[key];
  const lower = key.toLowerCase();
  const found = Object.keys(row).find((candidate) => candidate.toLowerCase() === lower);
  return found ? row[found] : undefined;
}

export function resolveComponentIdentifier(
  row: EquipmentHeatmapRow,
  meta?: PlantComponentRow | null,
): number {
  const fromMeta =
    meta?.identifier ??
    (meta as { identifier?: number | null } | undefined)?.identifier ??
    meta?.channels;
  if (fromMeta != null && Number(fromMeta) > 0) {
    return Math.floor(Number(fromMeta));
  }

  let maxIndex = 0;
  for (const key of Object.keys(row)) {
    const match = key.match(INDEXED_FIELD_PATTERN);
    if (!match || SKIP_INDEXED_BASES.has(match[1].toLowerCase())) continue;
    const index = parseInt(match[2], 10);
    if (Number.isFinite(index)) maxIndex = Math.max(maxIndex, index);
  }

  const trackerIndex = row.tracker_index;
  if (typeof trackerIndex === "number" && trackerIndex > maxIndex) {
    maxIndex = trackerIndex;
  }

  return maxIndex;
}

function parseIndexedFieldMap(row: EquipmentHeatmapRow): Map<number, Record<string, unknown>> {
  const byIndex = new Map<number, Record<string, unknown>>();

  for (const [key, value] of Object.entries(row)) {
    const match = key.match(INDEXED_FIELD_PATTERN);
    if (!match) continue;

    const base = match[1];
    if (SKIP_INDEXED_BASES.has(base.toLowerCase())) continue;

    const index = parseInt(match[2], 10);
    if (!Number.isFinite(index) || index < 1) continue;

    const bucket = byIndex.get(index) ?? {};
    bucket[base] = value;
    bucket[key] = value;
    byIndex.set(index, bucket);
  }

  return byIndex;
}

function rowHasIndexedFields(row: EquipmentHeatmapRow): boolean {
  return Object.keys(row).some((key) => {
    const match = key.match(INDEXED_FIELD_PATTERN);
    return match && !SKIP_INDEXED_BASES.has(match[1].toLowerCase());
  });
}

export function discoverHeatmapMetrics(rows: EquipmentHeatmapRow[]): HeatmapMetricOption[] {
  const metricKeys = new Set<string>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (SYSTEM_KEYS.has(key)) continue;

      const match = key.match(INDEXED_FIELD_PATTERN);
      const metricKey = match ? match[1] : key;
      if (SKIP_INDEXED_BASES.has(metricKey.toLowerCase())) continue;
      if (!isNumericFieldValue(value)) continue;

      metricKeys.add(metricKey);
    }
  }

  return Array.from(metricKeys)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, label: toTitleCaseLabel(key) }));
}

export function resolveHeatmapMetricValue(
  row: EquipmentHeatmapRow,
  metricKey: string,
  index?: number,
): number {
  if (index != null) {
    const candidates = [`${metricKey}${index}`, `${metricKey}_${index}`];
    for (const candidate of candidates) {
      const parsed = extractNumber(readRowField(row, candidate));
      if (!Number.isNaN(parsed)) return parsed;
    }
    const indexed = parseIndexedFieldMap(row).get(index);
    if (indexed) {
      const parsed = extractNumber(indexed[metricKey]);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  const direct = extractNumber(readRowField(row, metricKey));
  if (!Number.isNaN(direct)) return direct;

  const rowKeys = Object.keys(row);
  const lowerMetric = metricKey.toLowerCase();
  const foundKey = rowKeys.find((key) => {
    if (key.toLowerCase() === lowerMetric) return true;
    const match = key.match(INDEXED_FIELD_PATTERN);
    return match?.[1].toLowerCase() === lowerMetric;
  });
  if (foundKey) return extractNumber(row[foundKey]);

  return Number.NaN;
}

function usesIndexedLayout(
  componentType: EquipmentFilterComponentType | undefined,
  rows: EquipmentHeatmapRow[],
): boolean {
  const normalized = String(componentType ?? "").toLowerCase();
  if (normalized === "dc_channel" || normalized === "tracker") return true;
  return rows.some((row) => rowHasIndexedFields(row) || row.tracker_index != null);
}

function resolveGroupKeys(
  row: EquipmentHeatmapRow,
  componentType: EquipmentFilterComponentType | undefined,
): { primary: string; secondary: string } {
  const normalized = String(componentType ?? "").toLowerCase();

  if (normalized === "tracker") {
    return {
      primary: String(row.block_name || row.component_name || "Block"),
      secondary: String(row.component_name || ""),
    };
  }

  if (normalized === "dc_channel") {
    return {
      primary: String(row.inverter_name || row.component_name || "Inverter"),
      secondary: String(row.block_name || ""),
    };
  }

  if (normalized === "inverter") {
    return {
      primary: String(row.acdb_name || row.block_name || row.component_name || "Inverter"),
      secondary: String(row.block_name || ""),
    };
  }

  if (normalized === "acdb") {
    return {
      primary: String(row.block_name || row.component_name || "ACDB"),
      secondary: "",
    };
  }

  if (normalized === "block") {
    return {
      primary: String(row.block_name || row.component_name || "Block"),
      secondary: "",
    };
  }

  return {
    primary: String(row.component_name || row.component_id || "Equipment"),
    secondary: String(row.block_name || row.inverter_name || ""),
  };
}

function filterRowsForComponentType(
  rows: EquipmentHeatmapRow[],
  componentType?: EquipmentFilterComponentType,
): EquipmentHeatmapRow[] {
  const normalized = String(componentType ?? "").toLowerCase();
  if (!normalized || normalized === "all") return rows;

  return rows.filter((row) => {
    const type = resolveEquipmentViewFromCode(String(row.component_type ?? ""));
    if (normalized === "dc_channel") {
      return type === "dc_channel";
    }
    if (normalized === "tracker") {
      return type === "tracker" || row.tracker_index != null;
    }
    return type === normalized;
  });
}

function buildIndexedCells(
  row: EquipmentHeatmapRow,
  meta: PlantComponentRow | undefined,
  componentType: EquipmentFilterComponentType | undefined,
): HeatmapCell[] {
  const trackerIndex = row.tracker_index;
  if (typeof trackerIndex === "number" && trackerIndex > 0) {
    return [
      {
        index: trackerIndex,
        label: String(row.tracker_name || row.component_name || `T${trackerIndex}`),
        row,
      },
    ];
  }

  const count = resolveComponentIdentifier(row, meta);
  if (count <= 0 || !rowHasIndexedFields(row)) {
    return [
      {
        index: 1,
        label: String(row.component_name || row.component_id || "1"),
        row,
      },
    ];
  }

  const indexed = parseIndexedFieldMap(row);
  return Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    const indexedFields = indexed.get(index) ?? {};
    return {
      index,
      label: `${index}`,
      row: { ...row, ...indexedFields },
    };
  });
}

export function buildHeatmapGroups(args: {
  rows: EquipmentHeatmapRow[];
  componentType?: EquipmentFilterComponentType;
  componentById?: ReadonlyMap<string, PlantComponentRow>;
}): HeatmapGroup[] {
  const { rows, componentType, componentById } = args;
  const visibleRows = filterRowsForComponentType(rows, componentType);
  const indexedLayout = usesIndexedLayout(componentType, visibleRows);
  const groups = new Map<string, HeatmapGroup>();

  for (const row of visibleRows) {
    const componentId = String(row.component_id ?? row.id ?? "");
    const meta = componentById?.get(componentId);
    const { primary, secondary } = resolveGroupKeys(row, componentType);
    const key = `${primary}::${secondary}`;

    if (!groups.has(key)) {
      groups.set(key, { label: primary, secondary, cells: [], columnCount: 0 });
    }

    const group = groups.get(key)!;
    const cells = indexedLayout
      ? buildIndexedCells(row, meta, componentType)
      : [
          {
            index: group.cells.length + 1,
            label: String(row.component_name || row.component_id || group.cells.length + 1),
            row,
          },
        ];

    for (const cell of cells) {
      const existing = group.cells.find((item) => item.index === cell.index);
      if (existing) {
        existing.row = { ...existing.row, ...cell.row };
        continue;
      }
      group.cells.push(cell);
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      group.cells.sort((a, b) => a.index - b.index);
      group.columnCount = group.cells.reduce((max, cell) => Math.max(max, cell.index), 0);
      return group;
    })
    .sort((a, b) => {
      const numA = parseInt(a.label.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.label.replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.label.localeCompare(b.label);
    });
}

export function getHeatmapMaxColumns(groups: HeatmapGroup[]): number {
  return Math.max(1, ...groups.map((group) => group.columnCount || group.cells.length));
}

export type HeatmapCellState = "empty" | "zero" | "offline" | "value";

export function resolveHeatmapCellState(
  value: number,
  disconnected = false,
): HeatmapCellState {
  if (disconnected) return "offline";
  if (Number.isNaN(value)) return "empty";
  if (value === 0) return "zero";
  return "value";
}

export function colorForHeatmapRatio(ratio: number, disconnected = false): string {
  if (disconnected) return colorForHeatmapCellState("offline");
  if (!Number.isFinite(ratio) || ratio <= 0) return colorForHeatmapCellState("zero");
  return colorForHeatmapCellState("value", ratio);
}

export function colorForHeatmapCellState(
  state: HeatmapCellState,
  ratio = 0,
): string {
  if (state === "offline") {
    return "border-neutral-400/30 bg-neutral-500/20 text-neutral-500 dark:border-neutral-dark-400/30 dark:bg-neutral-dark-400/20 dark:text-neutral-dark-600";
  }
  if (state === "empty") {
    return "border-neutral-200/40 bg-neutral-100/30 text-transparent dark:border-neutral-dark-400/25 dark:bg-neutral-dark-300/15";
  }
  if (state === "zero") {
    return "border-neutral-300/35 bg-neutral-200/50 text-neutral-400 dark:border-neutral-dark-400/30 dark:bg-neutral-dark-400/25 dark:text-neutral-dark-600";
  }

  if (ratio >= 0.76) {
    return "border-emerald-500/50 bg-emerald-500/85 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]";
  }
  if (ratio >= 0.51) {
    return "border-lime-500/50 bg-lime-600/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
  }
  if (ratio >= 0.26) {
    return "border-amber-500/50 bg-amber-500/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
  }
  return "border-orange-500/50 bg-orange-600/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
}

export function isHeatmapDisconnected(row: EquipmentHeatmapRow): boolean {
  const status = String(row.status ?? row.communication_status ?? "").toLowerCase();
  return ["offline", "error", "fault", "disconnected"].includes(status);
}

export function formatHeatmapValue(value: number): string {
  if (Number.isNaN(value)) return "-";
  const precision = Math.abs(value) >= 100 ? 0 : 1;
  return value.toFixed(precision);
}

export const HEATMAP_MAX_ROWS_PER_SECTION = 120;
export const HEATMAP_INITIAL_ROWS = 50;

export interface ComponentMetricEntry {
  id: string;
  label: string;
  secondary: string;
  row: EquipmentHeatmapRow;
}

export interface ComponentMetricSection {
  componentType: EquipmentFilterComponentType;
  typeLabel: string;
  metrics: HeatmapMetricOption[];
  entries: ComponentMetricEntry[];
  columnMax: Record<string, number>;
}

export function groupRowsByEquipmentType(
  rows: EquipmentHeatmapRow[],
): Map<EquipmentFilterComponentType, EquipmentHeatmapRow[]> {
  const grouped = new Map<EquipmentFilterComponentType, EquipmentHeatmapRow[]>();

  for (const row of rows) {
    const type =
      row.tracker_index != null
        ? "tracker"
        : resolveEquipmentViewFromCode(String(row.component_type ?? ""));
    if (!type) continue;

    const bucket = grouped.get(type) ?? [];
    bucket.push(row);
    grouped.set(type, bucket);
  }

  return grouped;
}

export function flattenToComponentEntries(args: {
  rows: EquipmentHeatmapRow[];
  componentType: EquipmentFilterComponentType;
  componentById?: ReadonlyMap<string, PlantComponentRow>;
}): ComponentMetricEntry[] {
  const { rows, componentType, componentById } = args;
  const visibleRows = filterRowsForComponentType(rows, componentType);
  if (visibleRows.length === 0) return [];

  const indexedLayout = usesIndexedLayout(componentType, visibleRows);
  const entries: ComponentMetricEntry[] = [];

  if (
    indexedLayout &&
    (componentType === "dc_channel" || componentType === "tracker")
  ) {
    const groups = buildHeatmapGroups({ rows: visibleRows, componentType, componentById });
    for (const group of groups) {
      for (const cell of group.cells) {
        entries.push({
          id: `${group.label}::${cell.index}::${cell.row.component_id ?? cell.row.id ?? entries.length}`,
          label:
            componentType === "tracker"
              ? `${group.label} · T${cell.index}`
              : `${group.label} · ${cell.index}`,
          secondary: group.secondary,
          row: cell.row,
        });
      }
    }
    return entries;
  }

  for (const row of visibleRows) {
    entries.push({
      id: String(row.component_id ?? row.id ?? `row-${entries.length}`),
      label: String(row.component_name ?? row.component_id ?? "Component"),
      secondary: String(row.block_name ?? row.inverter_name ?? row.acdb_name ?? ""),
      row,
    });
  }

  return entries;
}

export function buildComponentMetricSection(args: {
  rows: EquipmentHeatmapRow[];
  componentType: EquipmentFilterComponentType;
  componentById?: ReadonlyMap<string, PlantComponentRow>;
}): ComponentMetricSection | null {
  const { rows, componentType, componentById } = args;
  const entries = flattenToComponentEntries({ rows, componentType, componentById });
  if (entries.length === 0) return null;

  const metrics = discoverHeatmapMetrics(entries.map((entry) => entry.row));
  if (metrics.length === 0) return null;

  const columnMax: Record<string, number> = {};
  for (const metric of metrics) {
    let max = 0;
    for (const entry of entries) {
      const value = resolveHeatmapMetricValue(
        entry.row,
        metric.key,
        entry.row.tracker_index ?? undefined,
      );
      if (!Number.isNaN(value) && value > max) max = value;
    }
    columnMax[metric.key] = max;
  }

  return {
    componentType,
    typeLabel: toTitleCaseLabel(componentType),
    metrics,
    entries,
    columnMax,
  };
}

export function buildPlantHeatmapSections(args: {
  rows: EquipmentHeatmapRow[];
  componentTypes: readonly EquipmentFilterComponentType[];
  componentById?: ReadonlyMap<string, PlantComponentRow>;
}): ComponentMetricSection[] {
  const { rows, componentTypes, componentById } = args;
  const sections: ComponentMetricSection[] = [];

  for (const componentType of componentTypes) {
    const section = buildComponentMetricSection({
      rows,
      componentType,
      componentById,
    });
    if (section) sections.push(section);
  }

  return sections;
}
