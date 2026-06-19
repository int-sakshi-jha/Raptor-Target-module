import type { DashboardBreakpoint, DashboardWidgetInstance, GridLayoutItem } from "../types/document";
import type { WidgetDefinition } from "../registry/widgetLibrary";
import { BREAKPOINT_ORDER, GRID_COLS } from "./constants";

export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function getWidgetLayout(
  widget: DashboardWidgetInstance,
  breakpoint: DashboardBreakpoint,
): GridLayoutItem {
  return (
    widget.layouts[breakpoint] ??
    widget.layouts.lg ??
    widget.layouts.xl ??
    widget.layouts.md ?? { x: 0, y: 0, w: 6, h: 4 }
  );
}

export function collectLayouts(
  widgets: Record<string, DashboardWidgetInstance>,
  breakpoint: DashboardBreakpoint,
  excludeId?: string,
): LayoutRect[] {
  return Object.values(widgets)
    .filter((widget) => widget.id !== excludeId)
    .map((widget) => getWidgetLayout(widget, breakpoint));
}

export function hasCollision(
  candidate: LayoutRect,
  existing: LayoutRect[],
): boolean {
  return existing.some((rect) => rectsOverlap(candidate, rect));
}

/** Snap x/w to integer grid; clamp within column bounds. */
export function snapLayoutItem(
  item: GridLayoutItem,
  cols: number,
): GridLayoutItem {
  const minW = item.minW != null ? Math.max(1, Math.round(item.minW)) : undefined;
  const minH = item.minH != null ? Math.max(1, Math.round(item.minH)) : undefined;
  const w = Math.max(minW ?? 1, Math.min(cols, Math.round(item.w)));
  const h = Math.max(minH ?? 1, Math.round(item.h));
  const x = Math.max(0, Math.min(cols - w, Math.round(item.x)));
  const y = Math.max(0, Math.round(item.y));

  return {
    ...item,
    x,
    y,
    w,
    h,
    minW,
    minH,
    maxW: item.maxW != null ? Math.min(cols, item.maxW) : item.maxW,
    maxH: item.maxH,
  };
}

/** Placement + full default dimensions/constraints when adding a widget from the library. */
export function buildInitialWidgetLayout(
  def: WidgetDefinition,
  widgets: Record<string, DashboardWidgetInstance>,
  breakpoint: DashboardBreakpoint = "lg",
): GridLayoutItem {
  const cols = GRID_COLS[breakpoint];
  const base = def.defaultSize;
  const placement = findAutoPlacement({
    widgets,
    breakpoint,
    w: base.w,
    h: base.h,
  });

  return snapLayoutItem(
    {
      x: placement.x,
      y: placement.y,
      w: Math.min(base.w, cols),
      h: base.h,
      minW: base.minW ?? def.minSize?.minW ?? 2,
      minH: base.minH ?? def.minSize?.minH ?? 2,
      maxW: def.maxSize?.maxW ?? cols,
      maxH: def.maxSize?.maxH ?? 24,
    },
    cols,
  );
}

/** Find first non-colliding slot scanning top-to-bottom, left-to-right. */
export function findAutoPlacement(args: {
  widgets: Record<string, DashboardWidgetInstance>;
  breakpoint: DashboardBreakpoint;
  w: number;
  h: number;
}): GridLayoutItem {
  const { widgets, breakpoint, w, h } = args;
  const cols = GRID_COLS[breakpoint];
  const width = Math.min(w, cols);
  const existing = collectLayouts(widgets, breakpoint);

  for (let y = 0; y < 200; y += 1) {
    for (let x = 0; x <= cols - width; x += 1) {
      const candidate = { x, y, w: width, h };
      if (!hasCollision(candidate, existing)) {
        return snapLayoutItem(candidate, cols);
      }
    }
  }

  const maxY = existing.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
  return snapLayoutItem({ x: 0, y: maxY, w: width, h }, cols);
}

export function createDefaultLayouts(
  base: GridLayoutItem,
): Partial<Record<DashboardBreakpoint, GridLayoutItem>> {
  const layouts: Partial<Record<DashboardBreakpoint, GridLayoutItem>> = {};
  for (const breakpoint of BREAKPOINT_ORDER) {
    const cols = GRID_COLS[breakpoint];
    layouts[breakpoint] = snapLayoutItem(
      {
        ...base,
        w: Math.min(base.w, cols),
        maxW: base.maxW != null ? Math.min(base.maxW, cols) : cols,
      },
      cols,
    );
  }
  return layouts;
}

export function resolveActiveBreakpoint(width: number): DashboardBreakpoint {
  if (width >= 1920) return "xxl";
  if (width >= 1600) return "xl";
  if (width >= 1280) return "lg";
  if (width >= 1024) return "md";
  if (width >= 768) return "sm";
  return "xs";
}
