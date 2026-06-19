import type {
  ComponentLivePayload,
  DeviceLiveData,
  PlantLiveData,
} from "@/types/plantLive";
import {
  normalizeComponentType,
} from "@/pages/plant/plant-components/shared";
import {
  resolveEquipmentViewFromCode,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";

export interface ComponentLiveEntry {
  componentId: string;
  deviceId: string;
  device: DeviceLiveData;
  component: ComponentLivePayload;
}

export interface PlantLiveFilter {
  componentId?: string;
  componentType?: string;
  deviceId?: string;
  equipmentType?: EquipmentFilterComponentType | "";
}

export interface PlantLiveIndex {
  plantLive: PlantLiveData;
  liveByComponentId: ReadonlyMap<string, ComponentLiveEntry>;
  liveByDeviceId: ReadonlyMap<string, readonly ComponentLiveEntry[]>;
  liveByComponentType: ReadonlyMap<string, readonly ComponentLiveEntry[]>;
  componentIds: readonly string[];
  deviceIds: readonly string[];
  entries: readonly ComponentLiveEntry[];
}

const EMPTY_ENTRIES: readonly ComponentLiveEntry[] = [];

export function buildPlantLiveIndex(
  plantLive: PlantLiveData | null | undefined,
  componentTypeById?: ReadonlyMap<string, string>,
): PlantLiveIndex | null {
  if (!plantLive) return null;

  const liveByComponentId = new Map<string, ComponentLiveEntry>();
  const liveByDeviceId = new Map<string, ComponentLiveEntry[]>();
  const liveByComponentType = new Map<string, ComponentLiveEntry[]>();
  const componentIds: string[] = [];
  const deviceIds: string[] = [];
  const entries: ComponentLiveEntry[] = [];

  for (const [deviceId, device] of Object.entries(plantLive.devices ?? {})) {
    deviceIds.push(deviceId);
    const deviceEntries: ComponentLiveEntry[] = [];

    for (const [componentId, component] of Object.entries(device.components ?? {})) {
      const entry: ComponentLiveEntry = {
        componentId,
        deviceId,
        device,
        component,
      };

      entries.push(entry);
      componentIds.push(componentId);
      liveByComponentId.set(componentId, entry);
      deviceEntries.push(entry);

      const type =
        componentTypeById?.get(componentId) ??
        normalizeComponentType(
          String(
            (component.processed_data as Record<string, unknown> | undefined)
              ?.component_type ?? "",
          ),
        );

      if (type) {
        const bucket = liveByComponentType.get(type);
        if (bucket) bucket.push(entry);
        else liveByComponentType.set(type, [entry]);
      }
    }

    if (deviceEntries.length > 0) {
      liveByDeviceId.set(deviceId, deviceEntries);
    }
  }

  return {
    plantLive,
    liveByComponentId,
    liveByDeviceId,
    liveByComponentType,
    componentIds,
    deviceIds,
    entries,
  };
}

export function findPlantLiveEntries(
  index: PlantLiveIndex | null,
  filter: PlantLiveFilter = {},
): readonly ComponentLiveEntry[] {
  if (!index) return EMPTY_ENTRIES;

  const { componentId, deviceId, componentType, equipmentType } = filter;

  if (componentId) {
    const entry = index.liveByComponentId.get(componentId);
    return entry ? [entry] : EMPTY_ENTRIES;
  }

  if (deviceId) {
    return index.liveByDeviceId.get(deviceId) ?? EMPTY_ENTRIES;
  }

  const normalizedType = normalizeComponentType(componentType);
  if (normalizedType) {
    return index.liveByComponentType.get(normalizedType) ?? EMPTY_ENTRIES;
  }

  if (equipmentType) {
    const matches: ComponentLiveEntry[] = [];
    for (const entry of index.entries) {
      const type = normalizeComponentType(
        String(
          (entry.component.processed_data as Record<string, unknown> | undefined)
            ?.component_type ?? "",
        ),
      );
      if (resolveEquipmentViewFromCode(type) === equipmentType) {
        matches.push(entry);
      }
    }
    return matches;
  }

  return index.entries;
}

export function getPlantComponentLive(
  index: PlantLiveIndex | null,
  componentId: string,
): ComponentLiveEntry | null {
  return index?.liveByComponentId.get(componentId) ?? null;
}
