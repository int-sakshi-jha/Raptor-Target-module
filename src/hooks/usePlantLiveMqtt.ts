import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { PlantLiveData } from "@/types/plantLive";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import {
  findPlantLiveEntries,
  getPlantComponentLive,
  type ComponentLiveEntry,
  type PlantLiveFilter,
  type PlantLiveIndex,
} from "@/lib/plant/plantLiveIndex";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";
import {
  getComponentProcessed,
  type ComponentLiveProcessed,
  type PlantProcessedByComponent,
} from "@/lib/plant/plantLiveProcessed";
import {
  getPlantMqttStoreSnapshot,
  getPlantMqttTopic,
  setPlantMqttComponentTypes,
  subscribePlantMqttStore,
  type PlantMqttConnectionState,
} from "@/lib/plant/plantMqttManager";

export type { PlantMqttConnectionState, ComponentLiveEntry, PlantLiveFilter, PlantLiveIndex };

const EMPTY_LIVE_BY_COMPONENT_ID = new Map<string, ComponentLiveEntry>();
const EMPTY_PROCESSED_BY_COMPONENT = new Map<string, ComponentLiveProcessed>();

export interface UsePlantLiveMqttParams {
  plantId?: string;
  enabled?: boolean;
  /** Map component id → component type for faster live indexes. */
  componentTypeById?: ReadonlyMap<string, string>;
}

export interface UsePlantLiveMqttResult {
  connectionState: PlantMqttConnectionState;
  errorMessage: string | null;
  plantLive: PlantLiveData | null;
  lastMessageAt: Date | null;
  brokerUrl: string;
  subscribedTopic: string | null;
  configWarning: string | null;
  hasLiveData: boolean;
  liveIndex: PlantLiveIndex | null;
  liveByComponentId: ReadonlyMap<string, ComponentLiveEntry>;
  processedByComponentId: PlantProcessedByComponent;
  getComponentLive: (componentId: string) => ComponentLiveEntry | null;
  getComponentProcessed: (componentId: string) => ComponentLiveProcessed | null;
  findLive: (filter?: PlantLiveFilter) => readonly ComponentLiveEntry[];
  getLiveByType: (componentType: string) => readonly ComponentLiveEntry[];
  getLiveByEquipmentType: (
    equipmentType: EquipmentFilterComponentType,
  ) => readonly ComponentLiveEntry[];
}

export function usePlantLiveMqtt(
  plantIdOrParams?: string | UsePlantLiveMqttParams,
  legacyParams?: Pick<UsePlantLiveMqttParams, "enabled" | "componentTypeById">,
): UsePlantLiveMqttResult {
  const params: UsePlantLiveMqttParams =
    typeof plantIdOrParams === "string"
      ? { plantId: plantIdOrParams, ...legacyParams }
      : (plantIdOrParams ?? {});

  const { plantId, enabled = true, componentTypeById } = params;
  const active = enabled && Boolean(plantId);

  const componentTypesKey = useMemo(() => {
    if (!componentTypeById?.size) return "";
    const pairs: string[] = [];
    componentTypeById.forEach((type, componentId) => {
      pairs.push(`${componentId}:${type}`);
    });
    pairs.sort();
    return pairs.join("|");
  }, [componentTypeById]);

  useEffect(() => {
    if (!active || !plantId || !componentTypeById?.size) return;
    setPlantMqttComponentTypes(plantId, componentTypeById);
  }, [active, componentTypeById, componentTypesKey, plantId]);

  const snapshot = useSyncExternalStore(
    subscribePlantMqttStore,
    getPlantMqttStoreSnapshot,
    getPlantMqttStoreSnapshot,
  );

  const plantLive = useMemo(() => {
    if (!active || !plantId) return null;
    const live = snapshot.plantSnapshots.get(plantId) ?? null;
    if (!live) return null;
    return live.plant_id === plantId ? live : null;
  }, [active, plantId, snapshot.plantSnapshots]);

  const lastMessageAt = useMemo(() => {
    if (!active || !plantId) return null;
    return snapshot.lastMessageAtByPlant.get(plantId) ?? null;
  }, [active, plantId, snapshot.lastMessageAtByPlant]);

  const subscribedTopic = useMemo(() => {
    if (!active || !plantId) return null;
    if (!snapshot.subscribedPlantIds.has(plantId)) return null;
    return getPlantMqttTopic(plantId, snapshot.topicPrefix);
  }, [active, plantId, snapshot.subscribedPlantIds, snapshot.topicPrefix]);

  const liveIndex = useMemo(() => {
    if (!active || !plantId) return null;
    return snapshot.liveIndexByPlant.get(plantId) ?? null;
  }, [active, plantId, snapshot.liveIndexByPlant]);

  const liveByComponentId = liveIndex?.liveByComponentId ?? EMPTY_LIVE_BY_COMPONENT_ID;

  const processedByComponentId = useMemo(() => {
    if (!active || !plantId) return EMPTY_PROCESSED_BY_COMPONENT;
    return snapshot.processedByPlant.get(plantId) ?? EMPTY_PROCESSED_BY_COMPONENT;
  }, [active, plantId, snapshot.processedByPlant]);

  const getComponentLive = useCallback(
    (componentId: string) => getPlantComponentLive(liveIndex, componentId),
    [liveIndex],
  );

  const getComponentProcessedLive = useCallback(
    (componentId: string) => getComponentProcessed(processedByComponentId, componentId),
    [processedByComponentId],
  );

  const findLive = useCallback(
    (filter: PlantLiveFilter = {}) => findPlantLiveEntries(liveIndex, filter),
    [liveIndex],
  );

  const getLiveByType = useCallback(
    (componentType: string) =>
      findPlantLiveEntries(liveIndex, {
        componentType: normalizeComponentType(componentType),
      }),
    [liveIndex],
  );

  const getLiveByEquipmentType = useCallback(
    (equipmentType: EquipmentFilterComponentType) =>
      findPlantLiveEntries(liveIndex, { equipmentType }),
    [liveIndex],
  );

  const connectionState: PlantMqttConnectionState = !active
    ? "idle"
    : snapshot.connectionState;

  return {
    connectionState,
    errorMessage: snapshot.errorMessage,
    plantLive,
    lastMessageAt,
    brokerUrl: snapshot.brokerUrl,
    subscribedTopic,
    configWarning: snapshot.configWarning,
    hasLiveData: Boolean(plantLive),
    liveIndex,
    liveByComponentId,
    processedByComponentId,
    getComponentLive,
    getComponentProcessed: getComponentProcessedLive,
    findLive,
    getLiveByType,
    getLiveByEquipmentType,
  };
}
