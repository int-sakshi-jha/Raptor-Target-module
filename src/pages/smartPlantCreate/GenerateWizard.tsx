import React, { useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect from "@/components/common/AsyncSelect";
import type { Option } from "@/components/common/AsyncSelect";
import SectionHeader from "@/components/common/SectionHeader";
import CommonDateRangeSelector from "@/components/common/CommonDataRangeSelector";
import { VD_NUMBER_OPTIONS, VD_NUMBER_MIN, VD_NUMBER_MAX } from "@/constants/vdNumber";
import { fetchComponentRowsForPlant } from "@/services/operations/componentAPI";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import {
    fetchInverterTypeDisplayLabelById,
    fetchInverterTypeNames,
} from "@/services/operations/inverterTypeAPI";
import { newFlowNodeId } from "@/utils/flowNodeId";
import { PHASE_TYPE, STATUS, type ComponentKindSlug } from "./constants";
import type { SmartFlowData } from "./types";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { buildKindDefaultsFromSampleRows, type KindDefaultsMap } from "./wizardSeed";
import { parseOptionalFiniteNumber } from "./numericFields";
import { warrantyRangeFromFields } from "./warrantyDateRange";

/** When the prefix field is empty, codes use a short slug from the plant component name. */
function deriveCodePrefixFromPlantName(plantName: string): string {
    const t = plantName.trim();
    if (!t) return "SPC-";
    const slug = t
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const base = slug.slice(0, 12);
    return base ? `${base}-` : "SPC-";
}

/** Estimated node footprint + gaps — layout is computed in layers so tiers don’t overlap. */
const G = {
    /** Prefer at least one node width + margin between sibling left edges (see MIN_H_STEP). */
    METER_X_GAP: 260,
    BLOCK_X_GAP: 320,
    ACDB_X_GAP: 260,
    INV_X_GAP: 260,
    /** Rough card size on the board (must match `generatedNodeStyle()`). */
    NODE_W: 220,
    NODE_H: 112,
    LAYER_GAP: 56,
    PLANT_CENTER_X: 520,
};

/** Minimum delta between adjacent nodes’ left edges (horizontal) or top edges (vertical); prevents overlap for 220×112 frames. */
const MIN_H_STEP = G.NODE_W + 28;
const MIN_V_STEP = G.NODE_H + 28;

type AxisDirection = "horizontal" | "vertical";

const layerDown = (y: number) => y + G.NODE_H + G.LAYER_GAP;

/** Vertical offset from inverter top to first DCDB row (must match placement below). */
const DCDB_BELOW_INV = G.NODE_H + G.LAYER_GAP * 0.65;

/** Native selects — fixed row height to align with wizard AsyncSelect overrides below. */
const wizardSelectClassName = "input h-10 min-h-[2.5rem] w-full box-border";

const spreadAxisPositions = (
    centerX: number,
    centerY: number,
    count: number,
    gap: number,
    direction: AxisDirection,
) => {
    const positions: Array<{ x: number; y: number }> = [];
    if (count < 1) return positions;
    const minGap =
        direction === "horizontal" ? Math.max(gap, MIN_H_STEP) : Math.max(gap, MIN_V_STEP);
    const offsetStart = -((count - 1) * minGap) / 2;
    for (let index = 0; index < count; index++) {
        const offset = offsetStart + index * minGap;
        positions.push(
            direction === "horizontal"
                ? { x: centerX + offset, y: centerY }
                : { x: centerX, y: centerY + offset },
        );
    }
    return positions;
};

/**
 * DCDB (and similar) clusters: grows with count — near-square grid for "horizontal",
 * taller grid for "vertical". Strides are ≥ node size so cards never overlap.
 * `centerX` is the desired horizontal center of the cluster (e.g. inverter card center);
 * node `position.x` values are top-left, so startX accounts for NODE_W.
 */
const spreadWrappedPositions = (
    centerX: number,
    startY: number,
    count: number,
    direction: AxisDirection,
): { positions: Array<{ x: number; y: number }>; bandHeight: number } => {
    const positions: Array<{ x: number; y: number }> = [];
    if (count < 1) return { positions, bandHeight: 0 };

    /** Extra gap so wrapped grids never touch even with long labels inside fixed frame. */
    const strideX = G.NODE_W + 56;
    const strideY = G.NODE_H + 56;

    if (direction === "horizontal") {
        const cols = Math.min(count, Math.max(1, Math.ceil(Math.sqrt(count * 1.2))));
        let maxCol = 0;
        for (let index = 0; index < count; index++) {
            maxCol = Math.max(maxCol, index % cols);
        }
        const startX = centerX - (maxCol * strideX + G.NODE_W) / 2;
        for (let index = 0; index < count; index++) {
            const row = Math.floor(index / cols);
            const col = index % cols;
            positions.push({
                x: startX + col * strideX,
                y: startY + row * strideY,
            });
        }
        const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) : startY;
        const bandHeight = maxY - startY + G.NODE_H;
        return { positions, bandHeight };
    }

    const cols = Math.min(count, Math.max(1, Math.ceil(Math.sqrt(count / 2.2))));
    const rows = Math.ceil(count / cols);
    let maxCol = 0;
    for (let index = 0; index < count; index++) {
        maxCol = Math.max(maxCol, Math.floor(index / rows));
    }
    const startX = centerX - (maxCol * strideX + G.NODE_W) / 2;
    for (let index = 0; index < count; index++) {
        const col = Math.floor(index / rows);
        const row = index % rows;
        positions.push({
            x: startX + col * strideX,
            y: startY + row * strideY,
        });
    }
    const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) : startY;
    const bandHeight = maxY - startY + G.NODE_H;
    return { positions, bandHeight };
};

/** Every generated node uses this frame so layout gaps match rendered size (avoids content-driven overlap). */
const generatedNodeStyle = (): { width: number; height: number } => ({
    width: G.NODE_W,
    height: G.NODE_H,
});

/** Bounding width/height of a wrapped cluster (for spacing sibling inverters). */
function measureWrappedClusterBounds(count: number, direction: AxisDirection): { width: number; height: number } {
    const { positions } = spreadWrappedPositions(0, 0, count, direction);
    if (!positions.length) return { width: G.NODE_W, height: G.NODE_H };
    let minX = Infinity;
    let maxR = -Infinity;
    let minY = Infinity;
    let maxB = -Infinity;
    for (const p of positions) {
        minX = Math.min(minX, p.x);
        maxR = Math.max(maxR, p.x + G.NODE_W);
        minY = Math.min(minY, p.y);
        maxB = Math.max(maxB, p.y + G.NODE_H);
    }
    return { width: maxR - minX, height: maxB - minY };
}

/** Max horizontal extent of one parent’s inverter row + DCDB area (for spacing columns of blocks/ACDBs). */
function measureInverterSubtreeWidth(
    invertersPerParent: number,
    invGapHorizontal: number,
    dcOrInvSpanWidth: number,
    inverterDirection: AxisDirection,
): number {
    const n = invertersPerParent;
    if (n < 1) return G.NODE_W;
    /** One column’s horizontal footprint is the wider of inverter card or DC cluster under it. */
    const columnSpan = Math.max(G.NODE_W, dcOrInvSpanWidth);
    if (inverterDirection === "horizontal") {
        return (n - 1) * invGapHorizontal + columnSpan;
    }
    return columnSpan;
}

function makeEdge(a: string, b: string): Edge {
    return {
        id: `e-${a}-${b}`,
        source: a,
        target: b,
        sourceHandle: "s-bottom",
        targetHandle: "t-top",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#e97124" },
        style: { stroke: "#e97124", strokeWidth: 2, strokeDasharray: "7 5" },
    };
}

function buildDraft(
    kind: ComponentKindSlug,
    name: string,
    code: string,
    defaults: KindDefaultsMap,
    vdNumber?: number | null,
): SmartFlowData {
    const base = { ...(defaults[kind] ?? {}) };
    const vd = vdNumber ?? base.vd_number;
    return {
        kind,
        draft: {
            component_name: name,
            component_code: code,
            is_active: true,
            status: STATUS.ACTIVE,
            ...base,
            ...(vd !== undefined && vd !== null ? { vd_number: vd } : {}),
        },
    };
}

type LayoutAcc = {
    nodes: Node<SmartFlowData>[];
    edges: Edge[];
};

type BaseParent = { id: string; x: number; blockIndex: number };
type AcdbParent = { id: string; x: number; blockIndex: number; acdbIndex: number };
type InverterParent = { id: string; x: number; keyA: number; keyB: number };
type InverterNode = { id: string; x: number; y: number; keyA: number; keyB: number; keyC: number };

function computeLayoutGaps(params: {
    dcdbPerInverter: number;
    dcdbDirection: AxisDirection;
    invertersPerParent: number;
    inverterDirection: AxisDirection;
}): {
    blockGap: number;
    acdbGap: number;
    invGapHorizontal: number;
    invGapVertical: number;
} {
    const { dcdbPerInverter, dcdbDirection, invertersPerParent, inverterDirection } = params;
    const dcClusterBounds =
        dcdbPerInverter > 0
            ? measureWrappedClusterBounds(dcdbPerInverter, dcdbDirection)
            : { width: G.NODE_W, height: G.NODE_H };
    const invGapHorizontal =
        dcdbPerInverter > 0
            ? Math.max(MIN_H_STEP, G.INV_X_GAP, dcClusterBounds.width + 96)
            : Math.max(MIN_H_STEP, G.INV_X_GAP);
    const invGapVertical =
        dcdbPerInverter > 0
            ? Math.max(MIN_V_STEP, DCDB_BELOW_INV + dcClusterBounds.height + 48)
            : MIN_V_STEP;
    const dcSpanWidth = dcdbPerInverter > 0 ? dcClusterBounds.width : G.NODE_W;
    const inverterSubtreeWidth = measureInverterSubtreeWidth(
        invertersPerParent,
        invGapHorizontal,
        dcSpanWidth,
        inverterDirection,
    );
    const blockGapMin = Math.max(G.BLOCK_X_GAP, MIN_H_STEP);
    const acdbGapMin = Math.max(G.ACDB_X_GAP, MIN_H_STEP);
    const blockGap =
        invertersPerParent > 0 ? Math.max(blockGapMin, inverterSubtreeWidth + 96) : blockGapMin;
    const acdbGap =
        invertersPerParent > 0 ? Math.max(acdbGapMin, inverterSubtreeWidth + 80) : acdbGapMin;
    return { blockGap, acdbGap, invGapHorizontal, invGapVertical };
}

function pushPlantChildRow(
    acc: LayoutAcc,
    args: {
        plantId: string;
        cx: number;
        rowY: number;
        kind: ComponentKindSlug;
        count: number;
        gap: number;
        codePrefix: string;
        px: (s: string) => string;
        kindDefaults: KindDefaultsMap;
    },
): number {
    const { plantId, cx, rowY, kind, count, gap, codePrefix, px, kindDefaults } = args;
    if (count < 1) return rowY;
    const g = Math.max(gap, MIN_H_STEP);
    const rowWidth = (count - 1) * g;
    const startX = cx - rowWidth / 2;
    for (let idx = 1; idx <= count; idx++) {
        const nid = newFlowNodeId();
        acc.nodes.push({
            id: nid,
            type: "smartCmp",
            position: { x: startX + (idx - 1) * g, y: rowY },
            style: generatedNodeStyle(),
            data: buildDraft(kind, px(`${kind}-${idx}`), px(`${codePrefix}-${idx}`), kindDefaults),
        });
        acc.edges.push(makeEdge(plantId, nid));
    }
    return layerDown(rowY);
}

function appendPlantAccessoryRows(
    acc: LayoutAcc,
    cx: number,
    plantId: string,
    px: (s: string) => string,
    kindDefaults: KindDefaultsMap,
    yStart: number,
    counts: {
        plantMeters: number;
        transformerAtPlant: number;
        weatherStationAtPlant: number;
        scbAtPlant: number;
        icbAtPlant: number;
        stringAtPlant: number;
        othersAtPlant: number;
    },
): number {
    let y = yStart;
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "meter",
        count: counts.plantMeters,
        gap: G.METER_X_GAP,
        codePrefix: "M-PM",
        px,
        kindDefaults,
    });
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "transformer",
        count: counts.transformerAtPlant,
        gap: 260,
        codePrefix: "T",
        px,
        kindDefaults,
    });
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "weather_station",
        count: counts.weatherStationAtPlant,
        gap: 220,
        codePrefix: "WS",
        px,
        kindDefaults,
    });
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "scb",
        count: counts.scbAtPlant,
        gap: 220,
        codePrefix: "SCB",
        px,
        kindDefaults,
    });
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "icb",
        count: counts.icbAtPlant,
        gap: 220,
        codePrefix: "ICB",
        px,
        kindDefaults,
    });
    y = pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "string",
        count: counts.stringAtPlant,
        gap: 220,
        codePrefix: "STR",
        px,
        kindDefaults,
    });
    return pushPlantChildRow(acc, {
        plantId,
        cx,
        rowY: y,
        kind: "others",
        count: counts.othersAtPlant,
        gap: 220,
        codePrefix: "O",
        px,
        kindDefaults,
    });
}

function appendBlockLayer(
    acc: LayoutAcc,
    args: {
        plantId: string;
        cx: number;
        yCursor: number;
        blockCount: number;
        blockGap: number;
        px: (s: string) => string;
        kindDefaults: KindDefaultsMap;
    },
): { baseParents: BaseParent[]; yCursor: number } {
    const { plantId, cx, yCursor, blockCount, blockGap, px, kindDefaults } = args;
    const baseParents: BaseParent[] = [];
    if (blockCount <= 0) {
        baseParents.push({ id: plantId, x: cx, blockIndex: 0 });
        return { baseParents, yCursor };
    }
    const bg = Math.max(blockGap, MIN_H_STEP);
    const blockStartX = cx - ((blockCount - 1) * bg) / 2;
    for (let b = 1; b <= blockCount; b++) {
        const bid = newFlowNodeId();
        const bx = blockStartX + (b - 1) * bg;
        acc.nodes.push({
            id: bid,
            type: "smartCmp",
            position: { x: bx, y: yCursor },
            style: generatedNodeStyle(),
            data: buildDraft("block", px(`block-${b}`), px(`B-${b}`), kindDefaults),
        });
        acc.edges.push(makeEdge(plantId, bid));
        baseParents.push({ id: bid, x: bx, blockIndex: b });
    }
    return { baseParents, yCursor: layerDown(yCursor) };
}

function appendAcdbLayer(
    acc: LayoutAcc,
    baseParents: BaseParent[],
    yAcdb: number,
    acdbPerBlock: number,
    acdbGap: number,
    px: (s: string) => string,
    kindDefaults: KindDefaultsMap,
): { acdbParents: AcdbParent[]; yCursor: number } {
    const acdbParents: AcdbParent[] = [];
    if (acdbPerBlock <= 0) {
        return { acdbParents, yCursor: yAcdb };
    }
    const ag = Math.max(acdbGap, MIN_H_STEP);
    for (const parent of baseParents) {
        const rowWidth = (acdbPerBlock - 1) * ag;
        const startX = parent.x - rowWidth / 2;
        for (let a = 1; a <= acdbPerBlock; a++) {
            const aid = newFlowNodeId();
            const ax = startX + (a - 1) * ag;
            acc.nodes.push({
                id: aid,
                type: "smartCmp",
                position: { x: ax, y: yAcdb },
                style: generatedNodeStyle(),
                data: buildDraft(
                    "acdb",
                    px(`acdb-${parent.blockIndex || 1}-${a}`),
                    px(`AC-${parent.blockIndex || 1}-${a}`),
                    kindDefaults,
                ),
            });
            acc.edges.push(makeEdge(parent.id, aid));
            acdbParents.push({ id: aid, x: ax, blockIndex: parent.blockIndex || 1, acdbIndex: a });
        }
    }
    return { acdbParents, yCursor: layerDown(yAcdb) };
}

function inverterParentsFrom(acdbParents: AcdbParent[], baseParents: BaseParent[]): InverterParent[] {
    if (acdbParents.length > 0) {
        return acdbParents.map((entry) => ({
            id: entry.id,
            x: entry.x,
            keyA: entry.blockIndex,
            keyB: entry.acdbIndex,
        }));
    }
    return baseParents.map((entry) => ({
        id: entry.id,
        x: entry.x,
        keyA: entry.blockIndex || 1,
        keyB: 0,
    }));
}

function appendInverterLayer(
    acc: LayoutAcc,
    parents: InverterParent[],
    args: {
        inverterBaseY: number;
        invertersPerParent: number;
        invGapHorizontal: number;
        invGapVertical: number;
        inverterDirection: AxisDirection;
        px: (s: string) => string;
        kindDefaults: KindDefaultsMap;
        vdAutoIncrement: boolean;
        vdCounter: { value: number };
    },
): { inverterNodes: InverterNode[]; yCursor: number } {
    const {
        inverterBaseY,
        invertersPerParent,
        invGapHorizontal,
        invGapVertical,
        inverterDirection,
        px,
        kindDefaults,
        vdAutoIncrement,
        vdCounter,
    } = args;
    const inverterNodes: InverterNode[] = [];
    let inverterExtentBottom = inverterBaseY + G.NODE_H;
    if (invertersPerParent <= 0) {
        return { inverterNodes, yCursor: inverterBaseY };
    }
    for (const parent of parents) {
        const invGap = inverterDirection === "horizontal" ? invGapHorizontal : invGapVertical;
        const inverterPositions = spreadAxisPositions(
            parent.x,
            inverterBaseY,
            invertersPerParent,
            invGap,
            inverterDirection,
        );
        for (let i = 1; i <= inverterPositions.length; i++) {
            const position = inverterPositions[i - 1];
            if (!position) continue;
            const iid = newFlowNodeId();
            const inverterVd = vdAutoIncrement ? vdCounter.value++ : kindDefaults.inverter?.vd_number ?? null;
            acc.nodes.push({
                id: iid,
                type: "smartCmp",
                position,
                style: generatedNodeStyle(),
                data: buildDraft(
                    "inverter",
                    px(`inv-${parent.keyA}-${parent.keyB || 1}-${i}`),
                    px(`INV-${parent.keyA}-${parent.keyB || 1}-${i}`),
                    kindDefaults,
                    inverterVd,
                ),
            });
            acc.edges.push(makeEdge(parent.id, iid));
            inverterNodes.push({
                id: iid,
                x: position.x,
                y: position.y,
                keyA: parent.keyA,
                keyB: parent.keyB,
                keyC: i,
            });
            inverterExtentBottom = Math.max(inverterExtentBottom, position.y + G.NODE_H);
        }
    }
    return { inverterNodes, yCursor: inverterExtentBottom + G.LAYER_GAP };
}

function appendDcdbLayer(
    acc: LayoutAcc,
    inverterNodes: InverterNode[],
    args: {
        dcdbPerInverter: number;
        dcdbDirection: AxisDirection;
        px: (s: string) => string;
        kindDefaults: KindDefaultsMap;
        vdAutoIncrement: boolean;
    },
): void {
    const { dcdbPerInverter, dcdbDirection, px, kindDefaults, vdAutoIncrement } = args;
    if (dcdbPerInverter <= 0) return;
    for (const inv of inverterNodes) {
        const invCenterX = inv.x + G.NODE_W / 2;
        const { positions: dcdbPositions } = spreadWrappedPositions(
            invCenterX,
            inv.y + DCDB_BELOW_INV,
            dcdbPerInverter,
            dcdbDirection,
        );
        for (let d = 1; d <= dcdbPositions.length; d++) {
            const position = dcdbPositions[d - 1];
            if (!position) continue;
            const did = newFlowNodeId();
            acc.nodes.push({
                id: did,
                type: "smartCmp",
                position,
                style: generatedNodeStyle(),
                data: buildDraft(
                    "dcdb",
                    px(`dc-${inv.keyA}-${inv.keyB || 1}-${inv.keyC}-${d}`),
                    px(`DC-${inv.keyA}-${inv.keyB || 1}-${inv.keyC}-${d}`),
                    kindDefaults,
                    vdAutoIncrement ? d : kindDefaults.dcdb?.vd_number ?? null,
                ),
            });
            acc.edges.push(makeEdge(inv.id, did));
        }
    }
}

export function generateLayoutFromCounts(opts: {
    plantName: string;
    blockCount: number;
    acdbPerBlock: number;
    invertersPerParent: number;
    dcdbPerInverter: number;
    plantMeters: number;
    transformerAtPlant: number;
    weatherStationAtPlant: number;
    scbAtPlant: number;
    icbAtPlant: number;
    stringAtPlant: number;
    othersAtPlant: number;
    inverterDirection: AxisDirection;
    dcdbDirection: AxisDirection;
    namePrefix: string;
    kindDefaults: KindDefaultsMap;
    vdStart: number;
    vdAutoIncrement: boolean;
}): { nodes: Node<SmartFlowData>[]; edges: Edge[] } {
    const {
        plantName,
        blockCount,
        acdbPerBlock,
        invertersPerParent,
        dcdbPerInverter,
        plantMeters,
        transformerAtPlant,
        weatherStationAtPlant,
        scbAtPlant,
        icbAtPlant,
        stringAtPlant,
        othersAtPlant,
        inverterDirection,
        dcdbDirection,
        namePrefix,
        kindDefaults,
        vdStart,
        vdAutoIncrement,
    } = opts;
    let inverterVdCounter = vdStart;

    const dcClusterBounds =
        dcdbPerInverter > 0
            ? measureWrappedClusterBounds(dcdbPerInverter, dcdbDirection)
            : { width: G.NODE_W, height: G.NODE_H };
    const invGapHorizontal =
        dcdbPerInverter > 0
            ? Math.max(MIN_H_STEP, G.INV_X_GAP, dcClusterBounds.width + 96)
            : Math.max(MIN_H_STEP, G.INV_X_GAP);
    const invGapVertical =
        dcdbPerInverter > 0
            ? Math.max(MIN_V_STEP, DCDB_BELOW_INV + dcClusterBounds.height + 48)
            : MIN_V_STEP;

    const dcSpanWidth = dcdbPerInverter > 0 ? dcClusterBounds.width : G.NODE_W;
    const inverterSubtreeWidth = measureInverterSubtreeWidth(
        invertersPerParent,
        invGapHorizontal,
        dcSpanWidth,
        inverterDirection,
    );

    const blockGapMin = Math.max(G.BLOCK_X_GAP, MIN_H_STEP);
    const acdbGapMin = Math.max(G.ACDB_X_GAP, MIN_H_STEP);
    const blockGap =
        invertersPerParent > 0 ? Math.max(blockGapMin, inverterSubtreeWidth + 96) : blockGapMin;
    const acdbGap = invertersPerParent > 0 ? Math.max(acdbGapMin, inverterSubtreeWidth + 80) : acdbGapMin;

    const px = (s: string) => `${namePrefix}${s}`;
    const nodes: Node<SmartFlowData>[] = [];
    const edges: Edge[] = [];

    const cx = G.PLANT_CENTER_X;
    let yCursor = 40;

    const plantId = newFlowNodeId();
    nodes.push({
        id: plantId,
        type: "smartCmp",
        position: { x: cx, y: yCursor },
        style: generatedNodeStyle(),
        data: buildDraft("plant", plantName, px("P-ROOT"), kindDefaults),
    });
    yCursor = layerDown(yCursor);

    /** One horizontal row under the plant; advances y so tiers never share the same band. */
    const addPlantChildRow = (
        kind: ComponentKindSlug,
        count: number,
        gap: number,
        codePrefix: string,
        rowY: number,
    ): number => {
        if (count < 1) return rowY;
        const g = Math.max(gap, MIN_H_STEP);
        const rowWidth = (count - 1) * g;
        const startX = cx - rowWidth / 2;
        for (let idx = 1; idx <= count; idx++) {
            const id = newFlowNodeId();
            nodes.push({
                id,
                type: "smartCmp",
                position: { x: startX + (idx - 1) * g, y: rowY },
                style: generatedNodeStyle(),
                data: buildDraft(kind, px(`${kind}-${idx}`), px(`${codePrefix}-${idx}`), kindDefaults),
            });
            edges.push(makeEdge(plantId, id));
        }
        return layerDown(rowY);
    };

    yCursor = addPlantChildRow("meter", plantMeters, G.METER_X_GAP, "M-PM", yCursor);
    yCursor = addPlantChildRow("transformer", transformerAtPlant, 260, "T", yCursor);
    yCursor = addPlantChildRow("weather_station", weatherStationAtPlant, 220, "WS", yCursor);
    yCursor = addPlantChildRow("scb", scbAtPlant, 220, "SCB", yCursor);
    yCursor = addPlantChildRow("icb", icbAtPlant, 220, "ICB", yCursor);
    yCursor = addPlantChildRow("string", stringAtPlant, 220, "STR", yCursor);
    yCursor = addPlantChildRow("others", othersAtPlant, 220, "O", yCursor);

    const baseParents: Array<{ id: string; x: number; blockIndex: number }> = [];
    if (blockCount > 0) {
        const bg = Math.max(blockGap, MIN_H_STEP);
        const blockStartX = cx - ((blockCount - 1) * bg) / 2;
        for (let b = 1; b <= blockCount; b++) {
            const bid = newFlowNodeId();
            const bx = blockStartX + (b - 1) * bg;
            nodes.push({
                id: bid,
                type: "smartCmp",
                position: { x: bx, y: yCursor },
                style: generatedNodeStyle(),
                data: buildDraft("block", px(`block-${b}`), px(`B-${b}`), kindDefaults),
            });
            edges.push(makeEdge(plantId, bid));
            baseParents.push({ id: bid, x: bx, blockIndex: b });
        }
        yCursor = layerDown(yCursor);
    } else {
        baseParents.push({ id: plantId, x: cx, blockIndex: 0 });
    }

    const acdbParents: Array<{ id: string; x: number; blockIndex: number; acdbIndex: number }> = [];
    const yAcdb = yCursor;
    if (acdbPerBlock > 0) {
        const ag = Math.max(acdbGap, MIN_H_STEP);
        for (const parent of baseParents) {
            const rowWidth = (acdbPerBlock - 1) * ag;
            const startX = parent.x - rowWidth / 2;
            for (let a = 1; a <= acdbPerBlock; a++) {
                const aid = newFlowNodeId();
                const ax = startX + (a - 1) * ag;
                nodes.push({
                    id: aid,
                    type: "smartCmp",
                    position: { x: ax, y: yAcdb },
                    style: generatedNodeStyle(),
                    data: buildDraft(
                        "acdb",
                        px(`acdb-${parent.blockIndex || 1}-${a}`),
                        px(`AC-${parent.blockIndex || 1}-${a}`),
                        kindDefaults,
                    ),
                });
                edges.push(makeEdge(parent.id, aid));
                acdbParents.push({ id: aid, x: ax, blockIndex: parent.blockIndex || 1, acdbIndex: a });
            }
        }
        yCursor = layerDown(yAcdb);
    }

    const inverterParents =
        acdbParents.length > 0
            ? acdbParents.map((entry) => ({ id: entry.id, x: entry.x, keyA: entry.blockIndex, keyB: entry.acdbIndex }))
            : baseParents.map((entry) => ({ id: entry.id, x: entry.x, keyA: entry.blockIndex || 1, keyB: 0 }));

    const inverterNodes: Array<{ id: string; x: number; y: number; keyA: number; keyB: number; keyC: number }> = [];
    const inverterBaseY = yCursor;
    let inverterExtentBottom = inverterBaseY + G.NODE_H;
    if (invertersPerParent > 0) {
        for (const parent of inverterParents) {
            const invGap = inverterDirection === "horizontal" ? invGapHorizontal : invGapVertical;
            const inverterPositions = spreadAxisPositions(
                parent.x,
                inverterBaseY,
                invertersPerParent,
                invGap,
                inverterDirection,
            );
            for (let i = 1; i <= inverterPositions.length; i++) {
                const position = inverterPositions[i - 1];
                if (!position) continue;
                const iid = newFlowNodeId();
                const inverterVd = vdAutoIncrement ? inverterVdCounter++ : kindDefaults.inverter?.vd_number ?? null;
                nodes.push({
                    id: iid,
                    type: "smartCmp",
                    position,
                    style: generatedNodeStyle(),
                    data: buildDraft(
                        "inverter",
                        px(`inv-${parent.keyA}-${parent.keyB || 1}-${i}`),
                        px(`INV-${parent.keyA}-${parent.keyB || 1}-${i}`),
                        kindDefaults,
                        inverterVd,
                    ),
                });
                edges.push(makeEdge(parent.id, iid));
                inverterNodes.push({ id: iid, x: position.x, y: position.y, keyA: parent.keyA, keyB: parent.keyB, keyC: i });
                inverterExtentBottom = Math.max(inverterExtentBottom, position.y + G.NODE_H);
            }
        }
        yCursor = inverterExtentBottom + G.LAYER_GAP;
    }

    if (dcdbPerInverter > 0) {
        for (const inv of inverterNodes) {
            const invCenterX = inv.x + G.NODE_W / 2;
            const { positions: dcdbPositions } = spreadWrappedPositions(
                invCenterX,
                inv.y + DCDB_BELOW_INV,
                dcdbPerInverter,
                dcdbDirection,
            );
            for (let d = 1; d <= dcdbPositions.length; d++) {
                const position = dcdbPositions[d - 1];
                if (!position) continue;
                const did = newFlowNodeId();
                nodes.push({
                    id: did,
                    type: "smartCmp",
                    position,
                    style: generatedNodeStyle(),
                    data: buildDraft(
                        "dcdb",
                        px(`dc-${inv.keyA}-${inv.keyB || 1}-${inv.keyC}-${d}`),
                        px(`DC-${inv.keyA}-${inv.keyB || 1}-${inv.keyC}-${d}`),
                        kindDefaults,
                        vdAutoIncrement ? d : kindDefaults.dcdb?.vd_number ?? null,
                    ),
                });
                edges.push(makeEdge(inv.id, did));
            }
        }
    }

    return { nodes, edges };
}

type Props = {
    open: boolean;
    onClose: () => void;
    onApply: (result: { nodes: Node<SmartFlowData>[]; edges: Edge[] }) => void;
    /** Target plant for device/tag pickers */
    targetPlantId: string | null;
};

const emptyDefaults = (): KindDefaultsMap => ({});

const GenerateWizard: React.FC<Props> = ({ open, onClose, onApply, targetPlantId }) => {
    const [plantName, setPlantName] = useState("Main plant");
    const [namePrefix, setNamePrefix] = useState("SP-");
    const [blockCount, setBlockCount] = useState(2);
    const [acdbPerBlock, setAcdbPerBlock] = useState(1);
    const [invertersPerParent, setInvertersPerParent] = useState(2);
    const [dcdbPerInverter, setDcdbPerInverter] = useState(5);
    const [plantMeters, setPlantMeters] = useState(1);
    const [transformerAtPlant, setTransformerAtPlant] = useState(0);
    const [weatherStationAtPlant, setWeatherStationAtPlant] = useState(0);
    const [scbAtPlant, setScbAtPlant] = useState(0);
    const [icbAtPlant, setIcbAtPlant] = useState(0);
    const [stringAtPlant, setStringAtPlant] = useState(0);
    const [othersAtPlant, setOthersAtPlant] = useState(0);
    const [inverterDirection, setInverterDirection] = useState<AxisDirection>("horizontal");
    const [dcdbDirection, setDcdbDirection] = useState<AxisDirection>("horizontal");

    const [kindDefaults, setKindDefaults] = useState<KindDefaultsMap>(emptyDefaults);
    const [vdStart, setVdStart] = useState(1);
    const [vdAutoIncrement, setVdAutoIncrement] = useState(true);
    const [defaultIsActive, setDefaultIsActive] = useState(true);
    const [defaultStatus, setDefaultStatus] = useState<typeof STATUS[keyof typeof STATUS]>(STATUS.ACTIVE);

    const [templatePlantId, setTemplatePlantId] = useState<string | null>(null);
    const [templateLabel, setTemplateLabel] = useState("");
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({});
    const [tagTemplateLabels, setTagTemplateLabels] = useState<Record<string, string>>({});
    const [inverterTypeLabels, setInverterTypeLabels] = useState<Record<string, string>>({});
    const usesAcdb = acdbPerBlock > 0;
    const usesInverter = invertersPerParent > 0;
    const usesDcdb = dcdbPerInverter > 0 && invertersPerParent > 0;
    const usesMeter = plantMeters > 0;
    const usesBlock = blockCount > 0;
    const usesWeather = weatherStationAtPlant > 0;

    const toSelectedOption = (
        value: string | null | undefined,
        labels: Record<string, string>,
        fallbackLabel?: string | null,
    ): Option | null => {
        if (!value) return null;
        return { value, label: labels[value] ?? fallbackLabel ?? value };
    };

    const patchKind = (kind: ComponentKindSlug, patch: Partial<NonNullable<KindDefaultsMap[typeof kind]>>) => {
        setKindDefaults((prev) => ({
            ...prev,
            [kind]: { ...(prev[kind] ?? {}), ...patch },
        }));
    };

    const patchKw = (slug: ComponentKindSlug, field: "ac_capacity_kw" | "dc_capacity_kw", raw: string) => {
        const v = parseOptionalFiniteNumber(raw);
        if (v === undefined) return;
        patchKind(slug, { [field]: v });
    };

    useEffect(() => {
        const id = kindDefaults.inverter?.inverter_type_id;
        if (!id) return;
        if (kindDefaults.inverter?.inverter_type_name || inverterTypeLabels[id]) return;
        void fetchInverterTypeDisplayLabelById(id).then((label) => {
            if (!label) return;
            setInverterTypeLabels((cur) => (cur[id] ? cur : { ...cur, [id]: label }));
        });
    }, [
        kindDefaults.inverter?.inverter_type_id,
        kindDefaults.inverter?.inverter_type_name,
        inverterTypeLabels,
    ]);

    useEffect(() => {
        const id = kindDefaults.dcdb?.inverter_type_id;
        if (!id) return;
        if (kindDefaults.dcdb?.inverter_type_name || inverterTypeLabels[id]) return;
        void fetchInverterTypeDisplayLabelById(id).then((label) => {
            if (!label) return;
            setInverterTypeLabels((cur) => (cur[id] ? cur : { ...cur, [id]: label }));
        });
    }, [
        kindDefaults.dcdb?.inverter_type_id,
        kindDefaults.dcdb?.inverter_type_name,
        inverterTypeLabels,
    ]);

    useEffect(() => {
        const id = kindDefaults.acdb?.inverter_type_id;
        if (!id) return;
        if (kindDefaults.acdb?.inverter_type_name || inverterTypeLabels[id]) return;
        void fetchInverterTypeDisplayLabelById(id).then((label) => {
            if (!label) return;
            setInverterTypeLabels((cur) => (cur[id] ? cur : { ...cur, [id]: label }));
        });
    }, [
        kindDefaults.acdb?.inverter_type_id,
        kindDefaults.acdb?.inverter_type_name,
        inverterTypeLabels,
    ]);

    const meterWizardWarrantyRange = useMemo(
        () =>
            warrantyRangeFromFields({
                warranty_start_date: kindDefaults.meter?.warranty_start_date,
                warranty_end_date: kindDefaults.meter?.warranty_end_date,
            }),
        [
            kindDefaults.meter?.warranty_start_date,
            kindDefaults.meter?.warranty_end_date,
        ],
    );

    const weatherWizardWarrantyRange = useMemo(
        () =>
            warrantyRangeFromFields({
                warranty_start_date: kindDefaults.weather_station?.warranty_start_date,
                warranty_end_date: kindDefaults.weather_station?.warranty_end_date,
            }),
        [
            kindDefaults.weather_station?.warranty_start_date,
            kindDefaults.weather_station?.warranty_end_date,
        ],
    );

    const loadDefaultsFromPlant = async () => {
        if (!templatePlantId) {
            toast.error("Choose a plant to copy defaults from.");
            return;
        }
        setLoadingTemplate(true);
        try {
            const rows = await fetchComponentRowsForPlant(templatePlantId, 500);
            if (!rows.length) {
                toast.error("No components found for that plant.");
                return;
            }
            const sampled = buildKindDefaultsFromSampleRows(rows);
            setKindDefaults((prev) => ({ ...sampled, ...prev }));
            toast.success(`Loaded sample fields from ${rows.length} component(s).`);
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to load");
        } finally {
            setLoadingTemplate(false);
        }
    };

    const handleGenerate = () => {
        const effectivePrefix = namePrefix.trim() || deriveCodePrefixFromPlantName(plantName);
        const { nodes, edges } = generateLayoutFromCounts({
            plantName,
            blockCount,
            acdbPerBlock,
            invertersPerParent,
            dcdbPerInverter,
            plantMeters,
            transformerAtPlant,
            weatherStationAtPlant,
            scbAtPlant,
            icbAtPlant,
            stringAtPlant,
            othersAtPlant,
            inverterDirection,
            dcdbDirection,
            namePrefix: effectivePrefix,
            kindDefaults,
            vdStart,
            vdAutoIncrement,
        });
        const withDefaults = nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                draft: {
                    ...node.data.draft,
                    is_active: defaultIsActive,
                    status: defaultStatus,
                },
            },
        }));
        onApply({ nodes: withDefaults, edges });
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Generate hierarchy"
            subtitle="Configure counts, placement, and defaults for generated components."
            icon={Sparkles}
            maxWidth="max-w-4xl"
        >
            <div className="space-y-5">
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-dark-600">
                    The board uses stacked layers (plant → plant children → blocks → ACDB → inverters → DCDB) with
                    spacing from component size so large hierarchies don’t overlap. Set structure and per-kind defaults
                    below; optional VD auto-increment. Copy field patterns from an existing plant, then adjust. Leave name
                    prefix empty to derive codes from the plant component name.
                </p>

                <SectionHeader icon={Sparkles} title="Structure" compact />
                <div className="rounded-xs border border-neutral-200 p-3 dark:border-neutral-dark-200">
                    <p className="mb-2 text-[11px] text-neutral-500">
                        Keep counts as 0 to skip a component type. This gives a flexible hierarchy instead of a fixed chain.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Input label="Plant component name" value={plantName} onChange={(e) => setPlantName(e.target.value)} />
                    <Input
                        label="Name prefix (codes)"
                        placeholder="Empty = from plant name"
                        value={namePrefix}
                        onChange={(e) => setNamePrefix(e.target.value)}
                    />
                    <Input
                        type="number"
                        label="Blocks under plant"
                        value={String(blockCount)}
                        onChange={(e) => setBlockCount(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Input
                        type="number"
                        label="ACDB per parent"
                        value={String(acdbPerBlock)}
                        onChange={(e) => setAcdbPerBlock(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Input
                        type="number"
                        label="Inverters / parent"
                        value={String(invertersPerParent)}
                        onChange={(e) => setInvertersPerParent(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Input
                        type="number"
                        label="DCDB / inverter"
                        value={String(dcdbPerInverter)}
                        onChange={(e) => setDcdbPerInverter(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Input
                        type="number"
                        label="Meters under plant"
                        value={String(plantMeters)}
                        onChange={(e) => setPlantMeters(Math.max(0, Number(e.target.value) || 0))}
                    />
                        <Input
                            type="number"
                            label="Transformers under plant"
                            value={String(transformerAtPlant)}
                            onChange={(e) => setTransformerAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <Input
                            type="number"
                            label="Weather stations under plant"
                            value={String(weatherStationAtPlant)}
                            onChange={(e) => setWeatherStationAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <Input
                            type="number"
                            label="SCB under plant"
                            value={String(scbAtPlant)}
                            onChange={(e) => setScbAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <Input
                            type="number"
                            label="ICB under plant"
                            value={String(icbAtPlant)}
                            onChange={(e) => setIcbAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <Input
                            type="number"
                            label="Strings under plant"
                            value={String(stringAtPlant)}
                            onChange={(e) => setStringAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <Input
                            type="number"
                            label="Others under plant"
                            value={String(othersAtPlant)}
                            onChange={(e) => setOthersAtPlant(Math.max(0, Number(e.target.value) || 0))}
                        />
                        <div>
                            <label className="form-label">Inverter placement</label>
                            <select
                                className={wizardSelectClassName}
                                value={inverterDirection}
                                onChange={(e) => setInverterDirection(e.target.value as AxisDirection)}
                            >
                                <option value="horizontal">Horizontal spread</option>
                                <option value="vertical">Vertical stack</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">DC channel placement</label>
                            <select
                                className={wizardSelectClassName}
                                value={dcdbDirection}
                                onChange={(e) => setDcdbDirection(e.target.value as AxisDirection)}
                            >
                                <option value="horizontal">Horizontal spread</option>
                                <option value="vertical">Vertical stack</option>
                            </select>
                        </div>
                    </div>
                </div>

                <SectionHeader icon={Sparkles} title="Copy defaults from existing plant" compact />
                <p className="text-[11px] text-neutral-500">
                    Uses the first component of each type from that plant as a field template (capacities, device,
                    templates, etc.). You can still edit per-component-type fields below after loading.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[220px] flex-1">
                        <AsyncSelect
                            name="templatePlant"
                            loadOptions={(s) => fetchPlantNames(s, 1, 50)}
                            placeholder="Template plant"
                            value={templatePlantId ? { value: templatePlantId, label: templateLabel || templatePlantId } : null}
                            onChange={(v: any) => {
                                setTemplatePlantId(v?.value || null);
                                setTemplateLabel(v?.label || "");
                            }}
                            isClearable
                        />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={loadingTemplate || !templatePlantId}
                        onClick={() => void loadDefaultsFromPlant()}
                    >
                        {loadingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Load field defaults
                    </Button>
                </div>

                <SectionHeader icon={Sparkles} title="VD numbering" compact />
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        type="number"
                        label="Starting VD #"
                        value={String(vdStart)}
                        onChange={(e) => setVdStart(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <label className="form-checkbox-row mt-6">
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={vdAutoIncrement}
                            onChange={(e) => setVdAutoIncrement(e.target.checked)}
                        />
                        <span className="form-checkbox-label">Auto-increment VD for meter / ACDB / inverter / DCDB</span>
                    </label>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <label className="form-checkbox-row mt-6">
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={defaultIsActive}
                            onChange={(e) => setDefaultIsActive(e.target.checked)}
                        />
                        <span className="form-checkbox-label">Generated components active</span>
                    </label>
                    <div>
                        <label className="form-label">Default status</label>
                        <select
                            className={wizardSelectClassName}
                            value={defaultStatus}
                            onChange={(e) => setDefaultStatus(e.target.value as typeof STATUS[keyof typeof STATUS])}
                        >
                            <option value={STATUS.ACTIVE}>Active</option>
                            <option value={STATUS.INACTIVE}>Inactive</option>
                            <option value={STATUS.FAULTY}>Faulty</option>
                            <option value={STATUS.MAINTENANCE}>Maintenance</option>
                            <option value={STATUS.DECOMMISSIONED}>Decommissioned</option>
                        </select>
                    </div>
                </div>

                <SectionHeader icon={Sparkles} title="Device, tag template & VD (defaults)" compact />
                <p className="text-[11px] text-neutral-500">
                    Matches hierarchy JSON: device and tag template apply to most types. VD uses the same list as the
                    board (1–25) unless you use auto-increment below.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <AsyncSelect
                        name="plant_dev"
                        loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                        placeholder="Plant device"
                        isDisabled={!targetPlantId}
                        value={toSelectedOption(kindDefaults.plant?.device_id, deviceLabels)}
                        onChange={(v: any) => {
                            if (v?.value && v?.label) {
                                setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                            }
                            patchKind("plant", { device_id: v?.value || null });
                        }}
                        isClearable
                    />
                    <AsyncSelect
                        name="plant_tt"
                        loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                        placeholder="Plant tag template"
                        value={toSelectedOption(kindDefaults.plant?.tag_template_id, tagTemplateLabels)}
                        onChange={(v: any) => {
                            if (v?.value && v?.label) {
                                setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                            }
                            patchKind("plant", { tag_template_id: v?.value || null });
                        }}
                        isClearable
                    />
                    <div>
                        <label className="form-label">Plant VD #</label>
                        <select
                            className={wizardSelectClassName}
                            value={kindDefaults.plant?.vd_number != null ? String(kindDefaults.plant.vd_number) : ""}
                            onChange={(e) =>
                                patchKind("plant", {
                                    vd_number: e.target.value === "" ? null : Number(e.target.value),
                                })
                            }
                        >
                            <option value="">—</option>
                            {kindDefaults.plant?.vd_number != null &&
                            (!Number.isInteger(kindDefaults.plant.vd_number) ||
                                kindDefaults.plant.vd_number < VD_NUMBER_MIN ||
                                kindDefaults.plant.vd_number > VD_NUMBER_MAX) ? (
                                <option value={String(kindDefaults.plant.vd_number)}>
                                    {kindDefaults.plant.vd_number} (current)
                                </option>
                            ) : null}
                            {VD_NUMBER_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                    {usesBlock ? (
                        <>
                            <AsyncSelect
                                name="block_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="Block device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.block?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("block", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="block_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="Block tag template"
                                value={toSelectedOption(kindDefaults.block?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("block", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <div>
                                <label className="form-label">Block VD #</label>
                                <select
                                    className={wizardSelectClassName}
                                    value={kindDefaults.block?.vd_number != null ? String(kindDefaults.block.vd_number) : ""}
                                    onChange={(e) =>
                                        patchKind("block", {
                                            vd_number: e.target.value === "" ? null : Number(e.target.value),
                                        })
                                    }
                                >
                                    <option value="">—</option>
                                    {VD_NUMBER_OPTIONS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : null}
                    {stringAtPlant > 0 ? (
                        <>
                            <AsyncSelect
                                name="str_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="String device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.string?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("string", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="str_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="String tag template"
                                value={toSelectedOption(kindDefaults.string?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("string", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                        </>
                    ) : null}
                    {transformerAtPlant > 0 ? (
                        <>
                            <AsyncSelect
                                name="tr_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="Transformer device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.transformer?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("transformer", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="tr_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="Transformer tag template"
                                value={toSelectedOption(kindDefaults.transformer?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("transformer", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                        </>
                    ) : null}
                    {usesWeather ? (
                        <>
                            <AsyncSelect
                                name="ws_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="Weather station device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.weather_station?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("weather_station", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="ws_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="Weather station tag template"
                                value={toSelectedOption(kindDefaults.weather_station?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("weather_station", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <div>
                                <label className="form-label">Weather VD #</label>
                                <select
                                    className={wizardSelectClassName}
                                    value={
                                        kindDefaults.weather_station?.vd_number != null
                                            ? String(kindDefaults.weather_station.vd_number)
                                            : ""
                                    }
                                    onChange={(e) =>
                                        patchKind("weather_station", {
                                            vd_number: e.target.value === "" ? null : Number(e.target.value),
                                        })
                                    }
                                >
                                    <option value="">—</option>
                                    {VD_NUMBER_OPTIONS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : null}
                    {scbAtPlant > 0 ? (
                        <>
                            <AsyncSelect
                                name="scb_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="SCB device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.scb?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("scb", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="scb_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="SCB tag template"
                                value={toSelectedOption(kindDefaults.scb?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("scb", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                        </>
                    ) : null}
                    {icbAtPlant > 0 ? (
                        <>
                            <AsyncSelect
                                name="icb_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="ICB device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.icb?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("icb", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="icb_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="ICB tag template"
                                value={toSelectedOption(kindDefaults.icb?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("icb", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                        </>
                    ) : null}
                    {othersAtPlant > 0 ? (
                        <>
                            <AsyncSelect
                                name="oth_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="Others device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.others?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("others", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="oth_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="Others tag template"
                                value={toSelectedOption(kindDefaults.others?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("others", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                        </>
                    ) : null}
                </div>

                <SectionHeader icon={Sparkles} title="Default AC / DC (kW) by type" compact />
                <p className="text-[11px] text-neutral-500">
                    Values apply to every generated node of that kind (e.g. three inverters share the same defaults).
                    Override any single node on the board in the right panel.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <Input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        label="Plant AC kW"
                        value={kindDefaults.plant?.ac_capacity_kw != null ? String(kindDefaults.plant.ac_capacity_kw) : ""}
                        onChange={(e) => patchKw("plant", "ac_capacity_kw", e.target.value)}
                    />
                    <Input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        label="Plant DC kW"
                        value={kindDefaults.plant?.dc_capacity_kw != null ? String(kindDefaults.plant.dc_capacity_kw) : ""}
                        onChange={(e) => patchKw("plant", "dc_capacity_kw", e.target.value)}
                    />
                    {usesBlock ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Block AC kW"
                                value={kindDefaults.block?.ac_capacity_kw != null ? String(kindDefaults.block.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("block", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Block DC kW"
                                value={kindDefaults.block?.dc_capacity_kw != null ? String(kindDefaults.block.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("block", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                    {stringAtPlant > 0 ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="String AC kW"
                                value={kindDefaults.string?.ac_capacity_kw != null ? String(kindDefaults.string.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("string", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="String DC kW"
                                value={kindDefaults.string?.dc_capacity_kw != null ? String(kindDefaults.string.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("string", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                    {transformerAtPlant > 0 ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Transformer AC kW"
                                value={
                                    kindDefaults.transformer?.ac_capacity_kw != null
                                        ? String(kindDefaults.transformer.ac_capacity_kw)
                                        : ""
                                }
                                onChange={(e) => patchKw("transformer", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Transformer DC kW"
                                value={
                                    kindDefaults.transformer?.dc_capacity_kw != null
                                        ? String(kindDefaults.transformer.dc_capacity_kw)
                                        : ""
                                }
                                onChange={(e) => patchKw("transformer", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                    {scbAtPlant > 0 ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="SCB AC kW"
                                value={kindDefaults.scb?.ac_capacity_kw != null ? String(kindDefaults.scb.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("scb", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="SCB DC kW"
                                value={kindDefaults.scb?.dc_capacity_kw != null ? String(kindDefaults.scb.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("scb", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                    {icbAtPlant > 0 ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="ICB AC kW"
                                value={kindDefaults.icb?.ac_capacity_kw != null ? String(kindDefaults.icb.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("icb", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="ICB DC kW"
                                value={kindDefaults.icb?.dc_capacity_kw != null ? String(kindDefaults.icb.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("icb", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                    {othersAtPlant > 0 ? (
                        <>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Others AC kW"
                                value={kindDefaults.others?.ac_capacity_kw != null ? String(kindDefaults.others.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("others", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="Others DC kW"
                                value={kindDefaults.others?.dc_capacity_kw != null ? String(kindDefaults.others.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("others", "dc_capacity_kw", e.target.value)}
                            />
                        </>
                    ) : null}
                </div>

                {usesAcdb ? (
                    <>
                        <SectionHeader icon={Sparkles} title="ACDB defaults" compact />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="ACDB AC kW"
                                value={kindDefaults.acdb?.ac_capacity_kw != null ? String(kindDefaults.acdb.ac_capacity_kw) : ""}
                                onChange={(e) => patchKw("acdb", "ac_capacity_kw", e.target.value)}
                            />
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                inputMode="decimal"
                                label="ACDB DC kW"
                                value={kindDefaults.acdb?.dc_capacity_kw != null ? String(kindDefaults.acdb.dc_capacity_kw) : ""}
                                onChange={(e) => patchKw("acdb", "dc_capacity_kw", e.target.value)}
                            />
                            <AsyncSelect
                                name="acdb_dev"
                                loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                placeholder="ACDB device"
                                isDisabled={!targetPlantId}
                                value={toSelectedOption(kindDefaults.acdb?.device_id, deviceLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("acdb", { device_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="acdb_tt"
                                loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                placeholder="ACDB tag template"
                                value={toSelectedOption(kindDefaults.acdb?.tag_template_id, tagTemplateLabels)}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setTagTemplateLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("acdb", { tag_template_id: v?.value || null });
                                }}
                                isClearable
                            />
                            <AsyncSelect
                                name="acdb_it"
                                loadOptions={(s) => fetchInverterTypeNames(s, 1, 50)}
                                apiSearch
                                placeholder="ACDB inverter type (optional)"
                                value={toSelectedOption(
                                    kindDefaults.acdb?.inverter_type_id,
                                    inverterTypeLabels,
                                    kindDefaults.acdb?.inverter_type_name ?? null,
                                )}
                                onChange={(v: any) => {
                                    if (v?.value && v?.label) {
                                        setInverterTypeLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                    }
                                    patchKind("acdb", {
                                        inverter_type_id: v?.value || null,
                                        inverter_type_name: v?.label ? String(v.label) : null,
                                    });
                                }}
                                isClearable
                            />
                            <div>
                                <label className="form-label">ACDB VD #</label>
                                <select
                                    className={wizardSelectClassName}
                                    value={kindDefaults.acdb?.vd_number != null ? String(kindDefaults.acdb.vd_number) : ""}
                                    onChange={(e) =>
                                        patchKind("acdb", {
                                            vd_number: e.target.value === "" ? null : Number(e.target.value),
                                        })
                                    }
                                >
                                    <option value="">—</option>
                                    {VD_NUMBER_OPTIONS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                ) : null}

                {usesInverter ? (
                    <>
                        <SectionHeader icon={Sparkles} title="Inverter defaults" compact />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <Input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        label="AC kW"
                        value={kindDefaults.inverter?.ac_capacity_kw != null ? String(kindDefaults.inverter.ac_capacity_kw) : ""}
                        onChange={(e) => patchKw("inverter", "ac_capacity_kw", e.target.value)}
                    />
                    <Input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        label="DC kW"
                        value={kindDefaults.inverter?.dc_capacity_kw != null ? String(kindDefaults.inverter.dc_capacity_kw) : ""}
                        onChange={(e) => patchKw("inverter", "dc_capacity_kw", e.target.value)}
                    />
                    <AsyncSelect
                        name="inv_dev"
                        loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                        placeholder="Device"
                        isDisabled={!targetPlantId}
                        value={toSelectedOption(kindDefaults.inverter?.device_id, deviceLabels)}
                        onChange={(v: any) => {
                            if (v?.value && v?.label) {
                                setDeviceLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                            }
                            patchKind("inverter", { device_id: v?.value || null });
                        }}
                        isClearable
                    />
                    <AsyncSelect
                        name="inv_tt"
                        loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                        placeholder="Tag template"
                        value={toSelectedOption(kindDefaults.inverter?.tag_template_id, tagTemplateLabels)}
                        onChange={(v: any) => {
                            if (v?.value && v?.label) {
                                setTagTemplateLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                            }
                            patchKind("inverter", { tag_template_id: v?.value || null });
                        }}
                        isClearable
                    />
                    <AsyncSelect
                        name="inv_it"
                        loadOptions={(s) => fetchInverterTypeNames(s, 1, 50)}
                        apiSearch
                        placeholder="Inverter type"
                        value={toSelectedOption(
                            kindDefaults.inverter?.inverter_type_id,
                            inverterTypeLabels,
                            kindDefaults.inverter?.inverter_type_name ?? null,
                        )}
                        onChange={(v: any) => {
                            if (v?.value && v?.label) {
                                setInverterTypeLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                            }
                            patchKind("inverter", {
                                inverter_type_id: v?.value || null,
                                inverter_type_name: v?.label ? String(v.label) : null,
                            });
                        }}
                        isClearable
                    />
                    <Input
                        type="number"
                        label="MPPT"
                        value={kindDefaults.inverter?.mppt_count != null ? String(kindDefaults.inverter.mppt_count) : ""}
                        onChange={(e) =>
                            patchKind("inverter", {
                                mppt_count: e.target.value === "" ? null : Number(e.target.value),
                            })
                        }
                    />
                    <Input
                        type="number"
                        label="Strings/MPPT"
                        value={
                            kindDefaults.inverter?.strings_per_mppt != null
                                ? String(kindDefaults.inverter.strings_per_mppt)
                                : ""
                        }
                        onChange={(e) =>
                            patchKind("inverter", {
                                strings_per_mppt: e.target.value === "" ? null : Number(e.target.value),
                            })
                        }
                    />
                    <Input
                        type="number"
                        label="Channels"
                        value={kindDefaults.inverter?.channels != null ? String(kindDefaults.inverter.channels) : ""}
                        onChange={(e) =>
                            patchKind("inverter", {
                                channels: e.target.value === "" ? null : Number(e.target.value),
                            })
                        }
                    />
                    <div>
                        <label className="form-label">Phase type</label>
                        <select
                            className={wizardSelectClassName}
                            value={kindDefaults.inverter?.phase_type ?? ""}
                            onChange={(e) =>
                                patchKind("inverter", {
                                    phase_type: e.target.value ? (e.target.value as PHASE_TYPE) : undefined,
                                })
                            }
                        >
                            <option value={PHASE_TYPE.SINGLE_PHASE}>Single phase</option>
                            <option value={PHASE_TYPE.THREE_PHASE}>Three phase</option>
                        </select>
                    </div>
                    <Input label="Brand" value={kindDefaults.inverter?.brand ?? ""} onChange={(e) => patchKind("inverter", { brand: e.target.value })} />
                    <Input label="Model" value={kindDefaults.inverter?.model ?? ""} onChange={(e) => patchKind("inverter", { model: e.target.value })} />
                        </div>
                    </>
                ) : null}

                {usesWeather ? (
                    <div className="rounded-xs border border-neutral-200 p-3 dark:border-neutral-dark-200">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                            Weather station — warranty period
                        </p>
                        <CommonDateRangeSelector
                            label=""
                            maxDays={365 * 25}
                            dateRange={weatherWizardWarrantyRange}
                            onDateRangeChange={(range) => {
                                patchKind("weather_station", {
                                    warranty_start_date: format(startOfDay(range.startDate), "yyyy-MM-dd"),
                                    warranty_end_date: format(startOfDay(range.endDate), "yyyy-MM-dd"),
                                });
                            }}
                        />
                    </div>
                ) : null}

                {usesDcdb || usesMeter ? (
                    <>
                        <SectionHeader icon={Sparkles} title="DCDB & meter" compact />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                            {usesDcdb ? (
                                <>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        inputMode="decimal"
                                        label="DCDB DC kW"
                                        value={
                                            kindDefaults.dcdb?.dc_capacity_kw != null
                                                ? String(kindDefaults.dcdb.dc_capacity_kw)
                                                : ""
                                        }
                                        onChange={(e) => patchKw("dcdb", "dc_capacity_kw", e.target.value)}
                                    />
                                    <AsyncSelect
                                        name="dc_dev"
                                        loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                        placeholder="DCDB device"
                                        isDisabled={!targetPlantId}
                                        value={toSelectedOption(kindDefaults.dcdb?.device_id, deviceLabels)}
                                        onChange={(v: any) => {
                                            if (v?.value && v?.label) {
                                                setDeviceLabels((c) => ({ ...c, [String(v.value)]: String(v.label) }));
                                            }
                                            patchKind("dcdb", { device_id: v?.value || null });
                                        }}
                                        isClearable
                                    />
                                    <AsyncSelect
                                        name="dc_tt"
                                        loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                        placeholder="DCDB tag template"
                                        value={toSelectedOption(kindDefaults.dcdb?.tag_template_id, tagTemplateLabels)}
                                        onChange={(v: any) => {
                                            if (v?.value && v?.label) {
                                                setTagTemplateLabels((c) => ({
                                                    ...c,
                                                    [String(v.value)]: String(v.label),
                                                }));
                                            }
                                            patchKind("dcdb", { tag_template_id: v?.value || null });
                                        }}
                                        isClearable
                                    />
                                    <AsyncSelect
                                        name="dc_it"
                                        loadOptions={(s) => fetchInverterTypeNames(s, 1, 50)}
                                        apiSearch
                                        placeholder="DCDB inverter type"
                                        value={toSelectedOption(
                                            kindDefaults.dcdb?.inverter_type_id,
                                            inverterTypeLabels,
                                            kindDefaults.dcdb?.inverter_type_name ?? null,
                                        )}
                                        onChange={(v: any) => {
                                            if (v?.value && v?.label) {
                                                setInverterTypeLabels((c) => ({
                                                    ...c,
                                                    [String(v.value)]: String(v.label),
                                                }));
                                            }
                                            patchKind("dcdb", {
                                                inverter_type_id: v?.value || null,
                                                inverter_type_name: v?.label ? String(v.label) : null,
                                            });
                                        }}
                                        isClearable
                                    />
                                    <div>
                                        <label className="form-label">DCDB VD #</label>
                                        <select
                                            className={wizardSelectClassName}
                                            value={
                                                kindDefaults.dcdb?.vd_number != null
                                                    ? String(kindDefaults.dcdb.vd_number)
                                                    : ""
                                            }
                                            onChange={(e) =>
                                                patchKind("dcdb", {
                                                    vd_number: e.target.value === "" ? null : Number(e.target.value),
                                                })
                                            }
                                        >
                                            <option value="">—</option>
                                            {VD_NUMBER_OPTIONS.map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : null}
                            {usesMeter ? (
                                <>
                                    <AsyncSelect
                                        name="m_dev"
                                        loadOptions={(s) => fetchDeviceNames(s, 1, 50, targetPlantId)}
                                        placeholder="Meter device"
                                        isDisabled={!targetPlantId}
                                        value={toSelectedOption(kindDefaults.meter?.device_id, deviceLabels)}
                                        onChange={(v: any) => {
                                            if (v?.value && v?.label) {
                                                setDeviceLabels((c) => ({
                                                    ...c,
                                                    [String(v.value)]: String(v.label),
                                                }));
                                            }
                                            patchKind("meter", { device_id: v?.value || null });
                                        }}
                                        isClearable
                                    />
                                    <AsyncSelect
                                        name="m_tt"
                                        loadOptions={(s) => fetchTagTemplateNames(s, 1, 50)}
                                        placeholder="Meter tag template"
                                        value={toSelectedOption(kindDefaults.meter?.tag_template_id, tagTemplateLabels)}
                                        onChange={(v: any) => {
                                            if (v?.value && v?.label) {
                                                setTagTemplateLabels((c) => ({
                                                    ...c,
                                                    [String(v.value)]: String(v.label),
                                                }));
                                            }
                                            patchKind("meter", { tag_template_id: v?.value || null });
                                        }}
                                        isClearable
                                    />
                                    <div className="md:col-span-2">
                                        <p className="mb-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                                            Meter warranty period
                                        </p>
                                        <CommonDateRangeSelector
                                            label=""
                                            maxDays={365 * 25}
                                            dateRange={meterWizardWarrantyRange}
                                            onDateRangeChange={(range) => {
                                                patchKind("meter", {
                                                    warranty_start_date: format(
                                                        startOfDay(range.startDate),
                                                        "yyyy-MM-dd",
                                                    ),
                                                    warranty_end_date: format(
                                                        startOfDay(range.endDate),
                                                        "yyyy-MM-dd",
                                                    ),
                                                });
                                            }}
                                        />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </>
                ) : null}

                <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-dark-200">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" variant="primary" onClick={handleGenerate}>
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        Generate on board
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default GenerateWizard;
