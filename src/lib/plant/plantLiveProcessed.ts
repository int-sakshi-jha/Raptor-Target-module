import type { PlantLiveIndex, ComponentLiveEntry } from "@/lib/plant/plantLiveIndex";
import {
  extractLastDataMap,
  getLastNumericValue,
  toNumericArray,
  toValueArray,
} from "@/lib/plant/componentLiveData";

const INDEXED_FIELD_PATTERN = /^(.+?)(\d+)$/i;

const TIMESTAMP_FIELD_NAMES = new Set([
  "timestamp",
  "timestamps",
  "time",
  "time_stamp",
  "datetime",
  "date_time",
]);

const SKIP_INDEXED_FIELD_BASES = new Set([
  "timestamp",
  "timestamps",
  "time",
  "time_stamp",
  "datetime",
  "date_time",
]);

/** Full day at 15-minute intervals: 96 slots (00:00 → 23:45). */
export const TRACKER_DAY_SLOT_COUNT = 96;
export const TRACKER_SLOT_INTERVAL_MS = 15 * 60 * 1000;

export interface TrackerTimePoint {
  timestamp: number;
  label: string;
}

export interface TrackerChartSeries {
  trackerIndex: number;
  trackerName: string;
  actual: (number | null)[];
  projected: (number | null)[];
  deviation: (number | null)[];
}

export interface TrackerTableRow {
  id: string;
  tracker_index: number;
  tracker_name: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface TrackerIndexedTelemetry {
  anchorIso: string;
  deviceTimestamp: string;
  lastDataAt: string;
  communicationStatus: string;
  pointCount: number;
  timePoints: TrackerTimePoint[];
  fieldKeys: string[];
  tableRows: TrackerTableRow[];
  chartSeries: TrackerChartSeries[];
}

/** Per-component MQTT payload processed once on each message. */
export interface ComponentLiveProcessed {
  componentId: string;
  lastFields: Record<string, unknown>;
  tracker: TrackerIndexedTelemetry | null;
}

export type PlantProcessedByComponent = ReadonlyMap<string, ComponentLiveProcessed>;

function parseTimestampValue(value: unknown, anchorDate: Date): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const parts = raw.split(":").map((part) => parseInt(part, 10));
    const hh = parts[0] ?? 0;
    const mm = parts[1] ?? 0;
    const ss = parts[2] ?? 0;
    const date = new Date(anchorDate);
    date.setHours(hh, mm, ss, 0);
    return date.getTime();
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isTimestampFieldKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return TIMESTAMP_FIELD_NAMES.has(normalized) || normalized.includes("timestamp");
}

function buildInferredTimePoints(anchorMs: number, pointCount: number): TrackerTimePoint[] {
  if (pointCount <= 0) return [];
  if (pointCount === 1) {
    return [{ timestamp: anchorMs, label: formatTimeLabel(anchorMs) }];
  }

  const maxSpanMs = 12 * 60 * 60_000;
  const minStepMs = 60_000;
  const spanMs = Math.min(
    maxSpanMs,
    Math.max(minStepMs * (pointCount - 1), 5 * 60_000 * (pointCount - 1)),
  );
  const start = anchorMs - spanMs;

  return Array.from({ length: pointCount }, (_, index) => {
    const timestamp = start + (index / (pointCount - 1)) * spanMs;
    return { timestamp, label: formatTimeLabel(timestamp) };
  });
}

function normalizeTimePoints(
  points: TrackerTimePoint[],
  anchorMs: number,
  pointCount: number,
): TrackerTimePoint[] {
  if (points.length !== pointCount) return buildInferredTimePoints(anchorMs, pointCount);

  const uniqueTimestamps = new Set(points.map((point) => point.timestamp));
  if (uniqueTimestamps.size <= 1) {
    return buildInferredTimePoints(anchorMs, pointCount);
  }

  return points;
}

function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function buildFixedDayGrid(anchorDate: Date): TrackerTimePoint[] {
  const dayStart = new Date(anchorDate);
  dayStart.setHours(0, 0, 0, 0);
  const startMs = dayStart.getTime();

  return Array.from({ length: TRACKER_DAY_SLOT_COUNT }, (_, index) => {
    const timestamp = startMs + index * TRACKER_SLOT_INTERVAL_MS;
    return { timestamp, label: formatTimeLabel(timestamp) };
  });
}

function slotIndexForTimestamp(timestamp: number, dayStartMs: number): number {
  const index = Math.round((timestamp - dayStartMs) / TRACKER_SLOT_INTERVAL_MS);
  return Math.max(0, Math.min(TRACKER_DAY_SLOT_COUNT - 1, index));
}

/** Map MQTT array values onto the fixed 96-slot day grid. */
export function resampleToDayGrid(
  sourceTimePoints: TrackerTimePoint[],
  values: (number | null)[],
  dayGrid: TrackerTimePoint[],
): (number | null)[] {
  const result: (number | null)[] = Array(TRACKER_DAY_SLOT_COUNT).fill(null);
  const dayStartMs = dayGrid[0]?.timestamp ?? 0;
  const valueCount = values.length;
  if (valueCount === 0) return result;

  for (let i = 0; i < valueCount; i += 1) {
    const value = values[i];
    if (value == null) continue;

    let slotIndex: number;
    const sourceTs = sourceTimePoints[i]?.timestamp;
    if (sourceTs != null && Number.isFinite(sourceTs)) {
      slotIndex = slotIndexForTimestamp(sourceTs, dayStartMs);
    } else {
      slotIndex =
        valueCount <= 1 ? 0 : Math.round((i / (valueCount - 1)) * (TRACKER_DAY_SLOT_COUNT - 1));
    }

    result[slotIndex] = value;
  }

  return result;
}

function resolveTimePoints(args: {
  processedData: Record<string, unknown>;
  anchorIso: string;
  pointCount: number;
}): TrackerTimePoint[] {
  const { processedData, anchorIso, pointCount } = args;
  if (pointCount <= 0) return [];

  const anchorDate = new Date(anchorIso);
  const anchorMs = Number.isFinite(anchorDate.getTime()) ? anchorDate.getTime() : Date.now();

  for (const [key, value] of Object.entries(processedData)) {
    if (INDEXED_FIELD_PATTERN.test(key)) continue;
    if (!isTimestampFieldKey(key)) continue;

    const values = toValueArray(value);
    if (values.length !== pointCount) continue;

    const points = values
      .map((item) => {
        const ms = parseTimestampValue(item, anchorDate);
        if (ms === null) return null;
        return { timestamp: ms, label: formatTimeLabel(ms) };
      })
      .filter((point): point is TrackerTimePoint => point !== null);

    if (points.length === pointCount) {
      return normalizeTimePoints(points, anchorMs, pointCount);
    }
  }

  return buildInferredTimePoints(anchorMs, pointCount);
}

function parseIndexedSeries(processedData: Record<string, unknown>): {
  trackerIndices: number[];
  seriesByTracker: Map<number, Map<string, (number | null)[]>>;
  fieldKeys: Set<string>;
  pointCount: number;
} {
  const seriesByTracker = new Map<number, Map<string, (number | null)[]>>();
  const fieldKeys = new Set<string>();
  let pointCount = 0;

  for (const [key, rawValue] of Object.entries(processedData)) {
    const match = key.match(INDEXED_FIELD_PATTERN);
    if (!match) continue;

    const fieldBase = match[1];
    if (SKIP_INDEXED_FIELD_BASES.has(fieldBase.toLowerCase())) continue;

    const trackerIndex = parseInt(match[2], 10);
    if (!Number.isFinite(trackerIndex)) continue;

    const values = toNumericArray(rawValue);
    if (values.length === 0) continue;

    pointCount = Math.max(pointCount, values.length);
    fieldKeys.add(fieldBase);

    const trackerSeries = seriesByTracker.get(trackerIndex) ?? new Map();
    trackerSeries.set(fieldBase, values);
    seriesByTracker.set(trackerIndex, trackerSeries);
  }

  const trackerIndices = Array.from(seriesByTracker.keys()).sort((a, b) => a - b);
  return { trackerIndices, seriesByTracker, fieldKeys, pointCount };
}

function buildTrackerTelemetry(
  entry: ComponentLiveEntry,
  componentId: string,
  processedData: Record<string, unknown>,
): TrackerIndexedTelemetry | null {
  const { trackerIndices, seriesByTracker, fieldKeys, pointCount } =
    parseIndexedSeries(processedData);

  if (trackerIndices.length === 0 || pointCount === 0) return null;

  const anchorIso =
    entry.component.last_data_at || entry.device.timestamp || new Date().toISOString();
  const anchorDate = new Date(anchorIso);
  const sourceTimePoints = resolveTimePoints({ processedData, anchorIso, pointCount });
  const dayGrid = buildFixedDayGrid(
    Number.isFinite(anchorDate.getTime()) ? anchorDate : new Date(),
  );

  const tableRows: TrackerTableRow[] = trackerIndices.map((trackerIndex) => {
    const fields = seriesByTracker.get(trackerIndex) ?? new Map();
    const row: TrackerTableRow = {
      id: `${componentId}:tracker:${trackerIndex}`,
      tracker_index: trackerIndex,
      tracker_name: `Tracker ${trackerIndex}`,
      timestamp: anchorIso,
    };

    fields.forEach((values, fieldBase) => {
      row[fieldBase] = getLastNumericValue(values);
    });

    return row;
  });

  const chartSeries: TrackerChartSeries[] = trackerIndices.map((trackerIndex) => {
    const fields = seriesByTracker.get(trackerIndex) ?? new Map();
    const pick = (patterns: string[]) => {
      for (const pattern of patterns) {
        const values = fields.get(pattern);
        if (values?.length) return values;
      }
      for (const [key, values] of fields) {
        const lower = key.toLowerCase();
        if (patterns.some((pattern) => lower.includes(pattern)) && values.length > 0) {
          return values;
        }
      }
      return [] as (number | null)[];
    };

    const rawActual = pick(["actual_angle", "actual"]);
    const rawProjected = pick(["projected_angle", "projected"]);
    const rawDeviation = pick(["absolute_angle_deviation", "angle_deviation", "deviation"]);

    return {
      trackerIndex,
      trackerName: `Tracker ${trackerIndex}`,
      actual: resampleToDayGrid(sourceTimePoints, rawActual, dayGrid),
      projected: resampleToDayGrid(sourceTimePoints, rawProjected, dayGrid),
      deviation: resampleToDayGrid(sourceTimePoints, rawDeviation, dayGrid),
    };
  });

  return {
    anchorIso,
    deviceTimestamp: String(entry.device.timestamp ?? anchorIso),
    lastDataAt: String(entry.component.last_data_at ?? anchorIso),
    communicationStatus: String(entry.device.status ?? entry.component.status ?? ""),
    pointCount: TRACKER_DAY_SLOT_COUNT,
    timePoints: dayGrid,
    fieldKeys: Array.from(fieldKeys).sort(),
    tableRows,
    chartSeries,
  };
}

function processEntry(entry: ComponentLiveEntry): ComponentLiveProcessed {
  const processedData =
    entry.component.processed_data && typeof entry.component.processed_data === "object"
      ? (entry.component.processed_data as Record<string, unknown>)
      : {};

  return {
    componentId: entry.componentId,
    lastFields: extractLastDataMap(processedData),
    tracker: buildTrackerTelemetry(entry, entry.componentId, processedData),
  };
}

export function buildPlantProcessedCache(
  liveIndex: PlantLiveIndex | null,
): PlantProcessedByComponent {
  if (!liveIndex) return new Map();

  const cache = new Map<string, ComponentLiveProcessed>();
  for (const entry of liveIndex.entries) {
    cache.set(entry.componentId, processEntry(entry));
  }
  return cache;
}

export function getComponentProcessed(
  cache: PlantProcessedByComponent | null | undefined,
  componentId: string,
): ComponentLiveProcessed | null {
  return cache?.get(componentId) ?? null;
}

export function processComponentLiveEntry(entry: ComponentLiveEntry): ComponentLiveProcessed {
  return processEntry(entry);
}
