import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Hand, Info, Maximize2, Minimize2, MousePointer2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { WithChildren } from "@/utils/flatToTree";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
    CONTROL_ICON_BUTTON_CLASS,
    CONTROL_SURFACE_CLASS,
    buildDiagramLayout,
    buildHoverDetails,
    collectEdges,
    findFirstMatchingComponentId,
    formatComponentTypeTag,
    formatKwDetail,
    getLayoutRect,
    normalizeComponentType,
    typeIcon,
} from "./shared";
import type { DiagramLayoutConfig, LayoutRect, PositionedNode } from "./shared";
import ColorBadge from "@/components/common/ColorBadge";

const LAST_ALWAYS_VISIBLE_DEPTH = 2;

interface DiagramTreeNode {
    node: WithChildren<PlantComponentRow>;
    depth: number;
}

interface ConnectorLinesProps {
    parentId: string;
    childIds: string[];
    rects: Map<string, LayoutRect>;
}
const BADGE_LABELS = new Set(["Status", "Is Active"]);

const ConnectorLines: React.FC<ConnectorLinesProps> = ({ parentId, childIds, rects }) => {
    const parent = rects.get(parentId);
    if (!parent || childIds.length === 0) return null;

    const validChildren = childIds
        .map((id) => ({ id, rect: rects.get(id) }))
        .filter((child): child is { id: string; rect: LayoutRect } => Boolean(child.rect));

    if (validChildren.length === 0) return null;

    const parentCenterX = parent.left + parent.width / 2;
    const parentBottom = parent.top + parent.height;
    const childCentersX = validChildren.map(({ rect }) => rect.left + rect.width / 2);
    const childTops = validChildren.map(({ rect }) => rect.top);
    const firstChildTop = Math.min(...childTops);
    const railY = parentBottom + Math.max(32, (firstChildTop - parentBottom) * 0.46);
    const stroke = "var(--connector-stroke, var(--color-neutral-300, #d4d4d4))";

    return (
        <g>
            <line x1={parentCenterX} y1={parentBottom} x2={parentCenterX} y2={railY} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
            {validChildren.length > 1 && (
                <line x1={Math.min(...childCentersX)} y1={railY} x2={Math.max(...childCentersX)} y2={railY} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
            )}
            {validChildren.map(({ id }, index) => (
                <line
                    key={id}
                    x1={childCentersX[index]}
                    y1={validChildren.length > 1 ? railY : parentBottom}
                    x2={childCentersX[index]}
                    y2={childTops[index]}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinecap="round"
                />
            ))}
        </g>
    );
};

// Tracks the highest z-index so the last-clicked detail card always sits on top
let _detailZCounter = 30;

const ComponentSummaryCard: React.FC<{
    row: PlantComponentRow;
    childCount: number;
    compact?: boolean;
    canToggleChildren: boolean;
    isExpanded: boolean;
    isHighlighted?: boolean;
    onToggleChildren: (id: string) => void;
    renderActions?: (row: PlantComponentRow) => React.ReactNode;
}> = ({
    row,
    childCount,
    compact = false,
    canToggleChildren,
    isExpanded,
    isHighlighted = false,
    onToggleChildren,
    renderActions,
}) => {
    const ac = formatKwDetail(row.ac_capacity_kw);
    const dc = formatKwDetail(row.dc_capacity_kw);
    const hoverDetails = buildHoverDetails(row);
    const actionContent = renderActions?.(row);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailZIndex, setDetailZIndex] = useState(30);
    const bringToFront = useCallback(() => {
    _detailZCounter += 1;
        setDetailZIndex(_detailZCounter);
    }, []);

    const detailCardRef = useRef<HTMLDivElement>(null);
    const paddingClass = compact ? "p-2.5" : "p-2";
    const iconWrapClass = compact
        ? "rounded-md border border-brand-100/80 bg-brand-50/70 p-2 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/15"
        : "rounded-md border border-brand-100/80 bg-brand-50/70 p-1.5 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/15";
    const iconClass = compact ? "h-3 w-3" : "h-5 w-5";
    const widthClass = compact ? "w-full min-w-0" : "w-[min(100%,360px)] min-w-[260px]";
    const nameClass = compact
        ? "mt-2 block text-left text-[10px] font-bold leading-tight text-neutral-900 dark:text-neutral-dark-950"
        : "mt-2 block text-left text-[15px] font-bold leading-tight text-neutral-900 dark:text-neutral-dark-950";

    useEffect(() => {
        if (!isDetailOpen) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (detailCardRef.current?.contains(target)) return;
            setIsDetailOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [isDetailOpen]);

    return (
        <div
            className={[
                "relative rounded-xl border overflow-visible transition-all duration-150",
                "border-neutral-200 bg-neutral-100 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100",
                isHighlighted
                    ? "diagram-component-type-highlight z-10"
                    : "",
                widthClass,
            ].join(" ")}
            onMouseDown={(event) => event.stopPropagation()}
            role="group"
            aria-label={row.component_name}
        >
            <div className="w-full rounded-xl">
                <div className={paddingClass}>
                    <div className={compact ? "flex items-start gap-2.5" : "flex items-start gap-4"}>
                        <div className={iconWrapClass}>
                            {typeIcon(row.component_type, iconClass)}
                        </div>
                        <div className="min-w-0 flex-1">
                            {/* ↓ details icon added to the left of display_order */}
                            <div className="flex flex-wrap items-center justify-between">
                                <span className={compact ? "inline-flex rounded-sm bg-brand-100 px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-800 ring-1 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800" : "inline-flex rounded-sm bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800 ring-1 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800"}>
                                    {formatComponentTypeTag(row.component_type)}
                                </span>

                                <div className="flex items-center gap-1.5">
                                    {hoverDetails.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setIsDetailOpen((prev) => !prev);
                                                bringToFront();
                                            }}
                                            className={[
                                                "inline-flex items-center justify-center rounded-sm transition-colors bg-brand-50/70 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400",
                                                compact ? "h-5 w-5" : "h-6 w-6",
                                                isDetailOpen
                                                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                                                    : "text-neutral-400 hover:bg-brand-50 hover:text-brand-600 dark:text-neutral-dark-500 dark:hover:bg-brand-950/30 dark:hover:text-brand-400",
                                            ].join(" ")}
                                            aria-label={`${isDetailOpen ? "Close" : "Open"} details for ${row.component_name}`}
                                            aria-expanded={isDetailOpen}
                                        >
                                            <Info className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                                        </button>
                                    )}


                                </div>
                            </div>

                            <Link
                                to={`/components/${row.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className={`${nameClass} hover:text-brand-700 hover:underline dark:hover:text-brand-300`}
                                title={row.component_name}
                            >
                                {row.component_name}
                            </Link>
                        </div>
                    </div>

                    {/* rest of card unchanged ... */}
                    <div className={compact ? "grid grid-cols-2 gap-2 pt-2.5 text-left" : "mt-0 grid grid-cols-2 gap-3 pt-2.5 text-left"}>
                        <div className={compact ? "rounded-lg border border-brand-100 bg-brand-25 px-2 py-1.5 dark:border-brand-900/60 dark:bg-brand-950/15" : "rounded-lg border border-brand-100 bg-brand-25 px-3 py-2.5 dark:border-brand-900/60 dark:bg-brand-950/15"}>
                            <p className={compact ? "text-[9px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300" : "text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300"}>
                                AC Capacity
                            </p>
                            <p className={compact ? "mt-0.5 truncate text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950" : "mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950"}>
                                {ac ?? "N/A"}
                            </p>
                        </div>
                        <div className={compact ? "rounded-lg border border-brand-100 bg-brand-25 px-2 py-1.5 dark:border-brand-900/60 dark:bg-brand-950/15" : "rounded-lg border border-brand-100 bg-brand-25 px-3 py-2.5 dark:border-brand-900/60 dark:bg-brand-950/15"}>
                            <p className={compact ? "text-[9px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300" : "text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300"}>
                                DC Capacity
                            </p>
                            <p className={compact ? "mt-0.5 truncate text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950" : "mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950"}>
                                {dc ?? "N/A"}
                            </p>
                        </div>
                    </div>

                    {canToggleChildren ? (
                        <div className={compact ? "pt-2" : "pt-2.5"}>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleChildren(row.id);
                                }}
                                className={[
                                    "flex w-full items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-left transition-colors",
                                    "hover:border-brand-200 hover:bg-brand-25/60 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:hover:border-brand-800 dark:hover:bg-brand-950/15",
                                ].join(" ")}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? `Collapse children of ${row.component_name}` : `Expand children of ${row.component_name}`}
                            >
                                <div className="min-w-0">
                                    <p className="mt-0.5 text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950">
                                        {childCount} Child Component{childCount === 1 ? "" : "s"}
                                    </p>
                                </div>
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-transparent text-brand-700  ring-neutral-200  dark:text-brand-300 dark:ring-neutral-dark-300">
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </span>
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {isDetailOpen && hoverDetails.length > 0 ? (
                <div
    className="absolute left-1/2 top-1/2 mb-3 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
    style={{ zIndex: detailZIndex }}
    onMouseDown={(event) => { event.stopPropagation(); bringToFront(); }}
>

                    <div
                        ref={detailCardRef}
                        className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-[0_20px_60px_rgba(15,23,42,0.16)] dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-dark-200">
                            <div className="flex min-w-0 items-start gap-2">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-50">
                                    {typeIcon(row.component_type, "h-5 w-5")}
                                </div>
                                <div className="min-w-0">
                                    <Link
                                        to={`/components/${row.id}`}
                                        onClick={(event) => event.stopPropagation()}
                                        className="truncate text-sm font-semibold leading-tight text-neutral-900 hover:text-brand-700 hover:underline dark:text-neutral-dark-950 dark:hover:text-brand-300"
                                        title={row.component_name}
                                    >
                                        {row.component_name}
                                    </Link>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex rounded-sm bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-800 ring-1 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800">
                                            {formatComponentTypeTag(row.component_type)}
                                        </span>
                                        {row.component_code ? (
                                            <span className="rounded-sm bg-neutral-200 px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-500 dark:bg-neutral-dark-200 dark:text-neutral-dark-500">
                                                {row.component_code}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">

                        {actionContent ? (
                            <div className="border-neutral-200 px-3 dark:border-neutral-dark-200">
                                <div className="flex items-center justify-end">
                                    {actionContent}
                                </div>
                            </div>
                        ) : null}
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setIsDetailOpen(false);
                                }}
                                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-dark-500 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-dark-700"
                                aria-label={`Close details for ${row.component_name}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                                                        </div>

                        </div>


                        <div className="grid grid-cols-1 gap-x-3 gap-y-2 overflow-y-auto px-3 py-2 sm:grid-cols-2">
                            {hoverDetails.map((detail) => (
                                <div
                                    key={detail.label}
                                    className="flex min-w-0 flex-col gap-0.5 overflow-hidden"
                                >
                                    <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400">
                                        {detail.label}
                                    </p>
                                    {BADGE_LABELS.has(detail.label) ? (
                                                        <ColorBadge variant="green" className="w-fit rounded-full px-2 py-0.5">
                                        {detail.value}</ColorBadge>
                                    ): (
                                                        <p className="break-words text-xs font-medium leading-snug text-neutral-800 dark:text-neutral-dark-800">
                    {detail.value}
                </p>

                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

function PositionedDiagramNodes({
    nodes,
    refFor,
    compact,
    layoutConfig,
    expandedIds,
    highlightedType,
    isHighlightPulsing,
    onToggleChildren,
    renderActions,
}: {
    nodes: Array<PositionedNode & { depth: number; childCount: number }>;
    refFor: (id: string) => (el: HTMLDivElement | null) => void;
    compact: boolean;
    layoutConfig: DiagramLayoutConfig;
    expandedIds: Set<string>;
    highlightedType: string | null;
    isHighlightPulsing: boolean;
    onToggleChildren: (id: string) => void;
    renderActions?: (row: PlantComponentRow) => React.ReactNode;
}) {
    return (
        <>
            {nodes.map(({ node, left, top, depth, childCount }) => (
                <div
                    key={node.id}
                    ref={refFor(node.id)}
                    className="absolute"
                    style={{
                        left: left + layoutConfig.paddingX,
                        top: top + layoutConfig.paddingY,
                        width: layoutConfig.nodeWidth,
                    }}
                >
                    <ComponentSummaryCard
                        row={node}
                        childCount={childCount}
                        compact={compact}
                        canToggleChildren={childCount > 0 && depth >= LAST_ALWAYS_VISIBLE_DEPTH}
                        isExpanded={expandedIds.has(node.id)}
                        isHighlighted={
                            isHighlightPulsing &&
                            highlightedType !== null &&
                            normalizeComponentType(node.component_type) === highlightedType
                        }
                        onToggleChildren={onToggleChildren}
                        renderActions={renderActions}
                    />
                </div>
            ))}
        </>
    );
}

interface DiagramToolbarProps {
    interactionMode: "zoom" | "move";
    onSetInteractionMode: (mode: "zoom" | "move") => void;
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
}

export function DiagramViewToolbar({
    interactionMode,
    onSetInteractionMode,
    scale,
    onZoomIn,
    onZoomOut,
    onResetZoom,
}: DiagramToolbarProps) {
    return (
        <div className={`${CONTROL_SURFACE_CLASS} flex-col gap-1 rounded-xs py-1 shadow-xl absolute bottom-1 left-1 z-[8]`}>
            <button
                type="button"
                aria-label="Pointer zoom mode"
                title="Pointer zoom mode"
                onClick={() => onSetInteractionMode("zoom")}
                className={[
                    CONTROL_ICON_BUTTON_CLASS,
                    interactionMode === "zoom"
                        ? "selected-glass-ui text-brand-700 dark:text-white"
                        : "",
                ].join(" ")}
            >
                <MousePointer2 className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                aria-label="Move mode"
                title="Move mode"
                onClick={() => onSetInteractionMode("move")}
                className={[
                    CONTROL_ICON_BUTTON_CLASS,
                    interactionMode === "move"
                        ? "selected-glass-ui text-brand-700 dark:text-white"
                        : "",
                ].join(" ")}
            >
                <Hand className="h-3.5 w-3.5" />
            </button>
            <div className="my-0.5 h-px w-7 shrink-0 bg-white/30 dark:bg-white/10" />
            <button type="button" aria-label="Zoom in" onClick={onZoomIn} className={CONTROL_ICON_BUTTON_CLASS}>
                <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Zoom out" onClick={onZoomOut} className={CONTROL_ICON_BUTTON_CLASS}>
                <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <div className="my-0.5 h-px w-7 shrink-0 bg-white/30 dark:bg-white/10" />
            <button type="button" aria-label="Reset zoom" onClick={onResetZoom} className={CONTROL_ICON_BUTTON_CLASS}>
                <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[40px] px-1.5 pt-0.5 text-center text-[11px] font-semibold tabular-nums text-neutral-700 dark:text-neutral-dark-600">
                {Math.round(scale * 100)}%
            </span>
        </div>
    );
}

interface DiagramViewProps {
    tree: WithChildren<PlantComponentRow>[];
    isLoading: boolean;
    scale: number;
    position: { x: number; y: number };
    setScale: React.Dispatch<React.SetStateAction<number>>;
    setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    interactionMode: "zoom" | "move";
    highlightedType: string | null;
    isHighlightPulsing: boolean;
    highlightExpandIds: Set<string> | null;
    renderActions?: (row: PlantComponentRow) => React.ReactNode;
}

export interface DiagramViewHandle {
    fitToViewport: () => void;
}

const DiagramView = forwardRef<DiagramViewHandle, DiagramViewProps>(({
    tree,
    isLoading,
    scale,
    position,
    setScale,
    setPosition,
    interactionMode,
    highlightedType,
    isHighlightPulsing,
    highlightExpandIds,
    renderActions,
}, ref) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [layoutRects, setLayoutRects] = useState<Map<string, LayoutRect>>(new Map());
    const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRootRef = useRef<HTMLDivElement>(null);
    const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
    const hasAutoFittedRef = useRef(false);
    const positionRef = useRef(position);
    const scaleRef = useRef(scale);
    const touchGestureRef = useRef<{
        panStart: { x: number; y: number } | null;
        pinchStart: {
            initialDistance: number;
            initialScale: number;
            initialPosition: { x: number; y: number };
        } | null;
    }>({ panStart: null, pinchStart: null });
    const supportsCssZoom =
        typeof window !== "undefined" &&
        typeof window.CSS !== "undefined" &&
        window.CSS.supports?.("zoom", "1") === true;

    const toggleChildren = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const visibleTree = useMemo(() => {
        const buildVisibleNodes = (
            nodes: WithChildren<PlantComponentRow>[],
            depth = 0,
        ): WithChildren<PlantComponentRow>[] =>
            nodes.map((node) => {
                const shouldShowChildren =
                    node.children.length > 0 &&
                    (depth < LAST_ALWAYS_VISIBLE_DEPTH || expandedIds.has(node.id));

                return {
                    ...node,
                    children: shouldShowChildren ? buildVisibleNodes(node.children, depth + 1) : [],
                };
            });

        return buildVisibleNodes(tree);
    }, [expandedIds, tree]);

    const treeNodeMeta = useMemo(() => {
        const map = new Map<string, DiagramTreeNode>();
        const walk = (nodes: WithChildren<PlantComponentRow>[], depth = 0) => {
            nodes.forEach((node) => {
                map.set(node.id, { node, depth });
                walk(node.children, depth + 1);
            });
        };
        walk(tree);
        return map;
    }, [tree]);

    const layoutConfig = useMemo<DiagramLayoutConfig>(() => {
        const componentCount = treeNodeMeta.size;
        if (componentCount >= 300) {
            return {
                nodeWidth: 224,
                nodeHeight: 146,
                horizontalGap: 24,
                verticalGap: 58,
                paddingX: 36,
                paddingY: 32,
            };
        }

        if (componentCount >= 120) {
            return {
                nodeWidth: 248,
                nodeHeight: 158,
                horizontalGap: 30,
                verticalGap: 66,
                paddingX: 42,
                paddingY: 34,
            };
        }

        return {
            nodeWidth: 292,
            nodeHeight: 198,
            horizontalGap: 38,
            verticalGap: 74,
            paddingX: 50,
            paddingY: 36,
        };
    }, [treeNodeMeta.size]);

    const diagramLayout = useMemo(() => buildDiagramLayout(visibleTree, layoutConfig), [layoutConfig, visibleTree]);
    const edges = useMemo(() => collectEdges(visibleTree), [visibleTree]);
    const isCompactDiagram = layoutConfig.nodeWidth <= 232;
    const positionedNodes = useMemo(
        () =>
            diagramLayout.positionedNodes.map((positionedNode) => {
                const meta = treeNodeMeta.get(positionedNode.node.id);
                return {
                    ...positionedNode,
                    depth: meta?.depth ?? 0,
                    childCount: meta?.node.children.length ?? 0,
                };
            }),
        [diagramLayout.positionedNodes, treeNodeMeta],
    );

    const refFor = useCallback((id: string) => (element: HTMLDivElement | null) => {
        if (element) nodeEls.current.set(id, element);
        else nodeEls.current.delete(id);
    }, []);

    const measure = useCallback(() => {
        const root = contentRootRef.current;
        if (!root) return;
        const rectMap = new Map<string, LayoutRect>();
        nodeEls.current.forEach((element, id) => {
            rectMap.set(id, getLayoutRect(element, root));
        });
        setLayoutRects(rectMap);
        setSvgSize({ w: root.scrollWidth, h: root.scrollHeight });
    }, []);

    const fitToViewport = useCallback(() => {
        const container = containerRef.current;
        const root = contentRootRef.current;
        if (!container || !root) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const rootWidth = root.scrollWidth;
        const rootHeight = root.scrollHeight;
        if (rootWidth <= 0 || rootHeight <= 0) return;

        const nextScale = Math.min(containerWidth / rootWidth, containerHeight / rootHeight, 1) * 0.88;
        setScale(nextScale);
        setPosition({
            x: (containerWidth - rootWidth * nextScale) / 2,
            y: Math.max(16, (containerHeight - rootHeight * nextScale) / 2),
        });
    }, [setPosition, setScale]);

    const toggleFullscreen = useCallback(async () => {
        const container = containerRef.current;
        if (!container) return;

        try {
            if (document.fullscreenElement === container) {
                await document.exitFullscreen();
                return;
            }
            await container.requestFullscreen();
        } catch {
            // Some browsers or policies may block Fullscreen API requests.
        }
    }, []);

    useImperativeHandle(ref, () => ({
        fitToViewport,
    }), [fitToViewport]);

    useEffect(() => {
        if (!highlightExpandIds || highlightExpandIds.size === 0) return;
        setExpandedIds((previous) => new Set([...previous, ...highlightExpandIds]));
    }, [highlightExpandIds]);

    useEffect(() => {
        if (!highlightedType) return;
        const firstId = findFirstMatchingComponentId(tree, highlightedType);
        if (!firstId) return;

        const timer = window.setTimeout(() => {
            const container = containerRef.current;
            const root = contentRootRef.current;
            const nodeElement = nodeEls.current.get(firstId);
            if (!container || !root || !nodeElement) return;

            const containerRect = container.getBoundingClientRect();
            const nodeRect = nodeElement.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();
            const nodeCenterX =
                nodeRect.left - rootRect.left + nodeRect.width / 2;
            const nodeCenterY =
                nodeRect.top - rootRect.top + nodeRect.height / 2;

            setPosition({
                x: containerRect.width / 2 - nodeCenterX * scale,
                y: containerRect.height / 2 - nodeCenterY * scale,
            });
        }, 280);

        return () => window.clearTimeout(timer);
    }, [highlightedType, scale, setPosition, tree, visibleTree]);

    useEffect(() => {
        hasAutoFittedRef.current = false;
    }, [tree.length, expandedIds]);

    useEffect(() => {
        const timer = window.setTimeout(measure, 80);
        return () => window.clearTimeout(timer);
    }, [measure, edges.length, visibleTree]);

    useEffect(() => {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [measure]);

    useEffect(() => {
        const root = contentRootRef.current;
        if (!root || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(() => measure());
        observer.observe(root);
        return () => observer.disconnect();
    }, [measure, visibleTree]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            if (interactionMode === "move") {
                setPosition((previous) => ({
                    x: previous.x - event.deltaX,
                    y: previous.y - event.deltaY,
                }));
                return;
            }
            const delta = event.deltaY > 0 ? -0.08 : 0.08;
            setScale((previous) => Math.max(0.25, Math.min(3, parseFloat((previous + delta).toFixed(2)))));
        };

        container.addEventListener("wheel", onWheel, { passive: false });
        return () => container.removeEventListener("wheel", onWheel);
    }, [interactionMode, setPosition, setScale]);

    useEffect(() => {
        positionRef.current = position;
        scaleRef.current = scale;
    }, [position, scale]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const gesture = touchGestureRef.current;

        const getTouchDistance = (touches: TouchList) => {
            if (touches.length < 2) return 0;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.hypot(dx, dy);
        };

        const getTouchCenter = (touches: TouchList) => {
            const rect = container.getBoundingClientRect();
            return {
                x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
                y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
            };
        };

        const clampScale = (value: number) =>
            Math.max(0.25, Math.min(3, parseFloat(value.toFixed(2))));

        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length === 2) {
                gesture.panStart = null;
                gesture.pinchStart = {
                    initialDistance: getTouchDistance(event.touches),
                    initialScale: scaleRef.current,
                    initialPosition: { ...positionRef.current },
                };
                event.preventDefault();
                return;
            }

            if (event.touches.length === 1 && interactionMode === "move") {
                gesture.pinchStart = null;
                gesture.panStart = {
                    x: event.touches[0].clientX - positionRef.current.x,
                    y: event.touches[0].clientY - positionRef.current.y,
                };
            }
        };

        const onTouchMove = (event: TouchEvent) => {
            if (event.touches.length === 2 && gesture.pinchStart && gesture.pinchStart.initialDistance > 0) {
                event.preventDefault();
                const { initialDistance, initialScale, initialPosition } = gesture.pinchStart;
                const ratio = getTouchDistance(event.touches) / initialDistance;
                const nextScale = clampScale(initialScale * ratio);
                const center = getTouchCenter(event.touches);
                const diagramX = (center.x - initialPosition.x) / initialScale;
                const diagramY = (center.y - initialPosition.y) / initialScale;
                const nextPosition = {
                    x: center.x - diagramX * nextScale,
                    y: center.y - diagramY * nextScale,
                };
                scaleRef.current = nextScale;
                positionRef.current = nextPosition;
                setScale(nextScale);
                setPosition(nextPosition);
                return;
            }

            if (event.touches.length === 1 && gesture.panStart && interactionMode === "move") {
                event.preventDefault();
                const nextPosition = {
                    x: event.touches[0].clientX - gesture.panStart.x,
                    y: event.touches[0].clientY - gesture.panStart.y,
                };
                positionRef.current = nextPosition;
                setPosition(nextPosition);
            }
        };

        const onTouchEnd = (event: TouchEvent) => {
            if (event.touches.length < 2) {
                gesture.pinchStart = null;
            }

            if (event.touches.length === 0) {
                gesture.panStart = null;
                return;
            }

            if (event.touches.length === 1 && interactionMode === "move") {
                gesture.panStart = {
                    x: event.touches[0].clientX - positionRef.current.x,
                    y: event.touches[0].clientY - positionRef.current.y,
                };
            }
        };

        container.addEventListener("touchstart", onTouchStart, { passive: false });
        container.addEventListener("touchmove", onTouchMove, { passive: false });
        container.addEventListener("touchend", onTouchEnd);
        container.addEventListener("touchcancel", onTouchEnd);

        return () => {
            container.removeEventListener("touchstart", onTouchStart);
            container.removeEventListener("touchmove", onTouchMove);
            container.removeEventListener("touchend", onTouchEnd);
            container.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [interactionMode, setPosition, setScale]);

    useEffect(() => {
        if (isLoading || tree.length === 0 || hasAutoFittedRef.current) return;
        const timer = window.setTimeout(() => {
            fitToViewport();
            hasAutoFittedRef.current = true;
        }, 120);
        return () => window.clearTimeout(timer);
    }, [diagramLayout.height, diagramLayout.width, fitToViewport, isLoading, tree.length]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const syncFullscreenState = () => {
            setIsFullscreen(document.fullscreenElement === container);
        };

        syncFullscreenState();
        document.addEventListener("fullscreenchange", syncFullscreenState);
        return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (event: MouseEvent) =>
            setPosition({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
        const onUp = () => setIsDragging(false);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, [dragStart, isDragging, setPosition]);

    return (
        <div
            ref={containerRef}
            className={`relative flex-1 touch-none overflow-hidden overscroll-none rounded-xs ${
                interactionMode === "move"
                    ? isDragging
                        ? "cursor-grabbing"
                        : "cursor-grab"
                    : "cursor-default"
            }`}
            onMouseDown={(event) => {
                if (interactionMode !== "move") return;
                if (event.button !== 0) return;
                event.preventDefault();
                setIsDragging(true);
                setDragStart({ x: event.clientX - position.x, y: event.clientY - position.y });
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="absolute right-1 top-1 z-10 inline-flex h-7 w-7 items-center justify-center rounded-xs border border-neutral-200 bg-neutral-0 text-neutral-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600 dark:hover:border-brand-700 dark:hover:text-brand-400"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
                {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                )}
            </button>

            <div
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: "top left",
                    width: supportsCssZoom ? diagramLayout.width * scale : diagramLayout.width,
                    height: supportsCssZoom ? diagramLayout.height * scale : diagramLayout.height,
                }}
                className={supportsCssZoom ? "relative" : "relative will-change-transform"}
            >
                <div
                    style={
                        supportsCssZoom
                            ? {
                                zoom: scale,
                                width: diagramLayout.width,
                                height: diagramLayout.height,
                            }
                            : {
                                transform: `scale(${scale})`,
                                transformOrigin: "top left",
                                width: diagramLayout.width,
                                height: diagramLayout.height,
                            }
                    }
                >
                    <div
                        ref={contentRootRef}
                        className="relative"
                        style={{ width: diagramLayout.width, height: diagramLayout.height }}
                    >
                        <svg
                            width={svgSize.w || diagramLayout.width}
                            height={svgSize.h || diagramLayout.height}
                            className="pointer-events-none absolute left-0 top-0"
                        >
                            {edges.map((edge) => (
                                <ConnectorLines
                                    key={edge.parentId}
                                    parentId={edge.parentId}
                                    childIds={edge.childIds}
                                    rects={layoutRects}
                                />
                            ))}
                        </svg>

                        <PositionedDiagramNodes
                            nodes={positionedNodes}
                            refFor={refFor}
                            compact={isCompactDiagram}
                            layoutConfig={layoutConfig}
                            expandedIds={expandedIds}
                            highlightedType={highlightedType}
                            isHighlightPulsing={isHighlightPulsing}
                            onToggleChildren={toggleChildren}
                            renderActions={renderActions}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

DiagramView.displayName = "DiagramView";

export default DiagramView;
