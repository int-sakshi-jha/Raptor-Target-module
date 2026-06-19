import { toNumericArray } from "@/lib/plant/componentLiveData";
import type { PlantLiveData } from "@/types/plantLive";
import { resolveEquipmentViewFromCode } from "@/utils/plantLiveFormatters";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  buildProcessedRows,
  resolveLiveSolarPowerKw,
  type PlantProcessedRow,
} from "../shared/plantLiveMetrics";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";

const POWER_FIELD_KEYS = [
  "act_power",
  "active_power",
  "power",
  "dc_power",
  "calculatedActivePowerKW",
  "calculatedActivePower",
];

export interface GenerationCurvePoint {
  label: string;
  valueKw: number | null;
}

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 19;
const SLOT_MINUTES = 30;

export interface GenerationCurveOptions {
  sourceGroups?: string[];
  dayStartHour?: number;
  dayEndHour?: number;
  slotMinutes?: number;
}

function formatHourLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return m > 0
    ? `${displayHour}:${String(m).padStart(2, "0")} ${period}`
    : `${displayHour} ${period}`;
}

function buildSlotLabels(options: Required<GenerationCurveOptions>): string[] {
  const labels: string[] = [];
  for (
    let hour = options.dayStartHour;
    hour <= options.dayEndHour;
    hour += options.slotMinutes / 60
  ) {
    labels.push(formatHourLabel(hour));
  }
  return labels;
}

function resolveCurrentHour(now: Date): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

/** Index of the latest 30-min slot that has started (never includes future slots). */
function resolveCurrentSlotIndex(
  now: Date,
  slotCount: number,
  options: Required<GenerationCurveOptions>,
): number {
  const currentHour = resolveCurrentHour(now);

  if (currentHour < options.dayStartHour) {
    return -1;
  }

  if (currentHour >= options.dayEndHour) {
    return slotCount - 1;
  }

  const slotHours = options.slotMinutes / 60;
  return Math.floor((currentHour - options.dayStartHour) / slotHours);
}

function buildVisibleSlotLabels(now: Date, options: Required<GenerationCurveOptions>): string[] {
  const allLabels = buildSlotLabels(options);
  const currentIndex = resolveCurrentSlotIndex(now, allLabels.length, options);
  if (currentIndex < 0) return [];
  return allLabels.slice(0, currentIndex + 1);
}

function isArrayLike(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "string" && value.includes(","));
}

function normalizePowerKw(value: number, liveReferenceKw: number | null): number {
  if (!Number.isFinite(value)) return 0;
  if (liveReferenceKw != null && liveReferenceKw > 0) {
    if (value > liveReferenceKw * 4 && value / 1000 <= liveReferenceKw * 4) {
      return value / 1000;
    }
  }
  return value;
}

function normalizeSeries(values: number[], liveReferenceKw: number | null): number[] {
  return values
    .filter((value) => Number.isFinite(value))
    .map((value) => normalizePowerKw(value, liveReferenceKw));
}

function resampleSeriesToLabels(values: number[], labelCount: number): number[] {
  if (values.length === 0 || labelCount <= 0) return [];
  if (values.length === 1) {
    return Array.from({ length: labelCount }, () => values[0] ?? 0);
  }

  return Array.from({ length: labelCount }, (_, index) => {
    const position = (index / Math.max(labelCount - 1, 1)) * (values.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(values.length - 1, lower + 1);
    const weight = position - lower;
    const lowerValue = values[lower] ?? 0;
    const upperValue = values[upper] ?? lowerValue;
    return lowerValue + (upperValue - lowerValue) * weight;
  });
}

function extractInverterPowerArrays(args: {
  plantLive: PlantLiveData | null;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  liveReferenceKw: number | null;
  sourceGroups: string[];
}): number[][] {
  const { plantLive, componentById, liveReferenceKw, sourceGroups } = args;
  const allowedGroups = new Set(sourceGroups);
  const arrays: number[][] = [];

  Object.values(plantLive?.devices ?? {}).forEach((device) => {
    Object.entries(device.components ?? {}).forEach(([componentId, componentLive]) => {
      const component = componentById.get(componentId);
      const group = resolveEquipmentViewFromCode(String(component?.component_type ?? ""));
      if (!allowedGroups.has(group)) return;

      const processed = componentLive.processed_data ?? {};
      for (const key of POWER_FIELD_KEYS) {
        const raw = processed[key];
        if (!isArrayLike(raw)) continue;
        const values = normalizeSeries(toNumericArray(raw) as number[], liveReferenceKw).filter(
          (value) => value > 0,
        );
        if (values.length > 1) {
          arrays.push(values);
          break;
        }
      }
    });
  });

  return arrays;
}

function sumSeriesArrays(arrays: number[][]): number[] {
  const maxLength = Math.max(...arrays.map((values) => values.length), 0);
  if (maxLength === 0) return [];

  return Array.from({ length: maxLength }, (_, index) => {
    const values = arrays
      .map((series) => series[index])
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0);
  });
}

function buildFallbackCurve(
  rows: PlantProcessedRow[],
  now: Date,
  options: Required<GenerationCurveOptions>,
): GenerationCurvePoint[] {
  const visibleLabels = buildVisibleSlotLabels(now, options);
  if (visibleLabels.length === 0) return [];

  const liveKw = resolveLiveSolarPowerKw(rows);
  const currentIndex = visibleLabels.length - 1;

  return visibleLabels.map((label, index) => {
    if (liveKw == null) return { label, valueKw: null };
    if (currentIndex === 0) return { label, valueKw: liveKw };
    const ratio = index / currentIndex;
    return { label, valueKw: Math.max(0, liveKw * ratio) };
  });
}

export function buildGenerationCurve(args: {
  plantLive: PlantLiveData | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  now?: Date;
  options?: GenerationCurveOptions;
}): GenerationCurvePoint[] {
  const { plantLive, processedByComponentId, componentById, now = new Date() } = args;
  const options: Required<GenerationCurveOptions> = {
    sourceGroups: args.options?.sourceGroups?.length ? args.options.sourceGroups : ["inverter"],
    dayStartHour: args.options?.dayStartHour ?? DAY_START_HOUR,
    dayEndHour: args.options?.dayEndHour ?? DAY_END_HOUR,
    slotMinutes: args.options?.slotMinutes ?? SLOT_MINUTES,
  };
  const rows = buildProcessedRows({ processedByComponentId, componentById });
  const visibleLabels = buildVisibleSlotLabels(now, options);
  const liveKw = resolveLiveSolarPowerKw(rows);
  const arrays = extractInverterPowerArrays({
    plantLive,
    componentById,
    liveReferenceKw: liveKw,
    sourceGroups: options.sourceGroups,
  });

  if (visibleLabels.length === 0) {
    return [];
  }

  if (arrays.length === 0) {
    return buildFallbackCurve(rows, now, options);
  }

  const summed = sumSeriesArrays(arrays);
  const resampled = resampleSeriesToLabels(summed, visibleLabels.length);

  return visibleLabels.map((label, index) => {
    const value = resampled[index];
    return {
      label,
      valueKw: value != null && Number.isFinite(value) && value > 0 ? value : null,
    };
  });
}
