import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  COMPONENT_TYPE_LABEL_BY_CODE,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";
import {
  normalizeComponentHierarchy,
  normalizeComponentType,
} from "@/pages/plant/plant-components/shared";
import type {
  DetailDashboardMetricConfig,
  DetailDashboardRow,
} from "./DetailDashboardTypes";

export const DEFAULT_DETAIL_DASHBOARD_METRIC: DetailDashboardMetricConfig = {
  key: "generation",
  label: "Generation",
  unit: "kWh",
  aliases: [
    "dc_energy",
    "dc_energy_kwh",
    "energy",
    "daily_energy",
    "today_energy",
    "dc_power",
    "dc_capacity_kw",
    "ac_capacity_kw",
    "channels",
    "module_count",
  ],
};

const TYPE_TO_CODE: Record<string, string[]> = {
  meter: ["M"],
  block: ["B"],
  acdb: ["AC"],
  inverter: ["INV"],
  dc_channel: ["DC", "CH", "SCB", "ICB", "AJB", "STR"],
  tracker: ["TRC"],
  weather_station: ["WS"],
};

export function readText(row: DetailDashboardRow, key: string): string {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

export function readNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  if (Array.isArray(value)) {
    const values = value.filter((entry) => entry !== null && entry !== undefined && entry !== "");
    return values.length > 0 ? readNumber(values[values.length - 1]) : Number.NaN;
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if ("value" in source) return readNumber(source.value);
    if ("val" in source) return readNumber(source.val);
  }
  return Number.NaN;
}

export function resolveMetricValue(
  row: DetailDashboardRow,
  metric = DEFAULT_DETAIL_DASHBOARD_METRIC,
): number {
  let fallback = Number.NaN;

  for (const alias of metric.aliases) {
    const exact = readNumber(row[alias]);
    if (!Number.isNaN(exact)) {
      if (exact > 0) return exact;
      if (Number.isNaN(fallback)) fallback = exact;
    }

    const foundKey = Object.keys(row).find(
      (key) => key.toLowerCase() === alias.toLowerCase(),
    );
    if (foundKey) {
      const parsed = readNumber(row[foundKey]);
      if (!Number.isNaN(parsed)) {
        if (parsed > 0) return parsed;
        if (Number.isNaN(fallback)) fallback = parsed;
      }
    }
  }

  return fallback;
}

export function formatMetricValue(
  value: number,
  metric = DEFAULT_DETAIL_DASHBOARD_METRIC,
): string {
  const safeValue = Number.isNaN(value) ? 0 : value;
  const precision = Math.abs(safeValue) >= 100 ? 0 : 2;
  return `${safeValue.toFixed(precision)}${metric.unit ? ` ${metric.unit}` : ""}`;
}

export function matchesDetailDashboardType(
  row: DetailDashboardRow,
  componentType?: EquipmentFilterComponentType,
): boolean {
  const requestedType = String(componentType ?? "").toLowerCase();
  if (!requestedType || requestedType === "all") return true;

  const acceptedCodes = TYPE_TO_CODE[requestedType];
  if (!acceptedCodes) return true;

  const rowType = normalizeComponentType(row.component_type);
  return acceptedCodes.some((code) => rowType === code || rowType.includes(code));
}

export function filterDetailDashboardRows(
  rows: DetailDashboardRow[],
  componentType?: EquipmentFilterComponentType,
): DetailDashboardRow[] {
  return rows.filter((row) => matchesDetailDashboardType(row, componentType));
}

function getAncestor(
  row: PlantComponentRow,
  byId: ReadonlyMap<string, PlantComponentRow>,
  type: string,
): PlantComponentRow | null {
  let current: PlantComponentRow | undefined = row;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (normalizeComponentType(current.component_type) === type) return current;
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return null;
}

export function plantComponentsToDetailDashboardRows(
  components: PlantComponentRow[],
): DetailDashboardRow[] {
  const normalized = normalizeComponentHierarchy(components);
  const byId = new Map(normalized.map((component) => [component.id, component]));

  return normalized.map((component, index) => {
    const componentType = normalizeComponentType(component.component_type);
    const block = getAncestor(component, byId, "B");
    const acdb = getAncestor(component, byId, "AC");
    const inverter = getAncestor(component, byId, "INV");
    const fallbackValue =
      readNumber(component.dc_capacity_kw) ||
      readNumber(component.ac_capacity_kw) ||
      readNumber(component.channels) ||
      readNumber(component.module_count) ||
      ((index % 8) + 1) * 6;

    return {
      ...component,
      id: component.id,
      component_id: component.id,
      component_name: component.component_name,
      component_type: component.component_type,
      component_type_label:
        COMPONENT_TYPE_LABEL_BY_CODE[componentType] ?? componentType,
      block_name: block?.component_name ?? null,
      acdb_name: acdb?.component_name ?? null,
      inverter_name: inverter?.component_name ?? null,
      status: component.is_active === false ? "Offline" : component.status ?? "Online",
      dc_energy: fallbackValue,
      dc_power: readNumber(component.dc_capacity_kw) || fallbackValue,
      timestamp: component.updated_at ?? component.created_at ?? "",
    };
  });
}

export function resolveDetailDashboardRows(
  explicitRows: DetailDashboardRow[] | undefined,
  fallbackComponents: PlantComponentRow[],
): DetailDashboardRow[] {
  if (explicitRows && explicitRows.length > 0) return explicitRows;
  return plantComponentsToDetailDashboardRows(fallbackComponents);
}
