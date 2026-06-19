import type { PlantRow } from "@/services/operations/plantAPI";
import type { PlantLiveData } from "@/types/plantLive";
import { normalizeStatus, toFiniteNumber } from "@/utils/plantLiveFormatters";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  buildProcessedRows,
  calculatePerformanceRatio,
  resolveInsolation,
  resolveTodayGenerationKwh,
  resolveTotalGenerationKwh,
} from "../shared/plantLiveMetrics";

const KWH_TO_CO2_TON = 800 / 1000 / 1000;
const CO2_TON_PER_TREE = 22;
const KWH_TO_COAL_TON = 0.4 / 1000;

export interface PlantUptimeDisplay {
  value: string;
  unit: string;
}

export interface PlantStatsSummary {
  dailyYield: number | null;
  todayGenerationKwh: number | null;
  performanceRatio: number | null;
  liveAlarms: number;
  highImpactAlarms: number;
  mostUnavailableComponent: string;
  plantUptime: PlantUptimeDisplay;
  treesPlanted: number | null;
  coalSavedTon: number | null;
  co2SavedTon: number | null;
}

function isHighImpactAlarm(alarm: Record<string, unknown>): boolean {
  const severity = String(alarm.severity ?? alarm.priority ?? alarm.level ?? "").toLowerCase();
  return ["critical", "high", "major", "urgent"].includes(severity);
}

export function formatPlantUptime(
  start: string | null | undefined,
  end: Date = new Date(),
): PlantUptimeDisplay {
  if (!start) return { value: "-", unit: "" };

  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return { value: "-", unit: "" };

  const totalDays = (end.getTime() - startMs) / (24 * 60 * 60 * 1000);
  if (totalDays < 0) return { value: "-", unit: "" };

  if (totalDays < 30) {
    const days = Math.max(1, Math.round(totalDays));
    return { value: String(days), unit: days === 1 ? "Day" : "Days" };
  }

  if (totalDays < 365) {
    const months = totalDays / 30.44;
    const rounded = months >= 10 ? Math.round(months) : Number(months.toFixed(1));
    return {
      value: String(rounded),
      unit: rounded === 1 ? "Month" : "Months",
    };
  }

  const years = totalDays / 365.25;
  return {
    value: years >= 10 ? years.toFixed(1) : years.toFixed(2),
    unit: years < 2 ? "Year" : "Years",
  };
}

function resolveUnavailableComponent(args: {
  plantLive: PlantLiveData | null;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): string {
  const { plantLive, componentById } = args;
  const counts = new Map<string, number>();

  Object.values(plantLive?.devices ?? {}).forEach((device) => {
    Object.values(device.components ?? {}).forEach((componentLive) => {
      if (normalizeStatus(componentLive.status) !== "offline") return;
      const component = componentById.get(componentLive.component_id);
      const type = component?.component_type || "Component";
      const label = String(type).toUpperCase();
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[1]} ${top[0]}` : "-";
}

export function buildPlantStatsSummary(args: {
  plant: PlantRow | null;
  plantLive: PlantLiveData | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  now?: Date;
}): PlantStatsSummary {
  const {
    plant,
    plantLive,
    processedByComponentId,
    componentById,
    now = new Date(),
  } = args;

  const rows = buildProcessedRows({ processedByComponentId, componentById });
  const todayGenerationKwh = resolveTodayGenerationKwh(rows);
  const totalGenerationKwh = resolveTotalGenerationKwh(rows, todayGenerationKwh);
  const dcCapacityKw = toFiniteNumber(plant?.dc_capacity_kw);
  const dcCapacityMwp = (dcCapacityKw ?? 0) / 1000;
  const insolation = resolveInsolation(rows);

  const performanceRatio = calculatePerformanceRatio({
    todayGenerationKwh,
    dcCapacityKw,
    insolationKwhM2: insolation,
  });
  const dailyYield =
    todayGenerationKwh != null && dcCapacityMwp > 0
      ? todayGenerationKwh / (dcCapacityMwp * 1000)
      : null;

  let liveAlarms = 0;
  let highImpactAlarms = 0;
  Object.values(plantLive?.devices ?? {}).forEach((device) => {
    Object.values(device.components ?? {}).forEach((component) => {
      const alarms = Array.isArray(component.alarms) ? component.alarms : [];
      liveAlarms += alarms.length;
      highImpactAlarms += alarms.filter(isHighImpactAlarm).length;
    });
  });

  const co2SavedTon = totalGenerationKwh != null ? totalGenerationKwh * KWH_TO_CO2_TON : null;

  return {
    dailyYield,
    todayGenerationKwh,
    performanceRatio,
    liveAlarms,
    highImpactAlarms,
    mostUnavailableComponent: resolveUnavailableComponent({ plantLive, componentById }),
    plantUptime: formatPlantUptime(plant?.commissioning_date ?? plant?.cod_date, now),
    treesPlanted: co2SavedTon != null ? co2SavedTon / CO2_TON_PER_TREE : null,
    coalSavedTon: totalGenerationKwh != null ? totalGenerationKwh * KWH_TO_COAL_TON : null,
    co2SavedTon,
  };
}
