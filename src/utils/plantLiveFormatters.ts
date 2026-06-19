import type { ReactNode } from "react";
import type { ICellRendererParams } from "@ag-grid-community/core";
import type { CommonColumnConfig } from "@/components/core/table/CommonTable";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import type { PlantEquipmentComponentType } from "@/utils/selectOptions";

export type EquipmentColumnKind = "text" | "number" | "datetime" | "status";
export type CommunicationMode = "none" | "append" | "only";
export type EquipmentFilterComponentType = PlantEquipmentComponentType | "all" | "" | string;
type EquipmentCommunicationStatus =
  | "Live"
  | "Delayed"
  | "Stale"
  | "Offline"
  | "Unknown";

export const DEVICE_ANALYSIS_KEY = "device" as const;



export const COMPONENT_TYPE_LABEL_BY_CODE: Record<string, string> = {
  M: "Meter",
  B: "Block",
  AC: "ACDB",
  INV: "Inverter",
  DC: "DC Channel",
  TRC: "Tracker",
  WS: "Weather Station",
  STR: "String",
  T: "Transformer",
  SCB: "SCB",
  ICB: "ICB",
  O: "Other",
};


const COMMUNICATION_PRIORITY_FIELDS = [
  "device_id",
  "device_name",
  "last_communication_at",
  "health",
  "communication_status",
  "status",
] as const;

const ALL_COMPONENT_PRIORITY_FIELDS = [
  "component_name",
  "component_type_label",
  "timestamp",
  "block_name",
  "acdb_name",
  "inverter_name",
  "device_name",
  "meter_type",
  "status",
  "last_communication_at",
  "communication_status",
] as const;

const COMPONENT_PRIORITY_FIELDS_BY_TYPE: Record<EquipmentFilterComponentType, readonly string[]> = {
  all: ALL_COMPONENT_PRIORITY_FIELDS,
  "": ALL_COMPONENT_PRIORITY_FIELDS,
  plant: ["component_name", "timestamp", "status"],
  meter: ["component_name", "timestamp", "status"],
  block: ["component_name", "timestamp", "status"],
  acdb: ["component_name", "block_name", "timestamp", "status"],
  inverter: ["component_name", "acdb_name", "timestamp", "status"],
  dc_channel: ["component_name", "inverter_name", "timestamp", "status"],
  weather_station: ["component_name", "timestamp", "status"],
  tracker: ["component_name", "timestamp", "status"],
};


const EQUIPMENT_CORE_FIELD_META: Record<
  string,
  {
    headerName: string;
    kind?: EquipmentColumnKind;
    minWidth?: number;
    pinned?: "left" | "right";
  }
> = {
  component_name: { headerName: "Component", minWidth: 220, pinned: "left" },
  component_type_label: { headerName: "Type", minWidth: 150 },
  device_id: { headerName: "Device Id", minWidth: 180 },
  device_name: { headerName: "RTU", minWidth: 180 },
  timestamp: { headerName: "TimeStamp", kind: "datetime", minWidth: 190 },
  last_communication_at: {
    headerName: "Last Comm. Timestamp",
    kind: "datetime",
    minWidth: 190,
  },
  communication_status: { headerName: "Comm. Status", kind: "status", minWidth: 140 },
  status: { headerName: "Status", kind: "status", minWidth: 130 },
  block_name: { headerName: "Block", minWidth: 150 },
  acdb_name: { headerName: "ACDB", minWidth: 150 },
  inverter_name: { headerName: "Inverter", minWidth: 150 },
  meter_type: { headerName: "Meter Type", minWidth: 120 },
};

const CANONICAL_FIELD_ALIASES: Record<string, string[]> = {
  act_power: ["act_power", "active_power", "power", "ac_power", "power_kw", "kw"],
  avg_pf: ["avg_pf", "power_factor", "pf"],
  frequency: ["frequency", "freq", "hz"],
  react_power: ["react_power", "reactive_power", "reactive_power_kvar", "reactive_power_mvar"],
  act_energy_imp: ["act_energy_imp", "active_energy_import", "energy_imp", "import_energy", "import_energy_kwh", "energy_import"],
  act_energy_exp: ["act_energy_exp", "active_energy_export", "energy_exp", "export_energy", "export_energy_kwh", "energy_export"],
  vr: ["vr", "r_voltage", "ac_r_voltage", "voltage_r", "phase_r_voltage"],
  vy: ["vy", "y_voltage", "ac_y_voltage", "voltage_y", "phase_y_voltage"],
  vb: ["vb", "b_voltage", "ac_b_voltage", "voltage_b", "phase_b_voltage"],
  ir: ["ir", "r_current", "ac_r_current", "current_r", "phase_r_current"],
  iy: ["iy", "y_current", "ac_y_current", "current_y", "phase_y_current"],
  ib: ["ib", "b_current", "ac_b_current", "current_b", "phase_b_current"],
  voltage: ["voltage", "line_voltage", "avg_voltage"],
  current: ["current", "line_current", "avg_current"],
  energy: ["energy", "total_energy", "energy_kwh", "total_energy_kwh"],
  dc_power: ["dc_power", "dc_power_kw"],
  dc_voltage: ["dc_voltage", "dc_v"],
  dc_current: ["dc_current", "dc_i"],
  dc_energy: ["dc_energy", "dc_energy_kwh"],
  dc_generation_time: ["dc_generation_time", "generation_time", "generation_minutes"],
  efficiency: ["efficiency", "efficiency_pct"],
  daily_energy: ["daily_energy", "today_energy", "today_energy_kwh"],
  total_energy: ["total_energy", "lifetime_energy", "total_energy_kwh"],
  yield: ["yield", "specific_yield"],
  angle: ["angle", "tracker_angle"],
  target_angle: ["target_angle", "tracker_target_angle"],
  signal: ["signal", "rssi"],
  rssi: ["rssi", "RSSI"],
  gsm: ["gsm", "GSM"],
  sim: ["sim", "SIM"],
  net: ["net", "NET"],
  gprs: ["gprs", "GPRS"],
  sd: ["sd", "SD"],
  wifi: ["wifi", "wi_fi", "wifiCount", "WIFI", "WI-FI"],
  date: ["date", "DATE", "rtcDate", "RTCDATE"],
  time: ["time", "TIME", "rtcTime", "RTCTIME"],
  temp: ["temp", "temperature", "TEMP"],
  active_sim_slot: ["active_sim_slot", "simSlot", "SIMSLOT"],
  battery_volt: ["battery_volt", "battery_voltage", "vbatt", "VBATT"],
  battery_mode: ["battery_mode", "battSt", "BATTST"],
  watchdog_count: ["watchdog_count", "wd", "WD", "watchdog"],
  gprs_watchdog_count: ["gprs_watchdog_count", "gprswd", "GPRSWD"],
  soft_restart_count: ["soft_restart_count", "frwd", "FRWD"],
  flash_status: ["flash_status", "flash", "FLASH"],
  flash_capacity: ["flash_capacity", "flSize", "FLSIZE"],
  flash_storage: ["flash_storage", "flUsed", "FLUSED", "flash_free", "freeHesp", "FREEHESP"],
  firmware_version: ["firmware_version", "firmware", "FIRMWARE"],
  sim_slot_shift_count: ["sim_slot_shift_count", "simChngCnt", "SIMCHNGCNT"],
  sim_no: ["sim_no", "simno", "SIMNO"],
  online: ["online", "ONLINE"],
};

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatNumber(value: unknown, digits = 2): string {
  const number = toFiniteNumber(value);
  if (number == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: number % 1 === 0 ? 0 : Math.min(2, digits),
  }).format(number);
}

export function formatTime(value: unknown): string {
  if (!value) return "--:--:--";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const STATUS_ONLINE_SET = new Set(["live", "online", "connected", "healthy", "active"]);
export const STATUS_OFFLINE_SET = new Set(["offline", "disconnected", "fault", "error", "stale"]);

export type ComponentStatus = "online" | "offline" | "unknown";

export function normalizeStatus(value: unknown): ComponentStatus {
  const status = String(value ?? "").trim().toLowerCase();
  if (STATUS_ONLINE_SET.has(status)) return "online";
  if (STATUS_OFFLINE_SET.has(status)) return "offline";
  return "unknown";
}

export function countStatuses(rows: any[]) {
  return rows.reduce(
    (acc, row) => {
      const status = normalizeStatus(row.communication_status ?? row.status);
      acc[status] += 1;
      return acc;
    },
    { online: 0, offline: 0, unknown: 0 } as Record<ComponentStatus, number>,
  );
}

export function matchesStatusFilter(
  row: any,
  statusFilter: string,
) {
  return statusFilter === "all" || normalizeStatus(row.communication_status ?? row.status) === statusFilter;
}

export function getBlockMetrics(rows: any[]) {
  const totalActivePower = rows.reduce(
    (sum, row) => sum + (toFiniteNumber(row.act_power) ?? 0),
    0,
  );
  const totalEnergyExport = rows.reduce(
    (sum, row) => sum + (toFiniteNumber(row.act_energy_exp) ?? 0),
    0,
  );
  const avgPfValues = rows
    .map((row) => toFiniteNumber(row.avg_pf))
    .filter((value): value is number => value != null);
  const avgPf =
    avgPfValues.length > 0
      ? avgPfValues.reduce((sum, value) => sum + value, 0) / avgPfValues.length
      : null;

  return { totalActivePower, totalEnergyExport, avgPf };
}

export function matchesSearch(
  block: { component_name?: string | null; component_code?: string | null; serial_number?: string | null },
  rows: any[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const blockText = [
    block.component_name,
    block.component_code,
    block.serial_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (blockText.includes(query)) return true;
  return rows.some((row) =>
    Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(query),
    ),
  );
}

export function isValidTelemetryValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  const s = String(value).trim();
  if (s === "" || s === "-" || s === "null" || s === "undefined" || s === "NaN") return false;
  if (s.includes(",") && s.split(",").every(part => {
    const p = part.trim();
    return p === "" || p === "-" || p === "null" || p === "undefined" || p === "NaN";
  })) return false;
  return true;
}

function firstDefinedValue(
  source: Record<string, unknown>,
  candidates: string[],
): unknown {
  const sourceKeys = Object.keys(source);
  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    // 1. Precise match
    if (candidate in source && isValidTelemetryValue(source[candidate])) {
      return source[candidate];
    }
    // 2. Case-insensitive match
    const foundKey = sourceKeys.find((k) => k.toLowerCase() === lowerCandidate);
    if (foundKey && isValidTelemetryValue(source[foundKey])) {
      return source[foundKey];
    }
  }
  return undefined;
}

export function extractLatestValue(value: unknown): unknown {
  if (value == null || value === "") return value;

  if (Array.isArray(value)) {
    const validValues = value.filter((v) => {
      if (v == null || v === "") return false;
      const s = String(v).trim();
      return s !== "" && s !== "-" && s !== "null" && s !== "undefined" && s !== "NaN";
    });
    if (validValues.length > 0) {
      return extractLatestValue(validValues[validValues.length - 1]);
    }
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "null" || trimmed === "undefined" || trimmed === "NaN") {
      return null;
    }

    if (trimmed.includes(",")) {
      const parts = trimmed.split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "" && s !== "-" && s !== "null" && s !== "undefined" && s !== "NaN");
      if (parts.length > 0) {
        return extractLatestValue(parts[parts.length - 1]);
      }
      return null;
    }
  }

  return value;
}

export function normalizeProcessedData(processedData: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};

  // Extract latest values for all fields
  for (const [key, rawValue] of Object.entries(processedData)) {
    normalized[key] = extractLatestValue(rawValue);
  }

  for (const [canonicalKey, aliases] of Object.entries(CANONICAL_FIELD_ALIASES)) {
    const value = firstDefinedValue(processedData, aliases);
    if (value !== undefined) {
      normalized[canonicalKey] = extractLatestValue(value);
    }
  }

  return normalized;
}

/** Keeps array fields intact (for tracker graphs); still maps canonical aliases. */
export function preserveProcessedData(processedData: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...processedData };

  for (const [canonicalKey, aliases] of Object.entries(CANONICAL_FIELD_ALIASES)) {
    const value = firstDefinedValue(processedData, aliases);
    if (value !== undefined) {
      normalized[canonicalKey] = value;
    }
  }

  return normalized;
}

export function resolveEquipmentCommunicationStatus(args: {
  timestamp?: unknown;
  sourceStatus?: unknown;
  liveWithinMinutes?: number;
  delayedWithinMinutes?: number;
}): EquipmentCommunicationStatus {
  const {
    timestamp,
    sourceStatus,
    liveWithinMinutes = 15,
    delayedWithinMinutes = 60,
  } = args;

  const normalizedStatus = String(sourceStatus ?? "").trim().toLowerCase();
  if (["fault", "error", "offline", "disconnected"].includes(normalizedStatus)) {
    return "Offline";
  }
  if (["live", "online", "connected", "healthy", "active"].includes(normalizedStatus)) {
    return "Live";
  }
  if (["warning", "partial", "unstable", "connecting", "reconnecting"].includes(normalizedStatus)) {
    return "Delayed";
  }

  const millis = timestamp ? new Date(String(timestamp)).getTime() : Number.NaN;
  if (!Number.isFinite(millis)) {
    return "Unknown";
  }

  const ageMinutes = Math.max(0, (Date.now() - millis) / 60_000);
  if (ageMinutes <= liveWithinMinutes) return "Live";
  if (ageMinutes <= delayedWithinMinutes) return "Delayed";
  return "Stale";
}

function supportsCommunicationColumns(
  componentType: EquipmentFilterComponentType,
): boolean {
  return componentType === "meter" || componentType === "inverter" || componentType === "dc_channel";
}

export function resolveCommunicationMode(
  componentType: EquipmentFilterComponentType,
  showCommunicationOnly: boolean,
): CommunicationMode {
  if (showCommunicationOnly) return "only";
  if (supportsCommunicationColumns(componentType)) return "append";
  return "none";
}
export function resolveEquipmentViewFromCode(
  componentTypeCode: string,
): EquipmentFilterComponentType {
  const normalized = componentTypeCode.trim().toLowerCase();

  // Basic normalization for common codes
  if (normalized === "m" || normalized === "meter") return "meter";
  if (normalized === "p" || normalized === "plant") return "plant";
  if (normalized === "b" || normalized === "block") return "block";
  if (normalized === "ac" || normalized === "acdb") return "acdb";
  if (normalized === "inv" || normalized === "inverter") return "inverter";
  if (normalized === "dc" || normalized === "ch" || normalized === "str" || normalized === "string") return "dc_channel";
  if (normalized === "ws" || normalized === "weather_station") return "weather_station";
  if (normalized === "trc" || normalized === "tracker") return "tracker";

  return normalized;
}



function getDefaultEquipmentFields(
  componentType: EquipmentFilterComponentType,
  communicationMode: CommunicationMode,
): string[] {
  if (communicationMode === "only") {
    return [...COMMUNICATION_PRIORITY_FIELDS];
  }
  return [...(COMPONENT_PRIORITY_FIELDS_BY_TYPE[componentType] ?? ALL_COMPONENT_PRIORITY_FIELDS)];
}

function getOrderedEquipmentFields(args: {
  rowKeys: string[];
  componentType: EquipmentFilterComponentType;
  communicationMode: CommunicationMode;
}): string[] {
  const { rowKeys, componentType, communicationMode } = args;
  const preferredFields = getDefaultEquipmentFields(componentType, communicationMode);

  return [
    ...preferredFields.filter((field) => rowKeys.includes(field)),
    ...rowKeys.filter((field) => !preferredFields.includes(field)),
  ];
}

function resolveEquipmentHeader(
  field: string,
  componentType: EquipmentFilterComponentType,
): string {
  if (field === "component_name") {
    if (componentType === "meter") return "MCR";
    return toTitleCaseLabel(componentType);
  }
  return EQUIPMENT_CORE_FIELD_META[field]?.headerName ?? toTitleCaseLabel(field);
}


function inferEquipmentColumnKind(field: string): EquipmentColumnKind {
  const key = field.toLowerCase();
  if (key === "date" || key === "time") {
    return "text";
  }
  if (key.includes("timestamp") || key.endsWith("_at") || key === "timestamp") {
    return "datetime";
  }
  if (key.includes("status") || key.includes("state")) {
    return "status";
  }
  return "text";
}

export function toTitleCaseLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPowerValue(row: any): number | null {
  return toFiniteNumber(row.act_power ?? row.active_power ?? row.power ?? row.kw);
}

export function getColumnLabel(key: string): string {
  if (key === "act_power") return "Active Power";
  if (key === "act_energy_exp") return "Act. Energy (KWH)";
  if (key === "timestamp") return "Time";
  return toTitleCaseLabel(key);
}

function getDisplayValue(row: any, key: string): unknown {
  if (key === "time") return row.timestamp ?? row.last_communication_at;
  if (key in row) return row[key];
  return null;
}

export function formatCellValue(row: any, key: string): string {
  const value = getDisplayValue(row, key);
  if (key === "time") return formatTime(value);
  if (value == null || value === "") return "-";
  if (Array.isArray(value)) {
    const latest = [...value].reverse().find((item) => item != null && item !== "");
    return latest == null ? "-" : String(latest);
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

function createEquipmentColumn({
  field,
  headerName,
  kind,
  index,
  renderCell,
}: {
  field: string;
  headerName: string;
  kind: EquipmentColumnKind;
  index: number;
  renderCell: (
    kind: EquipmentColumnKind,
    params: ICellRendererParams<unknown, unknown>,
  ) => ReactNode;
}): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    minWidth: EQUIPMENT_CORE_FIELD_META[field]?.minWidth ?? (index === 0 ? 180 : 140),
    pinned: EQUIPMENT_CORE_FIELD_META[field]?.pinned ?? (index === 0 ? "left" : undefined),
    filter:
      kind === "status"
        ? "agSetColumnFilter"
        : kind === "number"
          ? "agNumberColumnFilter"
          : "agTextColumnFilter",
    cellRenderer: (params: ICellRendererParams<unknown, unknown>) =>
      renderCell(kind, params),
  });
}

export function buildEquipmentColumnsFromRows({
  rows,
  componentType,
  communicationMode,
  renderCell,
}: {
  rows: Record<string, unknown>[];
  componentType: EquipmentFilterComponentType;
  communicationMode: CommunicationMode;
  renderCell: (
    kind: EquipmentColumnKind,
    params: ICellRendererParams<unknown, unknown>,
  ) => ReactNode;
}): CommonColumnConfig[] {
  if (rows.length === 0) {
    return [];
  }

  const rowKeys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        // Skip system IDs and redundant type labels when filtered
        const isSystemId =
          (key.endsWith("_id") || key === "id" || key === "_id") &&
          (Object.keys(row).some((k) => k === key.replace("_id", "_name")) ||
            Object.keys(row).some((k) => k === "component_name" || k === "device_name"));

        const isRedundantType =
          componentType !== "" &&
          componentType !== "all" &&
          (key === "component_type" || key === "component_type_label");

        if (!isSystemId && !isRedundantType && key !== "component_id" && key !== "id") {
          acc.add(key);
        }
      });
      return acc;
    }, new Set<string>()),
  );

  const orderedKeys = getOrderedEquipmentFields({
    rowKeys,
    componentType,
    communicationMode,
  });

  return orderedKeys.map((field, index) =>
    createEquipmentColumn({
      field,
      headerName: resolveEquipmentHeader(field, componentType),
      kind:
        EQUIPMENT_CORE_FIELD_META[field]?.kind ??
        inferEquipmentColumnKind(field),
      index,
      renderCell,
    }),
  );
}
