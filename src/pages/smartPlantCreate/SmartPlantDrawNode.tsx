import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  Handle,
  NodeResizer,
  Position,
  useNodeId,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { SmartFlowData } from "./types";

export const DRAW_NODE_UPDATE_EVENT = "smart-plant-draw-update";

function pathFromPoints(points: [number, number][]): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0];
  let d = `M ${x0} ${y0}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  return d;
}

type DrawPatch = Partial<
  Pick<SmartFlowData, "draw_rotation_deg" | "draw_points" | "draw_stroke_width" | "draw_stroke_color">
>;

export default function SmartPlantDrawNode({
  id: idProp,
  data,
  selected,
  width,
  height,
}: NodeProps<Node<SmartFlowData>>) {
  const nodeId = useNodeId();
  const id = nodeId ?? idProp;
  const { getNode, screenToFlowPosition } = useReactFlow();

  const points = (data.draw_points as [number, number][] | undefined) ?? [
    [0, 0],
    [40, 0],
  ];
  const strokeW = data.draw_stroke_width ?? 2.5;
  const color = data.draw_stroke_color ?? "#374151";
  const rot = data.draw_rotation_deg ?? 0;
  const w = typeof width === "number" && width > 0 ? width : 48;
  const h = typeof height === "number" && height > 0 ? height : 32;

  const resizeSnapshotRef = useRef<{
    w: number;
    h: number;
    pts: [number, number][];
  } | null>(null);

  const pushPatch = useCallback(
    (patch: DrawPatch) => {
      globalThis.window.dispatchEvent(
        new CustomEvent(DRAW_NODE_UPDATE_EVENT, {
          detail: { nodeId: id, patch },
        }),
      );
    },
    [id],
  );

  const onResizeStart = useCallback(() => {
    const nw = typeof width === "number" ? width : w;
    const nh = typeof height === "number" ? height : h;
    resizeSnapshotRef.current = {
      w: Math.max(nw, 1),
      h: Math.max(nh, 1),
      pts: points.map((p) => [p[0], p[1]] as [number, number]),
    };
  }, [width, height, w, h, points]);

  const onResizeEnd = useCallback(() => {
    const snap = resizeSnapshotRef.current;
    resizeSnapshotRef.current = null;
    if (!snap) return;
    const readDim = (v: unknown): number => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const p = parseFloat(v.replace("px", ""));
        return Number.isFinite(p) ? p : NaN;
      }
      return NaN;
    };
    requestAnimationFrame(() => {
      const n = getNode(id);
      if (!n) return;
      const st = n.style as { width?: number | string; height?: number | string } | undefined;
      const pickW = [readDim(n.measured?.width), readDim(st?.width), readDim(width)].find(
        (x) => Number.isFinite(x) && (x as number) >= 4,
      );
      const pickH = [readDim(n.measured?.height), readDim(st?.height), readDim(height)].find(
        (x) => Number.isFinite(x) && (x as number) >= 4,
      );
      const nw = (pickW as number) ?? snap.w;
      const nh = (pickH as number) ?? snap.h;
      if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw < 4 || nh < 4) return;
      const sx = nw / snap.w;
      const sy = nh / snap.h;
      if (Math.abs(sx - 1) < 0.002 && Math.abs(sy - 1) < 0.002) return;
      const newPts = snap.pts.map(([x, y]) => [x * sx, y * sy] as [number, number]);
      pushPatch({ draw_points: newPts });
    });
  }, [getNode, id, width, height, pushPatch]);

  const rotateDragRef = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const n = getNode(id);
      if (!n) return;
      const readDim = (v: unknown): number => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
          const p = parseFloat(v.replace("px", ""));
          return Number.isFinite(p) ? p : NaN;
        }
        return NaN;
      };
      const st = n.style as { width?: number | string; height?: number | string } | undefined;
      const nw =
        readDim(n.measured?.width) ||
        readDim(st?.width) ||
        readDim(width) ||
        w;
      const nh =
        readDim(n.measured?.height) ||
        readDim(st?.height) ||
        readDim(height) ||
        h;
      const centerFlow = { x: n.position.x + nw / 2, y: n.position.y + nh / 2 };
      const startPointerFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const startAngle =
        Math.atan2(startPointerFlow.y - centerFlow.y, startPointerFlow.x - centerFlow.x);
      const startRot = data.draw_rotation_deg ?? 0;

      const onMove = (ev: PointerEvent) => {
        const curFlow = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        const curAngle = Math.atan2(curFlow.y - centerFlow.y, curFlow.x - centerFlow.x);
        let deltaRad = curAngle - startAngle;
        while (deltaRad > Math.PI) deltaRad -= 2 * Math.PI;
        while (deltaRad < -Math.PI) deltaRad += 2 * Math.PI;
        let next = startRot + (deltaRad * 180) / Math.PI;
        while (next > 180) next -= 360;
        while (next < -180) next += 360;
        pushPatch({ draw_rotation_deg: Math.round(next) });
      };
      const onUp = () => {
        globalThis.window.removeEventListener("pointermove", onMove);
        globalThis.window.removeEventListener("pointerup", onUp);
      };
      globalThis.window.addEventListener("pointermove", onMove);
      globalThis.window.addEventListener("pointerup", onUp);
    },
    [data.draw_rotation_deg, getNode, h, height, id, pushPatch, screenToFlowPosition, w, width],
  );

  const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500";

  return (
    <div
      data-draw-root
      className="relative h-full w-full overflow-visible"
      style={{
        zIndex: selected ? 2 : 1,
        transform: `rotate(${rot}deg)`,
        transformOrigin: "center center",
      }}
    >
      <Handle type="target" id="t-top" position={Position.Top} className={handleClass} />
      <Handle type="target" id="t-left" position={Position.Left} className={handleClass} />
      <Handle type="target" id="t-right" position={Position.Right} className={handleClass} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} className={handleClass} />
      <Handle type="source" id="s-left" position={Position.Left} className={handleClass} />
      <Handle type="source" id="s-top" position={Position.Top} className={handleClass} />
      <Handle type="source" id="s-right" position={Position.Right} className={handleClass} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} className={handleClass} />
      <NodeResizer
        isVisible={selected}
        minWidth={16}
        minHeight={12}
        lineStyle={{ borderColor: "#e97124" }}
        handleStyle={{
          width: 7,
          height: 7,
          borderRadius: 2,
          border: "1px solid #e97124",
          background: "#fff",
        }}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
      />
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: "none", overflow: "visible" }}
      >
        <path
          d={pathFromPoints(points)}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {selected ? (
        <div
          className="nodrag nopan absolute -top-6 left-1/2 z-10 flex h-4 w-4 cursor-grab items-center justify-center rounded-full border border-brand-500 bg-white text-[9px] shadow dark:bg-neutral-dark-100"
          style={{
            transform: `translate(-50%, 0) rotate(${-rot}deg)`,
            transformOrigin: "center bottom",
          }}
          title="Drag to rotate"
          onPointerDown={rotateDragRef}
        >
          ↻
        </div>
      ) : null}
    </div>
  );
}
