import type { DashboardBreakpoint } from "../types/document";

export const DASHBOARD_SCHEMA_VERSION = 1 as const;

/** Primary grid: 24 columns on desktop / ultrawide. */
export const GRID_COLS: Record<DashboardBreakpoint, number> = {
  xxl: 24,
  xl: 24,
  lg: 24,
  md: 20,
  sm: 12,
  xs: 8,
};

export const GRID_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  xxl: 1920,
  xl: 1600,
  lg: 1280,
  md: 1024,
  sm: 768,
  xs: 0,
};

export const BREAKPOINT_ORDER: DashboardBreakpoint[] = ["xxl", "xl", "lg", "md", "sm", "xs"];

export const DEFAULT_ROW_HEIGHT = 42;
export const GRID_MARGIN: [number, number] = [10, 10];
export const GRID_CONTAINER_PADDING: [number, number] = [0, 0];

let dashboardIdSeq = 0;

/** Temporary client id for unsaved templates (server assigns UUID on create). */
export function newDashboardDocumentId(): string {
  dashboardIdSeq += 1;
  return `dashboard-${Date.now()}-${dashboardIdSeq}`;
}

export function newDashboardWidgetId(type: string): string {
  dashboardIdSeq += 1;
  return `${type}-${Date.now().toString(36)}-${dashboardIdSeq}`;
}
