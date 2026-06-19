import type { DashboardDocument, DashboardWidgetInstance, WidgetLibraryType } from "../types/document";
import { newDashboardDocumentId, newDashboardWidgetId } from "./constants";
import { createDefaultLayouts } from "./layoutEngine";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";

function createWidget(
  type: WidgetLibraryType,
  layout: { x: number; y: number; w: number; h: number },
): DashboardWidgetInstance {
  const def = WIDGET_LIBRARY_BY_TYPE[type];
  const id = newDashboardWidgetId(type);
  const base = {
    ...def.defaultSize,
    ...layout,
    minW: def.defaultSize.minW,
    minH: def.defaultSize.minH,
  };

  return {
    id,
    type,
    config: { ...(def.defaultConfig ?? {}) },
    layouts: createDefaultLayouts(base),
  };
}

/** Blank starter canvas for the standalone builder only — not used for the live plant dashboard. */
export function createDefaultDashboardDocument(
  plantId: string,
  name = "Plant Dashboard",
): DashboardDocument {
  const instances = [
    createWidget("plant_stats", { x: 0, y: 0, w: 24, h: 2 }),
    createWidget("power_meter", { x: 0, y: 2, w: 7, h: 8 }),
    createWidget("generation_graph", { x: 7, y: 2, w: 9, h: 8 }),
    createWidget("earnings_breakdown", { x: 16, y: 2, w: 4, h: 4 }),
    createWidget("performance_indicator", { x: 20, y: 2, w: 4, h: 4 }),
    createWidget("non_availability", { x: 16, y: 6, w: 4, h: 4 }),
    createWidget("low_performing_components", { x: 20, y: 6, w: 4, h: 4 }),
    createWidget("devices_overview", { x: 0, y: 10, w: 16, h: 9 }),
    createWidget("all_time_stats", { x: 16, y: 10, w: 4, h: 5 }),
    createWidget("weather_forecast", { x: 20, y: 10, w: 4, h: 9 }),
  ];

  const widgets = Object.fromEntries(instances.map((widget) => [widget.id, widget]));

  return {
    schemaVersion: 1,
    id: newDashboardDocumentId(),
    plantId,
    name,
    meta: { isDefault: true, createdAt: new Date().toISOString() },
    widgets,
  };
}
