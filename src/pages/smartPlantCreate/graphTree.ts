import type { Edge, Node } from "@xyflow/react";
import type { SmartFlowData } from "./types";

export function buildParentMap(edges: Edge[]): Map<string, string> {
    const m = new Map<string, string>();
    for (const e of edges) {
        if (!m.has(e.target)) m.set(e.target, e.source);
    }
    return m;
}

/** True if `target` can reach `source` by following parent→child edges. */
export function introducesCycle(edges: Edge[], source: string, target: string): boolean {
    const outgoing = new Map<string, string[]>();
    for (const e of edges) {
        if (!outgoing.has(e.source)) outgoing.set(e.source, []);
        outgoing.get(e.source)!.push(e.target);
    }
    const stack = [target];
    const seen = new Set<string>();
    while (stack.length) {
        const n = stack.pop()!;
        if (n === source) return true;
        if (seen.has(n)) continue;
        seen.add(n);
        for (const c of outgoing.get(n) ?? []) stack.push(c);
    }
    return false;
}

export function getRoots(nodes: Node<SmartFlowData>[], parentMap: Map<string, string>): Node<SmartFlowData>[] {
    return nodes.filter((n) => !parentMap.has(n.id));
}

/** Pre-order: every parent before its descendants (for sequential POST). */
export function buildCreationOrder(
    nodes: Node<SmartFlowData>[],
    parentMap: Map<string, string>,
): Node<SmartFlowData>[] {
    const idToNode = new Map(nodes.map((n) => [n.id, n] as const));
    const roots = nodes.filter((n) => !parentMap.has(n.id));
    const childrenByParent = new Map<string, Node<SmartFlowData>[]>();
    for (const n of nodes) {
        const p = parentMap.get(n.id);
        if (!p) continue;
        if (!childrenByParent.has(p)) childrenByParent.set(p, []);
        childrenByParent.get(p)!.push(n);
    }
    for (const [, arr] of childrenByParent) {
        arr.sort((a, b) => {
            const dy = a.position.y - b.position.y;
            if (Math.abs(dy) > 0.5) return dy;
            return a.position.x - b.position.x;
        });
    }
    const out: Node<SmartFlowData>[] = [];
    const walk = (id: string) => {
        const node = idToNode.get(id);
        if (!node) return;
        out.push(node);
        const ch = childrenByParent.get(id) ?? [];
        for (const c of ch) walk(c.id);
    };
    for (const r of roots) walk(r.id);
    return out;
}
