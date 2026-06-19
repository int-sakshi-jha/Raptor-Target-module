import type { Node } from "@xyflow/react";
import { slugToApiType } from "./constants";
import { PAYLOAD_NUMERIC_FIELD_KEYS } from "./numericFields";
import type { SmartFlowData } from "./types";

export type ExportNode = {
    node_id: string;
    component_type: string;
    parent_node_id: string | null;
    children?: ExportNode[];
} & Record<string, unknown>;

export function buildExportTree(
    ordered: Node<SmartFlowData>[],
    parentMap: Map<string, string>,
): ExportNode[] {
    const idToExport = new Map<string, ExportNode>();

    for (const n of ordered) {
        const api = slugToApiType(n.data.kind);
        const d = n.data.draft;
        const row: ExportNode = {
            node_id: n.id,
            parent_node_id: parentMap.get(n.id) ?? null,
            component_type: api,
            component_name: d.component_name,
            component_code: d.component_code,
            serial_number: d.serial_number,
            device_id: d.device_id,
            inverter_type_id: d.inverter_type_id,
            tag_template_id: d.tag_template_id,
            vd_number: d.vd_number,
            ac_capacity_kw: d.ac_capacity_kw,
            dc_capacity_kw: d.dc_capacity_kw,
            brand: d.brand,
            model: d.model,
            mppt_count: d.mppt_count,
            strings_per_mppt: d.strings_per_mppt,
            phase_type: d.phase_type,
            module_count: d.module_count,
            string_length: d.string_length,
            ct_ratio: d.ct_ratio,
            rating_a: d.rating_a,
            channels: d.channels,
            area_sqm: d.area_sqm,
            warranty_start_date: d.warranty_start_date,
            warranty_end_date: d.warranty_end_date,
            is_active: d.is_active ?? true,
            status: d.status ?? "active",
        };
        idToExport.set(n.id, row);
    }

    const roots: ExportNode[] = [];
    for (const n of ordered) {
        const ex = idToExport.get(n.id);
        if (!ex) continue;
        const p = parentMap.get(n.id);
        if (!p) {
            roots.push(ex);
            continue;
        }
        const parent = idToExport.get(p);
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(ex);
        }
    }

    return roots;
}

/** Fields sent per `component_type` for smart plant create (aligned with platform hierarchy JSON). */
export const PAYLOAD_FIELDS_BY_TYPE: Record<string, string[]> = {
    P: [
        "component_name",
        "component_code",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "module_count",
        "area_sqm",
        "is_active",
        "status",
    ],
    B: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "module_count",
        "area_sqm",
        "rating_a",
        "is_active",
        "status",
    ],
    INV: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "inverter_type_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "brand",
        "model",
        "phase_type",
        "mppt_count",
        "strings_per_mppt",
        "ct_ratio",
        "rating_a",
        "channels",
        "warranty_start_date",
        "warranty_end_date",
        "is_active",
        "status",
    ],
    STR: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "channels",
        "is_active",
        "status",
    ],
    M: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "warranty_start_date",
        "warranty_end_date",
        "is_active",
        "status",
    ],
    AC: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "inverter_type_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "is_active",
        "status",
    ],
    DC: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "inverter_type_id",
        "tag_template_id",
        "vd_number",
        "dc_capacity_kw",
        "string_length",
        "ct_ratio",
        "rating_a",
        "channels",
        "is_active",
        "status",
    ],
    WS: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "warranty_start_date",
        "warranty_end_date",
        "is_active",
        "status",
    ],
    T: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "is_active",
        "status",
    ],
    SCB: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "is_active",
        "status",
    ],
    ICB: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "is_active",
        "status",
    ],
    O: [
        "component_name",
        "component_code",
        "display_order",
        "serial_number",
        "device_id",
        "tag_template_id",
        "vd_number",
        "ac_capacity_kw",
        "dc_capacity_kw",
        "is_active",
        "status",
    ],
};

export function getPayloadKeysForComponentType(componentType: string): string[] {
    return PAYLOAD_FIELDS_BY_TYPE[componentType] ?? GENERIC_FIELDS;
}

export function componentTypeIncludesPayloadField(componentType: string, field: string): boolean {
    return getPayloadKeysForComponentType(componentType).includes(field);
}

/** Used when `component_type` is unknown at export time. */

const GENERIC_FIELDS = [
    "component_name",
    "component_code",
    "serial_number",
    "display_order",
    "device_id",
    "inverter_type_id",
    "tag_template_id",
    "vd_number",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "brand",
    "model",
    "mppt_count",
    "strings_per_mppt",
    "phase_type",
    "module_count",
    "string_length",
    "ct_ratio",
    "rating_a",
    "channels",
    "area_sqm",
    "warranty_start_date",
    "warranty_end_date",
    "is_active",
    "status",
];

const isMeaningful = (value: unknown) => value !== undefined && value !== null && value !== "";
const toSafeString = (value: unknown, fallback: string) =>
    typeof value === "string" || typeof value === "number" ? String(value) : fallback;

/** API body for smart plant create — strips graph metadata and keeps only component fields. */
export function toSmartPlantApiPayload(roots: ExportNode[]): { data: Record<string, unknown>[] } {
    const mapNode = (node: ExportNode, siblingIndex: number): Record<string, unknown> => {
        const componentType = String(node.component_type ?? "O");
        const keys = PAYLOAD_FIELDS_BY_TYPE[componentType] ?? GENERIC_FIELDS;
        const out: Record<string, unknown> = {
            component_type: componentType,
            component_name: toSafeString(node.component_name, componentType),
        };

        for (const key of keys) {
            if (key === "component_name") continue;
            if (key === "display_order") {
                out[key] = siblingIndex + 1;
                continue;
            }
            const value = node[key];
            if (!isMeaningful(value)) continue;
            if (PAYLOAD_NUMERIC_FIELD_KEYS.has(key)) {
                const n = Number(value);
                if (!Number.isFinite(n)) continue;
                out[key] = n;
                continue;
            }
            out[key] = value;
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            out.children = node.children.map((child, i) => mapNode(child, i));
        }

        return out;
    };

    return { data: roots.map((root, rootIndex) => mapNode(root, rootIndex)) };
}
