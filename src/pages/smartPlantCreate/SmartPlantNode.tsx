import { useRef, useState, type CSSProperties } from "react";
import {
    Handle,
    NodeResizer,
    Position,
    type Node,
    type NodeProps,
} from "@xyflow/react";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import Button from "@/components/common/Button";
import { API_TYPE_LABEL, slugToApiType } from "./constants";
import type { SmartFlowData } from "./types";

export const ASSET_DRAG_MIME = "application/x-smart-plant-asset";
export const NODE_ASSET_DROP_EVENT = "smart-plant-node-asset-drop";
export const NODE_INLINE_RENAME_EVENT = "smart-plant-node-inline-rename";
export const NODE_CHROME_UPDATE_EVENT = "smart-plant-node-chrome-update";

/** Default title for palette-drawn shapes; cleared on first edit focus so typing replaces it. */
export const DEFAULT_SHAPE_PLACEHOLDER_NAME = "Write a Text";

type DroppedAsset = {
    kind: "device" | "tag_template";
    id: string;
    label: string;
};

export default function SmartPlantNode({ id, data, selected, width, height }: NodeProps<Node<SmartFlowData>>) {
    const api = slugToApiType(data.kind);
    const label = API_TYPE_LABEL[api] ?? api;
    const showKindLabel = data.kind !== "others";
    const [isDropActive, setIsDropActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const shape = data.nodeShape ?? "rounded";
    let shapeClass = "rounded-2xl";
    if (shape === "square") shapeClass = "rounded-none";
    if (shape === "circle") shapeClass = "rounded-full";
    if (shape === "pill") shapeClass = "rounded-full";
    const isTriangle = data.nodeShape === "triangle";
    const isTriangleDown = data.nodeShape === "triangle_down";
    const isDiamond = data.nodeShape === "diamond";
    const isHexagon = data.nodeShape === "hexagon";
    const isOctagon = data.nodeShape === "octagon";
    const isParallelogram = data.nodeShape === "parallelogram";
    const isLine = data.nodeShape === "line";
    const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500";
    const shapeStyle: CSSProperties = {};

    if (isTriangle) {
        shapeStyle.clipPath = "polygon(50% 2%, 98% 98%, 2% 98%)";
    }
    if (isTriangleDown) {
        shapeStyle.clipPath = "polygon(2% 2%, 98% 2%, 50% 98%)";
    }
    if (isDiamond) {
        shapeStyle.clipPath = "polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)";
    }
    if (isHexagon) {
        shapeStyle.clipPath = "polygon(25% 2%, 75% 2%, 98% 50%, 75% 98%, 25% 98%, 2% 50%)";
    }
    if (isOctagon) {
        shapeStyle.clipPath =
            "polygon(30% 2%, 70% 2%, 98% 30%, 98% 70%, 70% 98%, 30% 98%, 2% 70%, 2% 30%)";
    }
    if (isParallelogram) {
        shapeStyle.clipPath = "polygon(10% 0, 100% 0, 90% 100%, 0 100%)";
    }
    const sizeClass = isLine
        ? "min-h-[20px] min-w-[80px] py-0.5"
        : shape === "circle"
          ? "min-h-[120px] min-w-[120px]"
          : shape === "pill"
            ? "min-h-[64px] min-w-[120px]"
            : isTriangle || isTriangleDown || isDiamond
              ? "min-h-[88px] min-w-[120px]"
              : "min-h-[72px] min-w-[120px]";
    const contentWidthClass =
        isLine || isParallelogram
            ? "w-full"
            : isTriangle || isTriangleDown
              ? "w-[74%]"
              : isDiamond
                ? "w-[76%]"
                : "w-full";

    const resizeStyle: CSSProperties = {};
    if (typeof width === "number") resizeStyle.width = width;
    if (typeof height === "number") resizeStyle.height = height;
    const fillColor = data.node_fill_color;
    const titleColor = data.node_text_color;
    const titleAlign = data.node_title_align ?? "center";

    const renderChromeToolbar = () => {
        if (!selected) return null;
        const btn =
            "h-7 shrink-0 min-h-0 px-1.5 text-[10px] shadow-sm transition-colors dark:border-neutral-dark-400";
        const fill = fillColor ?? "#ffffff";
        const text = titleColor ?? "#111827";
        const pushChrome = (patch: Partial<Pick<SmartFlowData, "node_fill_color" | "node_text_color" | "node_title_align">>) => {
            globalThis.window.dispatchEvent(
                new CustomEvent(NODE_CHROME_UPDATE_EVENT, {
                    detail: { nodeId: id, patch },
                }),
            );
        };
        return (
            <div
                className="nodrag nopan absolute -top-[2.35rem] left-1/2 z-20 flex w-max max-w-[min(100vw-0.5rem,28rem)] -translate-x-1/2 flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-brand-200/90 bg-gradient-to-b from-white to-neutral-50/95 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-sm dark:border-brand-500/30 dark:from-neutral-dark-100 dark:to-neutral-dark-100 dark:ring-white/10 [scrollbar-width:thin]"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <span className="select-none text-[9px] font-bold uppercase tracking-wide text-brand-600/90 dark:text-brand-300/90">
                    Box
                </span>
                <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white/80 px-1 py-0.5 dark:bg-neutral-dark-200/80" title="Fill">
                    <span className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-300">Fill</span>
                    <input
                        type="color"
                        className="h-6 w-6 shrink-0 cursor-pointer rounded-md border border-neutral-200/80 p-0.5 shadow-inner dark:border-neutral-dark-400"
                        value={fill}
                        onChange={(e) => pushChrome({ node_fill_color: e.target.value })}
                    />
                </label>
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white/80 px-1 py-0.5 dark:bg-neutral-dark-200/80" title="Title text">
                    <span className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-300">Text</span>
                    <input
                        type="color"
                        className="h-6 w-6 shrink-0 cursor-pointer rounded-md border border-neutral-200/80 p-0.5 shadow-inner dark:border-neutral-dark-400"
                        value={text}
                        onChange={(e) => pushChrome({ node_text_color: e.target.value })}
                    />
                </label>
                <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
                <Button
                    type="button"
                    variant="secondary"
                    className={`${btn} ${titleAlign === "left" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
                    title="Align left"
                    onClick={() => pushChrome({ node_title_align: "left" })}
                >
                    <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className={`${btn} ${titleAlign === "center" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
                    title="Align center"
                    onClick={() => pushChrome({ node_title_align: "center" })}
                >
                    <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className={`${btn} ${titleAlign === "right" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
                    title="Align right"
                    onClick={() => pushChrome({ node_title_align: "right" })}
                >
                    <AlignRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        );
    };

    const titleAlignClass =
        titleAlign === "left" ? "text-left" : titleAlign === "right" ? "text-right" : "text-center";

    return (
        <div className="relative">
            {renderChromeToolbar()}
            <NodeResizer
                isVisible={selected}
                minWidth={48}
                minHeight={isLine ? 16 : 40}
                lineStyle={{ borderColor: "#e97124" }}
                handleStyle={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    border: "1px solid #e97124",
                    background: "#fff",
                }}
            />
            <Handle
                type="target"
                id="t-top"
                position={Position.Top}
                className={handleClass}
            />
            <Handle
                type="target"
                id="t-left"
                position={Position.Left}
                className={handleClass}
            />
            <Handle
                type="target"
                id="t-right"
                position={Position.Right}
                className={handleClass}
            />
            <Handle
                type="target"
                id="t-bottom"
                position={Position.Bottom}
                className={handleClass}
            />
            <button
                type="button"
                className={`${sizeClass} border px-3 py-2 shadow-sm transition-shadow ${shapeClass} ${
                    fillColor ? "" : "bg-white dark:bg-neutral-dark-100"
                } ${
                    selected
                        ? "border-brand-500 dark:border-brand-400"
                        : "border-neutral-200 dark:border-neutral-dark-200"
                } ${
                    isDropActive
                        ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-dark-50"
                        : ""
                }`}
                onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes(ASSET_DRAG_MIME)) return;
                    event.preventDefault();
                    if (!isDropActive) setIsDropActive(true);
                    event.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={() => setIsDropActive(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDropActive(false);
                    const raw = event.dataTransfer.getData(ASSET_DRAG_MIME);
                    if (!raw) return;
                    try {
                        const asset = JSON.parse(raw) as DroppedAsset;
                        if (!asset?.id || !asset?.kind) return;
                        globalThis.window.dispatchEvent(
                            new CustomEvent(NODE_ASSET_DROP_EVENT, {
                                detail: {
                                    nodeId: id,
                                    asset,
                                },
                            }),
                        );
                    } catch {
                        // Ignore invalid drag payloads from other sources.
                    }
                }}
                style={{
                    ...shapeStyle,
                    ...resizeStyle,
                    ...(fillColor ? { backgroundColor: fillColor } : {}),
                }}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    setIsEditing(true);
                    setTimeout(() => nameInputRef.current?.focus(), 0);
                }}
                title="Double-click to edit text"
            >
                <div className={`mx-auto flex w-full flex-col ${titleAlign === "center" ? "items-center" : titleAlign === "right" ? "items-end" : "items-start"} ${titleAlignClass} ${contentWidthClass}`}>
                    {showKindLabel ? (
                        <p className={`w-full text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-dark-500 ${titleAlignClass}`}>
                            {label}
                        </p>
                    ) : null}
                    {isEditing ? (
                        <input
                            ref={nameInputRef}
                            value={data.draft.component_name ?? ""}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onFocus={() => {
                                const current = data.draft.component_name?.trim() ?? "";
                                if (current === DEFAULT_SHAPE_PLACEHOLDER_NAME) {
                                    globalThis.window.dispatchEvent(
                                        new CustomEvent(NODE_INLINE_RENAME_EVENT, {
                                            detail: { nodeId: id, name: "" },
                                        }),
                                    );
                                }
                            }}
                            onBlur={() => setIsEditing(false)}
                            onChange={(event) =>
                                globalThis.window.dispatchEvent(
                                    new CustomEvent(NODE_INLINE_RENAME_EVENT, {
                                        detail: {
                                            nodeId: id,
                                            name: event.target.value,
                                        },
                                    }),
                                )
                            }
                            className={`w-full border-0 bg-transparent p-0 text-sm font-semibold outline-none ${titleAlignClass}`}
                            style={titleColor ? { color: titleColor } : undefined}
                        />
                    ) : (
                        <p
                            className={`w-full truncate text-sm font-semibold ${titleAlignClass} ${
                                titleColor ? "" : "text-neutral-900 dark:text-neutral-dark-950"
                            }`}
                            style={titleColor ? { color: titleColor } : undefined}
                        >
                            {data.draft.component_name?.trim() || "Untitled"}
                        </p>
                    )}
                </div>
            </button>
            <Handle
                type="source"
                id="s-left"
                position={Position.Left}
                className={handleClass}
            />
            <Handle
                type="source"
                id="s-top"
                position={Position.Top}
                className={handleClass}
            />
            <Handle
                type="source"
                id="s-right"
                position={Position.Right}
                className={handleClass}
            />
            <Handle
                type="source"
                id="s-bottom"
                position={Position.Bottom}
                className={handleClass}
            />
        </div>
    );
}
