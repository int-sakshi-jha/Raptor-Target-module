/**
 * Yield = TodayGeneration / DCCapacity
 * Returns kWh/kWp when both inputs are valid.
 */
export function calculateYield(
  todayGenerationKwh: number | null | undefined,
  dcCapacityKw: number | null | undefined,
): number | null {
  if (
    todayGenerationKwh == null ||
    dcCapacityKw == null ||
    !Number.isFinite(todayGenerationKwh) ||
    !Number.isFinite(dcCapacityKw) ||
    dcCapacityKw <= 0
  ) {
    return null;
  }
  return todayGenerationKwh / dcCapacityKw;
}
