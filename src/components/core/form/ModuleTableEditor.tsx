import React from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/common/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModuleColumnConfig {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
  minWidth?: string;
}

export interface ModuleTableEditorProps {
  columns: ModuleColumnConfig[];
  value: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  addLabel?: string;
  emptyText?: string;
  cols?: 1 | 2 | 3 | 4;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ModuleTableEditor: React.FC<ModuleTableEditorProps> = ({
  columns,
  value,
  onChange,
  addLabel = "Add row",
  emptyText = "No entries yet.",
  cols = 2,
}) => {
  const rows = Array.isArray(value) ? value : [];

  const update = (i: number, key: string, val: string) => {
    const col = columns.find((c) => c.key === key);
    let parsed: any;

    if (col?.type === "number") {
      parsed = val === "" ? null : Number(val);
    } else {
      parsed = String(val);
    }

    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: parsed } : r)));
  };

  const addRow = () => {
    const empty = Object.fromEntries(columns.map((c) => [c.key, null]));
    onChange([...rows, empty]);
  };

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const getCellValue = (row: Record<string, unknown>, key: string): string => {
    const v = row[key];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Add row button — top ── */}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </Button>
      </div>

      {/* ── Cards ── */}
      {rows.length === 0 ? (
        <p className="rounded-xs border border-dashed border-neutral-200 dark:border-neutral-dark-300 px-3 py-5 text-center text-xs text-neutral-400 dark:text-neutral-dark-500">
          {emptyText}
        </p>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            className="rounded-xs border border-neutral-200 dark:border-neutral-dark-300 bg-white dark:bg-neutral-dark-100 p-3 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-dark-900">
                Row {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-1 rounded-xs text-neutral-400 dark:text-neutral-dark-500 hover:text-error-500 dark:hover:text-error-dark-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-all"
                title="Remove row"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className={`grid gap-3 ${
              cols === 1 ? "grid-cols-1" :
              cols === 2 ? "grid-cols-1 sm:grid-cols-2" :
              cols === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
              "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}>
              {columns.map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <label className="text-neutral-800 dark:text-neutral-dark-900 font-medium text-sm">
                    {col.label}
                  </label>
                  <input
                    type={col.type ?? "text"}
                    step={col.step}
                    value={getCellValue(row, col.key)}
                    onChange={(e) => update(i, col.key, e.target.value)}
                    placeholder={col.placeholder}
                    className="input rounded-xs h-9 px-3 py-0 text-sm w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ModuleTableEditor;
