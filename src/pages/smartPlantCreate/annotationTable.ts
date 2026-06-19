import type { SmartFlowData } from "./types";

/** Default 2×2 table: header row + one data row. */
export const DEFAULT_TABLE_CELLS: string[][] = [
  ["Column 1", "Column 2"],
  ["", ""],
];

export function cellsToPipeText(cells: string[][]): string {
  return cells.map((row) => row.join(" | ")).join("\n");
}

/** Parse pipe / newline text into a rectangular grid (legacy + paste). */
export function parsePipeTableText(text: string): string[][] {
  const rows = text
    .split(/\n/)
    .map((row) => row.split("|").map((cell) => cell.trim()));
  const nonEmpty = rows.filter((row) => row.some((c) => c.length > 0));
  return nonEmpty.length > 0 ? normalizeRectangular(nonEmpty) : [];
}

export function normalizeRectangular(cells: string[][]): string[][] {
  if (cells.length === 0) return [[""]];
  const maxCols = Math.max(1, ...cells.map((r) => r.length));
  return cells.map((row) => {
    const next = row.map((c) => String(c ?? ""));
    while (next.length < maxCols) next.push("");
    return next;
  });
}

export function getTableCellsFromData(data: SmartFlowData): string[][] {
  const raw = data.annotation_table_cells;
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeRectangular(
      raw.map((row) =>
        Array.isArray(row) ? row.map((c) => String(c ?? "")) : [String(row ?? "")],
      ),
    );
  }
  const parsed = parsePipeTableText(data.annotation_text ?? "");
  return parsed.length > 0 ? parsed : DEFAULT_TABLE_CELLS.map((r) => [...r]);
}

export function addTableRow(cells: string[][]): string[][] {
  const cols = cells[0]?.length ?? 2;
  return [...cells.map((r) => [...r]), Array.from({ length: cols }, () => "")];
}

export function addTableColumn(cells: string[][]): string[][] {
  return cells.map((row) => [...row, ""]);
}

export function removeTableRow(cells: string[][]): string[][] {
  if (cells.length <= 1) return cells;
  return cells.slice(0, -1).map((r) => [...r]);
}

export function removeTableColumn(cells: string[][]): string[][] {
  const w = cells[0]?.length ?? 1;
  if (w <= 1) return cells;
  return cells.map((row) => row.slice(0, -1));
}

/** Append pasted text to the bottom-right cell (used by global paste handler). */
export function appendPasteToLastCell(cells: string[][], paste: string): string[][] {
  const grid = cells.map((r) => [...r]);
  const lastR = Math.max(0, grid.length - 1);
  const lastC = Math.max(0, (grid[lastR]?.length ?? 1) - 1);
  grid[lastR][lastC] = (grid[lastR][lastC] ?? "") + paste;
  return normalizeRectangular(grid);
}

/** Equal percentage per column (sums to 100). */
export function equalColumnPct(colCount: number): number[] {
  if (colCount <= 0) return [100];
  const v = 100 / colCount;
  return Array.from({ length: colCount }, () => v);
}

export function normalizePctWidths(widths: number[]): number[] {
  if (widths.length === 0) return [100];
  const sum = widths.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return equalColumnPct(widths.length);
  return widths.map((w) => (Math.max(0, w) / sum) * 100);
}

/** Resolve stored or default column % for the current grid width. */
export function getColumnWidthsPct(data: SmartFlowData, colCount: number): number[] {
  if (colCount <= 0) return [100];
  const raw = data.annotation_table_col_widths_pct;
  if (Array.isArray(raw) && raw.length === colCount && raw.every((x) => typeof x === "number" && Number.isFinite(x) && x > 0)) {
    return normalizePctWidths(raw);
  }
  return equalColumnPct(colCount);
}

/** When column count changes, reset to equal split (simple + predictable). */
export function syncColWidthsWithGrid(
  prev: number[] | undefined,
  colCount: number,
): number[] {
  if (colCount <= 0) return [100];
  if (!prev || prev.length !== colCount) {
    return equalColumnPct(colCount);
  }
  return normalizePctWidths(prev);
}
