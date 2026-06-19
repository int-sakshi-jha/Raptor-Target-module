import { useCallback, useMemo } from "react";
import { useGetDeviceNamesQuery } from "@/services/operations/deviceAPI";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveMqtt } from "@/hooks/usePlantLiveMqtt";
import {
  buildEquipmentRows,
  buildHeatmapRows,
  type BuildEquipmentRowsParams,
  type BuildHeatmapRowsParams,
  type PlantEquipmentAnalysisMode,
  type PlantEquipmentHeatmapRow,
  type PlantEquipmentLiveRow,
} from "@/lib/plant/plantLiveRows";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";

export type {
  PlantEquipmentAnalysisMode,
  PlantEquipmentHeatmapRow,
  PlantEquipmentLiveRow,
} from "@/lib/plant/plantLiveRows";

export interface UsePlantLiveDataParams {
  plantId?: string;
  enabled?: boolean;
}

export interface UsePlantLiveEquipmentFilter {
  analysisMode: PlantEquipmentAnalysisMode;
  componentType: EquipmentFilterComponentType;
  meterType?: string;
  blockId?: string;
  acdbId?: string;
  inverterId?: string;
  deviceId?: string;
  startDate: string;
  endDate: string;
  interval?: string;
  search?: string;
  preserveArrays?: boolean;
}

export interface UsePlantLiveDataResult {
  plantLive: ReturnType<typeof usePlantLiveMqtt>["plantLive"];
  connectionState: ReturnType<typeof usePlantLiveMqtt>["connectionState"];
  hasLiveData: boolean;
  liveIndex: ReturnType<typeof usePlantLiveMqtt>["liveIndex"];
  getComponentLive: ReturnType<typeof usePlantLiveMqtt>["getComponentLive"];
  processedByComponentId: ReturnType<typeof usePlantLiveMqtt>["processedByComponentId"];
  findLive: ReturnType<typeof usePlantLiveMqtt>["findLive"];
  getLiveByType: ReturnType<typeof usePlantLiveMqtt>["getLiveByType"];
  getLiveByEquipmentType: ReturnType<typeof usePlantLiveMqtt>["getLiveByEquipmentType"];
  components: ReturnType<typeof usePlantComponents>["components"];
  componentById: ReturnType<typeof usePlantComponents>["componentById"];
  isComponentsLoading: boolean;
  deviceNameById: ReadonlyMap<string, string>;
  getEquipmentRows: (filter: UsePlantLiveEquipmentFilter) => PlantEquipmentLiveRow[];
  getHeatmapRows: (
    filter: Pick<BuildHeatmapRowsParams, "endDate" | "blockId" | "acdbId" | "inverterId">,
  ) => PlantEquipmentHeatmapRow[];
}

export function usePlantLiveData(
  params: UsePlantLiveDataParams = {},
): UsePlantLiveDataResult {
  const { plantId, enabled = true } = params;

  const plantComponents = usePlantComponents({
    plantId,
    enabled,
  });

  const componentTypeById = useMemo(() => {
    const map = new Map<string, string>();
    plantComponents.components.forEach((component) => {
      map.set(component.id, component.component_type);
    });
    return map;
  }, [plantComponents.components]);

  const mqtt = usePlantLiveMqtt({
    plantId,
    enabled,
    componentTypeById,
  });

  const devicesQuery = useGetDeviceNamesQuery({
    plantId,
    limit: 100,
    enabled: enabled && Boolean(plantId),
  });

  const deviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    (devicesQuery.data ?? []).forEach((device) => {
      map.set(device.value, device.label);
    });
    return map;
  }, [devicesQuery.data]);

  const getEquipmentRows = useCallback(
    (filter: UsePlantLiveEquipmentFilter) =>
      buildEquipmentRows({
        plantLive: mqtt.plantLive,
        componentById: plantComponents.componentById,
        deviceNameById,
        processedByComponentId: mqtt.processedByComponentId,
        meterType: filter.meterType ?? "",
        blockId: filter.blockId ?? "",
        acdbId: filter.acdbId ?? "",
        inverterId: filter.inverterId ?? "",
        deviceId: filter.deviceId ?? "",
        interval: filter.interval ?? "",
        search: filter.search ?? "",
        preserveArrays: filter.preserveArrays ?? false,
        ...filter,
      } satisfies BuildEquipmentRowsParams),
    [deviceNameById, mqtt.plantLive, mqtt.processedByComponentId, plantComponents.componentById],
  );

  const getHeatmapRows = useCallback(
    (
      filter: Pick<BuildHeatmapRowsParams, "endDate" | "blockId" | "acdbId" | "inverterId">,
    ) =>
      buildHeatmapRows({
        plantLive: mqtt.plantLive,
        componentById: plantComponents.componentById,
        deviceNameById,
        endDate: filter.endDate,
        blockId: filter.blockId,
        acdbId: filter.acdbId,
        inverterId: filter.inverterId,
      }),
    [deviceNameById, mqtt.plantLive, plantComponents.componentById],
  );

  return {
    plantLive: mqtt.plantLive,
    connectionState: mqtt.connectionState,
    hasLiveData: mqtt.hasLiveData,
    liveIndex: mqtt.liveIndex,
    getComponentLive: mqtt.getComponentLive,
    processedByComponentId: mqtt.processedByComponentId,
    findLive: mqtt.findLive,
    getLiveByType: mqtt.getLiveByType,
    getLiveByEquipmentType: mqtt.getLiveByEquipmentType,
    components: plantComponents.components,
    componentById: plantComponents.componentById,
    isComponentsLoading: plantComponents.isComponentsLoading,
    deviceNameById,
    getEquipmentRows,
    getHeatmapRows,
  };
}
