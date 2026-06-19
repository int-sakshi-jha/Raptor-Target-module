import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout/legacy";
import type { DashboardBreakpoint, DashboardDocument, DashboardWidgetInstance } from "../types/document";
import { BREAKPOINT_ORDER, GRID_COLS } from "./constants";
import { getWidgetLayout, snapLayoutItem } from "./layoutEngine";

export function documentToRglLayouts(document: DashboardDocument): ResponsiveLayouts {
  const layouts: ResponsiveLayouts = {};

  for (const breakpoint of BREAKPOINT_ORDER) {
    layouts[breakpoint] = Object.values(document.widgets).map((widget) =>
      widgetToRglItem(widget, breakpoint),
    );
  }

  return layouts;
}

export function widgetToRglItem(
  widget: DashboardWidgetInstance,
  breakpoint: DashboardBreakpoint,
): LayoutItem {
  const layout = getWidgetLayout(widget, breakpoint);
  const cols = GRID_COLS[breakpoint];
  const snapped = snapLayoutItem(layout, cols);

  return {
    i: widget.id,
    x: snapped.x,
    y: snapped.y,
    w: snapped.w,
    h: snapped.h,
    minW: snapped.minW,
    minH: snapped.minH,
    maxW: snapped.maxW,
    maxH: snapped.maxH,
    static: false,
    isDraggable: true,
    isResizable: true,
  };
}

/** One layout item per widget — RGL requires layout[i].i === String(child.key). */
export function buildWidgetGridLayout(
  widgets: DashboardWidgetInstance[],
  breakpoint: DashboardBreakpoint,
): LayoutItem[] {
  return widgets.map((widget) => {
    const item = widgetToRglItem(widget, breakpoint);
    if (import.meta.env.DEV && item.i !== widget.id) {
      console.error("[dashboard-builder] layout key mismatch", {
        layoutKey: item.i,
        widgetId: widget.id,
      });
    }
    return item;
  });
}

export function applyRglLayoutChange(args: {
  document: DashboardDocument;
  breakpoint: DashboardBreakpoint;
  layout: Layout;
}): DashboardDocument {
  const { document, breakpoint, layout } = args;
  const cols = GRID_COLS[breakpoint];
  const nextWidgets = { ...document.widgets };

  for (const item of layout) {
    const widget = nextWidgets[item.i];
    if (!widget) continue;

    nextWidgets[item.i] = {
      ...widget,
      layouts: {
        ...widget.layouts,
        [breakpoint]: snapLayoutItem(
          {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            minW: item.minW,
            minH: item.minH,
            maxW: item.maxW,
            maxH: item.maxH,
          },
          cols,
        ),
      },
    };
  }

  return { ...document, widgets: nextWidgets };
}
