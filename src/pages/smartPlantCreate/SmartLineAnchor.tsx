import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { SmartFlowData } from "./types";

const handleClass = "!h-2 !w-2 !border-2 !border-white !bg-brand-500";

/**
 * Tiny node used only as a free end for a connector dragged onto empty canvas.
 * Not included in plant export (type !== smartCmp).
 */
export default function SmartLineAnchor({ selected }: NodeProps<Node<SmartFlowData>>) {
  return (
    <div
      className="relative flex h-3 w-3 items-center justify-center"
      title="Line end — drag to connect to a component or delete when unused"
    >
      <Handle type="target" id="t-top" position={Position.Top} className={handleClass} />
      <Handle type="target" id="t-left" position={Position.Left} className={handleClass} />
      <Handle type="target" id="t-right" position={Position.Right} className={handleClass} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} className={handleClass} />
      <Handle type="source" id="s-left" position={Position.Left} className={handleClass} />
      <Handle type="source" id="s-top" position={Position.Top} className={handleClass} />
      <Handle type="source" id="s-right" position={Position.Right} className={handleClass} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} className={handleClass} />
      <div
        className={`pointer-events-none h-1.5 w-1.5 rounded-full border shadow-sm ${
          selected
            ? "border-brand-500 bg-brand-400 ring-2 ring-brand-300/60"
            : "border-neutral-400 bg-white dark:border-neutral-500 dark:bg-neutral-dark-200"
        }`}
      />
    </div>
  );
}
