import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  normalizeProcessedData,
  resolveEquipmentViewFromCode,
  toFiniteNumber,
} from "@/utils/plantLiveFormatters";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";

export const GENERATION_FIELDS = [
  "today_generation_kwh",
  "today_generation",
  "today_energy_kwh",
  "today_energy",
  "daily_energy",
  "day_energy",
  "energy_today",
  "generation_kwh",
  "todayGeneration",
  "todayEnergy",
] as const;

export const TOTAL_GENERATION_FIELDS = [
  "total_generation_kwh",
  "total_generation",
  "totalGeneration",
  "total_energy_kwh",
  "total_energy",
  "lifetime_energy",
  "energy",
] as const;

export const DAY_FIRST_GENERATION_FIELDS = [
  "dayFirstGeneration",
  "day_first_generation",
  "day_first_gen_kwh",
] as const;

export const DAY_FIRST_EXPORT_FIELDS = [
  "dayFirstExport",
  "day_first_export",
  "dayFirstExportEnergy",
] as const;

export const DAY_FIRST_IMPORT_FIELDS = [
  "dayFirstImport",
  "day_first_import",
  "dayFirstImportEnergy",
] as const;

export const LIFETIME_EXPORT_FIELDS = [
  "act_energy_exp",
  "active_energy_export",
  "export_energy",
  "export_energy_kwh",
  "energy_export",
  "total_export_kwh",
  "total_export",
  "exportEnergy",
] as const;

export const LIFETIME_IMPORT_FIELDS = [
  "act_energy_imp",
  "active_energy_import",
  "import_energy",
  "import_energy_kwh",
  "energy_import",
  "total_import_kwh",
  "total_import",
  "importEnergy",
] as const;

/** Daily insolation (kWh/m²) — used for PR. Excludes instant irradiance (W/m²). */
export const INSOLATION_DAY_FIELDS = [
  "insolation",
  "isolation",
  "poa_insolation",
  "poa_irradiation",
  "poaToday",
  "poaDay",
  "irradiation_kwh_m2",
  "irradiation",
  "ghi_insolation",
  "daily_irradiation",
  "W-DHRPOA",
  "W-YLDPOA",
] as const;

export const INSOLATION_FIELDS = INSOLATION_DAY_FIELDS;

export const LIVE_POWER_FIELDS = [
  "act_power",
  "active_power",
  "dc_power",
  "power_kw",
  "power",
  "kw",
] as const;

export const TOTAL_IMPORT_ENERGY_FIELDS = LIFETIME_IMPORT_FIELDS;

export const TOTAL_EXPORT_ENERGY_FIELDS = LIFETIME_EXPORT_FIELDS;

export const TODAY_IMPORT_ENERGY_FIELDS = [
  "today_import_energy",
  "todayImportEnergy",
  "today_import_kwh",
  "today_import",
  "daily_import_energy",
] as const;

export const TODAY_EXPORT_ENERGY_FIELDS = [
  "today_export_energy",
  "todayExportEnergy",
  "today_export_kwh",
  "today_export",
  "daily_export_energy",
] as const;

export const YESTERDAY_GENERATION_FIELDS = [
  "yesterday_generation",
  "yesterday_generation_kwh",
  "yesterday_energy",
  "yesterdayGeneration",
  "yesterdayEnergy",
  "prev_day_generation",
  "prevDayGeneration",
  "previous_day_generation",
  "last_day_generation",
  "yday_generation",
  "yday_energy",
] as const;

export const YESTERDAY_IMPORT_FIELDS = [
  "yesterday_import",
  "yesterday_import_kwh",
  "yesterday_import_energy",
  "yesterdayImport",
  "yesterdayImportEnergy",
  "prev_day_import",
  "prevDayImport",
  "previous_day_import",
  "last_day_import",
  "yday_import",
] as const;

export const YESTERDAY_EXPORT_FIELDS = [
  "yesterday_export",
  "yesterday_export_kwh",
  "yesterday_export_energy",
  "yesterdayExport",
  "yesterdayExportEnergy",
  "prev_day_export",
  "prevDayExport",
  "previous_day_export",
  "last_day_export",
  "yday_export",
] as const;

export type PlantProcessedRow = {
  component: PlantComponentRow | undefined;
  componentId: string;
  componentType: string;
  componentGroup: ReturnType<typeof resolveEquipmentViewFromCode>;
  fields: Record<string, unknown>;
};

export function firstNumber(
  source: Record<string, unknown>,
  fields: readonly string[],
): number | null {
  const entries = Object.entries(source);
  for (const field of fields) {
    const direct = toFiniteNumber(source[field]);
    if (direct != null) return direct;

    const found = entries.find(([key]) => key.toLowerCase() === field.toLowerCase());
    const value = found ? toFiniteNumber(found[1]) : null;
    if (value != null) return value;
  }
  return null;
}

export function sumPositive(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && value >= 0);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0);
}

export function sumNullable(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0);
}

function resolveComputedDeltaKwh(
  fields: Record<string, unknown>,
  todayFields: readonly string[],
  totalFields: readonly string[],
  dayFirstFields: readonly string[],
): number | null {
  const direct = firstNumber(fields, todayFields);
  if (direct != null) return direct >= 0 ? direct : null;

  const total = firstNumber(fields, totalFields);
  const dayFirst = firstNumber(fields, dayFirstFields);
  if (total == null || dayFirst == null) return null;

  const delta = total - dayFirst;
  return delta >= 0 ? delta : null;
}

export function resolveRowTodayGenerationKwh(row: PlantProcessedRow): number | null {
  return resolveComputedDeltaKwh(
    row.fields,
    GENERATION_FIELDS,
    TOTAL_GENERATION_FIELDS,
    DAY_FIRST_GENERATION_FIELDS,
  );
}

function resolveRowTodayExportKwh(row: PlantProcessedRow): number | null {
  return resolveComputedDeltaKwh(
    row.fields,
    TODAY_EXPORT_ENERGY_FIELDS,
    LIFETIME_EXPORT_FIELDS,
    DAY_FIRST_EXPORT_FIELDS,
  );
}

function resolveRowTodayImportKwh(row: PlantProcessedRow): number | null {
  return resolveComputedDeltaKwh(
    row.fields,
    TODAY_IMPORT_ENERGY_FIELDS,
    LIFETIME_IMPORT_FIELDS,
    DAY_FIRST_IMPORT_FIELDS,
  );
}

export function maxPositive(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && value >= 0);
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

export function buildProcessedRows(args: {
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): PlantProcessedRow[] {
  const { processedByComponentId, componentById } = args;
  return Array.from(processedByComponentId.values()).map((processed) => {
    const component = componentById.get(processed.componentId);
    const componentType = String(component?.component_type ?? "");
    return {
      component,
      componentId: processed.componentId,
      componentType,
      componentGroup: resolveEquipmentViewFromCode(componentType),
      fields: normalizeProcessedData(processed.lastFields),
    };
  });
}

function meterRows(rows: PlantProcessedRow[]): PlantProcessedRow[] {
  return rows.filter((row) => row.componentGroup === "meter" || row.componentGroup === "plant");
}

function inverterRows(rows: PlantProcessedRow[]): PlantProcessedRow[] {
  return rows.filter((row) => row.componentGroup === "inverter");
}

export function resolveTodayGenerationKwh(rows: PlantProcessedRow[]): number | null {
  const inverterGeneration = sumNullable(inverterRows(rows).map(resolveRowTodayGenerationKwh));
  if (inverterGeneration != null) return inverterGeneration;

  const meterGeneration = maxPositive(meterRows(rows).map(resolveRowTodayGenerationKwh));
  if (meterGeneration != null) return meterGeneration;

  return maxPositive(rows.map(resolveRowTodayGenerationKwh));
}

export function resolveTotalGenerationKwh(
  rows: PlantProcessedRow[],
  todayGenerationKwh: number | null,
): number | null {
  const total = maxPositive(rows.map((row) => firstNumber(row.fields, TOTAL_GENERATION_FIELDS)));
  return total ?? todayGenerationKwh;
}

export function resolveInsolation(rows: PlantProcessedRow[]): number | null {
  const weather = maxPositive(
    rows
      .filter((row) => row.componentGroup === "weather_station")
      .map((row) => firstNumber(row.fields, INSOLATION_DAY_FIELDS)),
  );
  return weather ?? maxPositive(rows.map((row) => firstNumber(row.fields, INSOLATION_DAY_FIELDS)));
}

/**
 * PR (%) = todayGeneration / (DC MWp × 1000 × insolation kWh/m²) × 100
 */
export function calculatePerformanceRatio(args: {
  todayGenerationKwh: number | null;
  dcCapacityKw: number | null;
  insolationKwhM2: number | null;
}): number | null {
  const { todayGenerationKwh, dcCapacityKw, insolationKwhM2 } = args;
  const dcCapacityMwp = (dcCapacityKw ?? 0) / 1000;

  if (
    todayGenerationKwh == null ||
    dcCapacityMwp <= 0 ||
    insolationKwhM2 == null ||
    insolationKwhM2 <= 0
  ) {
    return null;
  }

  return (todayGenerationKwh / (dcCapacityMwp * 1000 * insolationKwhM2)) * 100;
}

export function resolveTotalImportKwh(rows: PlantProcessedRow[]): number | null {
  const meterImport = maxPositive(
    meterRows(rows).map((row) => firstNumber(row.fields, TOTAL_IMPORT_ENERGY_FIELDS)),
  );
  if (meterImport != null) return meterImport;
  return maxPositive(rows.map((row) => firstNumber(row.fields, TOTAL_IMPORT_ENERGY_FIELDS)));
}

export function resolveTotalExportKwh(rows: PlantProcessedRow[]): number | null {
  const meterExport = maxPositive(
    meterRows(rows).map((row) => firstNumber(row.fields, LIFETIME_EXPORT_FIELDS)),
  );
  if (meterExport != null) return meterExport;

  const inverterTotal = sumPositive(
    inverterRows(rows).map((row) => firstNumber(row.fields, TOTAL_GENERATION_FIELDS)),
  );
  if (inverterTotal != null) return inverterTotal;

  return maxPositive(rows.map((row) => firstNumber(row.fields, LIFETIME_EXPORT_FIELDS)));
}

export function resolveTodayImportKwh(rows: PlantProcessedRow[]): number | null {
  const meterImport = sumNullable(meterRows(rows).map(resolveRowTodayImportKwh));
  if (meterImport != null) return meterImport;
  return maxPositive(rows.map(resolveRowTodayImportKwh));
}

export function resolveTodayExportKwh(
  rows: PlantProcessedRow[],
  todayGenerationKwh: number | null,
): number | null {
  const meterExport = sumNullable(meterRows(rows).map(resolveRowTodayExportKwh));
  if (meterExport != null) return meterExport;

  const inverterExport = sumNullable(inverterRows(rows).map(resolveRowTodayExportKwh));
  if (inverterExport != null) return inverterExport;

  if (todayGenerationKwh != null) return todayGenerationKwh;
  return maxPositive(rows.map(resolveRowTodayExportKwh));
}

function resolveLivePowerKw(row: PlantProcessedRow): number | null {
  return firstNumber(row.fields, LIVE_POWER_FIELDS);
}

export function resolveLiveSolarPowerKw(rows: PlantProcessedRow[]): number | null {
  const inverterPower = sumPositive(inverterRows(rows).map(resolveLivePowerKw));
  if (inverterPower != null && inverterPower > 0) return inverterPower;

  const blockPower = sumPositive(
    rows
      .filter((row) => row.componentGroup === "block" || row.componentGroup === "acdb")
      .map(resolveLivePowerKw),
  );
  if (blockPower != null && blockPower > 0) return blockPower;

  return sumPositive(rows.map(resolveLivePowerKw));
}

function resolveMeterImportPowerKw(rows: PlantProcessedRow[]): number | null {
  return sumPositive(
    meterRows(rows).map((row) => {
      const power = resolveLivePowerKw(row);
      if (power == null) return null;
      return power > 0 ? power : null;
    }),
  );
}

function resolveMeterExportPowerKw(rows: PlantProcessedRow[]): number | null {
  const meterPowers = meterRows(rows)
    .map((row) => {
      const power = resolveLivePowerKw(row);
      if (power == null) return null;
      return power < 0 ? Math.abs(power) : power;
    })
    .filter((value): value is number => value != null && value > 0);

  if (meterPowers.length === 0) return null;
  return Math.max(...meterPowers);
}

export interface LivePowerBreakdownKw {
  solarKw: number | null;
  auxKw: number | null;
  exportKw: number | null;
}

/** Resolves solar / aux / export live power in one pass (no mutual recursion). */
export function resolveLivePowerBreakdownKw(rows: PlantProcessedRow[]): LivePowerBreakdownKw {
  const solarKw = resolveLiveSolarPowerKw(rows);
  const meterImportKw = resolveMeterImportPowerKw(rows);
  const meterExportKw = resolveMeterExportPowerKw(rows);

  if (meterImportKw != null && meterImportKw > 0) {
    const exportKw =
      meterExportKw ??
      (solarKw != null ? Math.max(0, solarKw - meterImportKw) : null);
    return { solarKw, auxKw: meterImportKw, exportKw };
  }

  if (meterExportKw != null && meterExportKw > 0) {
    const auxKw =
      solarKw != null ? Math.max(0, solarKw - meterExportKw) : 0;
    return { solarKw, auxKw, exportKw: meterExportKw };
  }

  if (solarKw != null) {
    return { solarKw, auxKw: 0, exportKw: solarKw };
  }

  return { solarKw: null, auxKw: null, exportKw: null };
}

export function resolveLiveExportPowerKw(rows: PlantProcessedRow[]): number | null {
  return resolveLivePowerBreakdownKw(rows).exportKw;
}

export function resolveLiveAuxPowerKw(rows: PlantProcessedRow[]): number | null {
  return resolveLivePowerBreakdownKw(rows).auxKw;
}

export function kwToMw(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value / 1000;
}

export function kwhToMwh(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value / 1000;
}
