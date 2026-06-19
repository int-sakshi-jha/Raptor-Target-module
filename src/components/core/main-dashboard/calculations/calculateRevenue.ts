import type { RevenueType } from "../types/dashboard.types";

export interface RevenueCalculationInput {
  revenueType: RevenueType;
  exportEnergyKwh?: number | null;
  importEnergyKwh?: number | null;
  todayGenerationKwh?: number | null;
  ppaRate?: number | null;
  customRate?: number | null;
  customFormula?: string | null;
}

function toFinite(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Frontend revenue engine — no hardcoded MQTT keys; callers pass resolved numeric inputs.
 */
export function calculateRevenue(input: RevenueCalculationInput): number | null {
  const exportKwh = toFinite(input.exportEnergyKwh);
  const importKwh = toFinite(input.importEnergyKwh);
  const generationKwh = toFinite(input.todayGenerationKwh);
  const ppaRate = toFinite(input.ppaRate);
  const customRate = toFinite(input.customRate ?? input.ppaRate);

  switch (input.revenueType) {
    case "export":
      return exportKwh * (ppaRate || customRate || 0);
    case "import":
      return importKwh * (ppaRate || customRate || 0);
    case "net":
      return (exportKwh - importKwh) * (ppaRate || customRate || 0);
    case "ppa":
      return generationKwh * ppaRate;
    case "custom":
      if (input.customFormula) {
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function(
            "exportKwh",
            "importKwh",
            "generationKwh",
            "ppaRate",
            "customRate",
            `return (${input.customFormula});`,
          ) as (
            exportKwh: number,
            importKwh: number,
            generationKwh: number,
            ppaRate: number,
            customRate: number,
          ) => number;
          const result = fn(exportKwh, importKwh, generationKwh, ppaRate, customRate);
          return Number.isFinite(result) ? result : null;
        } catch {
          return null;
        }
      }
      return generationKwh * customRate;
    default:
      return null;
  }
}

export function resolveRevenueTypeFromPlant(
  raw: string | number | null | undefined,
): RevenueType {
  const normalized = String(raw ?? "net").toLowerCase().trim();
  if (normalized.includes("export")) return "export";
  if (normalized.includes("import")) return "import";
  if (normalized.includes("ppa")) return "ppa";
  if (normalized.includes("custom")) return "custom";
  return "net";
}
