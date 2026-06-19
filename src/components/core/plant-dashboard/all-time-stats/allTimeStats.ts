import type { PlantRow } from "@/services/operations/plantAPI";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import { toFiniteNumber } from "@/utils/plantLiveFormatters";
import type { PlantProcessedByComponent } from "@/lib/plant/plantLiveProcessed";
import {
  buildProcessedRows,
  kwhToMwh,
  resolveTodayExportKwh,
  resolveTodayGenerationKwh,
  resolveTodayImportKwh,
  resolveTotalExportKwh,
  resolveTotalImportKwh,
} from "../shared/plantLiveMetrics";

export interface AllTimeStatsSummary {
  totalRevenueInr: number | null;
  totalExportMwh: number | null;
  totalConsumptionMwh: number | null;
  todayRevenueInr: number | null;
  netExportKwh: number | null;
  ppaRate: number | null;
}

function resolveNetExportKwh(totalExportKwh: number | null, totalImportKwh: number | null): number | null {
  if (totalExportKwh == null && totalImportKwh == null) return null;
  const exportKwh = totalExportKwh ?? 0;
  const importKwh = totalImportKwh ?? 0;
  const net = exportKwh - importKwh;
  return net > 0 ? net : 0;
}

function resolveRevenueInr(netExportKwh: number | null, ppaRate: number | null): number | null {
  if (netExportKwh == null || ppaRate == null || ppaRate <= 0) return null;
  return netExportKwh * ppaRate;
}

export function buildAllTimeStatsSummary(args: {
  plant: PlantRow | null;
  processedByComponentId: PlantProcessedByComponent;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): AllTimeStatsSummary {
  const { plant, processedByComponentId, componentById } = args;
  const rows = buildProcessedRows({ processedByComponentId, componentById });

  const todayGenerationKwh = resolveTodayGenerationKwh(rows);
  const totalExportKwh = resolveTotalExportKwh(rows);
  const totalImportKwh = resolveTotalImportKwh(rows);
  const todayExportKwh = resolveTodayExportKwh(rows, todayGenerationKwh);
  const todayImportKwh = resolveTodayImportKwh(rows);

  const ppaRate = toFiniteNumber(plant?.ppa_rate);
  const netExportKwh = resolveNetExportKwh(totalExportKwh, totalImportKwh);
  const todayNetExportKwh = resolveNetExportKwh(todayExportKwh, todayImportKwh);

  const revenueEnergyKwh =
    netExportKwh ?? (totalExportKwh != null ? totalExportKwh : null);

  return {
    totalRevenueInr: resolveRevenueInr(revenueEnergyKwh, ppaRate),
    totalExportMwh: kwhToMwh(totalExportKwh),
    totalConsumptionMwh: kwhToMwh(totalImportKwh),
    todayRevenueInr: resolveRevenueInr(todayNetExportKwh, ppaRate),
    netExportKwh,
    ppaRate,
  };
}
