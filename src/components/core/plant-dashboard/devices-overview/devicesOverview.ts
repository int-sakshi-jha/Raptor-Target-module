import {
  endOfDay,
  format,
  startOfDay,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import type { PlantEquipmentLiveRow } from "@/hooks/usePlantLiveData";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import { toFiniteNumber } from "@/utils/plantLiveFormatters";

export type DevicesOverviewTimeRange = "live" | "day" | "week" | "month" | "year" | "custom";

export interface DevicesOverviewDeviceType {
  id: EquipmentFilterComponentType;
  label: string;
}

export const DEVICES_OVERVIEW_TYPES: DevicesOverviewDeviceType[] = [
  { id: "inverter", label: "Inverters" },
  { id: "meter", label: "Meters" },
  { id: "dc_channel", label: "DC Channels" },
  { id: "weather_station", label: "Weather Stations" },
  { id: "block", label: "Blocks" },
  { id: "acdb", label: "ACDBs" },
  { id: "tracker", label: "Trackers" },
];

export const DEVICES_TIME_RANGES: { id: DevicesOverviewTimeRange; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
];

export interface DevicesOverviewDateRange {
  startDate: string;
  endDate: string;
  interval: string;
  label: string;
}

/** Preferred live/MQTT fields per equipment type for the overview table. */
export const DEVICES_OVERVIEW_FIELDS_BY_TYPE: Record<
  EquipmentFilterComponentType,
  readonly string[]
> = {
  all: ["component_name", "timestamp", "status"],
  "": ["component_name", "timestamp", "status"],
  plant: ["component_name", "timestamp", "status"],
  inverter: [
    "component_name",
    "timestamp",
    "status",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "act_power",
    "todayGeneration",
    "totalGeneration",
    "today_cuf",
    "today_pr",
    "act_energy_imp",
    "act_energy_exp",
  ],
  meter: [
    "component_name",
    "timestamp",
    "status",
    "meter_type",
    "act_power",
    "act_energy_imp",
    "act_energy_exp",
    "avg_pf",
    "frequency",
  ],
  dc_channel: [
    "component_name",
    "timestamp",
    "status",
    "inverter_name",
    "dc_capacity_kw",
    "dc_power",
    "dc_voltage",
    "todayGeneration",
    "today_cuf",
    "today_pr",
  ],
  weather_station: [
    "component_name",
    "timestamp",
    "status",
    "poaInstant",
    "poaToday",
    "ghiInstant",
    "ambientTemp",
    "moduleTemp1",
    "windSpeed",
    "windDirection",
    "rain",
  ],
  block: [
    "component_name",
    "timestamp",
    "status",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "act_power",
    "todayGeneration",
    "today_cuf",
    "today_pr",
  ],
  acdb: [
    "component_name",
    "timestamp",
    "status",
    "block_name",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "act_power",
    "todayGeneration",
  ],
  tracker: [
    "component_name",
    "timestamp",
    "status",
    "projected_angle",
    "actual_angle",
    "deviation",
    "is_tracking",
  ],
};

function normalizeCapacityKw(value: string | number | null | undefined): number | null {
  return toFiniteNumber(value);
}

export function enrichEquipmentRowsWithPlantDetails(
  rows: PlantEquipmentLiveRow[],
  componentById: ReadonlyMap<string, PlantComponentRow>,
): PlantEquipmentLiveRow[] {
  return rows.map((row) => {
    const componentId = String(row.component_id ?? row.id ?? "");
    const component = componentById.get(componentId);
    if (!component) return row;

    const acKw = normalizeCapacityKw(component.ac_capacity_kw);
    const dcKw = normalizeCapacityKw(component.dc_capacity_kw);

    return {
      ...row,
      ac_capacity_kw: acKw ?? row.ac_capacity_kw,
      dc_capacity_kw: dcKw ?? row.dc_capacity_kw,
      ac_capacity: acKw ?? row.ac_capacity,
      dc_capacity: dcKw ?? row.dc_capacity,
      
    };
  });
}

export function orderDevicesOverviewFields(
  rowKeys: string[],
  componentType: EquipmentFilterComponentType,
): string[] {
  const preferred = DEVICES_OVERVIEW_FIELDS_BY_TYPE[componentType] ?? DEVICES_OVERVIEW_FIELDS_BY_TYPE.inverter;
  return [
    ...preferred.filter((field) => rowKeys.includes(field)),
    ...rowKeys.filter((field) => !preferred.includes(field)),
  ];
}

export function resolveDevicesOverviewDateRange(args: {
  timeRange: DevicesOverviewTimeRange;
  customDate?: string;
  now?: Date;
}): DevicesOverviewDateRange {
  const { timeRange, customDate, now = new Date() } = args;
  const today = format(now, "yyyy-MM-dd");

  if (timeRange === "live" || timeRange === "day") {
    return { startDate: today, endDate: today, interval: "", label: format(now, "dd MMMM yyyy") };
  }

  if (timeRange === "week") {
    return {
      startDate: format(subWeeks(now, 1), "yyyy-MM-dd"),
      endDate: today,
      interval: "1day",
      label: `${format(subWeeks(now, 1), "dd MMM")} – ${format(now, "dd MMM yyyy")}`,
    };
  }

  if (timeRange === "month") {
    return {
      startDate: format(subMonths(now, 1), "yyyy-MM-dd"),
      endDate: today,
      interval: "1day",
      label: `${format(subMonths(now, 1), "dd MMM")} – ${format(now, "dd MMM yyyy")}`,
    };
  }

  if (timeRange === "year") {
    return {
      startDate: format(subYears(now, 1), "yyyy-MM-dd"),
      endDate: today,
      interval: "1day",
      label: `${format(subYears(now, 1), "dd MMM yyyy")} – ${format(now, "dd MMM yyyy")}`,
    };
  }

  const date = customDate && customDate.length > 0 ? customDate : today;
  return {
    startDate: date,
    endDate: date,
    interval: "1day",
    label: format(new Date(`${date}T12:00:00`), "dd MMMM yyyy"),
  };
}

export function filterRowsByTimeRange(
  rows: PlantEquipmentLiveRow[],
  timeRange: DevicesOverviewTimeRange,
  customDate?: string,
  now = new Date(),
): PlantEquipmentLiveRow[] {
  if (timeRange === "live") {
    return rows;
  }

  const range = resolveDevicesOverviewDateRange({ timeRange, customDate, now });
  const start = startOfDay(new Date(`${range.startDate}T00:00:00`)).getTime();
  const end = endOfDay(new Date(`${range.endDate}T23:59:59`)).getTime();

  return rows.filter((row) => {
    const raw = row.timestamp ?? row.last_communication_at;
    if (!raw) return timeRange === "day" || timeRange === "custom";
    const parsed = Date.parse(String(raw));
    if (!Number.isFinite(parsed)) return true;
    return parsed >= start && parsed <= end;
  });
}
