import type { Option } from "@/components/common/AsyncSelect";
import type { FilterFieldConfig, FilterValues } from "@/components/core/table/CommonFilterPanel";
import CommonFilterPanel from "@/components/core/table/CommonFilterPanel";
import type {
  CompareMetric,
  MainDashboardFilters,
  PlantOperationalStatus,
  RevenueType,
  TimeRangePreset,
} from "../types/dashboard.types";
import { DEFAULT_MAIN_DASHBOARD_FILTERS } from "../types/dashboard.types";
import {
  COMPARE_METRIC_OPTIONS,
  REVENUE_TYPE_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TIME_RANGE_OPTIONS,
} from "./plantMetricUtils";

const { parseMultiSelectOptions } = CommonFilterPanel;

export const PLANT_DASHBOARD_FILTER_ENTITY_KEY = "main-dashboard-plants";

export const PLANT_DASHBOARD_FILTER_DEFAULTS: FilterValues = {
  time_range: "today",
  compare_by: "yield",
  revenue_type: "net",
  capacity_min: "0",
  capacity_max: "100000",
  status: "",
  selected_plants: "",
  custom_date_start: "",
  custom_date_end: "",
};

export function buildPlantDashboardFilterFields(
  plantOptions: Option[],
  capacityBounds: { min: number; max: number },
): FilterFieldConfig[] {
  return [
    {
      key: "time_range",
      label: "Time Range",
      type: "select",
      options: TIME_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      key: "custom_date_start",
      label: "Custom From",
      type: "date",
    },
    {
      key: "custom_date_end",
      label: "Custom To",
      type: "date",
    },
    {
      key: "compare_by",
      label: "Compare By",
      type: "select",
      options: COMPARE_METRIC_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    },
    {
      key: "revenue_type",
      label: "Revenue Type",
      type: "select",
      options: REVENUE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      key: "status",
      label: "Status",
      type: "async-multiselect",
      placeholder: "All statuses",
      apiSearch: false,
      loadOptions: async () =>
        STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      key: "capacity_min",
      label: "Min DC Capacity (kW)",
      type: "number",
      min: capacityBounds.min,
      max: capacityBounds.max,
    },
    {
      key: "capacity_max",
      label: "Max DC Capacity (kW)",
      type: "number",
      min: capacityBounds.min,
      max: capacityBounds.max,
    },
    {
      key: "selected_plants",
      label: "Plants",
      type: "async-multiselect",
      placeholder: "All plants",
      apiSearch: false,
      loadOptions: async (search = "") => {
        const q = search.trim().toLowerCase();
        return plantOptions.filter((o) => o.label.toLowerCase().includes(q));
      },
    },
  ];
}

export function mainFiltersToFilterValues(filters: MainDashboardFilters): FilterValues {
  return {
    time_range: filters.timeRange,
    compare_by: filters.compareBy,
    revenue_type: filters.revenueType,
    capacity_min: String(filters.capacityMinKw),
    capacity_max: String(filters.capacityMaxKw),
    status: filters.status.length
      ? JSON.stringify(
          filters.status.map((value) => ({
            value,
            label: STATUS_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? value,
          })),
        )
      : "",
    selected_plants: filters.selectedPlantIds.length
      ? JSON.stringify(
          filters.selectedPlantIds.map((value) => ({ value, label: value })),
        )
      : "",
    custom_date_start: filters.customDateFrom ?? "",
    custom_date_end: filters.customDateTo ?? "",
  };
}

export function filterValuesToMainFilters(values: FilterValues): MainDashboardFilters {
  const status = parseMultiSelectOptions(values.status ?? "")
    .map((o) => o.value)
    .filter(Boolean) as PlantOperationalStatus[];

  const selectedPlantIds = parseMultiSelectOptions(values.selected_plants ?? "").map(
    (o) => o.value,
  );

  const capacityMin = Number(values.capacity_min);
  const capacityMax = Number(values.capacity_max);

  return {
    ...DEFAULT_MAIN_DASHBOARD_FILTERS,
    search: "",
    timeRange: (values.time_range as TimeRangePreset) || "today",
    compareBy: (values.compare_by as CompareMetric) || "yield",
    revenueType: (values.revenue_type as RevenueType) || "net",
    capacityMinKw: Number.isFinite(capacityMin) ? capacityMin : 0,
    capacityMaxKw: Number.isFinite(capacityMax) ? capacityMax : 100_000,
    status,
    selectedPlantIds,
    customDateFrom: values.custom_date_start || null,
    customDateTo: values.custom_date_end || null,
  };
}
