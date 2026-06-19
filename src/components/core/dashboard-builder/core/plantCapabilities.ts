import type { PlantComponentRow, PlantRow } from "@/services/operations/plantAPI";
import {
  resolveEquipmentViewFromCode,
  toFiniteNumber,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";
import type { WidgetCapabilityFlags } from "../registry/widgetLibrary";

export function buildWidgetCapabilityFlags(
  plant: PlantRow | null | undefined,
  components: readonly PlantComponentRow[],
): WidgetCapabilityFlags {
  const counts = new Map<EquipmentFilterComponentType, number>();
  components.forEach((component) => {
    const group = resolveEquipmentViewFromCode(String(component.component_type ?? ""));
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });

  const count = (type: EquipmentFilterComponentType) => counts.get(type) ?? 0;

  return {
    hasInverters: count("inverter") > 0,
    hasMeters: count("meter") > 0,
    hasWeatherStations: count("weather_station") > 0,
    hasDcChannels: count("dc_channel") > 0,
    hasBlocks: count("block") > 0,
    hasPpaRate: (toFiniteNumber(plant?.ppa_rate) ?? 0) > 0,
  };
}
