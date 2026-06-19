import { useMemo } from "react";
import {
  Responsive,
  WidthProvider,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import type { DashboardDocument } from "../types/document";
import { getDocumentLayoutSignature } from "../core/bootstrapDocument";
import {
  DEFAULT_ROW_HEIGHT,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_CONTAINER_PADDING,
  GRID_MARGIN,
} from "../core/constants";
import { documentToRglLayouts } from "../core/rglAdapter";
import { WidgetHost } from "../widgets/WidgetHost";
import { PLANT_DASHBOARD_GRID_CELL } from "@/components/core/plant-dashboard/shared/plantDashboardTheme";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGrid = WidthProvider(Responsive);

interface DashboardGridProps {
  document: DashboardDocument;
  plantId?: string;
}

/** Read-only responsive dashboard view. */
export function DashboardGrid({ document, plantId }: DashboardGridProps) {
  const layoutSignature = useMemo(() => getDocumentLayoutSignature(document), [document]);

  const layouts = useMemo(
    () => documentToRglLayouts(document) as ResponsiveLayouts,
    [layoutSignature],
  );

  const widgets = useMemo(() => Object.values(document.widgets), [document.widgets]);

  const gridHeight = useMemo(() => {
    const lgLayout = layouts.lg ?? [];
    const maxRow = lgLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    return (
      maxRow * (DEFAULT_ROW_HEIGHT + GRID_MARGIN[1]) +
      GRID_CONTAINER_PADDING[1] * 2 +
      8
    );
  }, [layouts]);

  return (
    <div className="w-full min-w-0" style={{ minHeight: gridHeight }}>
      <ResponsiveGrid
        className="dashboard-builder-grid dashboard-builder-grid--view"
        layouts={layouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLS}
        rowHeight={DEFAULT_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={GRID_CONTAINER_PADDING}
        compactType="vertical"
        preventCollision={false}
        isDraggable={false}
        isResizable={false}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={`dashboard-grid-item relative flex min-h-0 flex-col overflow-hidden ${PLANT_DASHBOARD_GRID_CELL}`}
          >
            <WidgetHost
              type={widget.type}
              plantId={plantId}
              title={widget.title}
              config={widget.config}
              editMode={false}
            />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
