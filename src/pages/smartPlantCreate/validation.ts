import type { Edge, Node } from "@xyflow/react";
import { getPayloadKeysForComponentType, type ExportNode } from "./buildPayload";
import { buildParentMap } from "./graphTree";
import { isFiniteNumberLike, PAYLOAD_NUMERIC_FIELD_KEYS } from "./numericFields";
import type { SmartFlowData } from "./types";

const isMeaningfulValue = (value: unknown) =>
    value !== undefined && value !== null && value !== "";

export function validateSmartPlantExportTree(roots: ExportNode[]): string | null {
    if (roots.length !== 1) {
        return "Smart plant submit expects exactly one root tree (one plant). Connect all nodes under the plant or use a single root in the export.";
    }
    const root = roots[0];
    if (root.component_type !== "P") {
        return "The root component must be plant type (P).";
    }

    const walk = (n: ExportNode): string | null => {
        const name = typeof n.component_name === "string" ? n.component_name.trim() : "";
        const type = String(n.component_type ?? "").trim();
        const payloadKeys = new Set(getPayloadKeysForComponentType(type));

        if (!type) {
            return 'Component type is required for every node.';
        }
        if (!name) {
            return `Component name is required for ${type}.`;
        }
        const code = typeof n.component_code === "string" ? n.component_code.trim() : "";
        if (!code) {
            return `Component code is required for "${name || type}".`;
        }
        if (payloadKeys.has("vd_number")) {
            if (n.vd_number === undefined || n.vd_number === null || Number.isNaN(Number(n.vd_number))) {
                return `VD number is required for "${name}" (${type}).`;
            }
        }

        if (payloadKeys.has("device_id") && payloadKeys.has("tag_template_id")) {
            if (!n.device_id || !n.tag_template_id) {
                return `"${name}" (${type}) requires device and tag template.`;
            }
        }

        for (const key of payloadKeys) {
            if (!PAYLOAD_NUMERIC_FIELD_KEYS.has(key)) continue;
            const v = (n as Record<string, unknown>)[key];
            if (!isMeaningfulValue(v)) continue;
            if (!isFiniteNumberLike(v)) {
                return `"${key}" must be a valid number for "${name}" (${type}).`;
            }
        }

        for (const c of n.children ?? []) {
            const err = walk(c);
            if (err) return err;
        }
        return null;
    };

    return walk(root);
}

export function validateBoardGraph(nodes: Node<SmartFlowData>[], edges: Edge[]): string | null {
    const parents = buildParentMap(edges);
    const plants = nodes.filter((n) => n.data.kind === "plant");
    if (plants.length !== 1) return "The board must contain exactly one Plant node.";
    for (const n of nodes) {
        if (n.data.kind === "plant") continue;
        if (n.type === "smartAnnot" || n.type === "smartDraw") continue;
        if (!parents.has(n.id)) {
            return `Connect "${n.data.draft.component_name || "node"}" to a parent (drag from parent bottom handle to child top).`;
        }
    }
    return null;
}
