/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  useStoreApi,
  Panel,
  MarkerType,
  PanOnScrollMode,
  SelectionMode,
  ConnectionMode,
  type FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowUpRight,
  Circle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Diamond,
  LayoutTemplate,
  Link2Off,
  Loader2,
  Hand,
  Hexagon,
  X,
  Network,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  RotateCcw,
  RotateCw,
  Square,
  Sparkles,
  Tag,
  Triangle,
  Trash2,
  Upload,
  MousePointer2,
  Pencil,
  Slash,
} from "lucide-react";

import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import TextArea from "@/components/common/TextArea";
import AsyncSelect from "@/components/common/AsyncSelect";
import type { Option } from "@/components/common/AsyncSelect";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { submitSmartPlantCreate } from "@/services/operations/smartPlantAPI";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import { fetchInverterTypeNames } from "@/services/operations/inverterTypeAPI";
import { VD_NUMBER_MAX, VD_NUMBER_MIN, VD_NUMBER_OPTIONS } from "@/constants/vdNumber";
import { newFlowNodeId } from "@/utils/flowNodeId";
import type { NodeShapeStyle, SmartFlowData } from "./types";
import SmartPlantNode, {
  ASSET_DRAG_MIME,
  DEFAULT_SHAPE_PLACEHOLDER_NAME,
  NODE_CHROME_UPDATE_EVENT,
  NODE_INLINE_RENAME_EVENT,
  NODE_ASSET_DROP_EVENT,
} from "./SmartPlantNode";
import SmartLineAnchor from "./SmartLineAnchor";
import SmartPlantAnnotationNode, { ANNOTATION_UPDATE_EVENT } from "./SmartPlantAnnotationNode";
import SmartPlantDrawNode, { DRAW_NODE_UPDATE_EVENT } from "./SmartPlantDrawNode";
import SmartPlantEdge, {
  EDGE_LABEL_UPDATE_EVENT,
  SMART_PLANT_EDGE_LABEL_DBLCLICK,
} from "./SmartPlantEdge";
import SmartPlantInspector from "./SmartPlantInspector";
import GenerateWizard from "./GenerateWizard";
import { buildCreationOrder, buildParentMap } from "./graphTree";
import { buildExportTree, toSmartPlantApiPayload } from "./buildPayload";
import { nestedExportToGraph, parseImportPayload } from "./importExport";
import {
  addTableColumn,
  addTableRow,
  appendPasteToLastCell,
  cellsToPipeText,
  DEFAULT_TABLE_CELLS,
  equalColumnPct,
  getTableCellsFromData,
  normalizeRectangular,
  parsePipeTableText,
  removeTableColumn,
  removeTableRow,
  syncColWidthsWithGrid,
} from "./annotationTable";
import { validateBoardGraph, validateSmartPlantExportTree } from "./validation";
import { COMPONENT_KIND_OPTIONS, STATUS, type ComponentKindSlug, slugToApiType } from "./constants";
import {
  ANNOTATION_ALL_OPTIONS,
  ANNOTATION_SYMBOL_OPTIONS,
  ANNOTATION_TEXT_OPTIONS,
  EDGE_SYMBOL_DROP_EVENT,
  isEdgeAttachableSymbol,
  renderAnnotationPaletteIcon,
  renderElectricalSymbolSwatch,
  SYMBOL_DRAG_MIME,
  type AnnotationShape,
} from "./symbols";

type RFNode = Node<SmartFlowData>;

const nodeTypes = {
  smartCmp: SmartPlantNode,
  smartAnnot: SmartPlantAnnotationNode,
  smartDraw: SmartPlantDrawNode,
  smartAnchor: SmartLineAnchor,
} as Record<string, React.ComponentType<any>>;
const edgeTypes = { smartEdge: SmartPlantEdge } as Record<string, React.ComponentType<any>>;
const ROOT_POSITION = { x: 120, y: 160 };
const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 180;
const BRAND_EDGE_COLOR = "#e97124";
const SMART_PLANT_CREATE_STORAGE_KEY = "smart-plant-create-board-v1";
/** Sentinel option in palette dropdowns — adds every item to the left panel. */
const PALETTE_ALL_VALUE = "__palette_all__";
/** Must match `loadOptions` page size so pagination stays aligned with list requests. */
const PALETTE_PAGE_SIZE = 50;
/** Max draggable chips per palette — "Select all" replaces the list with the full API result (like VD 1–25). */
const PALETTE_MAX_CHIPS = 5000;

async function fetchAllPaginatedNameOptions(
  fetchPage: (
    page: number,
    limit: number,
  ) => Promise<Array<{ value: string; label: string }>>,
): Promise<Array<{ value: string; label: string }>> {
  const merged: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();
  let page = 1;
  for (let safety = 0; safety < 500; safety++) {
    const batch = await fetchPage(page, PALETTE_PAGE_SIZE);
    if (batch.length === 0) break;
    for (const o of batch) {
      if (!seen.has(o.value)) {
        seen.add(o.value);
        merged.push(o);
      }
    }
    if (batch.length < PALETTE_PAGE_SIZE) break;
    page += 1;
  }
  return merged;
}
const COMPONENT_TYPE_LABEL_BY_SLUG: Record<ComponentKindSlug, string> = Object.fromEntries(
  COMPONENT_KIND_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<ComponentKindSlug, string>;

type AddPromptState = {
  open: boolean;
  kind: ComponentKindSlug;
  quantity: string;
  parentId: string | null;
};

type PaletteResource = {
  kind: "device" | "tag_template" | "vd_number" | "inverter_type";
  id: string;
  label: string;
};

type NodeAssetDropPayload = {
  nodeId: string;
  asset: PaletteResource;
};
type NodeInlineRenamePayload = {
  nodeId: string;
  name: string;
};

type AnnotationUpdatePayload = {
  nodeId: string;
  patch: Partial<
    Pick<
      SmartFlowData,
      | "annotation_text"
      | "annotation_note"
      | "annotation_text_style"
      | "annotation_table_header_row"
      | "annotation_table_cells"
      | "annotation_table_col_widths_pct"
    >
  >;
  /** Merged into the React Flow node `style` (e.g. table frame height = content). */
  nodeStyle?: React.CSSProperties;
};

type BoardSnapshot = {
  nodes: RFNode[];
  edges: Edge[];
  selectedId: string | null;
};

type PersistedBoardState = {
  nodes: RFNode[];
  edges: Edge[];
  selectedId: string | null;
  plantId: string | null;
  plantLabel: string;
  nodeShape: NodeShapeStyle;
  edgeStyle: EdgeStylePreset;
};

type EdgeStylePreset = "dashed" | "solid" | "smooth" | "step";

const SHAPE_OPTIONS: Array<{ value: NodeShapeStyle; label: string }> = [
  { value: "rounded", label: "Rounded" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "triangle", label: "Triangle" },
  { value: "triangle_down", label: "Triangle down" },
  { value: "hexagon", label: "Hexagon" },
];

const EDGE_OPTIONS: Array<{ value: EdgeStylePreset; label: string }> = [
  { value: "dashed", label: "Dashed" },
  { value: "solid", label: "Solid" },
  { value: "smooth", label: "Smooth" },
  { value: "step", label: "Step" },
];

const renderShapeSwatch = (shape: NodeShapeStyle) => {
  if (shape === "rounded") {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="14" rx="4" />
      </svg>
    );
  }
  if (shape === "square") {
    return <Square className="mx-auto h-4 w-4" strokeWidth={1.8} />;
  }
  if (shape === "circle") {
    return <Circle className="mx-auto h-4 w-4" strokeWidth={2} />;
  }
  if (shape === "diamond") {
    return <Diamond className="mx-auto h-4 w-4" strokeWidth={1.8} />;
  }
  if (shape === "triangle_down") {
    return <Triangle className="mx-auto h-4 w-4 rotate-180" strokeWidth={1.8} />;
  }
  if (shape === "hexagon") {
    return <Hexagon className="mx-auto h-4 w-4" strokeWidth={1.8} />;
  }
  return <Triangle className="mx-auto h-4 w-4" strokeWidth={1.8} />;
};

const renderEdgeSwatch = (edge: EdgeStylePreset) => {
  if (edge === "step") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="mx-auto h-4 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7h8v10h8" />
      </svg>
    );
  }

  if (edge === "smooth") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="mx-auto h-4 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 16C9 16 9 8 14 8h6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto h-4 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h16" strokeDasharray={edge === "dashed" ? "4 3" : undefined} />
    </svg>
  );
};

const toShortLabel = (value: string, maxLength = 16) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const cloneBoardSnapshot = (snapshot: BoardSnapshot): BoardSnapshot => ({
  nodes: snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      draft: { ...node.data.draft },
    },
  })),
  edges: snapshot.edges.map((edge) => ({
    ...edge,
    style: edge.style ? { ...edge.style } : edge.style,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === "object"
        ? { ...edge.markerEnd }
        : edge.markerEnd,
  })),
  selectedId: snapshot.selectedId,
});

const readPersistedBoard = (): PersistedBoardState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SMART_PLANT_CREATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedBoardState>;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges))
      return null;
    return {
      nodes: parsed.nodes,
      edges: parsed.edges,
      selectedId: parsed.selectedId ?? null,
      plantId: parsed.plantId ?? null,
      plantLabel: parsed.plantLabel ?? "",
      nodeShape: parsed.nodeShape ?? "rounded",
      edgeStyle: parsed.edgeStyle ?? "dashed",
    };
  } catch {
    return null;
  }
};

function defaultDraft(name: string, code: string): SmartFlowData["draft"] {
  return {
    component_name: name,
    component_code: code,
    is_active: true,
    status: STATUS.ACTIVE,
  };
}

const getChildPosition = (
  parent: RFNode,
  siblingIndex: number,
  totalSiblings: number,
) => ({
  x:
    parent.position.x +
    (totalSiblings - siblingIndex - 1 - (totalSiblings - 1) / 2) *
      HORIZONTAL_GAP,
  y: parent.position.y + VERTICAL_GAP,
});

const makeStyledEdge = (
  source: string,
  target: string,
  edgeStyle: EdgeStylePreset,
  animated = true,
  sourceHandle: string | null = "s-bottom",
  targetHandle: string | null = "t-top",
  explicitEdgeId?: string,
): Edge => {
  return {
    id: explicitEdgeId ?? `e-${newFlowNodeId()}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    animated: edgeStyle === "dashed" ? animated : false,
    type: "smartEdge",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: BRAND_EDGE_COLOR,
    },
    style: {
      stroke: BRAND_EDGE_COLOR,
      strokeWidth: 2,
      strokeDasharray: edgeStyle === "dashed" ? "7 5" : undefined,
    },
    data: {
      edgeStyle,
      lineLabel: "",
      lineSymbol: "none",
      lineSymbolSize: 14,
      lineStretchStart: 0,
      lineStretchEnd: 0,
      lineOffsetX: 0,
      lineOffsetY: 0,
      lineLabelPosition: "center",
      labelOffsetX: 0,
      labelOffsetY: 0,
      lineWaypoints: [],
    },
  };
};

function normalizePenStroke(flowPoints: [number, number][]): {
  position: { x: number; y: number };
  width: number;
  height: number;
  points: [number, number][];
} | null {
  if (flowPoints.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of flowPoints) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const pad = 10;
  const w = Math.max(36, maxX - minX + pad * 2);
  const h = Math.max(28, maxY - minY + pad * 2);
  const points: [number, number][] = flowPoints.map(([x, y]) => [
    x - minX + pad,
    y - minY + pad,
  ]);
  return {
    position: { x: minX - pad, y: minY - pad },
    width: w,
    height: h,
    points,
  };
}

function normalizeStraightLine(
  a: { x: number; y: number },
  b: { x: number; y: number },
): {
  position: { x: number; y: number };
  width: number;
  height: number;
  points: [number, number][];
} {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const padX = 10;
  const padY = Math.abs(dy) < 2 ? 16 : 10;
  const w = Math.max(40, Math.abs(dx) + padX * 2);
  const h = Math.max(Math.abs(dy) < 2 ? 36 : 28, Math.abs(dy) + padY * 2);
  const points: [number, number][] = [
    [a.x - minX + padX, a.y - minY + padY],
    [b.x - minX + padX, b.y - minY + padY],
  ];
  return {
    position: { x: minX - padX, y: minY - padY },
    width: w,
    height: h,
    points,
  };
}

function PenSketchPreview({ points }: { points: [number, number][] | null }) {
  const transform = useStore((s) => s.transform);
  if (!points || points.length < 2) return null;
  const [tx, ty, zoom] = transform;
  const poly = points.map(([fx, fy]) => `${fx * zoom + tx},${fy * zoom + ty}`).join(" ");
  return (
    <svg className="pointer-events-none absolute inset-0 z-[30] overflow-visible">
      <polyline
        fill="none"
        stroke="#e97124"
        strokeWidth={2}
        strokeLinecap="round"
        points={poly}
      />
    </svg>
  );
}

function FlowWorkspace() {
  const persistedBoard = useMemo(() => readPersistedBoard(), []);
  const qc = useQueryClient();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const storeApi = useStoreApi();
  const [plantId, setPlantId] = useState<string | null>(
    persistedBoard?.plantId ?? null,
  );
  const [plantLabel, setPlantLabel] = useState<string>(
    persistedBoard?.plantLabel ?? "",
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(
    persistedBoard?.nodes ?? [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    persistedBoard?.edges ?? [],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    persistedBoard?.selectedId ?? null,
  );
  const [jsonTab, setJsonTab] = useState<"preview" | "import">("preview");
  const [importText, setImportText] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectionModeEnabled, setSelectionModeEnabled] = useState(false);
  const [modifierSelectionActive, setModifierSelectionActive] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(272);
  const [jsonPanelHeight, setJsonPanelHeight] = useState(208);
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<{
    edgeId: string;
    x: number;
    y: number;
    value: string;
  } | null>(null);
  /** Avoid duplicate save when Ctrl/Cmd+Enter commits and blur fires on the same textarea. */
  const skipNextEdgeTextBlurRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [addPrompt, setAddPrompt] = useState<AddPromptState>({
    open: false,
    kind: "plant",
    quantity: "1",
    parentId: null,
  });
  const [nodeShape, setNodeShape] = useState<NodeShapeStyle>(
    persistedBoard?.nodeShape ?? "rounded",
  );
  const [edgeStyle, setEdgeStyle] = useState<EdgeStylePreset>(
    persistedBoard?.edgeStyle ?? "dashed",
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [devicePalette, setDevicePalette] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [tagTemplatePalette, setTagTemplatePalette] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [deviceSearchPick, setDeviceSearchPick] = useState<Option | null>(null);
  const [tagSearchPick, setTagSearchPick] = useState<Option | null>(null);
  const [vdPalette, setVdPalette] = useState<number[]>([]);
  const [inverterTypePalette, setInverterTypePalette] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [inverterTypeSearchPick, setInverterTypeSearchPick] = useState<Option | null>(null);
  const [vdSearchPick, setVdSearchPick] = useState<Option | null>(null);
  const [pendingDrawShape, setPendingDrawShape] = useState<NodeShapeStyle | null>(null);
  const [drawToolMode, setDrawToolMode] = useState<"off" | "pen" | "line">("off");
  const [penPreviewPoints, setPenPreviewPoints] = useState<[number, number][] | null>(null);
  const [lineAnchorFlow, setLineAnchorFlow] = useState<{ x: number; y: number } | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedIdRef = useRef(selectedId);
  const undoStackRef = useRef<BoardSnapshot[]>([]);
  const redoStackRef = useRef<BoardSnapshot[]>([]);
  const dragSelectionIdsRef = useRef<string[]>([]);
  const dragStartPositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const dragGroupIdsRef = useRef<string[]>([]);
  const dragGroupStartPositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const dragGroupLeaderStartRef = useRef<{ x: number; y: number } | null>(null);
  /** Grabbed node position at drag start — used for drag delta. */
  const dragPrimaryStartPosRef = useRef<{ x: number; y: number } | null>(null);
  /** Node ids participating in this drag (single, multi-select, or group). */
  const draggingNodeIdsRef = useRef<Set<string>>(new Set());
  /** Node positions at pointer-down for waypoint translation. */
  const nodePosAtDragStartRef = useRef<Record<string, { x: number; y: number }>>({});
  /** Baseline `lineWaypoints` per edge at drag start (absolute flow coords). */
  const edgeWaypointBaselinesRef = useRef<Map<string, Array<{ x: number; y: number }>>>(new Map());
  const copiedNodesRef = useRef<RFNode[]>([]);
  const copiedEdgesRef = useRef<Edge[]>([]);
  const pasteCountRef = useRef(0);
  const resizeStateRef = useRef<{
    mode: "left" | "json" | null;
    startX: number;
    startY: number;
    leftWidth: number;
    jsonHeight: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    leftWidth: 272,
    jsonHeight: 208,
  });
  const flowPaneRef = useRef<HTMLDivElement | null>(null);
  const isLeftPanelCompact = leftPanelWidth < 250;
  const isSelectionModeActive = selectionModeEnabled !== modifierSelectionActive;
  const leftPanelGridColsClass =
    leftPanelWidth >= 360
      ? "grid-cols-3"
      : isLeftPanelCompact
        ? "grid-cols-1"
        : "grid-cols-2";

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );
  const selectedComponent = useMemo(
    () => (selected?.type === "smartCmp" ? selected : null),
    [selected],
  );
  const selectedAnnotation = useMemo(
    () => (selected?.type === "smartAnnot" ? selected : null),
    [selected],
  );
  const selectedDraw = useMemo(
    () => (selected?.type === "smartDraw" ? selected : null),
    [selected],
  );
  const selectedEdge = useMemo(
    () =>
      edges.find((edge) => edge.id === selectedEdgeId) ??
      edges.find((edge) => edge.selected) ??
      null,
    [edges, selectedEdgeId],
  );

  const selectedHasParent = useMemo(
    () =>
      selectedComponent ? edges.some((e) => e.target === selectedComponent.id) : false,
    [edges, selectedComponent],
  );

  const exportJson = useMemo(() => {
    const componentNodes = nodes.filter((node) => node.type === "smartCmp");
    const componentNodeIds = new Set(componentNodes.map((node) => node.id));
    const componentEdges = edges.filter(
      (edge) =>
        componentNodeIds.has(edge.source) && componentNodeIds.has(edge.target),
    );
    const pm = buildParentMap(componentEdges);
    const order = buildCreationOrder(componentNodes, pm);
    const tree = buildExportTree(order, pm);
    return JSON.stringify({ data: tree }, null, 2);
  }, [nodes, edges]);

  const devicePaletteMessage = useMemo(() => {
    if (!plantId) return "Select a plant to list devices.";
    if (devicePalette.length > 0) return null;
    return resourcesLoading
      ? "Loading devices..."
      : "No device found.";
  }, [devicePalette.length, plantId, resourcesLoading]);

  const tagTemplatePaletteMessage = useMemo(() => {
    if (tagTemplatePalette.length > 0) return null;
    return resourcesLoading
      ? "Loading tag templates..."
      : "No tag-template found.";
  }, [resourcesLoading, tagTemplatePalette.length]);

  const inverterTypePaletteMessage = useMemo(() => {
    if (inverterTypePalette.length > 0) return null;
    return "Search to add inverter types, then drag onto Inverter nodes.";
  }, [inverterTypePalette.length]);

  /**
   * Left-panel palette: keep the same visuals as the shared AsyncSelect (focus ring, option highlights, typography).
   * Only override menu + portal z-index so the portaled list stacks above the canvas/side panels.
   */
  const paletteSelectStyles = useMemo(
    () => ({
      menu: (provided: Record<string, unknown>) => {
        const isDark =
          typeof globalThis.document !== "undefined" &&
          globalThis.document.documentElement.classList.contains("dark");
        return {
          ...provided,
          borderRadius: "0.125rem",
          border: isDark ? "1px solid #434344" : "1px solid #E5E7EB",
          ...(isDark ? { backgroundColor: "#1E1F20" } : {}),
          zIndex: 10000,
        };
      },
      menuPortal: (provided: Record<string, unknown>) => ({
        ...provided,
        zIndex: 10000,
      }),
    }),
    [],
  );

  /** Portaled menu opens below the control (same for all four palette fields). Passed through AsyncSelect’s `...props` — no AsyncSelect.tsx edits. */
  const paletteMenuExtras = useMemo(
    () => ({
      menuPlacement: "bottom" as const,
      menuPosition: "fixed" as const,
      menuPortalTarget:
        typeof globalThis.document !== "undefined" ? globalThis.document.body : undefined,
    }),
    [],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const onPointerMove = (event: MouseEvent) => {
      const state = resizeStateRef.current;
      if (state.mode === "left") {
        const next = Math.min(
          460,
          Math.max(220, state.leftWidth + (event.clientX - state.startX)),
        );
        setLeftPanelWidth(next);
      } else if (state.mode === "json") {
        const next = Math.min(
          460,
          Math.max(140, state.jsonHeight + (state.startY - event.clientY)),
        );
        setJsonPanelHeight(next);
      }
    };
    const onPointerUp = () => {
      resizeStateRef.current.mode = null;
    };
    globalThis.window.addEventListener("mousemove", onPointerMove);
    globalThis.window.addEventListener("mouseup", onPointerUp);
    return () => {
      globalThis.window.removeEventListener("mousemove", onPointerMove);
      globalThis.window.removeEventListener("mouseup", onPointerUp);
    };
  }, []);

  useEffect(() => {
    setEdges((current) =>
      current.map((edge) => {
        const styled = makeStyledEdge(
          edge.source,
          edge.target,
          edgeStyle,
          true,
        );
        return {
          ...edge,
          type: "smartEdge",
          animated: styled.animated,
          markerEnd: styled.markerEnd,
          style: styled.style,
          data: {
            ...(edge.data ?? {}),
            edgeStyle,
          },
        };
      }),
    );
  }, [edgeStyle, setEdges]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedBoardState = {
      nodes,
      edges,
      selectedId,
      plantId,
      plantLabel,
      nodeShape,
      edgeStyle,
    };
    window.localStorage.setItem(SMART_PLANT_CREATE_STORAGE_KEY, JSON.stringify(payload));
  }, [nodes, edges, selectedId, plantId, plantLabel, nodeShape, edgeStyle]);

  useEffect(() => {
    let isCancelled = false;
    const loadPaletteResources = async () => {
      setResourcesLoading(true);
      try {
        const [devices, tags] = await Promise.all([
          plantId ? fetchDeviceNames("", 1, 200, plantId) : Promise.resolve([]),
          fetchTagTemplateNames("", 1, 100),
        ]);
        if (isCancelled) return;
        setDevicePalette(devices);
        setTagTemplatePalette(tags);
      } catch {
        if (!isCancelled) {
          setDevicePalette([]);
          setTagTemplatePalette([]);
        }
      } finally {
        if (!isCancelled) {
          setResourcesLoading(false);
        }
      }
    };
    void loadPaletteResources();
    return () => {
      isCancelled = true;
    };
  }, [plantId]);

  const pushUndoSnapshot = useCallback(() => {
    const snapshot = cloneBoardSnapshot({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      selectedId: selectedIdRef.current,
    });
    undoStackRef.current = [...undoStackRef.current.slice(-19), snapshot];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undoLastChange = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      toast("Nothing to undo");
      return;
    }
    const latest = stack[stack.length - 1];
    if (!latest) return;
    const currentSnapshot = cloneBoardSnapshot({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      selectedId: selectedIdRef.current,
    });
    redoStackRef.current = [...redoStackRef.current.slice(-19), currentSnapshot];
    setCanRedo(true);
    undoStackRef.current = stack.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);
    setNodes(cloneBoardSnapshot(latest).nodes);
    setEdges(cloneBoardSnapshot(latest).edges);
    setSelectedId(latest.selectedId);
  }, [setEdges, setNodes]);

  const redoLastChange = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      toast("Nothing to redo");
      return;
    }
    const latest = stack[stack.length - 1];
    if (!latest) return;
    const currentSnapshot = cloneBoardSnapshot({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      selectedId: selectedIdRef.current,
    });
    undoStackRef.current = [...undoStackRef.current.slice(-19), currentSnapshot];
    setCanUndo(true);
    redoStackRef.current = stack.slice(0, -1);
    setCanRedo(redoStackRef.current.length > 0);
    setNodes(cloneBoardSnapshot(latest).nodes);
    setEdges(cloneBoardSnapshot(latest).edges);
    setSelectedId(latest.selectedId);
  }, [setEdges, setNodes]);

  const startResourceDrag = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, resource: PaletteResource) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(resource));
    },
    [],
  );

  const startSymbolDrag = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, shape: AnnotationShape) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(SYMBOL_DRAG_MIME, JSON.stringify({ shape }));
    },
    [],
  );

  const addPaletteItem = useCallback(
    (kind: PaletteResource["kind"], option: Option | null) => {
      if (!option?.value || option.value === PALETTE_ALL_VALUE) return;
      const append = (current: Array<{ value: string; label: string }>) => {
        const exists = current.some((item) => item.value === option.value);
        if (exists) return current;
        return [{ value: option.value, label: option.label }, ...current].slice(
          0,
          PALETTE_MAX_CHIPS,
        );
      };
      if (kind === "device") {
        setDevicePalette((current) => append(current));
      } else if (kind === "tag_template") {
        setTagTemplatePalette((current) => append(current));
      } else if (kind === "inverter_type") {
        setInverterTypePalette((current) => append(current));
      }
    },
    [],
  );

  const removePaletteItem = useCallback(
    (kind: PaletteResource["kind"], id: string) => {
      if (kind === "device") {
        setDevicePalette((current) => current.filter((item) => item.value !== id));
      } else if (kind === "tag_template") {
        setTagTemplatePalette((current) =>
          current.filter((item) => item.value !== id),
        );
      } else if (kind === "inverter_type") {
        setInverterTypePalette((current) => current.filter((item) => item.value !== id));
      } else {
        setVdPalette((current) => current.filter((item) => String(item) !== id));
      }
    },
    [],
  );

  const addVdPaletteNumber = useCallback((n: number) => {
    if (n < VD_NUMBER_MIN || n > VD_NUMBER_MAX) {
      toast.error(`VD number must be between ${VD_NUMBER_MIN} and ${VD_NUMBER_MAX}.`);
      return;
    }
    setVdPalette((current) =>
      current.includes(n) ? current : [n, ...current].slice(0, PALETTE_MAX_CHIPS),
    );
  }, []);

  const loadVdPaletteOptions = useCallback(async (search = "") => {
    const q = search.trim().toLowerCase();
    const rows: Option[] = [
      { value: PALETTE_ALL_VALUE, label: "All" },
      ...VD_NUMBER_OPTIONS.map((n) => ({
        value: String(n),
        label: `VD ${n}`,
      })),
    ];
    if (!q) return rows;
    return rows.filter((o) => {
      if (o.value === PALETTE_ALL_VALUE) {
        return "all".includes(q) || o.label.toLowerCase().includes(q);
      }
      return o.label.toLowerCase().includes(q) || o.value.includes(q);
    });
  }, []);

  const loadDevicePaletteOptions = useCallback(
    async (search = "") => {
      const rows = await fetchDeviceNames(search, 1, 50, plantId);
      return [{ value: PALETTE_ALL_VALUE, label: "All" }, ...rows];
    },
    [plantId],
  );

  const loadTagPaletteOptions = useCallback(async (search = "") => {
    const rows = await fetchTagTemplateNames(search, 1, 50);
    return [{ value: PALETTE_ALL_VALUE, label: "All" }, ...rows];
  }, []);

  const loadInverterPaletteOptions = useCallback(async (search = "") => {
    const rows = await fetchInverterTypeNames(search, 1, 50);
    return [{ value: PALETTE_ALL_VALUE, label: "All" }, ...rows];
  }, []);

  const applyDeviceTagOrInverterAllToPalette = useCallback(
    async (kind: "device" | "tag_template" | "inverter_type") => {
      const loadingMessage =
        kind === "device"
          ? "Loading devices…"
          : kind === "tag_template"
            ? "Loading tag templates…"
            : "Loading inverter types…";
      const tid = toast.loading(loadingMessage);
      try {
        let all: Array<{ value: string; label: string }> = [];
        let successNoun: string;
        if (kind === "device") {
          if (!plantId) {
            toast.error("Select a plant first.", { id: tid });
            return;
          }
          all = await fetchAllPaginatedNameOptions((page, limit) =>
            fetchDeviceNames("", page, limit, plantId),
          );
          successNoun = "devices";
          setDevicePalette(all.slice(0, PALETTE_MAX_CHIPS));
        } else if (kind === "tag_template") {
          all = await fetchAllPaginatedNameOptions((page, limit) =>
            fetchTagTemplateNames("", page, limit),
          );
          successNoun = "tag templates";
          setTagTemplatePalette(all.slice(0, PALETTE_MAX_CHIPS));
        } else {
          all = await fetchAllPaginatedNameOptions((page, limit) =>
            fetchInverterTypeNames("", page, limit),
          );
          successNoun = "inverter types";
          setInverterTypePalette(all.slice(0, PALETTE_MAX_CHIPS));
        }
        toast.success(`Added ${all.length} ${successNoun} to palette`, { id: tid });
      } catch {
        toast.error("Could not load items.", { id: tid });
      }
    },
    [plantId],
  );

  useEffect(() => {
    const onNodeResourceDrop = (event: Event) => {
      const detail = (event as CustomEvent<NodeAssetDropPayload>).detail;
      if (!detail?.nodeId || !detail?.asset?.id) return;

      if (detail.asset.kind === "inverter_type") {
        const target = nodesRef.current.find((n) => n.id === detail.nodeId);
        if (!target || target.type !== "smartCmp" || target.data.kind !== "inverter") {
          toast.error("Inverter type can only be assigned to Inverter components.");
          return;
        }
      }

      const fieldPatch =
        detail.asset.kind === "device"
          ? {
              device_id: detail.asset.id,
              device_name: detail.asset.label,
            }
          : detail.asset.kind === "tag_template"
            ? {
                tag_template_id: detail.asset.id,
                tag_template_name: detail.asset.label,
              }
            : detail.asset.kind === "inverter_type"
              ? {
                  inverter_type_id: detail.asset.id,
                  inverter_type_name: detail.asset.label,
                }
              : {
                  vd_number: Number(detail.asset.id),
                };
      pushUndoSnapshot();
      setNodes((current) =>
        current.map((node) =>
          node.id === detail.nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: {
                    ...node.data.draft,
                    ...fieldPatch,
                  },
                },
              }
            : node,
        ),
      );
      setSelectedId(detail.nodeId);
      toast.success(
        detail.asset.kind === "device"
          ? "Device assigned"
          : detail.asset.kind === "tag_template"
            ? "Tag template assigned"
            : detail.asset.kind === "inverter_type"
              ? "Inverter type assigned"
              : "VD number assigned",
      );
    };
    globalThis.window.addEventListener(
      NODE_ASSET_DROP_EVENT,
      onNodeResourceDrop as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        NODE_ASSET_DROP_EVENT,
        onNodeResourceDrop as EventListener,
      );
  }, [pushUndoSnapshot, setNodes]);

  useEffect(() => {
    const onInlineRename = (event: Event) => {
      const detail = (event as CustomEvent<NodeInlineRenamePayload>).detail;
      if (!detail?.nodeId) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== detail.nodeId || node.type !== "smartCmp") return node;
          return {
            ...node,
            data: {
              ...node.data,
              draft: {
                ...node.data.draft,
                component_name: detail.name,
              },
            },
          };
        }),
      );
    };
    globalThis.window.addEventListener(
      NODE_INLINE_RENAME_EVENT,
      onInlineRename as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        NODE_INLINE_RENAME_EVENT,
        onInlineRename as EventListener,
      );
  }, [setNodes]);

  useEffect(() => {
    const onAnnotationInlineUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AnnotationUpdatePayload>).detail;
      if (!detail?.nodeId) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== detail.nodeId || node.type !== "smartAnnot") return node;
          return {
            ...node,
            ...(detail.nodeStyle
              ? {
                  style: {
                    ...(node.style as React.CSSProperties | undefined),
                    ...detail.nodeStyle,
                  },
                }
              : {}),
            data: {
              ...node.data,
              ...detail.patch,
            },
          };
        }),
      );
      setSelectedId(detail.nodeId);
    };
    globalThis.window.addEventListener(
      ANNOTATION_UPDATE_EVENT,
      onAnnotationInlineUpdate as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        ANNOTATION_UPDATE_EVENT,
        onAnnotationInlineUpdate as EventListener,
      );
  }, [setNodes]);

  useEffect(() => {
    const onNodeChromeUpdate = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          nodeId: string;
          patch: Partial<Pick<SmartFlowData, "node_fill_color" | "node_text_color" | "node_title_align">>;
        }>
      ).detail;
      if (!detail?.nodeId) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === detail.nodeId && node.type === "smartCmp"
            ? { ...node, data: { ...node.data, ...detail.patch } }
            : node,
        ),
      );
    };
    globalThis.window.addEventListener(NODE_CHROME_UPDATE_EVENT, onNodeChromeUpdate as EventListener);
    return () =>
      globalThis.window.removeEventListener(NODE_CHROME_UPDATE_EVENT, onNodeChromeUpdate as EventListener);
  }, [setNodes]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      const ae = document.activeElement;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.getAttribute("contenteditable") === "true")
      ) {
        return;
      }
      const primary =
        nodesRef.current.find((n) => n.id === selectedIdRef.current) ??
        nodesRef.current.find((n) => n.selected);
      if (primary?.type !== "smartAnnot") return;
      e.preventDefault();
      pushUndoSnapshot();
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== primary.id) return node;
          if (node.data.annotation_shape === "table") {
            const cells = getTableCellsFromData(node.data);
            const next = appendPasteToLastCell(cells, text);
            return {
              ...node,
              data: {
                ...node.data,
                annotation_table_cells: next,
                annotation_text: cellsToPipeText(next),
                annotation_table_col_widths_pct: syncColWidthsWithGrid(
                  node.data.annotation_table_col_widths_pct,
                  next[0]?.length ?? 1,
                ),
              },
            };
          }
          return {
            ...node,
            data: {
              ...node.data,
              annotation_text: `${(node.data.annotation_text as string) ?? ""}${text}`,
            },
          };
        }),
      );
    };
    globalThis.window.addEventListener("paste", onPaste);
    return () => globalThis.window.removeEventListener("paste", onPaste);
  }, [pushUndoSnapshot, setNodes]);

  useEffect(() => {
    const onEdgeLabelUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ edgeId: string; patch: Record<string, unknown> }>).detail;
      if (!detail?.edgeId) return;
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === detail.edgeId
            ? {
                ...edge,
                data: {
                  ...(edge.data ?? {}),
                  ...detail.patch,
                },
              }
            : edge,
        ),
      );
    };
    globalThis.window.addEventListener(
      EDGE_LABEL_UPDATE_EVENT,
      onEdgeLabelUpdate as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        EDGE_LABEL_UPDATE_EVENT,
        onEdgeLabelUpdate as EventListener,
      );
  }, [setEdges]);

  useEffect(() => {
    const onLabelDblClick = (event: Event) => {
      const detail = (
        event as CustomEvent<{ edgeId: string; clientX: number; clientY: number }>
      ).detail;
      if (!detail?.edgeId) return;
      const edge = edgesRef.current.find((e) => e.id === detail.edgeId);
      if (!edge) return;
      const rect = flowPaneRef.current?.getBoundingClientRect();
      if (!rect) return;
      skipNextEdgeTextBlurRef.current = false;
      setEditingEdge({
        edgeId: edge.id,
        x: detail.clientX - rect.left + 8,
        y: detail.clientY - rect.top + 8,
        value:
          typeof edge.data?.lineLabel === "string"
            ? edge.data.lineLabel
            : typeof edge.data?.label === "string"
              ? edge.data.label
              : "",
      });
    };
    globalThis.window.addEventListener(
      SMART_PLANT_EDGE_LABEL_DBLCLICK,
      onLabelDblClick as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        SMART_PLANT_EDGE_LABEL_DBLCLICK,
        onLabelDblClick as EventListener,
      );
  }, [setEditingEdge]);

  useEffect(() => {
    const onEdgeSymbolDrop = (
      event: Event,
    ) => {
      const detail = (
        event as CustomEvent<{
          edgeId: string;
          edgeIds?: string[];
          shape: AnnotationShape;
          lineLabelPosition?: "left" | "center" | "right";
          flowDrop?: { x: number; y: number };
        }>
      ).detail;
      if (!detail?.shape) return;
      const targetIds =
        detail.edgeIds && detail.edgeIds.length > 0
          ? [...new Set(detail.edgeIds)]
          : detail.edgeId
            ? [detail.edgeId]
            : [];
      if (targetIds.length === 0) return;

      const addJunctionWaypoint =
        targetIds.length > 1 && detail.flowDrop != null;

      pushUndoSnapshot();
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (!targetIds.includes(edge.id)) return edge;
          const prevWps = (edge.data?.lineWaypoints as Array<{ x: number; y: number }> | undefined) ?? [];
          const nextWps =
            addJunctionWaypoint && detail.flowDrop
              ? [...prevWps, { x: detail.flowDrop.x, y: detail.flowDrop.y }].slice(0, 24)
              : prevWps;
          return {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              lineWaypoints: nextWps,
              lineSymbol: isEdgeAttachableSymbol(detail.shape)
                ? detail.shape
                : "none",
              lineLabel:
                detail.shape === "label"
                  ? typeof edge.data?.lineLabel === "string"
                    ? edge.data.lineLabel
                    : "Label"
                  : typeof edge.data?.lineLabel === "string"
                    ? edge.data.lineLabel
                    : "",
              lineLabelPosition:
                detail.lineLabelPosition ??
                (edge.data?.lineLabelPosition as
                  | "left"
                  | "center"
                  | "right"
                  | undefined) ??
                "center",
              labelOffsetX: 0,
              labelOffsetY: 0,
            },
          };
        }),
      );
      setSelectedEdgeId(targetIds[0] ?? null);
      setSelectedId(null);
      toast.success(
        detail.shape === "label"
          ? "Connector label added"
          : addJunctionWaypoint
            ? "Symbol placed at line crossing"
            : "Connector symbol attached",
      );
    };
    globalThis.window.addEventListener(
      EDGE_SYMBOL_DROP_EVENT,
      onEdgeSymbolDrop as EventListener,
    );
    return () =>
      globalThis.window.removeEventListener(
        EDGE_SYMBOL_DROP_EVENT,
        onEdgeSymbolDrop as EventListener,
      );
  }, [pushUndoSnapshot, setEdges]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      setEdges((eds) => {
        const nextEdges = addEdge(
          {
            ...makeStyledEdge(c.source, c.target, edgeStyle, true),
            sourceHandle: c.sourceHandle ?? "s-bottom",
            targetHandle: c.targetHandle ?? "t-top",
          } as Edge,
          eds,
        );
        pushUndoSnapshot();
        return nextEdges;
      });
    },
    [edgeStyle, pushUndoSnapshot, setEdges],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (drawToolMode !== "off") return;
      if (connectionState.toNode || !connectionState.fromNode || !connectionState.fromHandle) return;
      if (connectionState.fromHandle.type !== "source") return;

      const clientX =
        "changedTouches" in event && event.changedTouches[0]
          ? event.changedTouches[0].clientX
          : (event as MouseEvent).clientX;
      const clientY =
        "changedTouches" in event && event.changedTouches[0]
          ? event.changedTouches[0].clientY
          : (event as MouseEvent).clientY;
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

      const newId = newFlowNodeId();
      const api = slugToApiType("others");
      const sourceId = connectionState.fromNode.id;
      const srcHandleId = connectionState.fromHandle.id ?? "s-bottom";

      const anchorNode: RFNode = {
        id: newId,
        type: "smartAnchor",
        position: { x: flowPos.x - 6, y: flowPos.y - 6 },
        style: { width: 12, height: 12 },
        data: {
          kind: "others",
          is_line_anchor: true,
          draft: defaultDraft("·", `${api}-${newId.slice(0, 6)}`),
        },
      };

      pushUndoSnapshot();
      setNodes((nds) => [...nds, anchorNode]);
      setEdges((eds) =>
        addEdge(
          {
            ...makeStyledEdge(sourceId, newId, edgeStyle, true, srcHandleId, "t-top"),
          } as Edge,
          eds,
        ),
      );
      setSelectedId(newId);
      setSelectedEdgeId(null);
    },
    [drawToolMode, edgeStyle, pushUndoSnapshot, screenToFlowPosition, setEdges, setNodes],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, nextConnection: Connection) => {
      if (!nextConnection.source || !nextConnection.target) return;
      setEdges((currentEdges) => {
        const edgesWithoutCurrent = currentEdges.filter((edge) => edge.id !== oldEdge.id);
        const nextEdges = [
          ...edgesWithoutCurrent,
          {
            ...makeStyledEdge(nextConnection.source, nextConnection.target, edgeStyle, true),
            id: oldEdge.id,
            sourceHandle:
              nextConnection.sourceHandle ?? oldEdge.sourceHandle ?? "s-bottom",
            targetHandle:
              nextConnection.targetHandle ?? oldEdge.targetHandle ?? "t-top",
            data: {
              ...(oldEdge.data ?? {}),
              edgeStyle,
              // Snap path back to handles; previous stretch/offset would float the line away from anchors.
              lineStretchStart: 0,
              lineStretchEnd: 0,
              lineOffsetX: 0,
              lineOffsetY: 0,
              lineStretch: 0,
              lineWaypoints: [],
            },
          },
        ];
        pushUndoSnapshot();
        return nextEdges;
      });
    },
    [edgeStyle, pushUndoSnapshot, setEdges],
  );

  const addNodes = useCallback(
    (kind: ComponentKindSlug, quantity: number, parentId: string | null) => {
      pushUndoSnapshot();
      const safeQty = Math.max(1, quantity);
      const baseCount = nodes.filter((n) => n.data.kind === kind).length;
      const api = slugToApiType(kind);
      const parentNode = parentId
        ? (nodes.find((n) => n.id === parentId) ?? null)
        : null;
      const siblingCount = parentNode
        ? edges.filter((e) => e.source === parentNode.id).length
        : 0;
      const totalSiblings = siblingCount + safeQty;
      const newNodes: RFNode[] = [];
      const newEdges: Edge[] = [];

      for (let i = 0; i < safeQty; i += 1) {
        const id = newFlowNodeId();
        const seq = baseCount + i + 1;
        const label = kind === "plant" ? `Plant ${seq}` : `${kind}-${seq}`;
        const position = parentNode
          ? getChildPosition(parentNode, siblingCount + i, totalSiblings)
          : { x: ROOT_POSITION.x + i * 16, y: ROOT_POSITION.y + i * 22 };
        newNodes.push({
          id,
          type: "smartCmp",
          position,
          data: {
            kind,
            draft: defaultDraft(label, `${api}-${id.slice(0, 8)}`),
            nodeShape,
          },
        });
        if (parentNode) {
          newEdges.push(makeStyledEdge(parentNode.id, id, edgeStyle, true));
        }
      }

      if (newNodes.length > 0) {
        const nextNodes = [...nodesRef.current, ...newNodes];
        const nextEdges = [...edgesRef.current, ...newEdges];
        setNodes(nextNodes);
        if (newEdges.length > 0) {
          setEdges(nextEdges);
        }
      }
      const firstCreated = newNodes[0];
      if (firstCreated) {
        setSelectedId(firstCreated.id);
      }
      setTimeout(() => fitView({ padding: 0.25 }), 80);
    },
    [edgeStyle, fitView, nodeShape, edges, nodes, pushUndoSnapshot, setEdges, setNodes],
  );

  const addNode = useCallback(
    (kind: ComponentKindSlug) => {
      const parentId = kind === "plant" ? null : selectedId ?? null;
      setAddPrompt({ open: true, kind, quantity: "1", parentId });
    },
    [selectedId],
  );

  const addAnnotationNode = useCallback(
    (shape: AnnotationShape, position?: { x: number; y: number }) => {
      pushUndoSnapshot();
      const id = newFlowNodeId();
      const anchor = selected ?? nodesRef.current[nodesRef.current.length - 1] ?? null;
      const baseX = anchor?.position.x ?? ROOT_POSITION.x + 40;
      const baseY = anchor?.position.y ?? ROOT_POSITION.y + 60;
      const tableDefaults =
        shape === "table"
          ? {
              annotation_table_header_row: true,
              annotation_table_cells: DEFAULT_TABLE_CELLS.map((row) => [...row]),
              annotation_text: cellsToPipeText(DEFAULT_TABLE_CELLS),
              annotation_table_col_widths_pct: equalColumnPct(DEFAULT_TABLE_CELLS[0].length),
            }
          : {
              annotation_text: "",
            };
      const annotationNode: RFNode = {
        id,
        type: "smartAnnot",
        position: position ?? { x: baseX + 80, y: baseY + 40 },
        ...(shape === "table" ? { style: { width: 280, minHeight: 48 } } : {}),
        data: {
          kind: "others",
          draft: defaultDraft("annotation", `ANN-${id.slice(0, 6)}`),
          annotation_shape: shape,
          annotation_note: "",
          ...tableDefaults,
        },
      };
      setNodes((currentNodes) => [...currentNodes, annotationNode]);
      setSelectedId(annotationNode.id);
    },
    [pushUndoSnapshot, selected, setNodes],
  );

  const drawShapeOnBoard = useCallback(
    (shape: NodeShapeStyle, position: { x: number; y: number }) => {
      pushUndoSnapshot();
      const id = newFlowNodeId();
      const api = slugToApiType("others");
      const defaultFrame =
        shape === "circle"
          ? { width: 168, height: 168 }
          : shape === "pill"
            ? { width: 200, height: 96 }
            : shape === "line"
              ? { width: 220, height: 28 }
              : shape === "triangle" || shape === "triangle_down" || shape === "diamond"
                ? { width: 180, height: 120 }
                : { width: 168, height: 96 };
      const shapeNode: RFNode = {
        id,
        type: "smartCmp",
        position,
        style: defaultFrame,
        data: {
          kind: "others",
          draft: defaultDraft(DEFAULT_SHAPE_PLACEHOLDER_NAME, `${api}-${id.slice(0, 8)}`),
          nodeShape: shape,
        },
      };
      setNodes((currentNodes) => [...currentNodes, shapeNode]);
      setSelectedId(id);
      setSelectedEdgeId(null);
    },
    [pushUndoSnapshot, setNodes],
  );

  const addDrawSketchNode = useCallback(
    (args: {
      mode: "freehand" | "line";
      position: { x: number; y: number };
      width: number;
      height: number;
      points: [number, number][];
    }) => {
      pushUndoSnapshot();
      const id = newFlowNodeId();
      const api = slugToApiType("others");
      const sketchNode: RFNode = {
        id,
        type: "smartDraw",
        position: args.position,
        style: { width: args.width, height: args.height },
        zIndex: 5,
        data: {
          kind: "others",
          draft: defaultDraft("Sketch", `${api}-${id.slice(0, 8)}`),
          draw_mode: args.mode,
          draw_points: args.points,
          draw_stroke_width: 2.5,
          draw_stroke_color: "#374151",
          draw_rotation_deg: 0,
        },
      };
      setNodes((currentNodes) => [...currentNodes, sketchNode]);
      setSelectedId(id);
      setSelectedEdgeId(null);
    },
    [pushUndoSnapshot, setNodes],
  );

  const copySelectedNodes = useCallback(() => {
    const selectedNodeIds = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id),
    );
    if (selectedNodeIds.size === 0 && selectedIdRef.current) {
      selectedNodeIds.add(selectedIdRef.current);
    }
    if (selectedNodeIds.size === 0) {
      toast("Select at least one node to copy.");
      return;
    }
    copiedNodesRef.current = nodesRef.current
      .filter((node) => selectedNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        position: { ...node.position },
        data: {
          ...node.data,
          draft: { ...node.data.draft },
        },
      }));
    copiedEdgesRef.current = edgesRef.current
      .filter(
        (edge) =>
          selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
      )
      .map((edge) => ({
        ...edge,
        style: edge.style ? { ...edge.style } : edge.style,
        data:
          edge.data && typeof edge.data === "object"
            ? { ...(edge.data as Record<string, unknown>) }
            : edge.data,
      }));
    pasteCountRef.current = 0;
    toast.success("Copied selection.");
  }, []);

  const pasteCopiedNodes = useCallback(() => {
    if (copiedNodesRef.current.length === 0) {
      toast("Nothing to paste.");
      return;
    }
    pushUndoSnapshot();
    pasteCountRef.current += 1;
    const offset = 36 * pasteCountRef.current;
    const idMap = new Map<string, string>();
    const pastedNodeIds = new Set<string>();
    const nextNodes = copiedNodesRef.current.map((node) => {
      const newId = newFlowNodeId();
      idMap.set(node.id, newId);
      pastedNodeIds.add(newId);
      const nextData: SmartFlowData = {
        ...node.data,
        draft: {
          ...node.data.draft,
        },
      };
      if (node.type === "smartDraw" && node.data.draw_points) {
        nextData.draw_points = node.data.draw_points.map(
          (p) => [p[0], p[1]] as [number, number],
        );
      }
      if (node.type === "smartCmp") {
        const api = slugToApiType(nextData.kind);
        nextData.draft.component_code = `${api}-${newId.slice(0, 8)}`;
        const name = nextData.draft.component_name?.trim();
        nextData.draft.component_name = name ? `${name} Copy` : "Write a Text Copy";
      }
      return {
        ...node,
        id: newId,
        selected: false,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset,
        },
        data: nextData,
      };
    });
    const nextEdges = copiedEdgesRef.current
      .map((edge) => {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (!source || !target) return null;
        return {
          ...edge,
          id: `e-${source}-${target}-${newFlowNodeId().slice(0, 6)}`,
          source,
          target,
          selected: false,
        } as Edge;
      })
      .filter((edge): edge is Edge => Boolean(edge));

    setNodes((currentNodes) =>
      [...currentNodes, ...nextNodes].map((node) => ({
        ...node,
        selected: pastedNodeIds.has(node.id),
      })),
    );
    if (nextEdges.length > 0) {
      setEdges((currentEdges) => [...currentEdges, ...nextEdges]);
    }
    setSelectedId(nextNodes[0]?.id ?? null);
    setSelectedEdgeId(null);
    toast.success("Pasted selection.");
  }, [pushUndoSnapshot, setEdges, setNodes]);

  const onSelectionChange = useCallback(
    (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => {
      const selectedNode = params.nodes[0]?.id ?? null;
      if (selectedNode) {
        setSelectedId(selectedNode);
        setSelectedEdgeId(null);
        return;
      }
      if (params.edges.length > 0) {
        setSelectedEdgeId(params.edges[0]?.id ?? null);
        setSelectedId(null);
        return;
      }
      setSelectedEdgeId(null);
    },
    [],
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      pushUndoSnapshot();
      dragPrimaryStartPosRef.current = { x: node.position.x, y: node.position.y };
      if (!selectionModeEnabled) {
        dragSelectionIdsRef.current = [];
        dragStartPositionsRef.current = {};
      }
      const groupId =
        typeof node.data?.groupId === "string" ? node.data.groupId : null;
      if (groupId) {
        const groupNodes = nodesRef.current.filter(
          (entry) =>
            typeof entry.data?.groupId === "string" &&
            entry.data.groupId === groupId,
        );
        dragGroupIdsRef.current = groupNodes.map((entry) => entry.id);
        dragGroupStartPositionsRef.current = Object.fromEntries(
          groupNodes.map((entry) => [entry.id, entry.position]),
        );
        dragGroupLeaderStartRef.current = node.position;
      } else {
        dragGroupIdsRef.current = [];
        dragGroupStartPositionsRef.current = {};
        dragGroupLeaderStartRef.current = null;
      }

      let draggingIds: string[];
      if (dragGroupIdsRef.current.length > 1) {
        draggingIds = [...dragGroupIdsRef.current];
      } else if (selectionModeEnabled) {
        const selectedIds = nodesRef.current
          .filter((entry) => entry.selected)
          .map((entry) => entry.id);
        draggingIds = selectedIds.length > 0 ? selectedIds : [node.id];
      } else {
        draggingIds = [node.id];
      }
      draggingNodeIdsRef.current = new Set(draggingIds);
      nodePosAtDragStartRef.current = Object.fromEntries(
        draggingIds.map((nid) => {
          const n = nodesRef.current.find((entry) => entry.id === nid);
          return [nid, n?.position ?? { x: 0, y: 0 }];
        }),
      );
      const baseline = new Map<string, Array<{ x: number; y: number }>>();
      for (const edge of edgesRef.current) {
        const wps = (edge.data as { lineWaypoints?: { x: number; y: number }[] } | undefined)
          ?.lineWaypoints;
        if (!wps?.length) continue;
        baseline.set(
          edge.id,
          wps.map((p) => ({ x: p.x, y: p.y })),
        );
      }
      edgeWaypointBaselinesRef.current = baseline;

      if (!selectionModeEnabled) return;
      const selectedIds = nodesRef.current
        .filter((entry) => entry.selected)
        .map((entry) => entry.id);
      const ids = selectedIds.length > 0 ? selectedIds : [node.id];
      dragSelectionIdsRef.current = ids;
      dragStartPositionsRef.current = Object.fromEntries(
        ids.map((id) => {
          const currentNode = nodesRef.current.find((entry) => entry.id === id);
          return [id, currentNode?.position ?? { x: 0, y: 0 }];
        }),
      );
    },
    [pushUndoSnapshot, selectionModeEnabled],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      const primaryStart = dragPrimaryStartPosRef.current;
      if (!primaryStart) return;

      const hasGroupFollowers = dragGroupIdsRef.current.length > 1;
      if (hasGroupFollowers) {
        const leaderStart = dragGroupLeaderStartRef.current;
        if (leaderStart) {
          const deltaX = node.position.x - leaderStart.x;
          const deltaY = node.position.y - leaderStart.y;
          const groupIds = new Set(dragGroupIdsRef.current);
          setNodes((currentNodes) =>
            currentNodes.map((entry) => {
              if (!groupIds.has(entry.id) || entry.id === node.id) return entry;
              const start = dragGroupStartPositionsRef.current[entry.id];
              if (!start) return entry;
              return {
                ...entry,
                position: {
                  x: start.x + deltaX,
                  y: start.y + deltaY,
                },
              };
            }),
          );
        }
      }

      const baselines = edgeWaypointBaselinesRef.current;
      const dragging = draggingNodeIdsRef.current;
      const starts = nodePosAtDragStartRef.current;
      if (baselines.size === 0 || dragging.size === 0) return;

      setEdges((eds) =>
        eds.map((edge) => {
          const base = baselines.get(edge.id);
          if (!base?.length) return edge;
          const srcIn = dragging.has(edge.source);
          const tgtIn = dragging.has(edge.target);
          if (!srcIn && !tgtIn) return edge;
          const ns = nodesRef.current.find((n) => n.id === edge.source);
          const nt = nodesRef.current.find((n) => n.id === edge.target);
          const ss = starts[edge.source];
          const st = starts[edge.target];
          let dx = 0;
          let dy = 0;
          if (srcIn && ns && ss) {
            dx = ns.position.x - ss.x;
            dy = ns.position.y - ss.y;
          } else if (tgtIn && nt && st) {
            dx = nt.position.x - st.x;
            dy = nt.position.y - st.y;
          }
          if (dx === 0 && dy === 0) return edge;
          return {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              lineWaypoints: base.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            },
          };
        }),
      );
    },
    [setNodes, setEdges],
  );

  const onNodeDragStop = useCallback(() => {
    const wasGroupDrag = dragGroupIdsRef.current.length > 1;
    dragGroupIdsRef.current = [];
    dragGroupStartPositionsRef.current = {};
    dragGroupLeaderStartRef.current = null;
    edgeWaypointBaselinesRef.current = new Map();
    draggingNodeIdsRef.current = new Set();
    nodePosAtDragStartRef.current = {};
    dragPrimaryStartPosRef.current = null;
    dragSelectionIdsRef.current = [];
    dragStartPositionsRef.current = {};
    if (wasGroupDrag) return;
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<SmartFlowData["draft"]>, nextKind?: ComponentKindSlug) => {
      if (!selectedComponent) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedComponent.id || n.type !== "smartCmp") return n;
          const kind = nextKind ?? n.data.kind;
          return {
            ...n,
            data: {
              kind,
              draft: { ...n.data.draft, ...patch },
            },
          };
        }),
      );
    },
    [selectedComponent, setNodes],
  );

  const updateSelectedComponentChrome = useCallback(
    (
      patch: Partial<Pick<SmartFlowData, "node_fill_color" | "node_text_color" | "node_title_align">>,
    ) => {
      if (!selectedComponent) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedComponent.id && n.type === "smartCmp"
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        ),
      );
    },
    [selectedComponent, setNodes],
  );

  const updateSelectedAnnotation = useCallback(
    (
      patch: Partial<
        Pick<
          SmartFlowData,
          | "annotation_shape"
          | "annotation_text"
          | "annotation_note"
          | "annotation_text_style"
          | "annotation_table_header_row"
          | "annotation_table_cells"
          | "annotation_table_col_widths_pct"
        >
      >,
    ) => {
      if (!selectedAnnotation) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== selectedAnnotation.id || node.type !== "smartAnnot") return node;
          return {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          };
        }),
      );
    },
    [selectedAnnotation, setNodes],
  );

  const updateSelectedDraw = useCallback(
    (
      patch: Partial<
        Pick<
          SmartFlowData,
          "draw_stroke_width" | "draw_stroke_color" | "draw_rotation_deg" | "draw_points"
        >
      >,
    ) => {
      if (!selectedDraw) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== selectedDraw.id || node.type !== "smartDraw") return node;
          return {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          };
        }),
      );
    },
    [selectedDraw, setNodes],
  );

  useEffect(() => {
    if (drawToolMode !== "line") {
      setLineAnchorFlow(null);
    }
  }, [drawToolMode]);

  useEffect(() => {
    const onDrawPatch = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string; patch: Partial<SmartFlowData> }>)
        .detail;
      if (!detail?.nodeId) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === detail.nodeId && node.type === "smartDraw"
            ? { ...node, data: { ...node.data, ...detail.patch } }
            : node,
        ),
      );
    };
    globalThis.window.addEventListener(DRAW_NODE_UPDATE_EVENT, onDrawPatch as EventListener);
    return () =>
      globalThis.window.removeEventListener(DRAW_NODE_UPDATE_EVENT, onDrawPatch as EventListener);
  }, [setNodes]);

  useEffect(() => {
    if (drawToolMode !== "pen") {
      setPenPreviewPoints(null);
      return;
    }
    const pane = flowPaneRef.current?.querySelector(".react-flow__pane");
    if (!pane || !(pane instanceof HTMLElement)) return;

    let drawing = false;
    const flowPoints: [number, number][] = [];

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.target as HTMLElement | null;
      if (!el?.closest(".react-flow__pane") || el.closest(".react-flow__node")) return;
      if (el.closest(".react-flow__edge") || el.closest("path")) return;
      e.preventDefault();
      e.stopPropagation();
      drawing = true;
      flowPoints.length = 0;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      flowPoints.push([p.x, p.y]);
      setPenPreviewPoints([[p.x, p.y]]);
    };

    const onMove = (e: PointerEvent) => {
      if (!drawing) return;
      const zoom = storeApi.getState().transform[2];
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const last = flowPoints[flowPoints.length - 1];
      const dist = Math.hypot(p.x - last[0], p.y - last[1]);
      if (dist < 1.5 / Math.max(zoom, 0.05)) return;
      flowPoints.push([p.x, p.y]);
      setPenPreviewPoints([...flowPoints]);
    };

    const onUp = () => {
      if (!drawing) return;
      drawing = false;
      setPenPreviewPoints(null);
      const normalized = normalizePenStroke(flowPoints);
      flowPoints.length = 0;
      if (!normalized) return;
      addDrawSketchNode({
        mode: "freehand",
        position: normalized.position,
        width: normalized.width,
        height: normalized.height,
        points: normalized.points,
      });
    };

    pane.addEventListener("pointerdown", onDown, true);
    globalThis.window.addEventListener("pointermove", onMove, true);
    globalThis.window.addEventListener("pointerup", onUp, true);
    return () => {
      pane.removeEventListener("pointerdown", onDown, true);
      globalThis.window.removeEventListener("pointermove", onMove, true);
      globalThis.window.removeEventListener("pointerup", onUp, true);
    };
  }, [drawToolMode, screenToFlowPosition, storeApi, addDrawSketchNode]);

  /** Sets the shape for the next click-to-place on the board only — does not rewrite existing nodes. */
  const applyShapeSelection = useCallback((shape: NodeShapeStyle) => {
    setDrawToolMode("off");
    setNodeShape(shape);
    setPendingDrawShape(shape);
  }, []);

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id),
    );
    if (selectedNodeIds.size === 0 && selectedIdRef.current) {
      selectedNodeIds.add(selectedIdRef.current);
    }
    const selectedEdgeIds = new Set(
      edgesRef.current.filter((edge) => edge.selected).map((edge) => edge.id),
    );
    if (selectedEdgeIds.size === 0 && selectedEdgeId) {
      selectedEdgeIds.add(selectedEdgeId);
    }
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

    pushUndoSnapshot();
    const nextNodes = nodesRef.current.filter((node) => !selectedNodeIds.has(node.id));
    const nextEdges = edgesRef.current.filter(
      (edge) =>
        !selectedEdgeIds.has(edge.id) &&
        !selectedNodeIds.has(edge.source) &&
        !selectedNodeIds.has(edge.target),
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedId(null);
    setSelectedEdgeId(null);
  }, [pushUndoSnapshot, selectedEdgeId, setEdges, setNodes]);

  const unlinkFromParent = useCallback(() => {
    if (!selectedId) return;
    pushUndoSnapshot();
    setEdges((eds) => {
      const next = eds.filter((e) => e.target !== selectedId);
      if (next.length === eds.length) return eds;
      toast.success(
        "Unlinked from parent — connect to a new parent when ready.",
      );
      return next;
    });
  }, [pushUndoSnapshot, selectedId, setEdges]);

  const groupSelectedNodes = useCallback(() => {
    const selectedNodeIds = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id),
    );
    if (selectedNodeIds.size === 0 && selectedIdRef.current) {
      selectedNodeIds.add(selectedIdRef.current);
    }
    if (selectedNodeIds.size < 2) {
      toast("Select at least 2 nodes to group.");
      return;
    }
    const groupId = `grp-${newFlowNodeId().slice(0, 10)}`;
    pushUndoSnapshot();
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        selectedNodeIds.has(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                groupId,
              },
            }
          : node,
      ),
    );
    toast.success("Grouped selection.");
  }, [pushUndoSnapshot, setNodes]);

  const ungroupSelectedNodes = useCallback(() => {
    const selectedNodeIds = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id),
    );
    if (selectedNodeIds.size === 0 && selectedIdRef.current) {
      selectedNodeIds.add(selectedIdRef.current);
    }
    if (selectedNodeIds.size === 0) {
      toast("Select grouped node(s) to ungroup.");
      return;
    }
    const groupIdsToClear = new Set(
      nodesRef.current
        .filter((node) => selectedNodeIds.has(node.id))
        .map((node) =>
          typeof node.data?.groupId === "string" ? node.data.groupId : null,
        )
        .filter((value): value is string => Boolean(value)),
    );
    if (groupIdsToClear.size === 0) {
      toast("No grouped nodes selected.");
      return;
    }
    pushUndoSnapshot();
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        typeof node.data?.groupId === "string" &&
        groupIdsToClear.has(node.data.groupId)
          ? {
              ...node,
              data: {
                ...node.data,
                groupId: undefined,
              },
            }
          : node,
      ),
    );
    toast.success("Ungrouped selection.");
  }, [pushUndoSnapshot, setNodes]);

  const saveEdgeText = useCallback(() => {
    if (!editingEdge) return;
    const nextLabel = editingEdge.value.trim();
    pushUndoSnapshot();
    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === editingEdge.edgeId
          ? {
              ...edge,
              data: {
                ...(edge.data ?? {}),
                lineLabel: nextLabel,
              },
            }
          : edge,
      ),
    );
    setEditingEdge(null);
  }, [editingEdge, pushUndoSnapshot, setEdges]);

  const applyToSelectedEdge = useCallback(
    (patch: Record<string, unknown>) => {
      const edgeId = selectedEdge?.id;
      if (!edgeId) {
        toast("Select a connector line first.");
        return;
      }
      const nextStylePatch =
        typeof patch.edgeStyle === "string"
          ? (patch.edgeStyle as EdgeStylePreset)
          : null;
      const nextStrokeWidth =
        typeof patch.strokeWidth === "number" ? patch.strokeWidth : null;
      const nextStroke = typeof patch.stroke === "string" ? patch.stroke : null;

      const dataPatch = { ...patch };
      delete dataPatch.stroke;
      delete dataPatch.strokeWidth;
      delete dataPatch.edgeStyle;

      pushUndoSnapshot();
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === edgeId
            ? (() => {
                const rebuilt = nextStylePatch
                  ? makeStyledEdge(edge.source, edge.target, nextStylePatch, true)
                  : null;
                const baseStyle = rebuilt?.style ?? edge.style;
                const mergedStyle: Record<string, unknown> = {
                  ...(baseStyle as Record<string, unknown> | undefined),
                };
                if (nextStrokeWidth != null) mergedStyle.strokeWidth = nextStrokeWidth;
                if (nextStroke != null) mergedStyle.stroke = nextStroke;

                let mergedMarker = rebuilt?.markerEnd ?? edge.markerEnd;
                if (
                  nextStroke != null &&
                  mergedMarker &&
                  typeof mergedMarker === "object" &&
                  mergedMarker !== null
                ) {
                  mergedMarker = { ...mergedMarker, color: nextStroke };
                }

                return {
                  ...edge,
                  ...(rebuilt
                    ? {
                        ...rebuilt,
                        id: edge.id,
                      }
                    : {}),
                  style: mergedStyle as Edge["style"],
                  markerEnd: mergedMarker,
                  data: (() => {
                    const merged = { ...(edge.data ?? {}), ...dataPatch };
                    if (typeof patch.edgeStyle === "string" && patch.edgeStyle === "smooth") {
                      merged.lineWaypoints = [];
                    }
                    return merged;
                  })(),
                };
              })()
            : edge,
        ),
      );
    },
    [pushUndoSnapshot, selectedEdge?.id, setEdges],
  );

  const copyPreview = useCallback(() => {
    void navigator.clipboard.writeText(exportJson);
    toast.success("JSON copied");
  }, [exportJson]);

  const applyImport = useCallback(() => {
    const parsed = parseImportPayload(importText);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    try {
      pushUndoSnapshot();
      const { nodes: n, edges: e } = nestedExportToGraph(parsed.roots);
      const importedNodes = (n as RFNode[]).map((node) => ({
        ...node,
        data: {
          ...node.data,
          nodeShape: node.data.nodeShape ?? nodeShape,
        },
      }));
      const normalizedEdges = e.map((edge) => ({
        ...edge,
        type: "smartEdge",
        sourceHandle: edge.sourceHandle ?? "s-bottom",
        targetHandle: edge.targetHandle ?? "t-top",
      }));
      setNodes(importedNodes);
      setEdges(normalizedEdges);
      setJsonTab("preview");
      toast.success("Imported");
      setTimeout(() => fitView({ padding: 0.2 }), 80);
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    }
  }, [fitView, importText, nodeShape, pushUndoSnapshot, setEdges, setNodes]);

  const runSubmit = useCallback(async () => {
    if (!plantId) {
      toast.error("Select a plant first.");
      return;
    }
    const componentNodes = nodes.filter((node) => node.type === "smartCmp");
    const componentNodeIds = new Set(componentNodes.map((node) => node.id));
    const componentEdges = edges.filter(
      (edge) =>
        componentNodeIds.has(edge.source) && componentNodeIds.has(edge.target),
    );
    const gErr = validateBoardGraph(componentNodes, componentEdges);
    if (gErr) {
      toast.error(gErr);
      return;
    }
    const pm = buildParentMap(componentEdges);
    const order = buildCreationOrder(componentNodes, pm);
    const treeRoots = buildExportTree(order, pm);
    const treeErr = validateSmartPlantExportTree(treeRoots);
    if (treeErr) {
      toast.error(treeErr);
      return;
    }
    const payload = toSmartPlantApiPayload(treeRoots);

    setSubmitting(true);
    try {
      const { created_count } = await submitSmartPlantCreate(plantId, payload);
      toast.success(
        created_count
          ? `Created ${created_count} component(s).`
          : "Plant hierarchy created.",
      );
      await qc.invalidateQueries({ queryKey: ["component"] });
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }, [plantId, nodes, edges, qc]);

  const requestSubmit = useCallback(() => {
    if (!plantId) {
      toast.error("Select a plant first.");
      return;
    }
    const componentNodes = nodes.filter((node) => node.type === "smartCmp");
    const componentNodeIds = new Set(componentNodes.map((node) => node.id));
    const componentEdges = edges.filter(
      (edge) =>
        componentNodeIds.has(edge.source) && componentNodeIds.has(edge.target),
    );
    const pm = buildParentMap(componentEdges);
    const order = buildCreationOrder(componentNodes, pm);
    if (order.length > 400) {
      setPendingCount(order.length);
      setConfirmLarge(true);
      return;
    }
    void runSubmit();
  }, [plantId, nodes, edges, runSubmit]);

  const confirmManualAdd = useCallback(() => {
    const qty = Number(addPrompt.quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error("Enter a valid quantity (minimum 1).");
      return;
    }
    addNodes(addPrompt.kind, Math.floor(qty), addPrompt.parentId);
    setAddPrompt((prev) => ({ ...prev, open: false, quantity: "1" }));
  }, [addNodes, addPrompt]);

  const resetBoard = useCallback(() => {
    pushUndoSnapshot();
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SMART_PLANT_CREATE_STORAGE_KEY);
    }
    toast.success("Board reset");
  }, [pushUndoSnapshot, setEdges, setNodes]);

  useEffect(() => {
    const onModifierDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.key === "Control" || event.key === "Meta") {
        setModifierSelectionActive(true);
      }
    };
    const onModifierUp = (event: KeyboardEvent) => {
      if (
        event.key === "Control" ||
        event.key === "Meta" ||
        (!event.ctrlKey && !event.metaKey)
      ) {
        setModifierSelectionActive(false);
      }
    };
    const clearModifierState = () => setModifierSelectionActive(false);
    globalThis.window.addEventListener("keydown", onModifierDown);
    globalThis.window.addEventListener("keyup", onModifierUp);
    globalThis.window.addEventListener("blur", clearModifierState);
    return () => {
      globalThis.window.removeEventListener("keydown", onModifierDown);
      globalThis.window.removeEventListener("keyup", onModifierUp);
      globalThis.window.removeEventListener("blur", clearModifierState);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      const isUndo =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
      const isRedo =
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "y" ||
          (event.shiftKey && event.key.toLowerCase() === "z"));
      if ((isUndo || isRedo) && event.repeat) {
        event.preventDefault();
        return;
      }
      if (isUndo && !event.shiftKey) {
        event.preventDefault();
        undoLastChange();
        return;
      }
      if (isRedo) {
        event.preventDefault();
        redoLastChange();
        return;
      }

      const isCopy =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "c" &&
        !event.shiftKey;
      if (isCopy) {
        event.preventDefault();
        copySelectedNodes();
        return;
      }

      const isPaste =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "v" &&
        !event.shiftKey;
      if (isPaste) {
        event.preventDefault();
        pasteCopiedNodes();
        return;
      }

      const isGroupShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "g" &&
        !event.shiftKey;
      if (isGroupShortcut) {
        event.preventDefault();
        groupSelectedNodes();
        return;
      }
      const isUngroupShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "g" &&
        event.shiftKey;
      if (isUngroupShortcut) {
        event.preventDefault();
        ungroupSelectedNodes();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const hasSelectedNodes =
          nodesRef.current.some((node) => node.selected) || Boolean(selectedIdRef.current);
        const hasSelectedEdges =
          edgesRef.current.some((edge) => edge.selected) || Boolean(selectedEdgeId);
        if (hasSelectedNodes || hasSelectedEdges) {
          event.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelectedNodes, deleteSelected, groupSelectedNodes, pasteCopiedNodes, redoLastChange, selectedEdgeId, undoLastChange, ungroupSelectedNodes]);

  return (
    <div className="box-border flex h-[calc(100dvh-2.5rem)] max-h-[calc(100dvh-2.5rem)] w-full min-h-0 flex-col overflow-hidden p-2 max-md:h-[calc(100dvh-3.5rem)] max-md:max-h-[calc(100dvh-3.5rem)]">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xs border border-neutral-200 bg-neutral-50 dark:border-neutral-dark-200 dark:bg-neutral-dark-50">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-2 py-2 sm:px-3 dark:border-neutral-dark-200">
        <div className="flex min-w-0 items-center gap-2">
          <Network className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <h1 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
            Smart plant builder
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[200px]">
            <AsyncSelect
              name="plant"
              loadOptions={(s) => fetchPlantNames(s, 1, 50)}
              placeholder="Physical plant"
              value={
                plantId
                  ? { value: plantId, label: plantLabel || plantId }
                  : null
              }
              onChange={(v: any) => {
                setPlantId(v?.value || null);
                setPlantLabel(v?.label || "");
              }}
              isClearable
            />
          </div>
          <Link
            to="/components"
            className="btn btn-secondary btn-md inline-flex items-center justify-center rounded-xs"
          >
            <ArrowUpRight className="mr-1 h-4 w-4" />
            Components
          </Link>
          <Button
            type="button"
            variant="primary"
            loading={submitting}
            onClick={requestSubmit}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit to API
          </Button>
          <Button type="button" variant="secondary" onClick={resetBoard}>
            Reset board
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        {leftPanelOpen ? (
          <aside
            className="relative flex h-full min-h-0 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-neutral-200 bg-white p-3 dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
            style={{ width: leftPanelWidth }}
          >
            <button
              type="button"
              className="absolute right-1 top-2 rounded-xs p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-100"
              title="Collapse palette"
              aria-label="Collapse left panel"
              onClick={() => setLeftPanelOpen(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <p className="pr-8 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Add node
            </p>
            <div className={`grid gap-2 ${leftPanelGridColsClass}`}>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("plant")}
              >
                <Plus className="mr-1 h-3 w-3" /> Plant
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("block")}
              >
                <Plus className="mr-1 h-3 w-3" /> Block
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("acdb")}
              >
                <Plus className="mr-1 h-3 w-3" /> ACDB
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("inverter")}
              >
                <Plus className="mr-1 h-3 w-3" /> Inverter
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("dcdb")}
              >
                <Plus className="mr-1 h-3 w-3" /> DCDB
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("meter")}
              >
                <Plus className="mr-1 h-3 w-3" /> Meter
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("string")}
              >
                <Plus className="mr-1 h-3 w-3" /> String
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("transformer")}
              >
                <Plus className="mr-1 h-3 w-3" /> Transformer
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("scb")}
              >
                <Plus className="mr-1 h-3 w-3" /> SCB
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("icb")}
              >
                <Plus className="mr-1 h-3 w-3" /> ICB
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("weather_station")}
              >
                <Plus className="mr-1 h-3 w-3" /> WS
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start px-1.5 py-1 text-[10px]"
                onClick={() => addNode("others")}
              >
                <Plus className="mr-1 h-3 w-3" /> Others
              </Button>
            </div>
            <div className="rounded-xs border border-neutral-200 p-2 dark:border-neutral-dark-200">
              {/* <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Quick assign a device or template
              </p> */}
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Devices
                  </p>
                  <AsyncSelect
                    name="quick_device_pick"
                    loadOptions={loadDevicePaletteOptions}
                    apiSearch
                    isDisabled={!plantId}
                    placeholder={
                      plantId ? "Add device" : "Select plant first"
                    }
                    value={deviceSearchPick}
                    onChange={async (value: any) => {
                      const option = (value as Option | null) ?? null;
                      if (!option?.value) {
                        setDeviceSearchPick(null);
                        return;
                      }
                      if (option.value === PALETTE_ALL_VALUE) {
                        setDeviceSearchPick(null);
                        await applyDeviceTagOrInverterAllToPalette("device");
                        return;
                      }
                      setDeviceSearchPick(option);
                      addPaletteItem("device", option);
                    }}
                    isClearable
                    styles={paletteSelectStyles}
                    {...paletteMenuExtras}
                  />
                  {devicePaletteMessage ? (
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {devicePaletteMessage}
                    </p>
                  ) : (
                    <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
                      {devicePalette.map((item) => (
                        <div key={item.value} className="group relative">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              startResourceDrag(event, {
                                kind: "device",
                                id: item.value,
                                label: item.label,
                              })
                            }
                            title={item.label}
                            className="rounded-xs border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 pr-4 text-[10px] text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-200 dark:text-neutral-dark-800 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10"
                          >
                            {toShortLabel(item.label)}
                          </button>
                          <button
                            type="button"
                            title="Remove from list"
                            className="absolute right-0.5 top-0.5 hidden h-3 w-3 items-center justify-center rounded-xs text-[10px] leading-none text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 group-hover:flex dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-300 dark:hover:text-neutral-dark-900"
                            onClick={() => removePaletteItem("device", item.value)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Tag templates
                  </p>
                  <AsyncSelect
                    name="quick_tag_pick"
                    loadOptions={loadTagPaletteOptions}
                    apiSearch
                    placeholder="Add tag"
                    value={tagSearchPick}
                    onChange={async (value: any) => {
                      const option = (value as Option | null) ?? null;
                      if (!option?.value) {
                        setTagSearchPick(null);
                        return;
                      }
                      if (option.value === PALETTE_ALL_VALUE) {
                        setTagSearchPick(null);
                        await applyDeviceTagOrInverterAllToPalette("tag_template");
                        return;
                      }
                      setTagSearchPick(option);
                      addPaletteItem("tag_template", option);
                    }}
                    isClearable
                    styles={paletteSelectStyles}
                    {...paletteMenuExtras}
                  />
                  {tagTemplatePaletteMessage ? (
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {tagTemplatePaletteMessage}
                    </p>
                  ) : (
                    <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
                      {tagTemplatePalette.map((item) => (
                        <div key={item.value} className="group relative">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              startResourceDrag(event, {
                                kind: "tag_template",
                                id: item.value,
                                label: item.label,
                              })
                            }
                            title={item.label}
                            className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 pr-4 text-[10px] text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-800 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10"
                          >
                            {toShortLabel(item.label)}
                          </button>
                          <button
                            type="button"
                            title="Remove from list"
                            className="absolute right-0.5 top-0.5 hidden h-3 w-3 items-center justify-center rounded-xs text-[10px] leading-none text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 group-hover:flex dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-300 dark:hover:text-neutral-dark-900"
                            onClick={() => removePaletteItem("tag_template", item.value)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    VD number ({VD_NUMBER_MIN}–{VD_NUMBER_MAX})
                  </p>
                  <AsyncSelect
                    name="quick_vd_pick"
                    loadOptions={loadVdPaletteOptions}
                    apiSearch
                    placeholder="Add VD"
                    value={vdSearchPick}
                    onChange={(value: any) => {
                      const option = (value as Option | null) ?? null;
                      if (!option?.value) {
                        setVdSearchPick(null);
                        return;
                      }
                      if (option.value === PALETTE_ALL_VALUE) {
                        setVdSearchPick(null);
                        setVdPalette([...VD_NUMBER_OPTIONS].sort((a, b) => b - a));
                        return;
                      }
                      setVdSearchPick(option);
                      const v = Number(option.value);
                      if (Number.isFinite(v)) addVdPaletteNumber(v);
                    }}
                    isClearable
                    styles={paletteSelectStyles}
                    {...paletteMenuExtras}
                  />
                  {vdPalette.length === 0 ? (
                    <p className="mt-1 text-[10px] text-neutral-400">
                      No VD numbers in palette yet.
                    </p>
                  ) : (
                    <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
                      {vdPalette.map((vdValue) => (
                        <div key={vdValue} className="group relative">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              startResourceDrag(event, {
                                kind: "vd_number",
                                id: String(vdValue),
                                label: `VD ${vdValue}`,
                              })
                            }
                            title={`VD ${vdValue}`}
                            className="rounded-xs border border-neutral-200 bg-white px-1.5 py-0.5 pr-4 text-[10px] text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-800 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10"
                          >
                            {`VD ${vdValue}`}
                          </button>
                          <button
                            type="button"
                            title="Remove from list"
                            className="absolute right-0.5 top-0.5 hidden h-3 w-3 items-center justify-center rounded-xs text-[10px] leading-none text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 group-hover:flex dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-300 dark:hover:text-neutral-dark-900"
                            onClick={() =>
                              removePaletteItem("vd_number", String(vdValue))
                            }
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Inverter type
                  </p>
                  <p className="mb-1 text-[9px] leading-snug text-neutral-500 dark:text-neutral-400">
                    Drag onto <span className="font-semibold text-neutral-600 dark:text-neutral-300">Inverter</span>{" "}
                    components only.
                  </p>
                  <AsyncSelect
                    name="quick_inverter_type_pick"
                    loadOptions={loadInverterPaletteOptions}
                    apiSearch
                    placeholder="Add InverterType"
                    value={inverterTypeSearchPick}
                    onChange={async (value: any) => {
                      const option = (value as Option | null) ?? null;
                      if (!option?.value) {
                        setInverterTypeSearchPick(null);
                        return;
                      }
                      if (option.value === PALETTE_ALL_VALUE) {
                        setInverterTypeSearchPick(null);
                        await applyDeviceTagOrInverterAllToPalette("inverter_type");
                        return;
                      }
                      setInverterTypeSearchPick(option);
                      addPaletteItem("inverter_type", option);
                    }}
                    isClearable
                    styles={paletteSelectStyles}
                    {...paletteMenuExtras}
                  />
                  {inverterTypePaletteMessage ? (
                    <p className="mt-1 text-[10px] text-neutral-400">{inverterTypePaletteMessage}</p>
                  ) : (
                    <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
                      {inverterTypePalette.map((item) => (
                        <div key={item.value} className="group relative">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              startResourceDrag(event, {
                                kind: "inverter_type",
                                id: item.value,
                                label: item.label,
                              })
                            }
                            title={item.label}
                            className="rounded-xs border border-neutral-200 bg-white px-1.5 py-0.5 pr-4 text-[10px] text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-800 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10"
                          >
                            {toShortLabel(item.label)}
                          </button>
                          <button
                            type="button"
                            title="Remove from list"
                            className="absolute right-0.5 top-0.5 hidden h-3 w-3 items-center justify-center rounded-xs text-[10px] leading-none text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 group-hover:flex dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-300 dark:hover:text-neutral-dark-900"
                            onClick={() => removePaletteItem("inverter_type", item.value)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xs border border-neutral-200 p-2 dark:border-neutral-dark-200">
              <div className="space-y-1.5">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Shapes
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {SHAPE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant="secondary"
                        onClick={() => applyShapeSelection(option.value)}
                        className={`h-8 border px-1 ${
                          (pendingDrawShape ?? nodeShape) === option.value
                            ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                            : "border-neutral-200 dark:border-neutral-dark-300"
                        }`}
                      >
                        <span>
                          {renderShapeSwatch(option.value)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Connections
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {EDGE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant="secondary"
                        onClick={() => setEdgeStyle(option.value)}
                        className={`h-8 border ${
                          edgeStyle === option.value
                            ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                            : "border-neutral-200 dark:border-neutral-dark-300"
                        }`}
                      >
                        <span>
                          {renderEdgeSwatch(option.value)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xs border border-neutral-200 p-2 dark:border-neutral-dark-200">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Symbols
              </p>
              <p className="mb-2 text-[10px] text-neutral-500">
                Drag onto a connector to attach it there, or click to add a free annotation.
              </p>
              <div className={`grid gap-1 ${isLeftPanelCompact ? "grid-cols-2" : "grid-cols-4"}`}>
                {ANNOTATION_SYMBOL_OPTIONS.map((item) => (
                  <Button
                    key={item.shape}
                    type="button"
                    variant="secondary"
                    draggable
                    onDragStart={(event) => startSymbolDrag(event, item.shape)}
                    onClick={() => addAnnotationNode(item.shape)}
                    className="h-8 w-full justify-center px-1 py-1"
                    title={`Drag ${item.label} to a connector or click to add`}
                  >
                    {isEdgeAttachableSymbol(item.shape) ? (
                      renderElectricalSymbolSwatch(item.shape)
                    ) : (
                      <Tag className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ))}
              </div>
              <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-dark-200">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Text & tables
                </p>
                          <div
                  className={`grid gap-1 ${isLeftPanelCompact ? "grid-cols-2" : "grid-cols-3"}`}
                >
                  {ANNOTATION_TEXT_OPTIONS.map((item) => (
                    <Button
                      key={item.shape}
                      type="button"
                      variant="secondary"
                      draggable={false}
                      onClick={() => addAnnotationNode(item.shape)}
                      className="h-8 w-full justify-center px-1 py-1 text-[10px]"
                      title={`${item.label} — click to place on the board`}
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        {renderAnnotationPaletteIcon(item.shape, 16)}
                        <span className="max-w-full truncate leading-tight">{item.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xs border border-neutral-200 p-2 dark:border-neutral-dark-200">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Connector tools
              </p>
              <p className="mb-2 text-[10px] text-neutral-500">
                Style and label controls for selected connector.
              </p>
              <div className="mb-2 grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1 text-[10px]"
                  onClick={() => {
                    const width =
                      typeof selectedEdge?.style?.strokeWidth === "number"
                        ? selectedEdge.style.strokeWidth
                        : 2;
                    applyToSelectedEdge({ strokeWidth: Math.max(1, width - 1) });
                  }}
                >
                  Width -
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1 text-[10px]"
                  onClick={() => {
                    const width =
                      typeof selectedEdge?.style?.strokeWidth === "number"
                        ? selectedEdge.style.strokeWidth
                        : 2;
                    applyToSelectedEdge({ strokeWidth: Math.min(10, width + 1) });
                  }}
                >
                  Width +
                </Button>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1"
                  title="Straight line"
                  onClick={() =>
                    applyToSelectedEdge({
                      edgeStyle: "solid",
                      lineStretchStart: 0,
                      lineStretchEnd: 0,
                      lineOffsetX: 0,
                      lineOffsetY: 0,
                      lineWaypoints: [],
                    })
                  }
                >
                  {renderEdgeSwatch("solid")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1"
                  title="Dashed line"
                  onClick={() => applyToSelectedEdge({ edgeStyle: "dashed" })}
                >
                  {renderEdgeSwatch("dashed")}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1"
                  title="Left label position"
                  onClick={() =>
                    applyToSelectedEdge({ lineLabelPosition: "left", labelOffsetX: 0, labelOffsetY: 0 })
                  }
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1"
                  title="Center label position"
                  onClick={() =>
                    applyToSelectedEdge({ lineLabelPosition: "center", labelOffsetX: 0, labelOffsetY: 0 })
                  }
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-1"
                  title="Right label position"
                  onClick={() =>
                    applyToSelectedEdge({ lineLabelPosition: "right", labelOffsetX: 0, labelOffsetY: 0 })
                  }
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-neutral-500">
                {selectedEdge ? " Line selected." : " No line selected."}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              className="mt-2 w-full py-1.5 text-xs"
              onClick={() => setWizardOpen(true)}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Generate wizard
            </Button>
            <button
              type="button"
              aria-label="Resize left panel"
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent focus:outline-none focus-visible:outline-none"
              onMouseDown={(event) => {
                resizeStateRef.current = {
                  mode: "left",
                  startX: event.clientX,
                  startY: event.clientY,
                  leftWidth: leftPanelWidth,
                  jsonHeight: jsonPanelHeight,
                };
              }}
            />
          </aside>
        ) : (
          <div className="flex w-10 flex-shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200"
              title="Show palette"
              aria-label="Expand left panel"
              onClick={() => setLeftPanelOpen(true)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          className="relative h-full min-h-0 min-w-0 flex-1"
          ref={flowPaneRef}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onReconnect={onReconnect}
            connectionMode={ConnectionMode.Loose}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedId(null);
              setRightPanelOpen(true);
              setEdges((eds) =>
                eds.map((e) => ({
                  ...e,
                  selected: e.id === edge.id,
                })),
              );
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={(p) =>
              onSelectionChange({ nodes: p.nodes ?? [], edges: p.edges ?? [] })
            }
            onNodeClick={(_, node) => {
              setSelectedId(node.id);
              setSelectedEdgeId(null);
              setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
              setRightPanelOpen(true);
            }}
            onPaneClick={(event) => {
              setSelectedEdgeId(null);
              setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
              if (drawToolMode === "line") {
                const position = screenToFlowPosition({
                  x: event.clientX,
                  y: event.clientY,
                });
                if (!lineAnchorFlow) {
                  setLineAnchorFlow(position);
                  return;
                }
                const line = normalizeStraightLine(lineAnchorFlow, position);
                setLineAnchorFlow(null);
                addDrawSketchNode({
                  mode: "line",
                  position: line.position,
                  width: line.width,
                  height: line.height,
                  points: line.points,
                });
                return;
              }
              if (drawToolMode !== "off") return;
              if (!pendingDrawShape) return;
              const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              drawShapeOnBoard(pendingDrawShape, position);
              setPendingDrawShape(null);
            }}
            onPaneContextMenu={(event) => event.preventDefault()}
            fitView
            fitViewOptions={{ padding: 0.25, minZoom: 0.05 }}
            minZoom={0.05}
            maxZoom={2.5}
            edgesReconnectable
            edgesFocusable
            selectionOnDrag={isSelectionModeActive}
            selectionMode={SelectionMode.Partial}
            panOnDrag={
              drawToolMode !== "off"
                ? ([1, 2] as const)
                : isSelectionModeActive
                  ? [1, 2]
                  : [0, 1, 2]
            }
            panOnScroll={!isSelectionModeActive}
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnScroll={isSelectionModeActive}
            deleteKeyCode={null}
            onlyRenderVisibleElements
            defaultEdgeOptions={{ reconnectable: true, interactionWidth: 36 }}
            proOptions={{ hideAttribution: true }}
            className="h-full w-full bg-neutral-100/80 dark:bg-neutral-dark-200/40"
          >
            <Background gap={20} size={1} />
            <PenSketchPreview points={penPreviewPoints} />
            <Controls className="!m-2 !border-neutral-200 !bg-white dark:!border-neutral-dark-200 dark:!bg-neutral-dark-100" />
            <Panel
              position="top-left"
              className="m-2 max-w-[min(100%,20rem)] rounded-xs bg-white/90 px-2 py-1 text-xs text-neutral-600 shadow dark:bg-neutral-dark-100/90 dark:text-neutral-300"
            >
              <LayoutTemplate className="mr-1 inline h-3.5 w-3.5" />
              {drawToolMode === "pen" ? (
                <span>Pen: drag on empty canvas to draw. Middle/right mouse pans.</span>
              ) : drawToolMode === "line" ? (
                <span>Line: click start point, then click end point.</span>
              ) : (
                <span>
                  Selection: wheel zooms. Hand: wheel pans. Ctrl/Cmd+G group · Ctrl/Cmd+Shift+G ungroup
                </span>
              )}
            </Panel>
          </ReactFlow>
          {editingEdge ? (
            <div
              className="absolute z-30"
              style={{ left: editingEdge.x, top: editingEdge.y }}
            >
              <TextArea
                label=""
                value={editingEdge.value}
                onChange={(event) =>
                  setEditingEdge((current) =>
                    current
                      ? {
                          ...current,
                          value: event.target.value,
                        }
                      : current,
                  )
                }
                onBlur={() => {
                  if (skipNextEdgeTextBlurRef.current) {
                    skipNextEdgeTextBlurRef.current = false;
                    return;
                  }
                  saveEdgeText();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    skipNextEdgeTextBlurRef.current = false;
                    setEditingEdge(null);
                  }
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    skipNextEdgeTextBlurRef.current = true;
                    saveEdgeText();
                  }
                }}
                rows={4}
                className="min-h-[4.5rem] w-56 max-w-[min(14rem,92vw)] resize-y bg-white text-xs shadow-md dark:bg-neutral-dark-100"
                divClassName="!w-auto"
                autoFocus
              />
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
            <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xs border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-neutral-dark-300 dark:bg-neutral-dark-100/95">
              <Button
                type="button"
                variant="secondary"
                className={`h-8 px-2 ${
                  isSelectionModeActive
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                    : ""
                }`}
                onClick={() => setSelectionModeEnabled(true)}
                title="Selection mode (hold Ctrl/Cmd to invert temporarily)"
                aria-label="Selection mode"
              >
                <MousePointer2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={`h-8 px-2 ${
                  !isSelectionModeActive
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                    : ""
                }`}
                onClick={() => setSelectionModeEnabled(false)}
                title="Hand drag mode (hold Ctrl/Cmd to invert temporarily)"
                aria-label="Hand drag mode"
              >
                <Hand className="h-3.5 w-3.5" />
              </Button>
              <span className="mx-0.5 h-5 w-px bg-neutral-200 dark:bg-neutral-dark-300" />
              <Button
                type="button"
                variant="secondary"
                className={`h-8 px-2 ${
                  drawToolMode === "pen"
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                    : ""
                }`}
                onClick={() => {
                  setDrawToolMode((m) => (m === "pen" ? "off" : "pen"));
                  setPendingDrawShape(null);
                  setLineAnchorFlow(null);
                }}
                title="Pen — drag on empty board to sketch. Middle/right mouse still pans."
                aria-label="Pen tool"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={`h-8 px-2 ${
                  drawToolMode === "line"
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                    : ""
                }`}
                onClick={() => {
                  setDrawToolMode((m) => (m === "line" ? "off" : "line"));
                  setPendingDrawShape(null);
                  setLineAnchorFlow(null);
                }}
                title="Straight line — click start, then click end"
                aria-label="Line tool"
              >
                <Slash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {rightPanelOpen ? (
          <aside className="relative flex h-full min-h-0 w-[min(100%,380px)] flex-shrink-0 flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
            <div className="border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-dark-200">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-xs p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-100"
                  title="Collapse inspector"
                  aria-label="Collapse right panel"
                  onClick={() => setRightPanelOpen(false)}
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
                {selected || selectedEdge ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 w-7 rounded-xs border border-neutral-200 bg-neutral-50 p-0 dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
                      disabled={!canUndo}
                      onClick={undoLastChange}
                      title="Undo (Ctrl/Cmd+Z)"
                      aria-label="Undo"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 w-7 rounded-xs border border-neutral-200 bg-neutral-50 p-0 dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
                      disabled={!canRedo}
                      onClick={redoLastChange}
                      title="Redo (Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z)"
                      aria-label="Redo"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 w-7 rounded-xs border border-neutral-200 bg-neutral-50 p-0 dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
                      onClick={deleteSelected}
                      title={selected ? "Remove node" : "Remove connector line"}
                      aria-label={selected ? "Remove node" : "Remove connector line"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 w-7 rounded-xs border border-neutral-200 bg-neutral-50 p-0 dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
                      disabled={!selectedHasParent || !selectedComponent}
                      onClick={unlinkFromParent}
                      title={
                        selectedHasParent
                          ? "Remove only the incoming parent link"
                          : "No parent link on this node"
                      }
                      aria-label="Unlink parent"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {selected ? null : selectedEdge ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Connector line selected — adjust stroke below, or use the close control to deselect.
                </p>
              ) : (
                <p className="mt-1 text-xs text-neutral-500">
                  Select a node to edit fields.
                </p>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
              {selectedEdge && !selected ? (
                <div className="mb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                        Connector line
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Stroke color matches the line and arrow head. Width and dash options are in the left
                        Connector tools panel.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-xs p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-100"
                      title="Deselect line"
                      aria-label="Close connector tools"
                      onClick={() => {
                        setSelectedEdgeId(null);
                        setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 px-2 py-1.5 dark:border-neutral-dark-300">
                    <label className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300">
                      Stroke
                      <input
                        type="color"
                        className="h-6 w-8 cursor-pointer rounded border border-neutral-200 p-0 dark:border-neutral-dark-400"
                        value={
                          typeof selectedEdge.style === "object" &&
                          selectedEdge.style !== null &&
                          "stroke" in selectedEdge.style &&
                          typeof (selectedEdge.style as { stroke?: string }).stroke === "string"
                            ? (selectedEdge.style as { stroke: string }).stroke
                            : BRAND_EDGE_COLOR
                        }
                        onChange={(e) => applyToSelectedEdge({ stroke: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              {selectedComponent ? (
                <div className="space-y-3">
                  <SmartPlantInspector
                    plantId={plantId}
                    kind={selectedComponent.data.kind}
                    draft={selectedComponent.data.draft}
                    onChange={updateSelected}
                  />
                  <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 px-2 py-1.5 dark:border-neutral-dark-300">
                    <span className="text-[10px] font-medium uppercase text-neutral-500">Box</span>
                    <label className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300">
                      Fill
                      <input
                        type="color"
                        className="h-6 w-7 cursor-pointer rounded border border-neutral-200 p-0 dark:border-neutral-dark-400"
                        value={selectedComponent.data.node_fill_color ?? "#ffffff"}
                        onChange={(e) =>
                          updateSelectedComponentChrome({ node_fill_color: e.target.value })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300">
                      Text
                      <input
                        type="color"
                        className="h-6 w-7 cursor-pointer rounded border border-neutral-200 p-0 dark:border-neutral-dark-400"
                        value={selectedComponent.data.node_text_color ?? "#111827"}
                        onChange={(e) =>
                          updateSelectedComponentChrome({ node_text_color: e.target.value })
                        }
                      />
                    </label>
                    <div className="flex items-center gap-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-dark-400">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        title="Title align left"
                        onClick={() => updateSelectedComponentChrome({ node_title_align: "left" })}
                      >
                        <AlignLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        title="Title align center"
                        onClick={() => updateSelectedComponentChrome({ node_title_align: "center" })}
                      >
                        <AlignCenter className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        title="Title align right"
                        onClick={() => updateSelectedComponentChrome({ node_title_align: "right" })}
                      >
                        <AlignRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedAnnotation ? (
                <div className="space-y-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Shape annotation
                  </p>
                  <div>
                    <label className="form-label" htmlFor="annotation-shape">
                      Shape
                    </label>
                    <select
                      id="annotation-shape"
                      className="input"
                      value={selectedAnnotation.data.annotation_shape ?? "isolator"}
                      onChange={(event) => {
                        const nextShape = event.target.value as AnnotationShape;
                        if (nextShape === "table") {
                          const prev = selectedAnnotation.data.annotation_shape;
                          const existing = selectedAnnotation.data.annotation_table_cells;
                          const hasStructuredGrid =
                            prev === "table" &&
                            Array.isArray(existing) &&
                            existing.length > 0 &&
                            existing.every((row) => Array.isArray(row));
                          if (hasStructuredGrid) {
                            updateSelectedAnnotation({ annotation_shape: nextShape });
                            return;
                          }
                          const fromText = parsePipeTableText(
                            selectedAnnotation.data.annotation_text ?? "",
                          );
                          const cells =
                            fromText.length > 0
                              ? fromText
                              : DEFAULT_TABLE_CELLS.map((row) => [...row]);
                          updateSelectedAnnotation({
                            annotation_shape: nextShape,
                            annotation_table_header_row: true,
                            annotation_table_cells: cells,
                            annotation_text: cellsToPipeText(cells),
                            annotation_table_col_widths_pct: syncColWidthsWithGrid(
                              selectedAnnotation.data.annotation_table_col_widths_pct,
                              cells[0]?.length ?? 1,
                            ),
                          });
                          return;
                        }
                        updateSelectedAnnotation({ annotation_shape: nextShape });
                      }}
                    >
                      {ANNOTATION_ALL_OPTIONS.map((option) => (
                        <option key={option.shape} value={option.shape}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedAnnotation.data.annotation_shape === "table" ? (
                    <>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Edit cells on the board. Drag between columns to resize column widths; use the
                        corner handles on the selection outline to resize the whole table. Use +/− below
                        or the floating toolbar for rows and columns.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-0 px-2 py-1 text-[11px]"
                          onClick={() => {
                            const cells = getTableCellsFromData(selectedAnnotation.data);
                            const next = normalizeRectangular(addTableRow(cells));
                            updateSelectedAnnotation({
                              annotation_table_cells: next,
                              annotation_text: cellsToPipeText(next),
                              annotation_table_col_widths_pct: syncColWidthsWithGrid(
                                selectedAnnotation.data.annotation_table_col_widths_pct,
                                next[0]?.length ?? 1,
                              ),
                            });
                          }}
                        >
                          + Row
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-0 px-2 py-1 text-[11px]"
                          onClick={() => {
                            const cells = getTableCellsFromData(selectedAnnotation.data);
                            const next = normalizeRectangular(addTableColumn(cells));
                            updateSelectedAnnotation({
                              annotation_table_cells: next,
                              annotation_text: cellsToPipeText(next),
                              annotation_table_col_widths_pct: syncColWidthsWithGrid(
                                selectedAnnotation.data.annotation_table_col_widths_pct,
                                next[0]?.length ?? 1,
                              ),
                            });
                          }}
                        >
                          + Col
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-0 px-2 py-1 text-[11px]"
                          disabled={getTableCellsFromData(selectedAnnotation.data).length <= 1}
                          onClick={() => {
                            const cells = getTableCellsFromData(selectedAnnotation.data);
                            const next = normalizeRectangular(removeTableRow(cells));
                            updateSelectedAnnotation({
                              annotation_table_cells: next,
                              annotation_text: cellsToPipeText(next),
                              annotation_table_col_widths_pct: syncColWidthsWithGrid(
                                selectedAnnotation.data.annotation_table_col_widths_pct,
                                next[0]?.length ?? 1,
                              ),
                            });
                          }}
                        >
                          − Row
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-0 px-2 py-1 text-[11px]"
                          disabled={
                            (getTableCellsFromData(selectedAnnotation.data)[0]?.length ?? 1) <= 1
                          }
                          onClick={() => {
                            const cells = getTableCellsFromData(selectedAnnotation.data);
                            const next = normalizeRectangular(removeTableColumn(cells));
                            updateSelectedAnnotation({
                              annotation_table_cells: next,
                              annotation_text: cellsToPipeText(next),
                              annotation_table_col_widths_pct: syncColWidthsWithGrid(
                                selectedAnnotation.data.annotation_table_col_widths_pct,
                                next[0]?.length ?? 1,
                              ),
                            });
                          }}
                        >
                          − Col
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Input
                      label="Text"
                      value={selectedAnnotation.data.annotation_text ?? ""}
                      onChange={(event) =>
                        updateSelectedAnnotation({
                          annotation_text: event.target.value,
                        })
                      }
                    />
                  )}
                  {selectedAnnotation.data.annotation_shape === "table" ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300"
                        checked={Boolean(selectedAnnotation.data.annotation_table_header_row)}
                        onChange={(event) =>
                          updateSelectedAnnotation({
                            annotation_table_header_row: event.target.checked,
                          })
                        }
                      />
                      First row is header
                    </label>
                  ) : null}
                  <p className="text-[11px] text-neutral-500">
                    Drag this annotation freely, or drag symbols from the left panel directly onto a connector line.
                  </p>
                </div>
              ) : null}
              {selectedDraw ? (
                <div className="space-y-2 px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Sketch
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Drag corners to resize (path scales). Use ↻ on the board to rotate.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[10px] text-neutral-600 dark:text-neutral-300">
                      W
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        className="ml-1 w-24 align-middle"
                        value={selectedDraw.data.draw_stroke_width ?? 2.5}
                        onChange={(event) =>
                          updateSelectedDraw({
                            draw_stroke_width: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300">
                      Stroke
                      <input
                        type="color"
                        className="h-6 w-8 cursor-pointer rounded border border-neutral-200 p-0 dark:border-neutral-dark-400"
                        value={selectedDraw.data.draw_stroke_color ?? "#374151"}
                        onChange={(event) =>
                          updateSelectedDraw({ draw_stroke_color: event.target.value })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-0.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                      °
                      <input
                        type="number"
                        className="input w-14 py-0.5 text-xs"
                        value={selectedDraw.data.draw_rotation_deg ?? 0}
                        onChange={(event) => {
                          const v = Number(event.target.value);
                          if (Number.isFinite(v)) {
                            updateSelectedDraw({ draw_rotation_deg: v });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        ) : (
          <div className="flex w-10 flex-shrink-0 flex-col border-l border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200"
              title="Show inspector"
              aria-label="Expand right panel"
              onClick={() => setRightPanelOpen(true)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {jsonPanelOpen ? (
      <div
        className="relative flex min-h-0 max-h-[min(360px,45vh)] flex-shrink-0 flex-col overflow-hidden border-t border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
        style={{ height: jsonPanelHeight }}
      >
        <button
          type="button"
          aria-label="Resize JSON panel"
          className="absolute left-0 top-0 z-10 h-1 w-full cursor-row-resize bg-transparent focus:outline-none focus-visible:outline-none"
          onMouseDown={(event) => {
            resizeStateRef.current = {
              mode: "json",
              startX: event.clientX,
              startY: event.clientY,
              leftWidth: leftPanelWidth,
              jsonHeight: jsonPanelHeight,
            };
          }}
        />
        <div className="flex border-b border-neutral-200 dark:border-neutral-dark-200">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-medium ${jsonTab === "preview" ? "border-b-2 border-brand-500 text-brand-600" : "text-neutral-500"}`}
            onClick={() => setJsonTab("preview")}
          >
            JSON preview
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-medium ${jsonTab === "import" ? "border-b-2 border-brand-500 text-brand-600" : "text-neutral-500"}`}
            onClick={() => setJsonTab("import")}
          >
            Import JSON
          </button>
          <button
            type="button"
            className="ml-auto inline-flex items-center px-3 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-dark-600 dark:hover:text-neutral-dark-900"
            title="Close JSON panel"
            onClick={() => setJsonPanelOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 p-2">
          {jsonTab === "preview" ? (
            <div className="flex h-full gap-2">
              <TextArea
                className="h-full min-h-0 flex-1 font-mono text-[11px]"
                value={exportJson}
                readOnly
              />
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={copyPreview}
              >
                <Copy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-2">
              <TextArea
                className="min-h-0 flex-1 font-mono text-[11px]"
                placeholder='{ "data": [ { "node_id": "...", "component_type": "P", ... "children": [] } ] }'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button
                type="button"
                variant="primary"
                className="self-end"
                onClick={applyImport}
              >
                <Upload className="mr-1 h-4 w-4" />
                Apply import
              </Button>
            </div>
          )}
        </div>
      </div>
      ) : (
        <button
          type="button"
          className="absolute bottom-2 right-4 z-20 inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-700 dark:hover:bg-neutral-dark-200"
          onClick={() => setJsonPanelOpen(true)}
        >
          JSON panel
        </button>
      )}
        </div>
      </main>

      <Modal
        open={addPrompt.open}
        onClose={() => setAddPrompt((prev) => ({ ...prev, open: false }))}
        title={`Add ${COMPONENT_TYPE_LABEL_BY_SLUG[addPrompt.kind] ?? addPrompt.kind}`}
        subtitle={
          addPrompt.parentId
            ? "How many components do you want to create after the selected component?"
            : "How many root components do you want to create?"
        }
        icon={Plus}
        centerModal
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="How many components"
            value={addPrompt.quantity}
            min={1}
            onChange={(e) =>
              setAddPrompt((prev) => ({ ...prev, quantity: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setAddPrompt((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={confirmManualAdd}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <GenerateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        targetPlantId={plantId}
        onApply={({ nodes: n, edges: e }) => {
          pushUndoSnapshot();
          const generatedNodes = (n as RFNode[]).map((node) => ({
            ...node,
            data: {
              ...node.data,
              nodeShape: node.data.nodeShape ?? nodeShape,
            },
          }));
          const normalizedEdges = e.map((edge) => ({
            ...edge,
            type: "smartEdge",
            sourceHandle: edge.sourceHandle ?? "s-bottom",
            targetHandle: edge.targetHandle ?? "t-top",
          }));
          setNodes(generatedNodes);
          setEdges(normalizedEdges);
          setTimeout(() => fitView({ padding: 0.2 }), 80);
        }}
      />

      <ConfirmationDialog
        open={confirmLarge}
        title="Create many components?"
        message={`This will create ${pendingCount} components sequentially. Continue?`}
        confirmText="Create all"
        cancelText="Cancel"
        onClose={() => setConfirmLarge(false)}
        onConfirm={() => {
          setConfirmLarge(false);
          void runSubmit();
        }}
      />
    </div>
  );
}

export const SmartPlantCreate: React.FC = () => (
  <ReactFlowProvider>
    <FlowWorkspace />
  </ReactFlowProvider>
);

export default SmartPlantCreate;
