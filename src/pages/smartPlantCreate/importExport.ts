/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { newFlowNodeId } from "@/utils/flowNodeId";
import { coerceComponentKind } from "./constants";
import type { ExportNode } from "./buildPayload";
import type { NodeDraftFields } from "./types";
import type { SmartFlowData } from "./types";

function draftFromExportRow(row: Record<string, any>): NodeDraftFields {
    return {
        component_name: String(row.component_name ?? ""),
        component_code: String(row.component_code ?? ""),
        component_label: row.component_label ? String(row.component_label) : undefined,
        serial_number: row.serial_number ? String(row.serial_number) : undefined,
        display_order: row.display_order != null ? Number(row.display_order) : null,
        device_id: row.device_id ? String(row.device_id) : null,
        inverter_type_id: row.inverter_type_id ? String(row.inverter_type_id) : null,
        tag_template_id: row.tag_template_id ? String(row.tag_template_id) : null,
        vd_number: row.vd_number != null ? Number(row.vd_number) : null,
        ac_capacity_kw: row.ac_capacity_kw != null ? Number(row.ac_capacity_kw) : null,
        dc_capacity_kw: row.dc_capacity_kw != null ? Number(row.dc_capacity_kw) : null,
        brand: row.brand ? String(row.brand) : undefined,
        model: row.model ? String(row.model) : undefined,
        mppt_count: row.mppt_count != null ? Number(row.mppt_count) : null,
        strings_per_mppt: row.strings_per_mppt != null ? Number(row.strings_per_mppt) : null,
        phase_type: row.phase_type ? String(row.phase_type) : undefined,
        module_count: row.module_count != null ? Number(row.module_count) : null,
        string_length: row.string_length != null ? Number(row.string_length) : null,
        ct_ratio: row.ct_ratio != null ? Number(row.ct_ratio) : null,
        rating_a: row.rating_a != null ? Number(row.rating_a) : null,
        channels: row.channels != null ? Number(row.channels) : null,
        area_sqm: row.area_sqm != null ? Number(row.area_sqm) : null,
        warranty_start_date: row.warranty_start_date ? String(row.warranty_start_date) : null,
        warranty_end_date: row.warranty_end_date ? String(row.warranty_end_date) : null,
        is_active: row.is_active !== false,
        status: row.status ? String(row.status) : "active",
    };
}

function makeEdge(a: string, b: string): Edge {
    return {
        id: `e-${a}-${b}`,
        source: a,
        target: b,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#e97124" },
        style: { stroke: "#e97124", strokeWidth: 2, strokeDasharray: "7 5" },
    };
}

/** Import nested `{ data: [...] }` trees with optional `node_id` per node. */
export function nestedExportToGraph(
    roots: ExportNode[],
): { nodes: Node<SmartFlowData>[]; edges: Edge[] } {
    const nodes: Node<SmartFlowData>[] = [];
    const edges: Edge[] = [];

    const walk = (row: ExportNode, parentId: string | null, depth: number, siblingIndex: number) => {
        const id = (row as any).node_id ? String((row as any).node_id) : newFlowNodeId();
        const kind = coerceComponentKind(String((row as any).component_type ?? "others"));
        const data: SmartFlowData = {
            kind,
            draft: draftFromExportRow(row as any),
        };
        const x = 80 + siblingIndex * 200 + depth * 40;
        const y = 40 + depth * 120;
        nodes.push({
            id,
            type: "smartCmp",
            position: { x, y },
            data,
        });
        if (parentId) edges.push(makeEdge(parentId, id));
        const ch = row.children ?? [];
        ch.forEach((c, i) => walk(c, id, depth + 1, i));
    };

    roots.forEach((r, i) => walk(r, null, 0, i));
    return { nodes, edges };
}

/** Parse user JSON: accepts `{ data: [...] }` or a bare array. */
export function parseImportPayload(json: string): { roots: ExportNode[] } | { error: string } {
    try {
        const parsed = JSON.parse(json) as any;
        const arr = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : null;
        if (!arr) return { error: 'Expected `{ "data": [ ... ] }` or a top-level array.' };
        return { roots: arr as ExportNode[] };
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Invalid JSON" };
    }
}
