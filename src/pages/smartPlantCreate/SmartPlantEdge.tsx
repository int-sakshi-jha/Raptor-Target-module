import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { EDGE_SYMBOL_DROP_EVENT, renderEdgeSymbolIcon, SYMBOL_DRAG_MIME, type AnnotationShape } from "./symbols";
import {
  clampEdgeStretches,
  resolveEdgeLineStretches,
  type LineStretchFields,
} from "./smartPlantEdgeStretch";
import {
  buildOrthogonalPathString,
  buildPolylinePathString,
  insertMidpointOnLongestSegment,
  type PathPoint,
} from "./smartPlantEdgePath";

export const EDGE_LABEL_UPDATE_EVENT = "smart-plant-edge-label-update";

/** Parent dispatches to insert a bend at path midpoint (connector tools button). */
export const SMART_PLANT_EDGE_ADD_WAYPOINT_CENTER = "smart-plant-edge-add-waypoint-center";

/** Parent listens: open line label editor (replaces edge double-click). */
export const SMART_PLANT_EDGE_LABEL_DBLCLICK = "smart-plant-edge-label-dblclick";

/** Flow-space px: snap near-zero stretch so the line sits back on anchors after shortening. */
const STRETCH_SNAP_PX = 4;

const MAX_WAYPOINTS = 24;

export type SmartEdgeData = LineStretchFields & {
  edgeStyle?: "dashed" | "solid" | "smooth" | "step";
  lineLabel?: string;
  lineSymbol?: "none" | "breaker" | "isolator" | "ct" | "meter" | "fuse" | "spd";
  /** When set, whole-line offset is ignored so anchors stay on components. */
  lineWaypoints?: PathPoint[];
  lineOffsetX?: number;
  lineOffsetY?: number;
  lineLabelPosition?: "left" | "center" | "right";
  labelOffsetX?: number;
  labelOffsetY?: number;
};

/** Cursors that follow the connector axis (top/bottom on vertical lines, left/right on horizontal). */
function stretchHandleCursors(
  unitX: number,
  unitY: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): { start: string; end: string } {
  const ax = Math.abs(unitX);
  const ay = Math.abs(unitY);
  if (ax >= ay * 1.2) {
    const sourceIsLeft = sourceX < targetX;
    return {
      start: sourceIsLeft ? "w-resize" : "e-resize",
      end: sourceIsLeft ? "e-resize" : "w-resize",
    };
  }
  if (ay >= ax * 1.2) {
    const sourceIsTop = sourceY < targetY;
    return {
      start: sourceIsTop ? "n-resize" : "s-resize",
      end: sourceIsTop ? "s-resize" : "n-resize",
    };
  }
  const nw = unitX * unitY > 0;
  return {
    start: nw ? "nw-resize" : "ne-resize",
    end: nw ? "se-resize" : "sw-resize",
  };
}

function snapStretchValue(value: number): number {
  return Math.abs(value) < STRETCH_SNAP_PX ? 0 : value;
}

function isRoutableEdgeStyle(s: SmartEdgeData["edgeStyle"] | undefined): boolean {
  const v = s ?? "dashed";
  return v === "dashed" || v === "solid" || v === "smooth" || v === "step";
}

export default function SmartPlantEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style, selected } =
    props;
  const { screenToFlowPosition } = useReactFlow();
  const selectedInStore = useStore(
    useCallback((state) => state.edges.find((e) => e.id === id)?.selected === true, [id]),
  );
  const isEdgeSelected = selected || selectedInStore;
  const typedData = (data ?? {}) as SmartEdgeData;
  const rawEdgeStyle = typedData.edgeStyle;
  const edgeStyle =
    rawEdgeStyle === "solid" || rawEdgeStyle === "smooth" || rawEdgeStyle === "step" || rawEdgeStyle === "dashed"
      ? rawEdgeStyle
      : "dashed";
  const lineSymbol = typedData.lineSymbol ?? "none";
  const lineOffsetX = typedData.lineOffsetX ?? 0;
  const lineOffsetY = typedData.lineOffsetY ?? 0;
  const lineWaypoints = typedData.lineWaypoints ?? [];
  const lineWaypointsRef = useRef(lineWaypoints);
  useEffect(() => {
    lineWaypointsRef.current = lineWaypoints;
  }, [lineWaypoints]);
  const resolvedStretch = resolveEdgeLineStretches(typedData);

  const {
    edgePath,
    labelX,
    labelY,
    unitX,
    unitY,
    sourceAdjX,
    sourceAdjY,
    targetAdjX,
    targetAdjY,
  } = useMemo(() => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.hypot(dx, dy);
    const usableDistance = Math.max(distance, 1);
    const unitX = dx / usableDistance;
    const unitY = dy / usableDistance;
    const { start: stretchStart, end: stretchEnd } = clampEdgeStretches(
      distance,
      resolvedStretch.start,
      resolvedStretch.end,
    );
    const useWaypointRouting = isRoutableEdgeStyle(edgeStyle) && lineWaypoints.length > 0;
    const ox = useWaypointRouting ? 0 : lineOffsetX;
    const oy = useWaypointRouting ? 0 : lineOffsetY;
    const sourceAdjX = sourceX + unitX * stretchStart + ox;
    const sourceAdjY = sourceY + unitY * stretchStart + oy;
    const targetAdjX = targetX - unitX * stretchEnd + ox;
    const targetAdjY = targetY - unitY * stretchEnd + oy;

    const hasCustomRoute = lineWaypoints.length > 0;

    if (hasCustomRoute && isRoutableEdgeStyle(edgeStyle)) {
      const pts: PathPoint[] = [
        { x: sourceAdjX, y: sourceAdjY },
        ...lineWaypoints,
        { x: targetAdjX, y: targetAdjY },
      ];
      if (edgeStyle === "step") {
        const { path, labelX: lx, labelY: ly } = buildOrthogonalPathString(pts);
        return {
          edgePath: path,
          labelX: lx,
          labelY: ly,
          unitX,
          unitY,
          sourceAdjX,
          sourceAdjY,
          targetAdjX,
          targetAdjY,
        };
      }
      const { path, labelX: lx, labelY: ly } = buildPolylinePathString(pts);
      return {
        edgePath: path,
        labelX: lx,
        labelY: ly,
        unitX,
        unitY,
        sourceAdjX,
        sourceAdjY,
        targetAdjX,
        targetAdjY,
      };
    }

    if (edgeStyle === "dashed" || edgeStyle === "solid") {
      const [path, lx, ly] = getStraightPath({
        sourceX: sourceAdjX,
        sourceY: sourceAdjY,
        targetX: targetAdjX,
        targetY: targetAdjY,
      });
      return {
        edgePath: path,
        labelX: lx,
        labelY: ly,
        unitX,
        unitY,
        sourceAdjX,
        sourceAdjY,
        targetAdjX,
        targetAdjY,
      };
    }
    if (edgeStyle === "smooth") {
      const [path, lx, ly] = getBezierPath({
        sourceX: sourceAdjX,
        sourceY: sourceAdjY,
        targetX: targetAdjX,
        targetY: targetAdjY,
        sourcePosition,
        targetPosition,
      });
      return {
        edgePath: path,
        labelX: lx,
        labelY: ly,
        unitX,
        unitY,
        sourceAdjX,
        sourceAdjY,
        targetAdjX,
        targetAdjY,
      };
    }
    if (edgeStyle === "step") {
      const [path, lx, ly] = getSmoothStepPath({
        sourceX: sourceAdjX,
        sourceY: sourceAdjY,
        targetX: targetAdjX,
        targetY: targetAdjY,
        sourcePosition,
        targetPosition,
        borderRadius: 0,
      });
      return {
        edgePath: path,
        labelX: lx,
        labelY: ly,
        unitX,
        unitY,
        sourceAdjX,
        sourceAdjY,
        targetAdjX,
        targetAdjY,
      };
    }
    const [path, lx, ly] = getStraightPath({
      sourceX: sourceAdjX,
      sourceY: sourceAdjY,
      targetX: targetAdjX,
      targetY: targetAdjY,
    });
    return {
      edgePath: path,
      labelX: lx,
      labelY: ly,
      unitX,
      unitY,
      sourceAdjX,
      sourceAdjY,
      targetAdjX,
      targetAdjY,
    };
  }, [
    edgeStyle,
    lineOffsetX,
    lineOffsetY,
    lineWaypoints,
    resolvedStretch.start,
    resolvedStretch.end,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  ]);

  const lineLabel = typedData.lineLabel?.trim() ?? "";
  const hasLabel = Boolean(lineLabel || lineSymbol !== "none");
  const sideShift = typedData.lineLabelPosition === "left" ? -96 : typedData.lineLabelPosition === "right" ? 96 : 0;
  const offsetX = typedData.labelOffsetX ?? 0;
  const offsetY = typedData.labelOffsetY ?? 0;
  const labelLeft = labelX + sideShift + offsetX;
  const labelTop = labelY + offsetY;
  const handleSymbolDrop = (event: React.DragEvent<SVGPathElement>) => {
    if (!event.dataTransfer.types.includes(SYMBOL_DRAG_MIME)) return;
    event.preventDefault();
    const raw = event.dataTransfer.getData(SYMBOL_DRAG_MIME);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { shape?: AnnotationShape };
      if (!parsed?.shape) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const relativeX = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0.5;
      const lineLabelPosition =
        relativeX < 0.33 ? "left" : relativeX > 0.66 ? "right" : "center";
      const fromPoint = document.elementsFromPoint(event.clientX, event.clientY);
      const edgeIdsAtPoint = [
        ...new Set(
          fromPoint
            .map((el) => (el instanceof Element ? el.getAttribute("data-smart-edge-id") : null))
            .filter((x): x is string => Boolean(x)),
        ),
      ];
      const flowDrop = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      globalThis.window.dispatchEvent(
        new CustomEvent(EDGE_SYMBOL_DROP_EVENT, {
          detail: {
            edgeId: id,
            edgeIds: edgeIdsAtPoint.length > 0 ? edgeIdsAtPoint : [id],
            shape: parsed.shape,
            lineLabelPosition,
            flowDrop,
          },
        }),
      );
    } catch {
      // Ignore unrelated drag payloads.
    }
  };

  useEffect(() => {
    const onAddCenter = (event: Event) => {
      const detail = (event as CustomEvent<{ edgeId: string }>).detail;
      if (detail?.edgeId !== id) return;
      if (!isRoutableEdgeStyle(edgeStyle)) return;
      const next = insertMidpointOnLongestSegment(
        { x: sourceAdjX, y: sourceAdjY },
        lineWaypointsRef.current,
        { x: targetAdjX, y: targetAdjY },
      ).slice(0, MAX_WAYPOINTS);
      globalThis.window.dispatchEvent(
        new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
          detail: {
            edgeId: id,
            patch: { lineWaypoints: next },
          },
        }),
      );
    };
    globalThis.window.addEventListener(SMART_PLANT_EDGE_ADD_WAYPOINT_CENTER, onAddCenter as EventListener);
    return () =>
      globalThis.window.removeEventListener(SMART_PLANT_EDGE_ADD_WAYPOINT_CENTER, onAddCenter as EventListener);
  }, [id, edgeStyle, sourceAdjX, sourceAdjY, targetAdjX, targetAdjY]);

  const onPathDoubleClick = (event: React.MouseEvent<SVGPathElement>) => {
    if (!isRoutableEdgeStyle(edgeStyle)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = insertMidpointOnLongestSegment(
      { x: sourceAdjX, y: sourceAdjY },
      lineWaypoints,
      { x: targetAdjX, y: targetAdjY },
    ).slice(0, MAX_WAYPOINTS);
    globalThis.window.dispatchEvent(
      new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
        detail: {
          edgeId: id,
          patch: { lineWaypoints: next },
        },
      }),
    );
  };

  const handleCursors = stretchHandleCursors(
    unitX,
    unitY,
    sourceX,
    sourceY,
    targetX,
    targetY,
  );

  const startStretchDragEnd = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const initial = resolveEdgeLineStretches(typedData);
    let lastStart = initial.start;
    let lastEnd = initial.end;
    const onMove = (moveEvent: MouseEvent) => {
      const moveFlow = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const dFlowX = moveFlow.x - startFlow.x;
      const dFlowY = moveFlow.y - startFlow.y;
      const projected = dFlowX * unitX + dFlowY * unitY;
      lastStart = initial.start;
      lastEnd = initial.end - projected;
      globalThis.window.dispatchEvent(
        new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
          detail: {
            edgeId: id,
            patch: {
              lineStretchStart: lastStart,
              lineStretchEnd: lastEnd,
            },
          },
        }),
      );
    };
    const onUp = () => {
      globalThis.window.removeEventListener("mousemove", onMove);
      globalThis.window.removeEventListener("mouseup", onUp);
      const s = snapStretchValue(lastStart);
      const e = snapStretchValue(lastEnd);
      if (s !== lastStart || e !== lastEnd) {
        globalThis.window.dispatchEvent(
          new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
            detail: {
              edgeId: id,
              patch: {
                lineStretchStart: s,
                lineStretchEnd: e,
              },
            },
          }),
        );
      }
    };
    globalThis.window.addEventListener("mousemove", onMove);
    globalThis.window.addEventListener("mouseup", onUp);
  };

  const startStretchDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const initial = resolveEdgeLineStretches(typedData);
    let lastStart = initial.start;
    let lastEnd = initial.end;
    const onMove = (moveEvent: MouseEvent) => {
      const moveFlow = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const dFlowX = moveFlow.x - startFlow.x;
      const dFlowY = moveFlow.y - startFlow.y;
      const projected = dFlowX * unitX + dFlowY * unitY;
      lastStart = initial.start + projected;
      lastEnd = initial.end;
      globalThis.window.dispatchEvent(
        new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
          detail: {
            edgeId: id,
            patch: {
              lineStretchStart: lastStart,
              lineStretchEnd: lastEnd,
            },
          },
        }),
      );
    };
    const onUp = () => {
      globalThis.window.removeEventListener("mousemove", onMove);
      globalThis.window.removeEventListener("mouseup", onUp);
      const s = snapStretchValue(lastStart);
      const e = snapStretchValue(lastEnd);
      if (s !== lastStart || e !== lastEnd) {
        globalThis.window.dispatchEvent(
          new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
            detail: {
              edgeId: id,
              patch: {
                lineStretchStart: s,
                lineStretchEnd: e,
              },
            },
          }),
        );
      }
    };
    globalThis.window.addEventListener("mousemove", onMove);
    globalThis.window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={
          lineWaypoints.length > 0
            ? { ...style, strokeLinecap: "round", strokeLinejoin: "round" }
            : style
        }
      />
      {/* Narrow stroke + stroke-only hits so node reconnect handles stay reachable (wide path blocked grabs). */}
      <path
        data-smart-edge-id={id}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        pointerEvents="stroke"
        className="cursor-copy"
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(SYMBOL_DRAG_MIME)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleSymbolDrop}
        onDoubleClick={onPathDoubleClick}
      />
      {hasLabel ? (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan absolute max-w-[min(14rem,92vw)] min-w-0 rounded border border-amber-300/80 bg-white/95 px-1.5 py-1 text-[10px] font-semibold text-amber-800 shadow-sm dark:border-amber-500/60 dark:bg-neutral-dark-100/95 dark:text-amber-200 ${
              isEdgeSelected ? "ring-1 ring-brand-400" : ""
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelLeft}px,${labelTop}px)`,
              pointerEvents: "all",
            }}
            title="Double-click to edit (multi-line: Ctrl/Cmd+Enter to apply). Drag to reposition."
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              globalThis.window.dispatchEvent(
                new CustomEvent(SMART_PLANT_EDGE_LABEL_DBLCLICK, {
                  detail: {
                    edgeId: id,
                    clientX: event.clientX,
                    clientY: event.clientY,
                  },
                }),
              );
            }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              const startX = event.clientX;
              const startY = event.clientY;
              const baseOffsetX = typedData.labelOffsetX ?? 0;
              const baseOffsetY = typedData.labelOffsetY ?? 0;
              const onMove = (moveEvent: MouseEvent) => {
                globalThis.window.dispatchEvent(
                  new CustomEvent(EDGE_LABEL_UPDATE_EVENT, {
                    detail: {
                      edgeId: id,
                      patch: {
                        labelOffsetX: baseOffsetX + (moveEvent.clientX - startX),
                        labelOffsetY: baseOffsetY + (moveEvent.clientY - startY),
                      },
                    },
                  }),
                );
              };
              const onUp = () => {
                globalThis.window.removeEventListener("mousemove", onMove);
                globalThis.window.removeEventListener("mouseup", onUp);
              };
              globalThis.window.addEventListener("mousemove", onMove);
              globalThis.window.addEventListener("mouseup", onUp);
            }}
          >
            <div className="flex min-w-0 flex-col items-center gap-1 text-center">
              {lineSymbol !== "none" ? (
                <span className="inline-flex shrink-0 items-center justify-center leading-none">
                  {renderEdgeSymbolIcon(lineSymbol)}
                </span>
              ) : null}
              {lineLabel ? (
                <span className="w-full min-w-0 whitespace-pre-wrap break-words text-center leading-snug hyphens-auto">
                  {lineLabel}
                </span>
              ) : null}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
      {isEdgeSelected ? (
        <EdgeLabelRenderer>
          <>
            <div
              className="nodrag nopan absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-600 bg-white shadow-sm dark:bg-neutral-dark-100"
              style={{
                transform: `translate(-50%, -50%) translate(${sourceAdjX}px,${sourceAdjY}px)`,
                pointerEvents: "all",
                cursor: handleCursors.start,
              }}
              title="Drag along the line to shorten or lengthen from the source side"
              onMouseDown={startStretchDragStart}
            />
            <div
              className="nodrag nopan absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-500 bg-white shadow-sm dark:bg-neutral-dark-100"
              style={{
                transform: `translate(-50%, -50%) translate(${targetAdjX}px,${targetAdjY}px)`,
                pointerEvents: "all",
                cursor: handleCursors.end,
              }}
              title="Drag along the line to shorten or lengthen from the target side"
              onMouseDown={startStretchDragEnd}
            />
          </>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
