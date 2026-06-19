import BoolBadge from "@/components/common/BoolBadge";

/** Minimal cell params shape used by CommonTable / ag-Grid `cellRenderer` callbacks */
export type AgCellParams = { value: unknown };

export const boolCellRenderer = (params: AgCellParams) => <BoolBadge value={params.value} />;

const cellArrayItemText = (item: unknown): string => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        return String(item);
    }
    try {
        return JSON.stringify(item);
    } catch {
        return "";
    }
};

export const arrayCellRenderer = (
    params: AgCellParams,
    options?: { separator?: string; empty?: string },
): string => {
    const sep = options?.separator ?? ", ";
    const empty = options?.empty ?? "-";
    const v = params.value;
    if (!Array.isArray(v) || v.length === 0) return empty;
    return v.map(cellArrayItemText).filter(Boolean).join(sep) || empty;
};

export const unitCellRenderer =
    (unit: string, options?: { empty?: string }) =>
    (params: AgCellParams): string => {
        const empty = options?.empty ?? "-";
        const v = params.value;
        if (v === undefined || v === null || v === "") return empty;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            return `${v} ${unit}`;
        }
        return empty;
    };

/** For detail views / non-grid: comma list or `null` when empty */
export function formatArrayAsCommaSeparated(value: unknown): string | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const text = value.map(cellArrayItemText).filter(Boolean).join(", ");
    return text || null;
}
