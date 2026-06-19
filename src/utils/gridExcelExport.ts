import * as XLSX from "xlsx";

/**
 * Builds an .xlsx download from a CSV string (e.g. from ag-Grid Community `getDataAsCsv`).
 * Reuses the grid’s CSV pipeline so values match “Export CSV”.
 */
export function saveCsvStringAsXlsxFile(csv: string, fileName: string): void {
  const trimmed = csv.trim();
  if (!trimmed) return;

  const workbook = XLSX.read(trimmed, { type: "string" });
  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
