import { format } from "date-fns";
import { buildWeatherStationRows } from "@/lib/plant/plantLiveRows";
import type { PlantEquipmentLiveRow } from "@/lib/plant/plantLiveRows";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";
import type { PlantLiveData } from "@/types/plantLive";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  normalizeProcessedData,
  resolveEquipmentViewFromCode,
} from "@/utils/plantLiveFormatters";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";
import {
  buildProcessedRows,
  firstNumber,
} from "../shared/plantLiveMetrics";

const POA_INSTANT_FIELDS = [
  "poaInstant",
  "poa",
  "irradiance",
  "gti",
  "gti_1",
  "W-POA",
] as const;

const POA_DAY_FIELDS = [
  "poaToday",
  "poaDay",
  "poa_irradiation",
  "poa_insolation",
  "irradiation_kwh_m2",
  "irradiation",
  "W-DHRPOA",
  "W-YLDPOA",
] as const;

const GHI_INSTANT_FIELDS = ["ghiInstant", "ghi", "W-GHI"] as const;

const AMBIENT_TEMP_FIELDS = [
  "ambientTemp",
  "ambient_temp",
  "temperature",
  "temp",
  "W-AMBTMP",
] as const;

const MODULE_TEMP_FIELDS = [
  "moduleTemp1",
  "moduleTemp2",
  "module_temp",
  "W-MODTMP1",
  "W-MODTMP2",
] as const;

const RAIN_FIELDS = ["rain", "rainfall", "W-RAIN"] as const;

const WIND_SPEED_FIELDS = ["windSpeed", "wind_speed", "W-WSPD"] as const;

const WIND_DIRECTION_FIELDS = ["windDirection", "wind_direction", "W-WDIR"] as const;

const SUNLIGHT_HOURS_FIELDS = [
  "sunlight_hours",
  "approx_sunlight",
  "sun_hours",
  "generationTime",
] as const;

const MIN_TEMP_FIELDS = ["minTemp", "min_temp", "temp_min", "W-MINTMP"] as const;

const MAX_TEMP_FIELDS = ["maxTemp", "max_temp", "temp_max", "W-MAXTMP"] as const;

const YESTERDAY_TEMP_FIELDS = ["yesterdayTemp", "yesterday_temp", "prev_day_temp"] as const;

const TOMORROW_TEMP_FIELDS = ["tomorrowTemp", "tomorrow_temp", "next_day_temp"] as const;

export interface WeatherMetricItem {
  label: string;
  value: string;
  unit?: string;
}

export interface WeatherForecastSummary {
  stationName: string | null;
  timestamp: string | null;
  currentTempC: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  yesterdayTempC: number | null;
  tomorrowTempC: number | null;
  displayDate: string;
  sunrise: string | null;
  sunset: string | null;
  metrics: WeatherMetricItem[];
  hasData: boolean;
}

function formatMetric(value: number | null, digits = 1, unit = ""): string {
  if (value == null || !Number.isFinite(value)) return "-";
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(digits, 2),
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatWindDirection(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value >= 0 && value <= 360) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(value / 45) % 8;
    return directions[index] ?? String(value);
  }
  return String(value);
}

function resolveTimestampFromFields(fields: Record<string, unknown>): string | null {
  const raw = fields.timestamp ?? fields.last_communication_at ?? fields.time;
  if (raw == null || raw === "") return null;
  const text = String(raw);
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    return format(new Date(parsed), "dd MMM yyyy, hh:mm a");
  }
  return text;
}

function fieldCount(fields: Record<string, unknown>): number {
  return Object.keys(fields).filter((key) => {
    const value = fields[key];
    return value != null && value !== "" && value !== "-";
  }).length;
}

function pickBestWeatherFields(
  candidates: Array<{ fields: Record<string, unknown>; stationName: string | null }>,
): { fields: Record<string, unknown>; stationName: string | null } | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, candidate) =>
    fieldCount(candidate.fields) > fieldCount(best.fields) ? candidate : best,
  );
}

function collectWeatherCandidates(args: {
  plantLive: PlantLiveData | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  now: Date;
}): Array<{ fields: Record<string, unknown>; stationName: string | null }> {
  const { plantLive, processedByComponentId, componentById, deviceNameById, now } = args;
  const candidates: Array<{ fields: Record<string, unknown>; stationName: string | null }> = [];
  const today = format(now, "yyyy-MM-dd");

  const tableRows = buildWeatherStationRows({
    plantLive,
    startDate: today,
    endDate: today,
    componentById,
    deviceNameById,
    search: "",
  });

  tableRows.forEach((row: PlantEquipmentLiveRow) => {
    candidates.push({
      fields: row as Record<string, unknown>,
      stationName: String(row.component_name ?? ""),
    });
  });

  buildProcessedRows({ processedByComponentId, componentById })
    .filter((row) => row.componentGroup === "weather_station")
    .forEach((row) => {
      candidates.push({
        fields: row.fields,
        stationName: row.component?.component_name ?? null,
      });
    });

  if (plantLive) {
    Object.values(plantLive.devices ?? {}).forEach((device) => {
      Object.entries(device.components ?? {}).forEach(([componentId, componentLive]) => {
        const meta = componentById.get(componentId);
        if (!meta) return;

        const resolvedType = resolveEquipmentViewFromCode(
          normalizeComponentType(meta.component_type),
        );
        if (resolvedType !== "weather_station") return;

        const rawProcessed =
          componentLive.processed_data && typeof componentLive.processed_data === "object"
            ? (componentLive.processed_data as Record<string, unknown>)
            : {};

        if (Object.keys(rawProcessed).length === 0) return;

        candidates.push({
          fields: normalizeProcessedData(rawProcessed),
          stationName: meta.component_name ?? null,
        });
      });
    });
  }

  return candidates;
}

export function buildWeatherForecastSummary(args: {
  plantLive: PlantLiveData | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  deviceNameById: ReadonlyMap<string, string>;
  now?: Date;
}): WeatherForecastSummary {
  const {
    plantLive,
    processedByComponentId,
    componentById,
    deviceNameById,
    now = new Date(),
  } = args;

  const picked = pickBestWeatherFields(
    collectWeatherCandidates({
      plantLive,
      processedByComponentId,
      componentById,
      deviceNameById,
      now,
    }),
  );

  const fields = picked?.fields ?? {};
  const stationName = picked?.stationName ?? null;

  const currentTempC = firstNumber(fields, AMBIENT_TEMP_FIELDS);
  const minTempC = firstNumber(fields, MIN_TEMP_FIELDS);
  const maxTempC = firstNumber(fields, MAX_TEMP_FIELDS);
  const yesterdayTempC = firstNumber(fields, YESTERDAY_TEMP_FIELDS);
  const tomorrowTempC = firstNumber(fields, TOMORROW_TEMP_FIELDS);
  const poa = firstNumber(fields, POA_INSTANT_FIELDS);
  const poaDay = firstNumber(fields, POA_DAY_FIELDS);
  const ghi = firstNumber(fields, GHI_INSTANT_FIELDS);
  const moduleTemp = firstNumber(fields, MODULE_TEMP_FIELDS);
  const rain = firstNumber(fields, RAIN_FIELDS);
  const windSpeed = firstNumber(fields, WIND_SPEED_FIELDS);
  const windDir = firstNumber(fields, WIND_DIRECTION_FIELDS);
  const sunlight = firstNumber(fields, SUNLIGHT_HOURS_FIELDS);

  const metrics: WeatherMetricItem[] = [
    { label: "POA", value: formatMetric(poa, 0), unit: "W/m²" },
    { label: "POA Irradiation", value: formatMetric(poaDay, 1), unit: "kWh/m²" },
    { label: "GHI", value: formatMetric(ghi, 0), unit: "W/m²" },
    { label: "Current Temp", value: formatMetric(currentTempC, 1), unit: "°C" },
    { label: "Module Temp", value: formatMetric(moduleTemp, 1), unit: "°C" },
    { label: "Rain Gauge", value: formatMetric(rain, 1), unit: "mm" },
    { label: "Wind Speed", value: formatMetric(windSpeed, 1), unit: "m/s" },
    { label: "Wind Direction", value: formatWindDirection(windDir) },
    { label: "Approx. Sunlight", value: formatMetric(sunlight, 1), unit: "hrs" },
  ];

  const hasData =
    picked != null &&
    (currentTempC != null ||
      poa != null ||
      ghi != null ||
      moduleTemp != null ||
      windSpeed != null ||
      poaDay != null);

  return {
    stationName,
    timestamp: resolveTimestampFromFields(fields),
    currentTempC,
    minTempC,
    maxTempC,
    yesterdayTempC,
    tomorrowTempC,
    displayDate: format(now, "dd MMMM yyyy"),
    sunrise:
      fields.sunrise != null && fields.sunrise !== ""
        ? String(fields.sunrise)
        : fields.sunrise_time != null && fields.sunrise_time !== ""
          ? String(fields.sunrise_time)
          : null,
    sunset:
      fields.sunset != null && fields.sunset !== ""
        ? String(fields.sunset)
        : fields.sunset_time != null && fields.sunset_time !== ""
          ? String(fields.sunset_time)
          : null,
    metrics,
    hasData,
  };
}
