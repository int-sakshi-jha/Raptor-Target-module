import type { CompareMetric, PlantDashboardMetrics } from "../types/dashboard.types";
import { formatNumber } from "@/utils/plantLiveFormatters";

export const COMPARE_METRIC_OPTIONS: Array<{ value: CompareMetric; label: string; unit: string }> = [
  { value: "yield", label: "Yield", unit: "kWh/kWp" },
  { value: "revenue", label: "Revenue", unit: "₹" },
  { value: "power", label: "Power", unit: "kW" },
  { value: "generation", label: "Generation", unit: "kWh" },
  { value: "export", label: "Export", unit: "kW" },
  { value: "import", label: "Import", unit: "kW" },
  { value: "ac_capacity", label: "AC Capacity", unit: "kW" },
  { value: "dc_capacity", label: "DC Capacity", unit: "kW" },
  { value: "alerts", label: "Alerts", unit: "" },
  { value: "pr", label: "Performance Ratio", unit: "%" },
  { value: "cuf", label: "CUF", unit: "%" },
];

export const TIME_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom Range" },
] as const;

export const REVENUE_TYPE_OPTIONS = [
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "net", label: "Net" },
  { value: "ppa", label: "PPA" },
  { value: "custom", label: "Custom" },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "partial", label: "Partial" },
  { value: "inactive", label: "Inactive" },
  { value: "unknown", label: "Unknown" },
] as const;

export function getCompareMetricValue(
  plant: PlantDashboardMetrics,
  metric: CompareMetric,
): number | null {
  switch (metric) {
    case "yield":
      return plant.yield;
    case "revenue":
      return plant.revenue;
    case "power":
      return plant.currentPowerKw;
    case "generation":
      return plant.todayGenerationKwh;
    case "export":
      return plant.exportPowerKw;
    case "import":
      return plant.importPowerKw;
    case "ac_capacity":
      return plant.acCapacityKw;
    case "dc_capacity":
      return plant.dcCapacityKw;
    case "alerts":
      return plant.alertsCount;
    case "pr":
      return plant.performanceRatio;
    case "cuf":
      return plant.cuf;
    default:
      return null;
  }
}

export function getCompareMetricLabel(metric: CompareMetric): string {
  return COMPARE_METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? metric;
}

export function getCompareMetricUnit(metric: CompareMetric): string {
  return COMPARE_METRIC_OPTIONS.find((o) => o.value === metric)?.unit ?? "";
}

export function formatPlantMetricValue(
  metric: CompareMetric,
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (metric === "revenue") {
    return `₹${formatNumber(value, 0)}`;
  }
  if (metric === "alerts") return String(Math.round(value));
  if (metric === "yield") return formatNumber(value, 2);
  if (metric === "pr" || metric === "cuf") return `${formatNumber(value, 1)}%`;
  return formatNumber(value, 2);
}

export function formatPowerKw(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, 2)} kW`;
}

export function formatEnergyKwh(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, 2)} kWh`;
}

export function formatCapacityKw(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, 2)} kW`;
}

/** Compact power display — MW when ≥ 1000 kW (matches dashboard card design). */
export function formatPowerDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, 1)} MW`;
  return `${formatNumber(value, 1)} kW`;
}

/** Compact energy display — MWh when ≥ 1000 kWh. */
export function formatEnergyDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, 0)} MWh`;
  return `${formatNumber(value, 1)} kWh`;
}

export function formatLastUpdateRelative(timestamp: string | null | undefined): string {
  if (!timestamp) return "Awaiting data";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Hr`;
  return `${Math.floor(hours / 24)} Day`;
}

export function getPlantUtilizationPercent(
  currentPowerKw: number | null | undefined,
  dcCapacityKw: number | null | undefined,
): number {
  if (
    currentPowerKw == null ||
    dcCapacityKw == null ||
    !Number.isFinite(currentPowerKw) ||
    !Number.isFinite(dcCapacityKw) ||
    dcCapacityKw <= 0
  ) {
    return 0;
  }
  return Math.min(100, Math.max(0, (currentPowerKw / dcCapacityKw) * 100));
}
