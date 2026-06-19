import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { useContainerWidth } from "react-grid-layout";
import GridLayout from "react-grid-layout/legacy";
import type { Layout, LayoutItem } from "react-grid-layout/legacy";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import type { DashboardBreakpoint, DashboardDocument } from "../types/document";
import {
  getDocumentLayoutSignature,
  getWidgetStructureKey,
} from "../core/bootstrapDocument";
import {
  DEFAULT_ROW_HEIGHT,
  GRID_COLS,
  GRID_CONTAINER_PADDING,
  GRID_MARGIN,
} from "../core/constants";
import { buildWidgetGridLayout } from "../core/rglAdapter";
import { PLANT_DASHBOARD_GRID_CELL } from "@/components/core/plant-dashboard/shared/plantDashboardTheme";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { DashboardWidgetPreview } from "../widgets/DashboardWidgetPreview";
import { WidgetHost } from "../widgets/WidgetHost";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const DEBUG_GRID = import.meta.env.DEV;
const logGrid = (event: string, payload?: unknown) => {
  if (!DEBUG_GRID) return;
  if (payload !== undefined) {
    console.log(`[DashboardEditGrid] ${event}`, payload);
  } else {
    console.log(`[DashboardEditGrid] ${event}`);
  }
};

interface DashboardEditGridProps {
  document: DashboardDocument;
  plantId?: string;
  selectedWidgetId?: string | null;
  onLayoutChange: (breakpoint: DashboardBreakpoint, layout: Layout) => void;
  onSelectWidget?: (widgetId: string | null) => void;
}

/** Desktop edit canvas — 24-column grid with drag handle + resize. */
export function DashboardEditGrid({
  document,
  plantId,
  selectedWidgetId,
  onLayoutChange,
  onSelectWidget,
}: DashboardEditGridProps) {
  const editBreakpoint: DashboardBreakpoint = "lg";
  const cols = GRID_COLS[editBreakpoint];

  const layoutSignature = useMemo(() => getDocumentLayoutSignature(document), [document]);
  const widgetStructureKey = useMemo(() => getWidgetStructureKey(document), [document]);

  const widgets = useMemo(
    () => Object.values(document.widgets).sort((a, b) => a.id.localeCompare(b.id)),
    [document.widgets],
  );

  const documentLayout = useMemo(
    () => buildWidgetGridLayout(widgets, editBreakpoint),
    [document, widgets, editBreakpoint, layoutSignature],
  );

  const [gridLayout, setGridLayout] = useState<LayoutItem[]>(documentLayout);
  const [prevWidgetStructureKey, setPrevWidgetStructureKey] = useState(widgetStructureKey);
  const syncedSignatureRef = useRef(layoutSignature);
  const isInteractingRef = useRef(false);

  /** Reset controlled layout when widgets are added/removed (before RGL paints). */
  const structureChanged = widgetStructureKey !== prevWidgetStructureKey;
  if (structureChanged) {
    setPrevWidgetStructureKey(widgetStructureKey);
    setGridLayout(documentLayout);
    syncedSignatureRef.current = layoutSignature;
  }

  /** Never pass a stale layout — RGL defaults missing items to 1×1. */
  const layoutForGrid = useMemo(() => {
    const widgetIds = new Set(widgets.map((widget) => widget.id));
    const layoutIds = new Set(gridLayout.map((item) => item.i));
    const inSync =
      gridLayout.length === widgets.length &&
      widgets.every((widget) => layoutIds.has(widget.id)) &&
      gridLayout.every((item) => widgetIds.has(item.i));

    return inSync ? gridLayout : documentLayout;
  }, [gridLayout, documentLayout, widgets]);

  useEffect(() => {
    logGrid("mount/update", {
      widgetCount: widgets.length,
      layoutSignature,
      layoutForGrid,
      documentLayout,
    });
  }, [documentLayout, layoutForGrid, layoutSignature, widgets.length]);

  useEffect(() => {
    if (isInteractingRef.current) {
      logGrid("sync skipped (interacting)", { layoutSignature });
      return;
    }
    if (syncedSignatureRef.current === layoutSignature) return;
    logGrid("sync layout from document", {
      from: syncedSignatureRef.current,
      to: layoutSignature,
      documentLayout,
    });
    syncedSignatureRef.current = layoutSignature;
    setGridLayout(documentLayout);
  }, [layoutSignature, documentLayout]);

  /** Keep controlled layout in sync while dragging/resizing (required for RGL). */
  const handleLayoutChange = useCallback((nextLayout: Layout) => {
    logGrid("onLayoutChange", {
      interacting: isInteractingRef.current,
      items: nextLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
    });
    setGridLayout([...nextLayout] as LayoutItem[]);
  }, []);

  const persistLayout = useCallback(
    (nextLayout: Layout, source: "dragStop" | "resizeStop") => {
      isInteractingRef.current = false;
      logGrid(source, {
        items: nextLayout.map((item) => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        })),
      });
      setGridLayout([...nextLayout] as LayoutItem[]);
      onLayoutChange(editBreakpoint, nextLayout);
    },
    [editBreakpoint, onLayoutChange],
  );

  const handleDragStart = useCallback(
    (
      layout: Layout,
      oldItem: LayoutItem | null,
      newItem: LayoutItem | null,
      _placeholder: LayoutItem | null,
      event: Event,
    ) => {
      isInteractingRef.current = true;
      logGrid("onDragStart", {
        oldItem,
        newItem,
        eventType: event.type,
        target: event.target instanceof Element ? event.target.className : null,
      });
    },
    [],
  );

  const handleResizeStart = useCallback(
    (
      layout: Layout,
      oldItem: LayoutItem | null,
      newItem: LayoutItem | null,
      _placeholder: LayoutItem | null,
      event: Event,
    ) => {
      isInteractingRef.current = true;
      logGrid("onResizeStart", {
        oldItem,
        newItem,
        eventType: event.type,
        target: event.target instanceof Element ? event.target.className : null,
      });
    },
    [],
  );

  return (
    <div className="w-full">
      {widgets.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-sm border border-dashed border-neutral-300/80 bg-neutral-50/40 px-6 py-10 text-center dark:border-neutral-dark-400/50 dark:bg-neutral-dark-100/20">
          <p className="text-sm text-neutral-500 dark:text-neutral-dark-600">
            No widgets on the canvas. Use the Widgets panel to add some.
          </p>
        </div>
      ) : (
      <WidthMeasuredGrid
        layout={layoutForGrid}
        cols={cols}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onResizeStart={handleResizeStart}
        onDragStop={(layout) => persistLayout(layout, "dragStop")}
        onResizeStop={(layout) => persistLayout(layout, "resizeStop")}
      >
        {widgets.map((widget) => {
          const isSelected = selectedWidgetId === widget.id;
          const def = WIDGET_LIBRARY_BY_TYPE[widget.type];
          const displayTitle = widget.title?.trim() || def?.label || widget.type;
          const showWidgetHeading = widgetShowHeading(widget.config);

          return (
            <div
              key={widget.id}
              className={`dashboard-grid-item group relative flex h-full min-h-0 flex-col overflow-hidden ${PLANT_DASHBOARD_GRID_CELL} ${
                isSelected
                  ? "border-brand-500 ring-2 ring-brand-500/35"
                  : ""
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectWidget?.(widget.id);
              }}
            >
              <div
                className={`dashboard-widget-drag-handle z-30 flex shrink-0 cursor-grab items-center active:cursor-grabbing ${
                  showWidgetHeading
                    ? "h-5 justify-center border-b border-neutral-200/60 px-1 dark:border-neutral-dark-300/50"
                    : "h-7 gap-1.5 border-b px-2"
                } ${
                  isSelected
                    ? "border-brand-500/25 bg-brand-500/8 dark:bg-brand-500/10"
                    : showWidgetHeading
                      ? "bg-neutral-50/80 dark:bg-neutral-dark-200/40"
                      : "border-neutral-200/70 bg-gradient-to-r from-neutral-50/95 to-white dark:border-neutral-dark-300/60 dark:from-neutral-dark-200/80 dark:to-neutral-dark-100"
                }`}
                onPointerDown={() => {
                  logGrid("drag handle pointerdown", { widgetId: widget.id });
                }}
              >
                <div className="flex shrink-0 items-center text-neutral-400 dark:text-neutral-dark-500">
                  <GripVertical
                    className={showWidgetHeading ? "h-3 w-3" : "h-3.5 w-3.5"}
                    strokeWidth={2.25}
                  />
                </div>
                {!showWidgetHeading ? (
                  <span className="pointer-events-none min-w-0 flex-1 truncate text-[10px] font-medium text-neutral-700 dark:text-neutral-dark-800">
                    {displayTitle}
                  </span>
                ) : null}
              </div>
              <div className="pointer-events-none min-h-0 flex-1 select-none overflow-hidden">
                {plantId ? (
                  <WidgetHost
                    type={widget.type}
                    plantId={plantId}
                    title={widget.title}
                    config={widget.config}
                    editMode
                  />
                ) : (
                  <DashboardWidgetPreview
                    type={widget.type}
                    title={widget.title}
                    config={widget.config}
                  />
                )}
              </div>
            </div>
          );
        })}
      </WidthMeasuredGrid>
      )}
    </div>
  );
}

function WidthMeasuredGrid({
  layout,
  cols,
  children,
  onLayoutChange,
  onDragStart,
  onResizeStart,
  onDragStop,
  onResizeStop,
}: {
  layout: LayoutItem[];
  cols: number;
  children: React.ReactNode;
  onLayoutChange: (layout: Layout) => void;
  onDragStart: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
  ) => void;
  onResizeStart: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
  ) => void;
  onDragStop: (layout: Layout) => void;
  onResizeStop: (layout: Layout) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });
  const [stableWidth, setStableWidth] = useState(1280);

  useEffect(() => {
    if (mounted && width > 0) {
      setStableWidth(width);
    }
    logGrid("container width", { mounted, width });
  }, [mounted, width]);

  const gridWidth = mounted && width > 0 ? width : stableWidth;

  return (
    <div
      ref={containerRef}
      className="dashboard-edit-canvas w-full overflow-visible rounded-sm border border-dashed border-neutral-300/80 bg-neutral-50/50 dark:border-neutral-dark-400/50 dark:bg-neutral-dark-100/30"
    >
      {gridWidth > 0 ? (
        <GridLayout
          className="dashboard-builder-grid dashboard-builder-grid--edit"
          width={gridWidth}
          layout={layout}
          cols={cols}
          rowHeight={DEFAULT_ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={GRID_CONTAINER_PADDING}
          compactType="vertical"
          preventCollision={false}
          isDraggable
          isResizable
          draggableHandle=".dashboard-widget-drag-handle"
          draggableCancel="button, input, select, textarea, a, label"
          resizeHandles={["se", "s", "e"]}
          onLayoutChange={onLayoutChange}
          onDragStart={onDragStart}
          onResizeStart={onResizeStart}
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
        >
          {children}
        </GridLayout>
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-neutral-500">
          Preparing canvas…
        </div>
      )}
    </div>
  );
}
