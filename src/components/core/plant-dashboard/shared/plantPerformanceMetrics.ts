import type { PlantRow } from "@/services/operations/plantAPI";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { PlantLiveData } from "@/types/plantLive";
import { normalizeStatus, toFiniteNumber } from "@/utils/plantLiveFormatters";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";
import {
  buildProcessedRows,
  calculatePerformanceRatio,
  firstNumber,
  resolveInsolation,
  resolveRowTodayGenerationKwh,
  resolveTodayExportKwh,
  resolveTodayGenerationKwh,
  resolveTodayImportKwh,
  type PlantProcessedRow,
} from "./plantLiveMetrics";

export interface ComponentGroupCounts {
  dcChannels: number;
  inverters: number;
  blocks: number;
}

export interface PlantPerformanceSummary {
  earningsTodayInr: number | null;
  maxEarningsPossibleInr: number | null;
  energyYield: number | null;
  performanceRatio: number | null;
  dcCuf: number | null;
  acCuf: number | null;
  nonAvailability: ComponentGroupCounts;
  lowPerforming: ComponentGroupCounts;
}

function resolveRowYield(row: PlantProcessedRow, dcCapacityKw: number | null): number | null {
  const todayGen = resolveRowTodayGenerationKwh(row);
  const capacity = dcCapacityKw ?? toFiniteNumber(row.component?.dc_capacity_kw);
  if (todayGen == null || capacity == null || capacity <= 0) return null;
  return todayGen / capacity;
}

function countByGroup(
  rows: PlantProcessedRow[],
  group: PlantProcessedRow["componentGroup"],
  predicate: (row: PlantProcessedRow) => boolean,
): number {
  return rows.filter((row) => row.componentGroup === group && predicate(row)).length;
}

function resolveComponentStatus(
  plantLive: PlantLiveData | null,
  componentId: string,
  fields: Record<string, unknown>,
): ReturnType<typeof normalizeStatus> {
  for (const device of Object.values(plantLive?.devices ?? {})) {
    const live = device.components?.[componentId];
    if (live) return normalizeStatus(live.status);
  }
  return normalizeStatus(fields.status ?? fields.communication_status);
}

function isOfflineRow(row: PlantProcessedRow, plantLive: PlantLiveData | null): boolean {
  return resolveComponentStatus(plantLive, row.componentId, row.fields) === "offline";
}

function isLowPerformingRow(
  row: PlantProcessedRow,
  plantLive: PlantLiveData | null,
  plantYield: number | null,
  avgPr: number | null,
  plantDcCuf: number | null,
  insolation: number | null,
): boolean {
  if (isOfflineRow(row, plantLive)) return false;

  const rowYield = resolveRowYield(row, toFiniteNumber(row.component?.dc_capacity_kw));
  if (rowYield != null && plantYield != null && plantYield > 0) {
    return rowYield < plantYield * 0.65;
  }

  const rowPr = calculatePerformanceRatio({
    todayGenerationKwh: resolveRowTodayGenerationKwh(row),
    dcCapacityKw: toFiniteNumber(row.component?.dc_capacity_kw),
    insolationKwhM2: insolation,
  });
  if (rowPr != null) {
    if (avgPr != null && avgPr > 0 && rowPr < avgPr * 0.75) return true;
    if (rowPr < 65) return true;
  }

  const rowTodayGen = resolveRowTodayGenerationKwh(row);
  const dcKw = toFiniteNumber(row.component?.dc_capacity_kw);
  if (rowTodayGen != null && dcKw != null && dcKw > 0) {
    const rowCuf = (rowTodayGen / (dcKw * 24)) * 100;
    if (plantDcCuf != null && plantDcCuf > 0 && rowCuf < plantDcCuf * 0.65) {
      return true;
    }
  }

  if (rowTodayGen === 0 && dcKw != null && dcKw > 0) {
    return true;
  }

  const livePower = firstNumber(row.fields, ["act_power", "active_power", "power", "dc_power"]);
  if (
    rowTodayGen != null &&
    rowTodayGen > 0 &&
    livePower != null &&
    livePower <= 0 &&
    dcKw != null &&
    dcKw > 0
  ) {
    return true;
  }

  return false;
}

export function buildPlantPerformanceSummary(args: {
  plant: PlantRow | null;
  plantLive: PlantLiveData | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): PlantPerformanceSummary {
  const { plant, plantLive, processedByComponentId, componentById } = args;
  const rows = buildProcessedRows({ processedByComponentId, componentById });

  const todayGenerationKwh = resolveTodayGenerationKwh(rows);
  const dcCapacityKw = toFiniteNumber(plant?.dc_capacity_kw);
  const dcCapacityMwp = (dcCapacityKw ?? 0) / 1000;
  const acCapacityMw = (toFiniteNumber(plant?.ac_capacity_kw) ?? 0) / 1000;
  const insolation = resolveInsolation(rows);
  const ppaRate = toFiniteNumber(plant?.ppa_rate);

  const energyYield =
    todayGenerationKwh != null && dcCapacityMwp > 0
      ? todayGenerationKwh / (dcCapacityMwp * 1000)
      : null;

  const performanceRatio = calculatePerformanceRatio({
    todayGenerationKwh,
    dcCapacityKw,
    insolationKwhM2: insolation,
  });

  const rowPrValues = rows
    .filter((row) => row.componentGroup === "inverter" || row.componentGroup === "dc_channel")
    .map((row) =>
      calculatePerformanceRatio({
        todayGenerationKwh: resolveRowTodayGenerationKwh(row),
        dcCapacityKw: toFiniteNumber(row.component?.dc_capacity_kw),
        insolationKwhM2: insolation,
      }),
    )
    .filter((value): value is number => value != null && value > 0);
  const avgRowPr =
    rowPrValues.length > 0
      ? rowPrValues.reduce((sum, value) => sum + value, 0) / rowPrValues.length
      : performanceRatio;

  const dcCuf =
    todayGenerationKwh != null && dcCapacityMwp > 0
      ? (todayGenerationKwh / (dcCapacityMwp * 1000 * 24)) * 100
      : null;

  const acCuf =
    todayGenerationKwh != null && acCapacityMw > 0
      ? (todayGenerationKwh / (acCapacityMw * 1000 * 24)) * 100
      : null;

  const todayExportKwh = resolveTodayExportKwh(rows, todayGenerationKwh);
  const todayImportKwh = resolveTodayImportKwh(rows);
  const todayNetExportKwh =
    todayExportKwh != null || todayImportKwh != null
      ? Math.max(0, (todayExportKwh ?? 0) - (todayImportKwh ?? 0))
      : null;

  const billableKwhToday = todayNetExportKwh ?? todayGenerationKwh;

  const earningsTodayInr =
    billableKwhToday != null && ppaRate != null && ppaRate > 0
      ? billableKwhToday * ppaRate
      : null;

  const maxEarningsPossibleInr =
    ppaRate != null && ppaRate > 0
      ? dcCapacityMwp > 0 && insolation != null && insolation > 0
        ? dcCapacityMwp * 1000 * insolation * ppaRate
        : earningsTodayInr != null && dcCuf != null && dcCuf > 0
          ? earningsTodayInr * (100 / dcCuf)
          : billableKwhToday != null && energyYield != null && energyYield > 0
            ? (billableKwhToday / energyYield) * (toFiniteNumber(plant?.expected_yield_kwh_kwp) ?? 5) * ppaRate
            : null
      : null;

  const offline = (row: PlantProcessedRow) => isOfflineRow(row, plantLive);
  const lowPerforming = (row: PlantProcessedRow) =>
    isLowPerformingRow(row, plantLive, energyYield, avgRowPr, dcCuf, insolation);

  return {
    earningsTodayInr,
    maxEarningsPossibleInr,
    energyYield,
    performanceRatio,
    dcCuf,
    acCuf,
    nonAvailability: {
      dcChannels: countByGroup(rows, "dc_channel", offline),
      inverters: countByGroup(rows, "inverter", offline),
      blocks: countByGroup(rows, "block", offline),
    },
    lowPerforming: {
      dcChannels: countByGroup(rows, "dc_channel", lowPerforming),
      inverters: countByGroup(rows, "inverter", lowPerforming),
      blocks: countByGroup(rows, "block", lowPerforming),
    },
  };
}
