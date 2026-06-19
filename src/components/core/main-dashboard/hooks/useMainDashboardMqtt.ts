import { useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import {
  getPlantMqttStoreSnapshot,
  setDashboardPlantMqttIds,
  subscribePlantMqttStore,
} from "@/lib/plant/plantMqttManager";
import type { PlantLiveData } from "@/types/plantLive";

export function useMainDashboardMqtt(plantIds: string[]) {
  const stableIds = useMemo(
    () => [...new Set(plantIds.map((id) => id.trim()).filter(Boolean))].sort(),
    [plantIds],
  );
  const idsKey = stableIds.join(",");

  useEffect(() => {
    setDashboardPlantMqttIds(stableIds);
    return () => setDashboardPlantMqttIds([]);
  }, [idsKey, stableIds]);

  const snapshot = useSyncExternalStore(
    subscribePlantMqttStore,
    getPlantMqttStoreSnapshot,
    getPlantMqttStoreSnapshot,
  );

  const mqttByPlant = useMemo(() => {
    const map = new Map<string, PlantLiveData>();
    stableIds.forEach((plantId) => {
      const live = snapshot.plantSnapshots.get(plantId);
      if (live) map.set(plantId, live);
    });
    return map;
  }, [snapshot.plantSnapshots, stableIds]);

  return {
    mqttByPlant,
    connectionState: snapshot.connectionState,
    isConnected: snapshot.connectionState === "connected",
    subscribedPlantIds: snapshot.subscribedPlantIds,
  };
}
