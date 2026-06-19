import type {
  PlantDashboardConfig,
  PlantDashboardGroupItem,
  PlantDashboardItem,
  PlantDashboardWidgetItem,
  PlantDashboardWidgetType,
} from "./dashboardTypes";
import type { DashboardDocument, DashboardWidgetInstance, WidgetLibraryType } from "@/components/core/dashboard-builder/types/document";
import { WIDGET_LIBRARY_BY_TYPE } from "@/components/core/dashboard-builder/registry/widgetLibrary";
import {
  DASHBOARD_SCHEMA_VERSION,
  newDashboardDocumentId,
  newDashboardWidgetId,
} from "@/components/core/dashboard-builder/core/constants";
import { createDefaultLayouts, findAutoPlacement } from "@/components/core/dashboard-builder/core/layoutEngine";
import { DEFAULT_DASHBOARD_NAME } from "@/components/core/dashboard-builder/core/defaultDashboard";

/** 24-col grid mirrors xl:grid-cols-12 → main 10/12, side 2/12. */
const GRID_COLS = 24;
const MAIN_WIDTH = 20;
const SIDE_X = 20;
const SIDE_WIDTH = 4;

/** Matches defaultDashboardConfig top-middle-row fr weights. */
const TOP_MIDDLE_FR = [0.95, 0.95, 1.1] as const;

const WIDGET_TYPE_MAP: Record<PlantDashboardWidgetType, WidgetLibraryType> = {
  plantStats: "plant_stats",
  powerMeter: "power_meter",
  generationGraph: "generation_graph",
  earningsBreakdown: "earnings_breakdown",
  performanceIndicator: "performance_indicator",
  nonAvailability: "non_availability",
  lowPerformingComponents: "low_performing_components",
  devicesOverview: "devices_overview",
  allTimeStats: "all_time_stats",
  weatherForecast: "weather_forecast",
  alarmPanel: "alarm_panel",
  equipmentStatus: "equipment_status",
  weatherPanel: "weather_panel",
  energyFlow: "energy_flow",
  plantSld: "plant_sld",
  dcChannelHeatmap: "dc_channel_heatmap",
  inverterOverview: "inverter_overview",
  meterAnalytics: "meter_analytics",
  generationAnalytics: "generation_analytics",
};

function isEnabled(item: PlantDashboardItem): boolean {
  return item.enabled !== false;
}

function isGroupItem(item: PlantDashboardItem): item is PlantDashboardGroupItem {
  return item.type === "group" || Array.isArray((item as PlantDashboardGroupItem).children);
}

function isWidget(item: PlantDashboardItem): item is PlantDashboardWidgetItem {
  return !isGroupItem(item);
}

function findGroup(item: PlantDashboardItem, id: string): PlantDashboardGroupItem | null {
  if (!isEnabled(item)) return null;
  if (isGroupItem(item)) {
    if (item.id === id) return item;
    for (const child of item.children) {
      const found = findGroup(child, id);
      if (found) return found;
    }
  }
  return null;
}

function splitFrWidths(count: number, totalCols: number, weights?: readonly number[]): number[] {
  if (count <= 0) return [];
  if (count === 1) return [totalCols];

  const fr = weights && weights.length >= count
    ? weights.slice(0, count)
    : Array.from({ length: count }, () => 1);
  const frSum = fr.reduce((sum, value) => sum + value, 0);
  const widths = fr.map((value) => Math.floor((value / frSum) * totalCols));
  const used = widths.reduce((sum, value) => sum + value, 0);
  widths[widths.length - 1] += totalCols - used;
  return widths;
}

function createWidget(
  item: PlantDashboardWidgetItem,
  layout: { x: number; y: number; w: number; h: number },
): DashboardWidgetInstance | null {
  const libType = WIDGET_TYPE_MAP[item.type];
  if (!libType) return null;

  const def = WIDGET_LIBRARY_BY_TYPE[libType];
  const base = {
    ...def.defaultSize,
    ...layout,
    minW: def.defaultSize.minW,
    minH: def.defaultSize.minH,
  };

  return {
    id: newDashboardWidgetId(libType),
    type: libType,
    title: item.title ?? def.label,
    config: { ...(def.defaultConfig ?? {}), ...(item.config ?? {}) },
    layouts: createDefaultLayouts(base),
  };
}

function placePerformanceGrid(
  widgets: Record<string, DashboardWidgetInstance>,
  group: PlantDashboardGroupItem,
  slot: { x: number; y: number; w: number; h: number },
  placedIds: Set<string>,
): void {
  const perfWidgets = group.children.filter(
    (entry): entry is PlantDashboardWidgetItem => isEnabled(entry) && isWidget(entry),
  );
  if (perfWidgets.length === 0) return;

  const halfW = Math.max(1, Math.floor(slot.w / 2));
  const halfH = Math.max(1, Math.floor(slot.h / 2));
  const slots =
    perfWidgets.length <= 1
      ? [{ x: slot.x, y: slot.y, w: slot.w, h: slot.h }]
      : perfWidgets.length === 2
        ? [
          { x: slot.x, y: slot.y, w: halfW, h: slot.h },
          { x: slot.x + halfW, y: slot.y, w: slot.w - halfW, h: slot.h },
        ]
        : perfWidgets.length === 3
          ? [
            { x: slot.x, y: slot.y, w: halfW, h: halfH },
            { x: slot.x + halfW, y: slot.y, w: slot.w - halfW, h: halfH },
            { x: slot.x, y: slot.y + halfH, w: slot.w, h: slot.h - halfH },
          ]
          : [
            { x: slot.x, y: slot.y, w: halfW, h: halfH },
            { x: slot.x + halfW, y: slot.y, w: slot.w - halfW, h: halfH },
            { x: slot.x, y: slot.y + halfH, w: halfW, h: slot.h - halfH },
            {
              x: slot.x + halfW,
              y: slot.y + halfH,
              w: slot.w - halfW,
              h: slot.h - halfH,
            },
          ];

  perfWidgets.slice(0, slots.length).forEach((widget, index) => {
    const layout = slots[index];
    const instance = createWidget(widget, layout);
    if (!instance) return;
    widgets[instance.id] = instance;
    placedIds.add(widget.id);
  });
}

/**
 * Map the resolved plant dashboard config tree onto a 24-column react-grid-layout
 * document that mirrors the live PlantDashboardRenderer proportions.
 */
export function buildGridDocumentFromPlantConfig(
  plantId: string,
  config: PlantDashboardConfig,
  name = DEFAULT_DASHBOARD_NAME,
): DashboardDocument {
  const widgets: Record<string, DashboardWidgetInstance> = {};
  const placedIds = new Set<string>();
  const root = config.root;

  const mainCol = findGroup(root, "main-column");
  const sideCol = findGroup(root, "side-column");
  const hasSideColumn = Boolean(sideCol?.children.some(isEnabled));

  const mainWidth = hasSideColumn ? MAIN_WIDTH : GRID_COLS;
  const plantStatsH = 2;
  const topMiddleY = plantStatsH;
  const topMiddleH = 8;
  const bottomY = topMiddleY + topMiddleH;
  const bottomH = 9;

  if (mainCol) {
    for (const child of mainCol.children) {
      if (!isEnabled(child) || !isWidget(child) || child.type !== "plantStats") continue;
      const instance = createWidget(child, { x: 0, y: 0, w: mainWidth, h: plantStatsH });
      if (!instance) continue;
      widgets[instance.id] = instance;
      placedIds.add(child.id);
      break;
    }

    const topMiddle = findGroup(mainCol, "top-middle-row");
    if (topMiddle) {
      const rowChildren = topMiddle.children.filter(isEnabled);
      const widths = splitFrWidths(
        rowChildren.length,
        mainWidth,
        rowChildren.length === 3 ? TOP_MIDDLE_FR : undefined,
      );
      let x = 0;
      rowChildren.forEach((child, index) => {
        const w = widths[index] ?? Math.floor(mainWidth / rowChildren.length);
        const slot = { x, y: topMiddleY, w, h: topMiddleH };
        if (isGroupItem(child)) {
          placePerformanceGrid(widgets, child, slot, placedIds);
        } else if (isWidget(child)) {
          const instance = createWidget(child, slot);
          if (instance) {
            widgets[instance.id] = instance;
            placedIds.add(child.id);
          }
        }
        x += w;
      });
    }

    const bottomRow = findGroup(mainCol, "bottom-overview-row");
    if (bottomRow) {
      const bottomChildren = bottomRow.children.filter(
        (entry): entry is PlantDashboardWidgetItem => isEnabled(entry) && isWidget(entry),
      );
      const bottomWidths = splitFrWidths(bottomChildren.length, mainWidth);
      let x = 0;
      bottomChildren.forEach((child, index) => {
        const w = bottomWidths[index] ?? mainWidth;
        const instance = createWidget(child, { x, y: bottomY, w, h: bottomH });
        if (!instance) return;
        widgets[instance.id] = instance;
        placedIds.add(child.id);
        x += w;
      });
    }
  }

  if (sideCol && hasSideColumn) {
    const sideChildren = sideCol.children.filter(
      (entry): entry is PlantDashboardWidgetItem => isEnabled(entry) && isWidget(entry),
    );
    const sideContentH = bottomY + bottomH;
    const fixedWidgets = sideChildren.filter((child) => child.type !== "weatherForecast");
    const flexWidgets = sideChildren.filter((child) => child.type === "weatherForecast");
    const fixedH = fixedWidgets.length > 0 ? 5 : 0;
    const flexH = Math.max(6, sideContentH - fixedH * fixedWidgets.length);

    let sideY = 0;
    for (const child of fixedWidgets) {
      const h = child.type === "allTimeStats" ? 5 : 5;
      const instance = createWidget(child, { x: SIDE_X, y: sideY, w: SIDE_WIDTH, h });
      if (!instance) continue;
      widgets[instance.id] = instance;
      placedIds.add(child.id);
      sideY += h;
    }
    for (const child of flexWidgets) {
      const instance = createWidget(child, {
        x: SIDE_X,
        y: sideY,
        w: SIDE_WIDTH,
        h: Math.max(flexH, sideContentH - sideY),
      });
      if (!instance) continue;
      widgets[instance.id] = instance;
      placedIds.add(child.id);
    }
  }

  const remaining: PlantDashboardWidgetItem[] = [];
  const walkUnplaced = (item: PlantDashboardItem) => {
    if (!isEnabled(item)) return;
    if (isGroupItem(item)) {
      item.children.forEach(walkUnplaced);
      return;
    }
    if (!placedIds.has(item.id)) remaining.push(item);
  };
  walkUnplaced(root);

  for (const item of remaining) {
    const libType = WIDGET_TYPE_MAP[item.type];
    if (!libType) continue;
    const def = WIDGET_LIBRARY_BY_TYPE[libType];
    const w = def?.defaultSize.w ?? 6;
    const h = def?.defaultSize.h ?? 4;
    const placement = findAutoPlacement({ widgets, breakpoint: "lg", w, h });
    const instance = createWidget(item, { ...placement, w, h });
    if (!instance) continue;
    widgets[instance.id] = instance;
  }

  return {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    id: newDashboardDocumentId(),
    plantId,
    name,
    meta: { isDefault: true, kind: "custom", status: "draft" },
    widgets,
  };
}
