import type {
  PlantDashboardConfig,
  PlantDashboardGroupItem,
  PlantDashboardItem,
  PlantDashboardWidgetItem,
  PlantDashboardWidgetType,
} from "@/components/core/plant-dashboard/shared/dashboardTypes";
import { buildGridDocumentFromPlantConfig } from "@/components/core/plant-dashboard/shared/plantDashboardGridLayout";
import type { DashboardDocument, DashboardWidgetInstance, WidgetLibraryType } from "../types/document";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import { BREAKPOINT_ORDER, DASHBOARD_SCHEMA_VERSION, GRID_COLS, newDashboardDocumentId, newDashboardWidgetId } from "./constants";
import { createDefaultLayouts, findAutoPlacement } from "./layoutEngine";
import { DEFAULT_DASHBOARD_NAME } from "./defaultDashboard";
import { createDefaultDashboardDocument } from "./defaultTemplate";

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

function isPlantWidgetEnabled(item: PlantDashboardItem): boolean {
  return item.enabled !== false;
}

function isPlantGroupItem(item: PlantDashboardItem): item is PlantDashboardGroupItem {
  return item.type === "group" || Array.isArray((item as PlantDashboardGroupItem).children);
}

function collectEnabledPlantWidgets(
  item: PlantDashboardItem,
  out: Array<{
    libType: WidgetLibraryType;
    config?: Record<string, unknown>;
    title?: string;
  }>,
): void {
  if (!isPlantWidgetEnabled(item)) return;
  if (isPlantGroupItem(item)) {
    for (const child of item.children) collectEnabledPlantWidgets(child, out);
    return;
  }

  const widgetItem = item as PlantDashboardWidgetItem;
  const libType = WIDGET_TYPE_MAP[widgetItem.type];
  if (!libType) return;

  out.push({
    libType,
    config: widgetItem.config as Record<string, unknown> | undefined,
    title: widgetItem.title,
  });
}

function countEnabledPlantWidgets(root: PlantDashboardGroupItem): number {
  const collected: Array<unknown> = [];
  collectEnabledPlantWidgets(root, collected);
  return collected.length;
}

function findGroupById(
  item: PlantDashboardItem,
  groupId: string,
): PlantDashboardGroupItem | null {
  if (!isPlantWidgetEnabled(item)) return null;
  if (isPlantGroupItem(item)) {
    if (item.id === groupId) return item;
    for (const child of item.children) {
      const found = findGroupById(child, groupId);
      if (found) return found;
    }
  }
  return null;
}

function createDocumentFromWidgets(
  plantId: string,
  widgets: Record<string, DashboardWidgetInstance>,
  name: string,
): DashboardDocument {
  return {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    id: newDashboardDocumentId(),
    plantId,
    name,
    meta: { isDefault: true, kind: "custom", status: "draft" },
    widgets,
  };
}

function createWidgetFromPlantConfig(args: {
  libType: WidgetLibraryType;
  config?: Record<string, unknown>;
  title?: string;
  layout: { x: number; y: number; w: number; h: number };
}): DashboardWidgetInstance {
  const def = WIDGET_LIBRARY_BY_TYPE[args.libType];
  const id = newDashboardWidgetId(args.libType);
  const base = {
    ...def.defaultSize,
    ...args.layout,
    minW: def.defaultSize.minW,
    minH: def.defaultSize.minH,
  };

  return {
    id,
    type: args.libType,
    title: args.title ?? def.label,
    config: { ...(def.defaultConfig ?? {}), ...(args.config ?? {}) },
    layouts: createDefaultLayouts(base),
  };
}

function buildWidgetsFromFlatCollect(
  root: PlantDashboardGroupItem,
): Record<string, DashboardWidgetInstance> {
  const collected: Array<{
    libType: WidgetLibraryType;
    config?: Record<string, unknown>;
    title?: string;
  }> = [];
  collectEnabledPlantWidgets(root, collected);

  const widgets: Record<string, DashboardWidgetInstance> = {};
  for (const entry of collected) {
    const def = WIDGET_LIBRARY_BY_TYPE[entry.libType];
    const w = def?.defaultSize.w ?? 6;
    const h = def?.defaultSize.h ?? 4;
    const placement = findAutoPlacement({ widgets, breakpoint: "lg", w, h });
    const widget = createWidgetFromPlantConfig({ ...entry, layout: { ...placement, w, h } });
    widgets[widget.id] = widget;
  }

  return widgets;
}

/** Build an editable document that mirrors the live PlantDashboardRenderer layout. */
export function buildDashboardDocumentFromPlantConfig(
  plantId: string,
  autoConfig: PlantDashboardConfig,
  name = DEFAULT_DASHBOARD_NAME,
): DashboardDocument {
  const root = autoConfig.root;
  const enabledWidgetCount = countEnabledPlantWidgets(root);
  const hasKnownStructure =
    findGroupById(root, "main-column") || findGroupById(root, "side-column");

  const structuredDocument = hasKnownStructure
    ? buildGridDocumentFromPlantConfig(plantId, autoConfig, name)
    : null;
  const flatWidgets = buildWidgetsFromFlatCollect(root);

  let document: DashboardDocument;
  if (structuredDocument && Object.keys(structuredDocument.widgets).length > 0) {
    document = structuredDocument;
  } else if (Object.keys(flatWidgets).length > 0) {
    document = createDocumentFromWidgets(plantId, flatWidgets, name);
  } else if (enabledWidgetCount === 0) {
    document = createDefaultDashboardDocument(plantId, name);
  } else {
    document = createDocumentFromWidgets(plantId, flatWidgets, name);
  }

  return normalizeDashboardDocument(document);
}

/** Clamp saved layouts to sensible min bounds without undoing user resize. */
export function normalizeDashboardDocument(document: DashboardDocument): DashboardDocument {
  const nextWidgets: Record<string, DashboardWidgetInstance> = {};

  for (const widget of Object.values(document.widgets)) {
    const def = WIDGET_LIBRARY_BY_TYPE[widget.type];
    const minW = def?.defaultSize.minW ?? 2;
    const minH = def?.defaultSize.minH ?? 2;
    const maxW = def?.maxSize?.maxW ?? GRID_COLS.lg;
    const maxH = def?.maxSize?.maxH ?? 24;
    const layouts = { ...widget.layouts };

    for (const breakpoint of BREAKPOINT_ORDER) {
      const current = layouts[breakpoint];
      if (!current) continue;
      const cols = GRID_COLS[breakpoint];
      layouts[breakpoint] = {
        ...current,
        w: Math.max(minW, Math.min(cols, current.w)),
        h: Math.max(minH, Math.min(maxH, current.h)),
        minW: Math.max(current.minW ?? minW, minW),
        minH: Math.max(current.minH ?? minH, minH),
        maxW: Math.min(current.maxW ?? maxW, cols),
        maxH: current.maxH ?? maxH,
      };
    }

    nextWidgets[widget.id] = { ...widget, layouts };
  }

  return { ...document, widgets: nextWidgets };
}

/** @deprecated Use normalizeDashboardDocument */
export const upgradeDashboardDocumentLayouts = normalizeDashboardDocument;

/** Build an editable dashboard document from auto-resolved tree config. */
export function bootstrapDashboardDocument(
  plantId: string,
  autoConfig: PlantDashboardConfig,
  existing?: DashboardDocument | null,
): DashboardDocument {
  if (existing) return normalizeDashboardDocument(existing);
  return buildDashboardDocumentFromPlantConfig(plantId, autoConfig);
}

/** New unsaved template seeded from the layout the user is currently viewing. */
export function createNewDashboardFromBase(
  plantId: string,
  base: DashboardDocument,
  name = "New dashboard",
): DashboardDocument {
  const normalized = normalizeDashboardDocument(base);
  return {
    ...normalized,
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    id: newDashboardDocumentId(),
    plantId,
    name,
    meta: {
      ...normalized.meta,
      status: "draft",
      kind: "custom",
      version: 1,
      isDefault: false,
    },
  };
}

export function resolveEditorStartingDocument(args: {
  plantId: string;
  autoConfig: PlantDashboardConfig;
  activeDocument: DashboardDocument | null;
  name?: string;
}): DashboardDocument {
  const base = args.activeDocument
    ? normalizeDashboardDocument(args.activeDocument)
    : buildDashboardDocumentFromPlantConfig(args.plantId, args.autoConfig);
  return createNewDashboardFromBase(args.plantId, base, args.name);
}

/** Deep copy for editor snapshots so live query data cannot mutate the canvas. */
export function cloneDashboardDocument(document: DashboardDocument): DashboardDocument {
  return normalizeDashboardDocument(structuredClone(document));
}

/**
 * Grid document for the layout the user is currently viewing (default or saved template).
 * Returns a read-only snapshot — clone before opening the editor.
 */
export function resolveActiveLayoutDocument(args: {
  plantId: string;
  autoConfig: PlantDashboardConfig;
  configReady: boolean;
  activeTemplateId: string | null;
  savedTemplateDocument: DashboardDocument | null;
}): DashboardDocument | null {
  if (args.activeTemplateId) {
    return args.savedTemplateDocument
      ? normalizeDashboardDocument(args.savedTemplateDocument)
      : null;
  }
  if (!args.configReady) return null;
  return buildDashboardDocumentFromPlantConfig(args.plantId, args.autoConfig);
}

/** @deprecated Use resolveActiveLayoutDocument */
export function resolveViewingDashboardDocument(args: {
  plantId: string;
  autoConfig: PlantDashboardConfig;
  configReady: boolean;
  activeTemplateId: string | null;
  displayDocument: DashboardDocument | null;
}): DashboardDocument | null {
  return resolveActiveLayoutDocument({
    plantId: args.plantId,
    autoConfig: args.autoConfig,
    configReady: args.configReady,
    activeTemplateId: args.activeTemplateId,
    savedTemplateDocument: args.displayDocument,
  });
}

export function getDocumentLayoutSignature(document: DashboardDocument): string {
  return Object.values(document.widgets)
    .map((widget) => {
      const layout = widget.layouts.lg ?? widget.layouts.xl ?? { x: 0, y: 0, w: 1, h: 1 };
      return `${widget.id}:${layout.x},${layout.y},${layout.w},${layout.h}`;
    })
    .sort()
    .join("|");
}

/** Widget ids only — use as grid remount key when widgets are added/removed. */
export function getWidgetStructureKey(document: DashboardDocument): string {
  return Object.keys(document.widgets).sort().join("|");
}
