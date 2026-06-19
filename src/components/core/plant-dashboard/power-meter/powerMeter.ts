import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";
import {
  buildProcessedRows,
  firstNumber,
  kwhToMwh,
  kwToMw,
  resolveLivePowerBreakdownKw,
  resolveTodayExportKwh,
  resolveTodayGenerationKwh,
  resolveTodayImportKwh,
  sumNullable,
  YESTERDAY_EXPORT_FIELDS,
  YESTERDAY_GENERATION_FIELDS,
  YESTERDAY_IMPORT_FIELDS,
  type PlantProcessedRow,
} from "../shared/plantLiveMetrics";

export interface PowerMeterComparisonRow {
  todayMwh: number | null;
  yesterdayMwh: number | null;
}

export interface PowerMeterSummary {
  liveSolarGenerationMw: number | null;
  liveAuxConsumptionMw: number | null;
  liveTotalExportMw: number | null;
  solarGeneration: PowerMeterComparisonRow;
  auxConsumption: PowerMeterComparisonRow;
  totalExport: PowerMeterComparisonRow;
}

function sumYesterdayByGroup(
  rows: PlantProcessedRow[],
  groups: PlantProcessedRow["componentGroup"][],
  fields: readonly string[],
): number | null {
  const grouped = rows.filter((row) => groups.includes(row.componentGroup));
  const values = grouped.map((row) => firstNumber(row.fields, fields));
  const groupedSum = sumNullable(values);
  if (groupedSum != null) return groupedSum;

  return sumNullable(rows.map((row) => firstNumber(row.fields, fields)));
}

function resolveYesterdayGenerationKwh(rows: PlantProcessedRow[]): number | null {
  return sumYesterdayByGroup(rows, ["inverter", "plant"], YESTERDAY_GENERATION_FIELDS);
}

function resolveYesterdayImportKwh(rows: PlantProcessedRow[]): number | null {
  return sumYesterdayByGroup(rows, ["meter", "plant"], YESTERDAY_IMPORT_FIELDS);
}

function resolveYesterdayExportKwh(rows: PlantProcessedRow[]): number | null {
  return sumYesterdayByGroup(rows, ["meter", "plant"], YESTERDAY_EXPORT_FIELDS);
}

export function buildPowerMeterSummary(args: {
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): PowerMeterSummary {
  const { processedByComponentId, componentById } = args;
  const rows = buildProcessedRows({ processedByComponentId, componentById });

  const todayGenerationKwh = resolveTodayGenerationKwh(rows);
  const todayImportKwh = resolveTodayImportKwh(rows);
  const todayExportKwh = resolveTodayExportKwh(rows, todayGenerationKwh);

  const { solarKw: liveSolarKw, auxKw: liveAuxKw, exportKw: liveExportKw } =
    resolveLivePowerBreakdownKw(rows);

  return {
    liveSolarGenerationMw: kwToMw(liveSolarKw),
    liveAuxConsumptionMw: kwToMw(liveAuxKw),
    liveTotalExportMw: kwToMw(liveExportKw),
    solarGeneration: {
      todayMwh: kwhToMwh(todayGenerationKwh),
      yesterdayMwh: kwhToMwh(resolveYesterdayGenerationKwh(rows)),
    },
    auxConsumption: {
      todayMwh: kwhToMwh(todayImportKwh),
      yesterdayMwh: kwhToMwh(resolveYesterdayImportKwh(rows)),
    },
    totalExport: {
      todayMwh: kwhToMwh(todayExportKwh),
      yesterdayMwh: kwhToMwh(resolveYesterdayExportKwh(rows)),
    },
  };
}
