import { useMemo, useState } from "react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveMqtt } from "@/hooks/usePlantLiveMqtt";
import {
  buildTrackerZoneLiveBundle,
  buildTrackerZones,
  type TrackerZone,
  type TrackerZoneLiveBundle,
} from "@/lib/plant/trackerLiveData";

export interface UsePlantTrackerParams {
  plantId?: string;
}

export interface UsePlantTrackerResult {
  isLoading: boolean;
  hasTrackerComponents: boolean;
  connectionState: ReturnType<typeof usePlantLiveMqtt>["connectionState"];
  hasLiveData: boolean;
  lastMessageAt: Date | null;
  zones: TrackerZone[];
  activeZoneId: string;
  setActiveZoneId: (zoneId: string) => void;
  activeZone: TrackerZone | null;
  activeBundle: TrackerZoneLiveBundle | null;
  allBundles: TrackerZoneLiveBundle[];
  getZoneBundle: (parentId: string) => TrackerZoneLiveBundle | null;
}

export function usePlantTracker(params: UsePlantTrackerParams = {}): UsePlantTrackerResult {
  const { plantId } = params;

  const { components, componentById, isLoading: isComponentsLoading } = usePlantComponents({
    plantId,
  });

  const componentTypeById = useMemo(() => {
    const map = new Map<string, string>();
    components.forEach((component) => {
      map.set(component.id, component.component_type);
    });
    return map;
  }, [components]);

  const mqtt = usePlantLiveMqtt({
    plantId,
    componentTypeById,
  });

  const zones = useMemo(
    () => buildTrackerZones({ components, componentById }),
    [componentById, components],
  );

  const [activeZoneId, setActiveZoneId] = useState("");

  const resolvedActiveZoneId = useMemo(() => {
    if (zones.length === 0) return "";
    if (activeZoneId && zones.some((zone) => zone.parentId === activeZoneId)) {
      return activeZoneId;
    }
    return zones[0]?.parentId ?? "";
  }, [activeZoneId, zones]);

  const bundleByZoneId = useMemo(() => {
    const map = new Map<string, TrackerZoneLiveBundle>();
    for (const zone of zones) {
      map.set(
        zone.parentId,
        buildTrackerZoneLiveBundle({
          zone,
          processedCache: mqtt.processedByComponentId,
          getComponentLive: mqtt.getComponentLive,
        }),
      );
    }
    return map;
  }, [mqtt.getComponentLive, mqtt.processedByComponentId, zones]);

  const allBundles = useMemo(
    () => zones.map((zone) => bundleByZoneId.get(zone.parentId)!),
    [bundleByZoneId, zones],
  );

  const activeZone = useMemo(
    () => zones.find((zone) => zone.parentId === resolvedActiveZoneId) ?? null,
    [resolvedActiveZoneId, zones],
  );

  const activeBundle = useMemo(
    () => bundleByZoneId.get(resolvedActiveZoneId) ?? null,
    [bundleByZoneId, resolvedActiveZoneId],
  );

  const getZoneBundle = (parentId: string): TrackerZoneLiveBundle | null =>
    bundleByZoneId.get(parentId) ?? null;

  return {
    isLoading: isComponentsLoading,
    hasTrackerComponents: zones.length > 0,
    connectionState: mqtt.connectionState,
    hasLiveData: mqtt.hasLiveData,
    lastMessageAt: mqtt.lastMessageAt,
    zones,
    activeZoneId: resolvedActiveZoneId,
    setActiveZoneId,
    activeZone,
    activeBundle,
    allBundles,
    getZoneBundle,
  };
}
