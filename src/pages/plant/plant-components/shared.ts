import React from "react";
import {
    Blocks,
    CircleGauge,
    Cpu,
    Factory,
} from "lucide-react";
import acdbIcon from "@/assets/component-icons/ACDB.svg?raw";
import dcChannelIcon from "@/assets/component-icons/DC Channel.svg?raw";
import inverterIcon from "@/assets/component-icons/Inverter.svg?raw";
import stringIcon from "@/assets/component-icons/String.svg?raw";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import ColorBadge, { type BadgeVariant } from "@/components/common/ColorBadge";
import { flatListToTree, type WithChildren } from "@/utils/flatToTree";
import {
    formatComponentPhaseLabel,
    formatComponentStatusLabel,
    formatComponentTypeLabel,
} from "@/utils/componentFormatters";
import { formateDateTime } from "@/utils/gridFormatters";

const svgMarkupToCurrentColor = (svg: string) =>
    svg.replaceAll(/stroke="white"/g, 'stroke="currentColor"').replaceAll(/fill="white"/g, 'fill="currentColor"');

const COMPONENT_ICON_MARKUP: Partial<Record<string, string>> = {
    AC: svgMarkupToCurrentColor(acdbIcon),
    DC: svgMarkupToCurrentColor(dcChannelIcon),
    INV: svgMarkupToCurrentColor(inverterIcon),
    STR: svgMarkupToCurrentColor(stringIcon),
};

export const DETAIL_FIELD_WIDTH_CLASS = "w-32";

export const CONTROL_SURFACE_CLASS =
    "glass-ui inline-flex items-center border border-white/20 bg-white/10 text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-dark-600";

export const CONTROL_ICON_BUTTON_CLASS =
    "inline-flex h-8 w-8 items-center justify-center rounded-xs text-neutral-500 transition-colors hover:bg-white/20 hover:text-neutral-900 active:scale-95 dark:text-neutral-dark-600 dark:hover:bg-white/10 dark:hover:text-neutral-dark-950";

export const CONTROL_ACTION_BUTTON_CLASS =
    "inline-flex items-center gap-1.5 rounded-xs border px-2.5 text-xs font-medium shadow-sm transition-colors";

export const DETAIL_EXCLUDED_KEYS = new Set<string>([
    "id",
    "component_name",
    "component_type",
    "component_code",
    "serial_number",
    "plant_name",
    "tenant_name",
    "status",
    "is_active",
    "parent_id",
    "parent_component_name",
    "parent_component_code",
    "device_id",
    "device_name",
    "inverter_type_id",
    "inverter_type_name",
    "inverter_type_code",
    "tag_template_id",
    "tag_template_name",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "phase_type",
    "brand",
    "model",
    "mppt_count",
    "strings_per_mppt",
    "module_count",
    "string_length",
    "ct_ratio",
    "channels",
    "area_sqm",
    "vd_number",
    "meter_type",
    "is_bot_layer_process",
    "warranty_start_date",
    "warranty_end_date",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "plant_id",
    "tenant_id",
]);

export function normalizeComponentType(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toUpperCase();
}

/**
 * Normalizes component hierarchy by trusting the `parent_id` from the API.
 * - Plant (type "P") always has parent_id = null (it's the root).
 * - Components with a valid parent_id pointing to an existing row keep their parent as-is.
 * - Orphans (missing or invalid parent_id) are attached to the plant root.
 */
export function normalizeComponentHierarchy(rows: PlantComponentRow[]): PlantComponentRow[] {
    if (rows.length === 0) return rows;

    const rowById = new Map(rows.map((row) => [row.id, row]));
    const plantRoot =
        rows.find((row) => normalizeComponentType(row.component_type) === "P") ?? null;

    return rows.map((row) => {
        const rowType = normalizeComponentType(row.component_type);

        // Plant root has no parent
        if (rowType === "P") return { ...row, parent_id: null };

        // If the component has a valid parent_id that exists in the dataset, keep it
        if (row.parent_id && rowById.has(row.parent_id)) {
            return row;
        }

        // Orphan: no parent_id or parent not in the dataset — attach to plant root
        if (plantRoot) return { ...row, parent_id: plantRoot.id };
        return row;
    });
}

export function flatListToTreeOptions(rows: PlantComponentRow[]) {
    return flatListToTree(rows, {
        idKey: "id",
        parentKey: "parent_id",
        orphanRoots: true,
        sortChildren: (a, b) => {
            const aType = normalizeComponentType(a.component_type);
            const bType = normalizeComponentType(b.component_type);
            if (aType !== bType) return aType.localeCompare(bType);
            return String(a.component_name).localeCompare(String(b.component_name));
        },
    });
}

export function formatKw(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(numericValue)) {
        return `${numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} kW`;
    }
    return `${value} kW`;
}

export function hasDetailValue(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
}

export function getDetailValue<T>(value: T | null | undefined): T | null {
    return value === null || value === undefined || value === "" ? null : value;
}

export function formatKwDetail(value: string | number | null | undefined): string | null {
    return hasDetailValue(value) ? formatKw(value) : null;
}

export function formatDateDetail(value: string | null | undefined): string | null {
    return value ? formateDateTime(value) : null;
}

export function formatGenericValue(value: unknown, key?: string): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "string" && key && (key.endsWith("_at") || key.endsWith("_date"))) {
        return formateDateTime(value);
    }
    return String(value);
}

export function formatFieldLabel(key: string): string {
    return key
        .replace(/_/g, " ")
        .replace(/\bid\b/g, "ID")
        .replace(/\bkw\b/g, "kW")
        .replace(/\bkva\b/g, "kVA")
        .replace(/\bsqm\b/g, "sq m")
        .replace(/\bmppt\b/g, "MPPT")
        .replace(/\bct\b/g, "CT")
        .replace(/\bvd\b/g, "VD")
        .replace(/\bac\b/g, "AC")
        .replace(/\bdc\b/g, "DC")
        .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function InlineComponentAssetIcon({
    markup,
    className,
}: {
    markup: string;
    className: string;
}) {
    return React.createElement("span", {
        "aria-hidden": true,
        className: `inline-flex text-brand-600 dark:text-brand-400 [&>svg]:h-full [&>svg]:w-full ${className}`,
        dangerouslySetInnerHTML: { __html: markup },
    });
}

export function typeIcon(componentType: string, size = "h-3.5 w-3.5"): React.ReactNode {
    const normalizedType = normalizeComponentType(componentType);
    const iconClass = `${size} text-brand-600 dark:text-brand-400`;
    const assetMarkup = COMPONENT_ICON_MARKUP[normalizedType];

    switch (normalizedType) {
        case "P":
            return React.createElement(Factory, { className: iconClass });
        case "B":
            return React.createElement(Blocks, { className: iconClass });
        case "AC":
        case "DC":
        case "INV":
        case "STR":
            return assetMarkup
                ? React.createElement(InlineComponentAssetIcon, { markup: assetMarkup, className: size })
                : React.createElement(Cpu, { className: iconClass });
        case "M":
            return React.createElement(CircleGauge, { className: iconClass });
        default:
            return React.createElement(Cpu, { className: iconClass });
    }
}

export function getComponentTypeInitial(componentType: string | null | undefined): string {
    const normalizedType = normalizeComponentType(componentType);
    if (!normalizedType) return "?";
    return normalizedType.charAt(0);
}

export function getStatusBadgeVariant(status: string | null | undefined): BadgeVariant {
    const normalizedStatus = (status ?? "").toLowerCase();
    if (["active", "operational", "online", "enabled", "commissioned"].includes(normalizedStatus)) {
        return "green";
    }
    if (["maintenance", "warning", "fault", "error"].includes(normalizedStatus)) {
        return "orange";
    }
    if (["inactive", "offline", "disabled", "decommissioned"].includes(normalizedStatus)) {
        return "gray";
    }
    return "gray";
}

export function renderStatusBadge(status: string | null | undefined) {
    if (!status) {
        return React.createElement(
            "span",
            { className: "text-xs text-neutral-300 dark:text-neutral-dark-600" },
            "—",
        );
    }

    return React.createElement(
        ColorBadge,
        {
            variant: getStatusBadgeVariant(status),
            className: "rounded-full px-2 py-0.5",
            children: formatComponentStatusLabel(status) ?? "Unknown",
        },
    );
}

export function getComponentSubtitle(component: PlantComponentRow): string {
    const parts = [
        component.component_code,
        component.plant_name,
        component.tenant_name,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : "Component details";
}

export function createHeroIcon(componentType: string): React.ComponentType<{ className?: string }> {
    return ({ className }) => {
        const sizeClass = className?.includes("w-") || className?.includes("h-")
            ? className
            : `${className ?? ""} h-5 w-5`.trim();
        return React.createElement(React.Fragment, null, typeIcon(componentType, sizeClass));
    };
}

export interface FlatRow {
    node: WithChildren<PlantComponentRow>;
    depth: number;
    hasChildren: boolean;
}

export function flattenVisible(
    nodes: WithChildren<PlantComponentRow>[],
    expandedIds: Set<string>,
    depth = 0,
): FlatRow[] {
    const result: FlatRow[] = [];
    for (const node of nodes) {
        const hasChildren = node.children.length > 0;
        result.push({ node, depth, hasChildren });
        if (hasChildren && expandedIds.has(node.id)) {
            result.push(...flattenVisible(node.children, expandedIds, depth + 1));
        }
    }
    return result;
}

export function flattenAll(nodes: WithChildren<PlantComponentRow>[], depth = 0): FlatRow[] {
    const result: FlatRow[] = [];
    for (const node of nodes) {
        const hasChildren = node.children.length > 0;
        result.push({ node, depth, hasChildren });
        if (hasChildren) result.push(...flattenAll(node.children, depth + 1));
    }
    return result;
}

export function getAllExpandableIds(nodes: WithChildren<PlantComponentRow>[]): string[] {
    const ids: string[] = [];
    const walk = (entries: WithChildren<PlantComponentRow>[]) => {
        for (const entry of entries) {
            if (entry.children.length > 0) {
                ids.push(entry.id);
                walk(entry.children);
            }
        }
    };
    walk(nodes);
    return ids;
}

/** All component ids whose normalized type matches `typeFilter`. */
export function getMatchingComponentIds(
    nodes: WithChildren<PlantComponentRow>[],
    typeFilter: string,
): Set<string> {
    const ids = new Set<string>();
    const walk = (entries: WithChildren<PlantComponentRow>[]) => {
        for (const entry of entries) {
            if (normalizeComponentType(entry.component_type) === typeFilter) {
                ids.add(entry.id);
            }
            if (entry.children.length > 0) walk(entry.children);
        }
    };
    walk(nodes);
    return ids;
}

/** Expandable ancestor ids required to reveal every id in `targetIds`. */
export function getExpandIdsForComponentIds(
    nodes: WithChildren<PlantComponentRow>[],
    targetIds: Set<string>,
): Set<string> {
    const expandIds = new Set<string>();

    const walk = (entries: WithChildren<PlantComponentRow>[]): boolean => {
        let branchHasTarget = false;
        for (const entry of entries) {
            const childHasTarget =
                entry.children.length > 0 ? walk(entry.children) : false;
            const isTarget = targetIds.has(entry.id);
            if (isTarget || childHasTarget) {
                branchHasTarget = true;
                if (entry.children.length > 0) expandIds.add(entry.id);
            }
        }
        return branchHasTarget;
    };

    walk(nodes);
    return expandIds;
}

/** Depth-first first component id for a type (used for scroll / pan). */
export function findFirstMatchingComponentId(
    nodes: WithChildren<PlantComponentRow>[],
    typeFilter: string,
): string | null {
    for (const entry of nodes) {
        if (normalizeComponentType(entry.component_type) === typeFilter) {
            return entry.id;
        }
        if (entry.children.length > 0) {
            const nested = findFirstMatchingComponentId(entry.children, typeFilter);
            if (nested) return nested;
        }
    }
    return null;
}

const DEPTH_ACCENT: Record<number, string> = {
    0: "border-brand-300 dark:border-brand-700",
    1: "border-brand-200 dark:border-brand-800",
    2: "border-neutral-200 dark:border-neutral-dark-400",
};

export function depthAccent(depth: number): string {
    return DEPTH_ACCENT[Math.min(depth, 2)];
}

export interface LayoutRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PositionedNode {
    node: WithChildren<PlantComponentRow>;
    left: number;
    top: number;
}

export interface DiagramLayoutConfig {
    nodeWidth: number;
    nodeHeight: number;
    horizontalGap: number;
    verticalGap: number;
    paddingX: number;
    paddingY: number;
}

export function getLayoutRect(el: HTMLElement, root: HTMLElement): LayoutRect {
    let left = 0;
    let top = 0;
    let node: HTMLElement | null = el;
    while (node && node !== root) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    return { left, top, width: el.offsetWidth, height: el.offsetHeight };
}

export function buildHoverDetails(row: PlantComponentRow): Array<{ label: string; value: string }> {
    const detailByKey: Partial<Record<keyof PlantComponentRow, string | null>> = {
        component_code: row.component_code ?? null,
        serial_number: row.serial_number ?? null,
        plant_name: row.plant_name ?? null,
        tenant_name: row.tenant_name ?? null,
        parent_component_name: row.parent_component_name ?? null,
        parent_component_code: row.parent_component_code ?? null,
        ac_capacity_kw: formatKwDetail(row.ac_capacity_kw),
        dc_capacity_kw: formatKwDetail(row.dc_capacity_kw),
        status: row.status ? formatComponentStatusLabel(row.status) : null,
        phase_type: row.phase_type ? formatComponentPhaseLabel(row.phase_type) : null,
        brand: row.brand ?? null,
        model: row.model ?? null,
        channels: hasDetailValue(row.channels) ? String(row.channels) : null,
        mppt_count: hasDetailValue(row.mppt_count) ? String(row.mppt_count) : null,
        strings_per_mppt: hasDetailValue(row.strings_per_mppt) ? String(row.strings_per_mppt) : null,
        module_count: hasDetailValue(row.module_count) ? String(row.module_count) : null,
        string_length: hasDetailValue(row.string_length) ? String(row.string_length) : null,
        ct_ratio: hasDetailValue(row.ct_ratio) ? String(row.ct_ratio) : null,
        area_sqm: hasDetailValue(row.area_sqm) ? `${row.area_sqm} sq m` : null,
        vd_number: hasDetailValue(row.vd_number) ? String(row.vd_number) : null,
        meter_type: row.meter_type ?? null,
        is_bot_layer_process:
            row.is_bot_layer_process == null ? null : row.is_bot_layer_process ? "Yes" : "No",
        is_active: row.is_active == null ? null : row.is_active ? "Yes" : "No",
        device_name: row.device_name ?? null,
        inverter_type_name: row.inverter_type_name ?? null,
        inverter_type_code: row.inverter_type_code ?? null,
        tag_template_name: row.tag_template_name ?? null,
        warranty_start_date: formatDateDetail(row.warranty_start_date),
        warranty_end_date: formatDateDetail(row.warranty_end_date),
        created_at: formatDateDetail(row.created_at),
        updated_at: formatDateDetail(row.updated_at),
    };

    return Object.entries(detailByKey)
        .filter(([, value]) => hasDetailValue(value))
        .map(([key, value]) => ({
            label: formatFieldLabel(key),
            value: String(value),
        }));
}

export function getDiagramLayoutConfig(componentCount: number): DiagramLayoutConfig {
    if (componentCount >= 300) {
        return {
            nodeWidth: 208,
            nodeHeight: 110,
            horizontalGap: 10,
            verticalGap: 26,
            paddingX: 24,
            paddingY: 24,
        };
    }

    if (componentCount >= 120) {
        return {
            nodeWidth: 232,
            nodeHeight: 130,
            horizontalGap: 14,
            verticalGap: 30,
            paddingX: 28,
            paddingY: 24,
        };
    }

    return {
        nodeWidth: 280,
        nodeHeight: 180,
        horizontalGap: 24,
        verticalGap: 42,
        paddingX: 40,
        paddingY: 28,
    };
}

export function collectEdges(
    roots: WithChildren<PlantComponentRow>[],
): { parentId: string; childIds: string[] }[] {
    const edges: { parentId: string; childIds: string[] }[] = [];
    const walk = (node: WithChildren<PlantComponentRow>) => {
        if (node.children.length > 0) {
            edges.push({
                parentId: node.id,
                childIds: node.children.map((child) => child.id),
            });
            node.children.forEach(walk);
        }
    };
    roots.forEach(walk);
    return edges;
}

export function buildDiagramLayout(
    roots: WithChildren<PlantComponentRow>[],
    config: DiagramLayoutConfig,
) {
    const positionedNodes: PositionedNode[] = [];
    let maxRight = 0;
    let maxBottom = 0;
    const { nodeWidth, nodeHeight, horizontalGap, verticalGap, paddingX, paddingY } = config;

    const measureSubtree = (node: WithChildren<PlantComponentRow>): number => {
        if (node.children.length === 0) return nodeWidth;

        const childWidths = node.children.map(measureSubtree);
        const childrenWidth =
            childWidths.reduce((sum, width) => sum + width, 0) +
            horizontalGap * (childWidths.length - 1);

        return Math.max(nodeWidth, childrenWidth);
    };

    const positionNode = (
        node: WithChildren<PlantComponentRow>,
        depth: number,
        startX: number,
        subtreeWidth: number,
    ) => {
        const nodeLeft = startX + (subtreeWidth - nodeWidth) / 2;
        const nodeTop = depth * (nodeHeight + verticalGap);

        positionedNodes.push({ node, left: nodeLeft, top: nodeTop });
        maxRight = Math.max(maxRight, nodeLeft + nodeWidth);
        maxBottom = Math.max(maxBottom, nodeTop + nodeHeight);

        if (node.children.length > 0) {
            const childWidths = node.children.map(measureSubtree);
            const childrenWidth =
                childWidths.reduce((sum, width) => sum + width, 0) +
                horizontalGap * (childWidths.length - 1);
            const centeredChildrenStartX = startX + (subtreeWidth - childrenWidth) / 2;
            let childCursor = centeredChildrenStartX;

            node.children.forEach((child, index) => {
                const childWidth = childWidths[index];
                positionNode(child, depth + 1, childCursor, childWidth);
                childCursor += childWidth + horizontalGap;
            });
        }
    };

    let rootCursor = 0;
    roots.forEach((root, index) => {
        const rootWidth = measureSubtree(root);
        positionNode(root, 0, rootCursor, rootWidth);
        rootCursor += rootWidth;
        if (index < roots.length - 1) rootCursor += horizontalGap * 2;
    });

    return {
        positionedNodes,
        width: Math.max(maxRight + paddingX * 2, nodeWidth + paddingX * 2),
        height: Math.max(maxBottom + paddingY * 2, nodeHeight + paddingY * 2),
    };
}

export function formatComponentTypeTag(componentType: string) {
    return formatComponentTypeLabel(componentType);
}
