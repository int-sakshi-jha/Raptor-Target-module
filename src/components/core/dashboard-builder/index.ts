export { DashboardBuilder } from "./builder/DashboardBuilder";
export { PlantDashboardWorkspace } from "./PlantDashboardWorkspace";
export { DashboardCanvas } from "./runtime/DashboardCanvas";
export { DashboardGrid } from "./runtime/DashboardGrid";
export { WidgetHost } from "./widgets/WidgetHost";

export { useDashboardDocument } from "./hooks/useDashboardDocument";
export { usePlantDashboardTemplates } from "./hooks/usePlantDashboardTemplates";

export {
  WIDGET_LIBRARY,
  WIDGET_LIBRARY_BY_TYPE,
  WIDGET_CATEGORIES,
  filterWidgetsByCapabilities,
  type WidgetDefinition,
  type WidgetCapabilityFlags,
} from "./registry/widgetLibrary";

export {
  GRID_COLS,
  GRID_BREAKPOINTS,
  BREAKPOINT_ORDER,
  DEFAULT_ROW_HEIGHT,
} from "./core/constants";

export { createDefaultDashboardDocument } from "./core/defaultTemplate";
export { buildWidgetCapabilityFlags } from "./core/plantCapabilities";
export {
  normalizeDocument,
  duplicateDashboardDocument,
  type DashboardPersistenceAdapter,
  type DashboardSaveOptions,
} from "./core/persistence";

export { getDashboardPersistence, dashboardPersistence } from "./core/dashboardPersistence";

export type {
  DashboardDocument,
  DashboardDocumentMeta,
  DashboardWidgetInstance,
  DashboardSummary,
  DashboardStatus,
  DashboardKind,
  DashboardBreakpoint,
  GridLayoutItem,
  WidgetLibraryType,
} from "./types/document";
