import { useMemo } from "react";
import type { PlantComponentRow, PlantRow } from "@/services/operations/plantAPI";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import {
  resolveEquipmentViewFromCode,
  toFiniteNumber,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";
import {
  DEVICES_OVERVIEW_TYPES,
  type DevicesOverviewDeviceType,
} from "../devices-overview/devicesOverview";
import type {
  DevicesOverviewWidgetConfig,
  PlantDashboardConfig,
  PlantDashboardGroupItem,
  PlantDashboardItem,
  PlantDashboardWidgetItem,
  PlantDashboardWidgetType,
  PlantStatsMetricId,
  PlantStatsWidgetConfig,
} from "./dashboardTypes";
import { DEFAULT_PLANT_DASHBOARD_CONFIG } from "./defaultDashboardConfig";

const OVERVIEW_TYPE_ORDER: EquipmentFilterComponentType[] = [
  "inverter",
  "meter",
  "dc_channel",
  "weather_station",
  "block",
  "acdb",
  "tracker",
];

export interface PlantDashboardCapabilities {
  hasInverters: boolean;
  hasMeters: boolean;
  hasWeatherStations: boolean;
  hasDcChannels: boolean;
  hasBlocks: boolean;
  hasPpaRate: boolean;
  hasDcCapacity: boolean;
  hasCommissioningDate: boolean;
  inverterCount: number;
  enabledDevicesOverviewTypes: DevicesOverviewDeviceType["id"][];
  defaultDevicesOverviewType: DevicesOverviewDeviceType["id"];
}

function buildCapabilities(
  plant: PlantRow | null | undefined,
  components: readonly PlantComponentRow[],
): PlantDashboardCapabilities {
  const counts = new Map<EquipmentFilterComponentType, number>();
  components.forEach((component) => {
    const group = resolveEquipmentViewFromCode(String(component.component_type ?? ""));
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });

  const count = (type: EquipmentFilterComponentType) => counts.get(type) ?? 0;
  const presentTypes = new Set(counts.keys());
  const enabledDevicesOverviewTypes = DEVICES_OVERVIEW_TYPES.filter((type) =>
    presentTypes.has(type.id),
  ).map((type) => type.id);

  return {
    hasInverters: count("inverter") > 0,
    hasMeters: count("meter") > 0,
    hasWeatherStations: count("weather_station") > 0,
    hasDcChannels: count("dc_channel") > 0,
    hasBlocks: count("block") > 0,
    hasPpaRate: (toFiniteNumber(plant?.ppa_rate) ?? 0) > 0,
    hasDcCapacity: (toFiniteNumber(plant?.dc_capacity_kw) ?? 0) > 0,
    hasCommissioningDate: Boolean(plant?.commissioning_date ?? plant?.cod_date),
    inverterCount: count("inverter"),
    enabledDevicesOverviewTypes,
    defaultDevicesOverviewType:
      OVERVIEW_TYPE_ORDER.find(
        (type) => presentTypes.has(type) && enabledDevicesOverviewTypes.includes(type),
      ) ??
      enabledDevicesOverviewTypes[0] ??
      "inverter",
  };
}

function isWidgetAvailable(
  type: PlantDashboardWidgetType,
  capabilities: PlantDashboardCapabilities,
): boolean {
  switch (type) {
    case "plantStats":
      return true;
    case "powerMeter":
      return capabilities.hasMeters || capabilities.hasInverters;
    case "generationGraph":
      return capabilities.hasInverters;
    case "earningsBreakdown":
      return capabilities.hasMeters || capabilities.hasInverters;
    case "performanceIndicator":
      return capabilities.hasInverters && capabilities.hasDcCapacity;
    case "nonAvailability":
      return capabilities.hasInverters || capabilities.hasDcChannels || capabilities.hasBlocks;
    case "lowPerformingComponents":
      return capabilities.hasInverters;
    case "devicesOverview":
      return capabilities.enabledDevicesOverviewTypes.length > 0;
    case "allTimeStats":
      return capabilities.hasInverters;
    case "weatherForecast":
      return true;
    case "alarmPanel":
      return true;
    default:
      return true;
  }
}

function isEnabled(item: PlantDashboardItem): boolean {
  return item.enabled !== false;
}

function plantStatsMetrics(capabilities: PlantDashboardCapabilities): PlantStatsMetricId[] {
  const metrics: PlantStatsMetricId[] = ["dailyYield"];
  if (capabilities.hasInverters) metrics.push("todayGenerationKwh", "performanceRatio");
  metrics.push("liveAlarms", "highImpactAlarms", "mostUnavailableComponent");
  if (capabilities.hasCommissioningDate) metrics.push("plantUptime");
  if (capabilities.hasInverters) metrics.push("treesPlanted", "coalSavedTon", "co2SavedTon");
  return metrics;
}

function applyWidgetConfig(
  item: PlantDashboardWidgetItem,
  capabilities: PlantDashboardCapabilities,
): PlantDashboardWidgetItem {
  const enabled = isWidgetAvailable(item.type, capabilities);

  if (item.type === "plantStats") {
    const visibleMetrics = plantStatsMetrics(capabilities);
    const config: PlantStatsWidgetConfig = {
      ...(item.config as PlantStatsWidgetConfig | undefined),
      visibleMetrics,
    };
    return { ...item, enabled, config };
  }

  if (item.type === "devicesOverview") {
    const config: DevicesOverviewWidgetConfig = {
      ...(item.config as DevicesOverviewWidgetConfig | undefined),
      defaultComponentType: capabilities.defaultDevicesOverviewType,
      enabledComponentTypes: capabilities.enabledDevicesOverviewTypes,
      defaultTimeRange: "live",
      showComponentTypeTabs: capabilities.enabledDevicesOverviewTypes.length > 1,
    };
    return { ...item, enabled, config };
  }

  if (item.type === "generationGraph") {
    return {
      ...item,
      enabled,
      config: { ...(item.config ?? {}), sourceGroups: capabilities.hasInverters ? ["inverter"] : [] },
    };
  }

  return { ...item, enabled };
}

function applyCapabilities(
  item: PlantDashboardItem,
  capabilities: PlantDashboardCapabilities,
): PlantDashboardItem {
  if (item.type === "group") {
    return {
      ...item,
      children: item.children.map((child) => applyCapabilities(child, capabilities)),
    };
  }
  return applyWidgetConfig(item, capabilities);
}

function pruneItem(item: PlantDashboardItem): PlantDashboardItem | null {
  if (!isEnabled(item)) return null;
  if (item.type !== "group") return item;

  const children = item.children
    .map(pruneItem)
    .filter((child): child is PlantDashboardItem => child != null);
  return children.length > 0 ? { ...item, children } : null;
}

function countWidgets(group: PlantDashboardGroupItem): number {
  let count = 0;
  const walk = (item: PlantDashboardItem) => {
    if (!isEnabled(item)) return;
    if (item.type === "group") {
      item.children.forEach(walk);
      return;
    }
    count += 1;
  };
  group.children.forEach(walk);
  return count;
}

function adjustLayouts(item: PlantDashboardItem): PlantDashboardItem {
  if (item.type !== "group") return item;

  let group: PlantDashboardGroupItem = {
    ...item,
    children: item.children.map(adjustLayouts),
  };

  if (group.id === "root") {
    const hasSideColumn = group.children.some((child) => child.id === "side-column");
    group = {
      ...group,
      className: "grid grid-cols-1 gap-2 xl:grid-cols-12 xl:items-stretch",
      children: group.children.map((child) => {
        if (child.id === "main-column" && child.type === "group") {
          return {
            ...child,
            className: hasSideColumn
              ? "flex h-full min-h-0 flex-col gap-2 xl:col-span-10 xl:col-start-1"
              : "flex h-full min-h-0 flex-col gap-2 xl:col-span-12 xl:col-start-1",
          };
        }
        if (child.id === "side-column" && child.type === "group") {
          return {
            ...child,
            className:
              "flex h-full min-h-0 flex-col gap-2 xl:col-span-2 xl:col-start-11 xl:row-start-1 xl:self-stretch",
          };
        }
        return child;
      }),
    };
  }

  if (group.id === "top-middle-row") {
    const visibleCount = countWidgets(group);
    group = {
      ...group,
      className:
        visibleCount >= 3
          ? "grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.1fr)] lg:items-stretch"
          : visibleCount === 2
            ? "grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:items-stretch"
            : "grid grid-cols-1 gap-2.5",
    };
  }

  if (group.id === "performance-grid") {
    const visibleCount = group.children.filter(isEnabled).length;
    const equalGrid =
      "grid h-full min-h-0 grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-2";
    group = {
      ...group,
      className:
        visibleCount <= 1
          ? "grid h-full min-h-0 grid-cols-1 gap-2"
          : visibleCount === 2
            ? "grid h-full min-h-0 grid-cols-2 gap-2"
            : visibleCount === 3
              ? `${equalGrid} [&>*:last-child]:col-span-2`
              : equalGrid,
    };
  }

  if (group.id === "side-column") {
    group = {
      ...group,
      className:
        "flex h-full min-h-0 flex-col gap-2 xl:col-span-2 xl:col-start-11 xl:row-start-1 xl:self-stretch",
    };
  }

  if (group.id === "main-column") {
    group = {
      ...group,
      className: "flex h-full min-h-0 flex-col gap-2 xl:col-span-10 xl:col-start-1",
    };
  }

  if (group.id === "bottom-overview-row") {
    const visibleCount = group.children.filter(isEnabled).length;
    group = {
      ...group,
      className:
        visibleCount <= 1
          ? "grid grid-cols-1 gap-2"
          : "grid grid-cols-1 gap-2 lg:grid-cols-2 lg:items-stretch",
    };
  }

  return group;
}

export function parsePlantDashboardOverride(
  plant: PlantRow | null | undefined,
): PlantDashboardConfig | null {
  const metadata = plant?.metadata;
  if (!metadata || typeof metadata !== "object") return null;

  const candidate =
    (metadata as { dashboard_config?: unknown }).dashboard_config ??
    (metadata as { plant_dashboard_config?: unknown }).plant_dashboard_config;

  if (!candidate || typeof candidate !== "object") return null;
  if (!("root" in candidate) || typeof (candidate as { root?: unknown }).root !== "object") {
    return null;
  }

  return candidate as PlantDashboardConfig;
}

export function resolvePlantDashboardConfig(args: {
  plant?: PlantRow | null;
  components?: readonly PlantComponentRow[];
  override?: PlantDashboardConfig | null;
  base?: PlantDashboardConfig;
}): PlantDashboardConfig {
  const capabilities = buildCapabilities(args.plant ?? null, args.components ?? []);
  const base = structuredClone(args.base ?? DEFAULT_PLANT_DASHBOARD_CONFIG);
  const withCapabilities = applyCapabilities(base.root, capabilities) as PlantDashboardGroupItem;
  const pruned = pruneItem(withCapabilities) ?? withCapabilities;
  const root = adjustLayouts(pruned) as PlantDashboardGroupItem;

  if (args.override?.root) {
    const overrideRoot = applyCapabilities(args.override.root, capabilities) as PlantDashboardGroupItem;
    const prunedOverride = pruneItem(overrideRoot) ?? overrideRoot;
    return {
      version: args.override.version ?? base.version,
      root: adjustLayouts(prunedOverride) as PlantDashboardGroupItem,
    };
  }

  return { version: base.version, root };
}

export function usePlantDashboardConfig(plantId?: string) {
  const plantComponents = usePlantComponents({ plantId });

  const config = useMemo(() => {
    if (plantId && !plantComponents.isReady) {
      return DEFAULT_PLANT_DASHBOARD_CONFIG;
    }

    return resolvePlantDashboardConfig({
      plant: plantComponents.plant,
      components: plantComponents.components,
      override: parsePlantDashboardOverride(plantComponents.plant),
    });
  }, [plantComponents.components, plantComponents.isReady, plantComponents.plant, plantId]);

  return {
    config,
    isLoading: plantComponents.isLoading,
    isReady: plantComponents.isReady,
  };
}
