import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { ComponentLiveEntry } from "@/lib/plant/plantLiveIndex";
import {
  getComponentProcessed,
  processComponentLiveEntry,
  type ComponentLiveProcessed,
  type PlantProcessedByComponent,
  type TrackerChartSeries,
  type TrackerTableRow,
  type TrackerTimePoint,
} from "@/lib/plant/plantLiveProcessed";
import { getLastNumericValue } from "@/lib/plant/componentLiveData";
import { resolveEquipmentViewFromCode } from "@/utils/plantLiveFormatters";

export type {
  TrackerChartSeries,
  TrackerTableRow,
  TrackerTimePoint,
} from "@/lib/plant/plantLiveProcessed";

const TRACKER_TABLE_PRIORITY = [
  "actual_angle",
  "projected_angle",
  "absolute_angle_deviation",
  "angle_deviation",
  "status",
  "is_tracking",
  "tracker_ok",
  "tracker_alarm",
  "tracker_alert",
] as const;

export interface TrackerZone {
  parentId: string;
  parentName: string;
  trackerComponents: PlantComponentRow[];
  weatherComponents: PlantComponentRow[];
}

export interface TrackerZoneTelemetry {
  componentId: string;
  componentName: string;
  deviceTimestamp: string;
  lastDataAt: string;
  communicationStatus: string;
  pointCount: number;
  timePoints: TrackerTimePoint[];
  tableRows: TrackerTableRow[];
  chartSeries: TrackerChartSeries[];
  fieldKeys: string[];
}

export interface TrackerZoneSummary {
  total: number;
  tracking: number;
  onTarget: number;
  drifting: number;
  offTrack: number;
  avgDeviation: number | null;
  onTargetRate: number;
}

export interface WeatherLastSnapshot {
  componentId: string;
  componentName: string;
  timestamp: string;
  fields: Record<string, unknown>;
  priorityFields: string[];
}

export interface TrackerZoneLiveBundle {
  zone: TrackerZone;
  trackerTelemetry: TrackerZoneTelemetry[];
  weatherSnapshots: WeatherLastSnapshot[];
  summary: TrackerZoneSummary;
  mergedTableRows: TrackerTableRow[];
}

function isTrackerComponent(component: PlantComponentRow): boolean {
  return resolveEquipmentViewFromCode(String(component.component_type ?? "")) === "tracker";
}

function isWeatherComponent(component: PlantComponentRow): boolean {
  return (
    resolveEquipmentViewFromCode(String(component.component_type ?? "")) === "weather_station"
  );
}

export function buildTrackerZones(args: {
  components: readonly PlantComponentRow[];
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): TrackerZone[] {
  const { components, componentById } = args;
  const trackerComponents = components.filter(isTrackerComponent);

  if (trackerComponents.length === 0) return [];

  const zoneByParent = new Map<string, TrackerZone>();

  for (const tracker of trackerComponents) {
    const parentId = tracker.parent_id;
    if (!parentId) continue;

    const parent = componentById.get(parentId);
    if (!parent) continue;

    const existing = zoneByParent.get(parentId);
    if (existing) {
      existing.trackerComponents.push(tracker);
      continue;
    }

    zoneByParent.set(parentId, {
      parentId,
      parentName: String(parent.component_name ?? parentId),
      trackerComponents: [tracker],
      weatherComponents: [],
    });
  }

  for (const component of components) {
    if (!isWeatherComponent(component) || !component.parent_id) continue;
    const zone = zoneByParent.get(component.parent_id);
    if (zone) zone.weatherComponents.push(component);
  }

  return Array.from(zoneByParent.values()).sort((a, b) =>
    a.parentName.localeCompare(b.parentName),
  );
}

function resolveProcessed(
  componentId: string,
  processedCache: PlantProcessedByComponent | undefined,
  entry?: ComponentLiveEntry | null,
): ComponentLiveProcessed | null {
  const cached = getComponentProcessed(processedCache, componentId);
  if (cached) return cached;
  if (!entry) return null;
  return processComponentLiveEntry(entry);
}

function trackerTelemetryFromProcessed(
  component: PlantComponentRow,
  processed: ComponentLiveProcessed | null,
): TrackerZoneTelemetry | null {
  const tracker = processed?.tracker;
  if (!tracker) return null;

  return {
    componentId: component.id,
    componentName: String(component.component_name ?? component.id),
    deviceTimestamp: tracker.deviceTimestamp,
    lastDataAt: tracker.lastDataAt,
    communicationStatus: tracker.communicationStatus,
    pointCount: tracker.pointCount,
    timePoints: tracker.timePoints,
    tableRows: tracker.tableRows,
    chartSeries: tracker.chartSeries,
    fieldKeys: tracker.fieldKeys,
  };
}

function weatherFromProcessed(
  component: PlantComponentRow,
  processed: ComponentLiveProcessed | null,
  entry?: ComponentLiveEntry | null,
): WeatherLastSnapshot | null {
  const fields = processed?.lastFields;
  if (!fields || Object.keys(fields).length === 0) return null;

  const priorityFields = [
    "timestamp",
    "irradiance",
    "ghi",
    "gti",
    "gti_1",
    "module_temp",
    "ambient_temp",
    "wind_speed",
    "wind_direction",
    "humidity",
    "rainfall",
    "poa",
    "status",
  ].filter((field) => field in fields);

  const otherFields = Object.keys(fields).filter((field) => !priorityFields.includes(field));

  return {
    componentId: component.id,
    componentName: String(component.component_name ?? component.id),
    timestamp: String(entry?.component.last_data_at ?? entry?.device.timestamp ?? ""),
    fields,
    priorityFields: [...priorityFields, ...otherFields],
  };
}

function rowIsTracking(row: TrackerTableRow): boolean {
  const status = String(row.status ?? "").toLowerCase();
  return (
    row.is_tracking === 1 ||
    row.is_tracking === "1" ||
    row.is_tracking === true ||
    ["tracking", "on", "active", "1"].includes(status)
  );
}

export function buildTrackerZoneSummary(tableRows: TrackerTableRow[]): TrackerZoneSummary {
  let tracking = 0;
  let onTarget = 0;
  let drifting = 0;
  let offTrack = 0;
  const deviations: number[] = [];

  tableRows.forEach((row) => {
    if (rowIsTracking(row)) tracking += 1;

    const absDeviation = getTrackerAbsoluteDeviation(row);
    if (absDeviation != null) {
      deviations.push(absDeviation);
      const deviationStatus = getTrackerDeviationStatus(absDeviation);
      if (deviationStatus === "ok") onTarget += 1;
      else if (deviationStatus === "warning") drifting += 1;
      else if (deviationStatus === "critical") offTrack += 1;
      return;
    }

    if (row.tracker_ok === 1 || row.tracker_ok === "1" || row.tracker_ok === true) {
      onTarget += 1;
    } else if (row.tracker_alarm === 1 || row.tracker_alarm === "1" || row.tracker_alarm === true) {
      offTrack += 1;
    } else if (row.tracker_alert === 1 || row.tracker_alert === "1" || row.tracker_alert === true) {
      drifting += 1;
    }
  });

  const total = tableRows.length;
  const rated = onTarget + drifting + offTrack;
  const onTargetRate = rated > 0 ? Math.round((onTarget / rated) * 100) : 0;
  const avgDeviation =
    deviations.length > 0
      ? parseFloat(
          (deviations.reduce((sum, value) => sum + value, 0) / deviations.length).toFixed(2),
        )
      : null;

  return {
    total,
    tracking,
    onTarget,
    drifting,
    offTrack,
    avgDeviation,
    onTargetRate,
  };
}

export function buildTrackerZoneLiveBundle(args: {
  zone: TrackerZone;
  processedCache: PlantProcessedByComponent;
  getComponentLive?: (componentId: string) => ComponentLiveEntry | null;
}): TrackerZoneLiveBundle {
  const { zone, processedCache, getComponentLive } = args;

  const trackerTelemetry = zone.trackerComponents
    .map((component) =>
      trackerTelemetryFromProcessed(
        component,
        resolveProcessed(component.id, processedCache, getComponentLive?.(component.id)),
      ),
    )
    .filter((item): item is TrackerZoneTelemetry => item !== null);

  const weatherSnapshots = zone.weatherComponents
    .map((component) =>
      weatherFromProcessed(
        component,
        resolveProcessed(component.id, processedCache, getComponentLive?.(component.id)),
        getComponentLive?.(component.id),
      ),
    )
    .filter((item): item is WeatherLastSnapshot => item !== null);

  const mergedTableRows = trackerTelemetry.flatMap((telemetry) => telemetry.tableRows);
  const summary = buildTrackerZoneSummary(mergedTableRows);

  return {
    zone,
    trackerTelemetry,
    weatherSnapshots,
    summary,
    mergedTableRows,
  };
}

/** Flatten tracker rows for equipment dashboard (last values only). */
export function buildTrackerEquipmentRows(args: {
  zones: TrackerZone[];
  processedCache: PlantProcessedByComponent;
  search?: string;
}): Record<string, unknown>[] {
  const query = (args.search ?? "").trim().toLowerCase();
  const rows: Record<string, unknown>[] = [];

  for (const zone of args.zones) {
    const bundle = buildTrackerZoneLiveBundle({
      zone,
      processedCache: args.processedCache,
    });

    for (const tableRow of bundle.mergedTableRows) {
      const row: Record<string, unknown> = {
        ...tableRow,
        component_name: tableRow.tracker_name,
        block_name: zone.parentName,
      };
      if (query && !Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(query))) {
        continue;
      }
      rows.push(row);
    }
  }

  return rows;
}

export function getTrackerTableColumnFields(rows: TrackerTableRow[]): string[] {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (["id", "tracker_index", "tracker_name"].includes(key)) return;
      keys.add(key);
    });
  });

  const ordered = TRACKER_TABLE_PRIORITY.filter((field) => keys.has(field));
  const rest = Array.from(keys)
    .filter((field) => !ordered.includes(field as (typeof TRACKER_TABLE_PRIORITY)[number]))
    .sort();
  return [...ordered, ...rest];
}

export function matchesTrackerSearch(row: TrackerTableRow, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return Object.values(row).some((value) =>
    String(value ?? "").toLowerCase().includes(query),
  );
}

/** Resolve projected sun angle from a tracker table row (last MQTT sample). */
export function getTrackerProjectedAngle(row: TrackerTableRow): number | null {
  return (
    getLastNumericValue(row.projected_angle) ??
    getLastNumericValue(row.proj_angle) ??
    getLastNumericValue(row.projected)
  );
}

/** Resolve actual tracker angle from a table row (last MQTT sample). */
export function getTrackerActualAngle(row: TrackerTableRow): number | null {
  return (
    getLastNumericValue(row.actual_angle) ?? getLastNumericValue(row.actual)
  );
}

/** Signed deviation (actual − projected) when available. */
export function getTrackerSignedDeviation(row: TrackerTableRow): number | null {
  const fromField = getLastNumericValue(row.angle_deviation);
  if (fromField != null) return fromField;

  const projected = getTrackerProjectedAngle(row);
  const actual = getTrackerActualAngle(row);
  if (projected != null && actual != null) return actual - projected;
  return null;
}

/** Absolute deviation used for status thresholds and charts. */
export function getTrackerAbsoluteDeviation(row: TrackerTableRow): number | null {
  const fromField =
    getLastNumericValue(row.absolute_angle_deviation) ??
    getLastNumericValue(row.deviation);
  if (fromField != null) return Math.abs(fromField);

  const signed = getTrackerSignedDeviation(row);
  return signed != null ? Math.abs(signed) : null;
}

export type TrackerDeviationStatus = "ok" | "warning" | "critical" | "unknown";

export const TRACKER_DEVIATION_OK_DEG = 2;
export const TRACKER_DEVIATION_WARN_DEG = 5;

export function getTrackerDeviationStatus(
  absoluteDeviation: number | null,
): TrackerDeviationStatus {
  if (absoluteDeviation == null) return "unknown";
  if (absoluteDeviation <= TRACKER_DEVIATION_OK_DEG) return "ok";
  if (absoluteDeviation <= TRACKER_DEVIATION_WARN_DEG) return "warning";
  return "critical";
}

export interface TrackerSnapshot {
  id: string;
  name: string;
  projectedAngle: number | null;
  actualAngle: number | null;
  signedDeviation: number | null;
  absoluteDeviation: number | null;
  status: TrackerDeviationStatus;
  timestamp: string | null;
}

export function buildTrackerSnapshots(
  bundle: TrackerZoneLiveBundle | null,
  search = "",
): TrackerSnapshot[] {
  if (!bundle) return [];
  const query = search.trim().toLowerCase();

  return bundle.mergedTableRows
    .filter((row) => !query || String(row.tracker_name ?? "").toLowerCase().includes(query))
    .map((row) => {
      const projectedAngle = getTrackerProjectedAngle(row);
      const actualAngle = getTrackerActualAngle(row);
      const signedDeviation = getTrackerSignedDeviation(row);
      const absoluteDeviation = getTrackerAbsoluteDeviation(row);

      return {
        id: String(row.id),
        name: String(row.tracker_name ?? row.id),
        projectedAngle,
        actualAngle,
        signedDeviation,
        absoluteDeviation,
        status: getTrackerDeviationStatus(absoluteDeviation),
        timestamp: row.timestamp ? String(row.timestamp) : null,
      };
    });
}
