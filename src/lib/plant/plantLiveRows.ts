import { endOfDay, startOfDay } from "date-fns";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type {
  ComponentLivePayload,
  DeviceLiveData,
  PlantLiveData,
} from "@/types/plantLive";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import {
  toTitleCaseLabel,
  DEVICE_ANALYSIS_KEY,
  normalizeProcessedData,
  preserveProcessedData,
  resolveEquipmentCommunicationStatus,
  resolveEquipmentViewFromCode,
} from "@/utils/plantLiveFormatters";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";
import {
  getComponentProcessed,
  type PlantProcessedByComponent,
} from "@/lib/plant/plantLiveProcessed";
import { normalizeProcessedData as applyCanonicalFields } from "@/utils/plantLiveFormatters";

const INTERVAL_WINDOW_MS: Record<string, number> = {
  "1min": 1 * 60 * 1000,
  "5min": 5 * 60 * 1000,
  "15min": 15 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

const HEATMAP_COMPONENT_CODES = [
  "M",
  "B",
  "AC",
  "INV",
  "DC",
  "CH",
  "STR",
  "TRC",
  "METER",
  "BLOCK",
  "ACDB",
  "INVERTER",
  "SCB",
  "ICB",
  "AJB",
] as const;

export type PlantEquipmentAnalysisMode = "equipment" | typeof DEVICE_ANALYSIS_KEY;

export type PlantEquipmentLiveRow = Record<string, unknown> & {
  id: string;
  component_id?: string;
  component_name?: string;
  component_type?: string;
  component_type_label?: string;
  device_id?: string;
  device_name?: string;
  meter_type?: string | null;
  block_id?: string | null;
  block_name?: string | null;
  acdb_id?: string | null;
  acdb_name?: string | null;
  inverter_id?: string | null;
  inverter_name?: string | null;
  timestamp?: string;
  last_communication_at?: string;
  communication_status?: string;
  status?: string;
  health?: string;
};

export type PlantEquipmentHeatmapRow = PlantEquipmentLiveRow;

export interface BuildEquipmentRowsParams {
  plantLive: PlantLiveData | null;
  analysisMode: PlantEquipmentAnalysisMode;
  componentType: EquipmentFilterComponentType;
  meterType?: string;
  blockId?: string;
  acdbId?: string;
  inverterId?: string;
  deviceId?: string;
  startDate: string;
  endDate: string;
  interval?: string;
  search?: string;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  /** Pre-computed last values from MQTT cache (avoids re-parsing arrays). */
  processedByComponentId?: PlantProcessedByComponent;
  /** When true, array telemetry (e.g. actual_angle[]) is kept for charts. */
  preserveArrays?: boolean;
}

export interface BuildHeatmapRowsParams {
  plantLive: PlantLiveData | null;
  endDate: string;
  blockId?: string;
  acdbId?: string;
  inverterId?: string;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  /** When true, array telemetry (e.g. actual_angle[]) is kept for charts. */
  preserveArrays?: boolean;
}

export interface BuildWeatherStationRowsParams {
  plantLive: PlantLiveData | null;
  startDate: string;
  endDate: string;
  blockId?: string;
  search?: string;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  /** When true, array telemetry (e.g. actual_angle[]) is kept for charts. */
  preserveArrays?: boolean;
}

type LiveDevice = NonNullable<PlantLiveData["devices"]>[string];
type LiveComponent = NonNullable<LiveDevice["components"]>[string];

interface BuildComponentLiveRowArgs {
  componentId: string;
  liveDeviceId: string;
  currentTime: string;
  plantTimestamp: string;
  componentLive: LiveComponent;
  deviceLive: LiveDevice;
  meta: PlantComponentRow;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  /** Pre-computed last values from MQTT cache. */
  lastFields?: Record<string, unknown>;
  /** When true, array telemetry (e.g. actual_angle[]) is kept for charts. */
  preserveArrays?: boolean;
}

interface EquipmentTimeRange {
  dataTimestamp: number;
  rangeStart: number;
  rangeEnd: number;
  currentTime: string;
}

export function matchesPlantLiveRowSearch(
  row: Record<string, unknown>,
  search: string,
): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return Object.values(row).some((value) =>
    String(value ?? "").toLowerCase().includes(query),
  );
}

export function getPlantLiveRowTime(row: {
  timestamp?: unknown;
  last_communication_at?: unknown;
}): number {
  const t = new Date(
    String(row.timestamp ?? row.last_communication_at ?? ""),
  ).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getCurrentTimeStamp(plantLive: PlantLiveData, endDate: string): number {
  return plantLive.timestamp
    ? new Date(plantLive.timestamp).getTime()
    : endOfDay(new Date(endDate)).getTime();
}

function buildTimeRange(
  plantLive: PlantLiveData,
  startDate: string,
  endDate: string,
): EquipmentTimeRange {
  const dataTimestamp = getCurrentTimeStamp(plantLive, endDate);
  return {
    dataTimestamp,
    rangeStart: startOfDay(new Date(startDate)).getTime(),
    rangeEnd: endOfDay(new Date(endDate)).getTime(),
    currentTime: new Date(dataTimestamp).toISOString(),
  };
}

function isRowInsideSelectedWindow(args: {
  row: {
    timestamp?: unknown;
    last_communication_at?: unknown;
  };
  interval: string;
  range: EquipmentTimeRange;
}): boolean {
  const { row, interval, range } = args;
  const rowTime = getPlantLiveRowTime(row);
  if (!Number.isFinite(rowTime)) {
    return false;
  }

  if (!interval || interval === "last") {
    return true;
  }

  const windowMs = INTERVAL_WINDOW_MS[interval];
  if (!windowMs) {
    return true;
  }

  const limitEnd = Math.min(range.rangeEnd, range.dataTimestamp);
  const effectiveStart = Math.max(range.rangeStart, limitEnd - windowMs);
  return rowTime >= effectiveStart && rowTime <= range.rangeEnd;
}

function isHeatmapComponent(componentTypeCode: string): boolean {
  return HEATMAP_COMPONENT_CODES.some((code) => componentTypeCode.includes(code));
}

function findAncestorInCategory(
  component: PlantComponentRow,
  componentById: ReadonlyMap<string, PlantComponentRow>,
  targetCategory: EquipmentFilterComponentType,
): PlantComponentRow | null {
  let current: PlantComponentRow | undefined = component;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const rawType = String(current.component_type).toUpperCase();
    if (resolveEquipmentViewFromCode(rawType) === targetCategory) {
      return current;
    }
    current = current.parent_id ? componentById.get(current.parent_id) : undefined;
  }

  return null;
}

export function buildComponentLiveRow(
  args: BuildComponentLiveRowArgs,
): PlantEquipmentLiveRow {
  const {
    componentId,
    liveDeviceId,
    currentTime,
    plantTimestamp,
    componentLive,
    deviceLive,
    meta,
    componentById,
    deviceNameById,
    lastFields,
    preserveArrays = false,
  } = args;

  const componentTypeCode = String(meta.component_type).toUpperCase();
  const block = findAncestorInCategory(meta, componentById, "block");
  const acdb = findAncestorInCategory(meta, componentById, "acdb");
  const inverter = findAncestorInCategory(meta, componentById, "inverter");
  const rawProcessed =
    componentLive.processed_data && typeof componentLive.processed_data === "object"
      ? (componentLive.processed_data as Record<string, unknown>)
      : null;

  let processedData: Record<string, unknown> = {};
  if (lastFields && Object.keys(lastFields).length > 0) {
    processedData = applyCanonicalFields(lastFields);
  } else if (rawProcessed) {
    processedData = preserveArrays
      ? preserveProcessedData(rawProcessed)
      : normalizeProcessedData(rawProcessed);
  }
  const deviceId = meta.device_id ?? liveDeviceId;

  return {
    ...(processedData as Record<string, unknown>),
    id: componentId,
    component_id: componentId,
    component_name: meta.component_name ?? componentId,
    component_type: meta.component_type,
    component_type_label: toTitleCaseLabel(meta.component_type || componentTypeCode),
    device_id: deviceId,
    device_name: meta.device_name ?? deviceNameById.get(deviceId) ?? deviceId,
    meter_type: meta.meter_type ?? null,
    block_id: block?.id ?? null,
    block_name: block?.component_name ?? null,
    acdb_id: acdb?.id ?? null,
    acdb_name: acdb?.component_name ?? null,
    inverter_id: inverter?.id ?? null,
    inverter_name: inverter?.component_name ?? null,
    timestamp: String(componentLive.last_data_at ?? deviceLive.timestamp ?? plantTimestamp ?? ""),
    last_communication_at: String(
      deviceLive.timestamp ?? componentLive.last_data_at ?? currentTime,
    ),
    communication_status: resolveEquipmentCommunicationStatus({
      timestamp: deviceLive.timestamp ?? componentLive.last_data_at ?? currentTime,
      sourceStatus: deviceLive.status,
    }),
    status: String(componentLive.status ?? deviceLive.status ?? ""),
  };
}

function buildDeviceLiveRow(args: {
  currentDeviceId: string;
  deviceLive: LiveDevice;
  currentTime: string;
  deviceNameById: ReadonlyMap<string, string>;
  /** When true, array telemetry (e.g. actual_angle[]) is kept for charts. */
  preserveArrays?: boolean;
}): PlantEquipmentLiveRow {
  const { currentDeviceId, deviceLive, currentTime, deviceNameById } = args;
  const aggregates = deviceLive.aggregates ?? {};
  const healthComp = deviceLive.components?.health;
  const healthData =
    healthComp?.processed_data && typeof healthComp.processed_data === "object"
      ? normalizeProcessedData(healthComp.processed_data as Record<string, unknown>)
      : {};
  const normalizedAggregates = normalizeProcessedData(
    aggregates as Record<string, unknown>,
  );
  const healthStatus = String(
    aggregates["0"] ?? healthComp?.status ?? deviceLive.status ?? "Unknown",
  );

  return {
    ...normalizedAggregates,
    ...healthData,
    id: `device:${currentDeviceId}`,
    device_id: currentDeviceId,
    device_name: deviceNameById.get(currentDeviceId) ?? currentDeviceId,
    last_communication_at: String(deviceLive.timestamp ?? currentTime),
    communication_status: resolveEquipmentCommunicationStatus({
      timestamp: deviceLive.timestamp ?? currentTime,
      sourceStatus: deviceLive.status,
    }),
    health: healthStatus,
    connected:
      deviceLive.status === "connected" ||
      aggregates["255"] === 1 ||
      aggregates["255"] === "true"
        ? "Healthy"
        : "Offline",
    energy: aggregates["13"] ?? aggregates.Energy,
    dc_generation_time: aggregates["14"] ?? aggregates["Generation Time"],
    daily_energy: aggregates["18"] ?? aggregates["Day Energy"],
    status: String(deviceLive.status ?? ""),
    timestamp: String(deviceLive.timestamp ?? ""),
  };
}

function buildWeatherStationRow(args: {
  componentId: string;
  liveDeviceId: string;
  componentLive: ComponentLivePayload;
  deviceLive: DeviceLiveData;
  meta: PlantComponentRow;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  plantTimestamp?: string;
}): PlantEquipmentLiveRow {
  const {
    componentId,
    liveDeviceId,
    componentLive,
    deviceLive,
    meta,
    componentById,
    deviceNameById,
    plantTimestamp,
  } = args;

  return buildComponentLiveRow({
    componentId,
    liveDeviceId,
    currentTime: new Date().toISOString(),
    plantTimestamp: plantTimestamp ?? "",
    componentLive,
    deviceLive,
    meta,
    componentById,
    deviceNameById,
  });
}

export function buildEquipmentRows(params: BuildEquipmentRowsParams): PlantEquipmentLiveRow[] {
  const {
    plantLive,
    analysisMode,
    componentType,
    meterType = "",
    blockId = "",
    acdbId = "",
    inverterId = "",
    deviceId = "",
    startDate,
    endDate,
    interval = "",
    search = "",
    componentById,
    deviceNameById,
    processedByComponentId,
    preserveArrays = false,
  } = params;

  if (!plantLive) {
    return [];
  }

  const isDeviceAnalysis = analysisMode === DEVICE_ANALYSIS_KEY;
  const timeRange = buildTimeRange(plantLive, startDate, endDate);
  const rowMap = new Map<string, PlantEquipmentLiveRow>();

  if (isDeviceAnalysis) {
    Object.entries(plantLive.devices ?? {})
      .filter(([currentDeviceId]) => currentDeviceId === deviceId || deviceId === "all")
      .forEach(([currentDeviceId, deviceLive]) => {
        const row = buildDeviceLiveRow({
          currentDeviceId,
          deviceLive,
          currentTime: timeRange.currentTime,
          deviceNameById,
        });

        if (
          isRowInsideSelectedWindow({
            row,
            interval,
            range: timeRange,
          }) &&
          matchesPlantLiveRowSearch(row, search)
        ) {
          const existing = rowMap.get(row.id);
          if (!existing || getPlantLiveRowTime(row) > getPlantLiveRowTime(existing)) {
            rowMap.set(row.id, row);
          }
        }
      });
  } else {
    for (const deviceLive of Object.values(plantLive.devices ?? {})) {
      for (const [compId, componentLive] of Object.entries(deviceLive.components ?? {})) {
        const meta = componentById.get(compId);
        if (!meta) continue;

        const rawType = String(meta.component_type).toUpperCase();
        const resolvedComponentType = resolveEquipmentViewFromCode(rawType);
        if (componentType && resolvedComponentType !== componentType) continue;

        const processedData = componentLive.processed_data;
        const hasLivePayload =
          (processedData &&
            typeof processedData === "object" &&
            Object.keys(processedData as Record<string, unknown>).length > 0) ||
          Boolean(componentLive.last_data_at);

        if (!hasLivePayload) continue;

        const cached = getComponentProcessed(processedByComponentId, compId);
        const liveRow = buildComponentLiveRow({
          componentId: compId,
          liveDeviceId: deviceLive.device_id,
          currentTime: timeRange.currentTime,
          plantTimestamp: plantLive.timestamp,
          componentLive,
          deviceLive,
          meta,
          componentById,
          deviceNameById,
          lastFields: cached?.lastFields,
          preserveArrays,
        });

        if (meterType && liveRow.meter_type !== meterType) continue;
        if (blockId && liveRow.block_id !== blockId) continue;
        if (acdbId && liveRow.acdb_id !== acdbId) continue;
        if (inverterId && liveRow.inverter_id !== inverterId) continue;
        if (!matchesPlantLiveRowSearch(liveRow, search)) continue;
        if (!isRowInsideSelectedWindow({ row: liveRow, interval, range: timeRange })) continue;

        const existing = rowMap.get(compId);
        if (!existing || getPlantLiveRowTime(liveRow) >= getPlantLiveRowTime(existing)) {
          rowMap.set(compId, liveRow);
        }
      }
    }
  }

  return Array.from(rowMap.values()).sort(
    (a, b) => getPlantLiveRowTime(b) - getPlantLiveRowTime(a),
  );
}

export function buildHeatmapRows(params: BuildHeatmapRowsParams): PlantEquipmentHeatmapRow[] {
  const {
    plantLive,
    endDate,
    blockId = "",
    acdbId = "",
    inverterId = "",
    componentById,
    deviceNameById,
  } = params;

  if (!plantLive) {
    return [];
  }

  const currentTime = new Date(getCurrentTimeStamp(plantLive, endDate)).toISOString();
  const rows: PlantEquipmentHeatmapRow[] = [];

  for (const [liveDeviceId, deviceLive] of Object.entries(plantLive.devices ?? {})) {
    for (const [componentId, componentLive] of Object.entries(deviceLive.components ?? {})) {
      const meta = componentById.get(componentId);
      if (!meta) continue;

      const componentTypeCode = String(meta.component_type).toUpperCase();
      if (!isHeatmapComponent(componentTypeCode)) continue;

      const row = buildComponentLiveRow({
        componentId,
        liveDeviceId,
        currentTime,
        plantTimestamp: plantLive.timestamp,
        componentLive,
        deviceLive,
        meta,
        componentById,
        deviceNameById,
      });

      if (blockId && row.block_id !== blockId) continue;
      if (acdbId && row.acdb_id !== acdbId) continue;
      if (inverterId && row.inverter_id !== inverterId) continue;

//       console.log(
//   "DC ROW",
//   row.component_name,
//   row.inverter_name,
//   row.component_type
// );

// const dcRows = rows.filter((r) =>
//   String(r.component_type || "")
//     .toUpperCase()
//     .includes("DC")
// );

// console.log("TOTAL DC ROWS:", dcRows.length);
// console.table(
//   dcRows.map((r) => ({
//     component: r.component_name,
//     inverter: r.inverter_name,
//   }))
// );
      
//       console.log(
//   JSON.stringify(componentLive.processed_data, null, 2)
// );
// console.log(
//   "HEATMAP",
//   row.component_name,
//   row.component_type,
//   Object.keys(row)
// );
      rows.push(row);
    }
  }

  return rows;
}

export function buildWeatherStationRows(
  params: BuildWeatherStationRowsParams,
): PlantEquipmentLiveRow[] {
  const {
    plantLive,
    startDate,
    endDate,
    blockId = "",
    search = "",
    componentById,
    deviceNameById,
  } = params;

  if (!plantLive) {
    return [];
  }

  const startTime = new Date(`${startDate}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T23:59:59.999`).getTime();
  const rows: PlantEquipmentLiveRow[] = [];

  for (const [liveDeviceId, deviceLive] of Object.entries(plantLive.devices ?? {})) {
    for (const [componentId, componentLive] of Object.entries(deviceLive.components ?? {})) {
      const meta = componentById.get(componentId);
      if (!meta) continue;

      const resolvedComponentType = resolveEquipmentViewFromCode(
        normalizeComponentType(meta.component_type),
      );
      if (resolvedComponentType !== "weather_station") {
        continue;
      }

      rows.push(
        buildWeatherStationRow({
          componentId,
          liveDeviceId,
          componentLive,
          deviceLive,
          meta,
          componentById,
          deviceNameById,
          plantTimestamp: plantLive.timestamp,
        }),
      );
    }
  }

  return rows
    .filter((row) => matchesPlantLiveRowSearch(row, search))
    .filter((row) => {
      const rowTime = getPlantLiveRowTime(row);
      if (!Number.isFinite(rowTime)) {
        return false;
      }
      if (rowTime < startTime || rowTime > endTime) {
        return false;
      }
      if (blockId && row.block_id !== blockId) {
        return false;
      }
      return true;
    })
    .sort((a, b) => getPlantLiveRowTime(b) - getPlantLiveRowTime(a));
}
