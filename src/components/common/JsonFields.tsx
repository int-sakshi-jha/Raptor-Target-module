import { Code2, Copy, Plus, X, Braces, ArrowRight } from "lucide-react";
import React, { useState } from "react";

export interface TagMapStaticRow {
  key: string;
  defaultValue: string;
  description?: string;
}

export interface TagMapBuilderProps {
  staticRows?: TagMapStaticRow[];
  keyLabel?: string;
  valueLabel?: string;
  initialConfig?: Record<string, unknown>;
  onChange: (val: Record<string, unknown>) => void;
  previewLabel?: string;
}

type TRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isStatic: boolean;
};

let dynamicRowSeed = 0;
const nextRowId = () => `tm-row-${++dynamicRowSeed}`;

const stringifyRowValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const parseRowValue = (value: string): unknown => {
  const t = value.trim();
  if (!t) return "";
  if (
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"))
  ) {
    try {
      return JSON.parse(t);
    } catch {
      return value;
    }
  }
  if (t === "true") return true;
  if (t === "false") return false;
  const n = Number(t);
  if (!Number.isNaN(n) && String(n) === t) return n;
  return value;
};


const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
  !!value && typeof value === "object";

const normalizeRecordForSync = (value: unknown): Record<string, string> => {
  if (!isPlainObject(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = stringifyRowValue(v);
  }
  return out;
};

export const TagMapBuilder: React.FC<TagMapBuilderProps> = ({
  staticRows = [],
  keyLabel = "Key",
  valueLabel = "Value",
  initialConfig = {},
  onChange,
  previewLabel = "tag_map",
}) => {
  const stableStringify = (value: unknown): string => {
    if (value === null || value === undefined) return String(value);
    const t = typeof value;
    if (t === "number" || t === "boolean" || t === "string") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (t === "object") {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
    }
    return JSON.stringify(String(value));
  };

  const knownKeys = React.useMemo(
    () => new Set(staticRows.map((r) => r.key)),
    [staticRows],
  );

  const buildRows = React.useCallback(
    (cfg: Record<string, unknown>): TRow[] => {
      const hasData = Object.keys(cfg).length > 0;
      const fixed: TRow[] = staticRows.map((r) => ({
        id: `static:${r.key}`,
        key: r.key,
        value:
          cfg[r.key] !== undefined
            ? stringifyRowValue(cfg[r.key])
            : r.defaultValue,
        enabled: hasData ? cfg[r.key] !== undefined : true,
        isStatic: true,
      }));
      const dynamic: TRow[] = Object.entries(cfg)
        .filter(([k]) => !knownKeys.has(k))
        .map(([k, v]) => ({
          id: `dynamic:${k || nextRowId()}`,
          key: k,
          value: stringifyRowValue(v),
          enabled: true,
          isStatic: false,
        }));
      return [...fixed, ...dynamic];
    },
    [staticRows, knownKeys],
  );

  const [rows, setRows] = React.useState<TRow[]>(() =>
    buildRows(initialConfig),
  );
  const [copied, setCopied] = React.useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedObjectRowId, setExpandedObjectRowId] = useState<string | null>(null);
  const [mainKeyDrafts, setMainKeyDrafts] = useState<Record<string, string>>({});
  const [mainKeyErrors, setMainKeyErrors] = useState<Record<string, string>>({});
  const [objectKeyDrafts, setObjectKeyDrafts] = useState<Record<string, string>>({});
  const [objectKeyErrors, setObjectKeyErrors] = useState<Record<string, string>>({});
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(initialConfig, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Re-sync only for true external changes; ignore our own round-trip coercions.
  const prevRef = React.useRef<Record<string, string>>(normalizeRecordForSync(initialConfig));
  React.useEffect(() => {
    const normalizedIncoming = normalizeRecordForSync(initialConfig);
    if (stableStringify(prevRef.current) !== stableStringify(normalizedIncoming)) {
      setRows(buildRows(initialConfig));
      setJsonText(JSON.stringify(initialConfig, null, 2));
      setJsonError(null);
      setShowPreview(Object.keys(initialConfig).length > 0);
      prevRef.current = normalizedIncoming;
    }
  }, [initialConfig, buildRows]);

  const derive = (r: TRow[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    r.forEach((row) => {
      if (row.enabled && row.key.trim()) out[row.key.trim()] = parseRowValue(row.value);
    });
    return out;
  };

  const push = (updated: TRow[]) => {
    setRows(updated);
    const nextJson = derive(updated);
    prevRef.current = normalizeRecordForSync(nextJson);
    setJsonText(JSON.stringify(nextJson, null, 2));
    setJsonError(null);
    onChange(nextJson);
  };

  const handleToggle = (idx: number) =>
    push(rows.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)));
  const handleKeyChange = (idx: number, val: string) => {
    setShowPreview(true);
    const row = rows[idx];
    if (!row) return;
    const hasDuplicate = rows.some(
      (r, i) => i !== idx && r.enabled && r.key.trim() !== "" && r.key === val && val.trim() !== "",
    );
    if (hasDuplicate) {
      setMainKeyDrafts((prev) => ({ ...prev, [row.id]: val }));
      setMainKeyErrors((prev) => ({ ...prev, [row.id]: "Key already exists in this object." }));
      return;
    }
    setMainKeyDrafts((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setMainKeyErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    push(rows.map((r, i) => (i === idx ? { ...r, key: val } : r)));
  };
  const handleValueChange = (idx: number, val: string) => {
    setShowPreview(true);
    push(rows.map((r, i) => (i === idx ? { ...r, value: val } : r)));
  };
  const handleRemove = (idx: number) => {
    const row = rows[idx];
    if (!row) return;
    setMainKeyDrafts((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setMainKeyErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    push(rows.filter((_, i) => i !== idx));
  };
  const handleAdd = () =>
    push([...rows, { id: nextRowId(), key: "", value: "", enabled: true, isStatic: false }]);
  const handleObjectToggle = (idx: number) => {
    const row = rows[idx];
    if (!row) return;

    if (expandedObjectRowId === row.id) {
      setExpandedObjectRowId(null);
      return;
    }

    const parsed = parseRowValue(row.value);
    const isValidContainer = isContainer(parsed);

    if (!isValidContainer) {
      const updatedRows = rows.map((r, i) =>
        i === idx ? { ...r, value: "{}" } : r,
      );
      push(updatedRows);
      setExpandedObjectRowId(row.id);
      return;
    }

    setExpandedObjectRowId(row.id);
  };
  const handleObjectPairKeyChange = (idx: number, objectIdx: number, nextKey: string) => {
    const row = rows[idx];
    if (!row) return;

    const parsed = parseRowValue(row.value);
    if (!isContainer(parsed)) return;

    if (Array.isArray(parsed)) {
      return;
    }

    const entries = Object.entries(parsed);
    if (!entries[objectIdx]) return;
    const draftId = `${row.id}::${objectIdx}`;
    const hasDuplicate = entries.some(
      ([existingKey], i) => i !== objectIdx && existingKey === nextKey && nextKey.trim() !== "",
    );
    if (hasDuplicate) {
      setObjectKeyDrafts((prev) => ({ ...prev, [draftId]: nextKey }));
      setObjectKeyErrors((prev) => ({ ...prev, [draftId]: "Key already exists in this object." }));
      return;
    }
    setObjectKeyDrafts((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
    setObjectKeyErrors((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
    entries[objectIdx] = [nextKey, entries[objectIdx][1]];
    const nextObj = Object.fromEntries(entries);
    push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextObj) } : r)));
  };
  const handleObjectPairValueChange = (idx: number, objectIdx: number, value: string) => {
    const row = rows[idx];
    if (!row) return;

    const parsed = parseRowValue(row.value);
    if (!isContainer(parsed)) return;

    if (Array.isArray(parsed)) {
      const nextArr = [...parsed];
      if (objectIdx in nextArr) {
        nextArr[objectIdx] = parseRowValue(value);
        push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextArr) } : r)));
      }
      return;
    }

    const entries = Object.entries(parsed);
    if (!entries[objectIdx]) return;
    entries[objectIdx] = [entries[objectIdx][0], parseRowValue(value)];
    const nextObj = Object.fromEntries(entries);
    push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextObj) } : r)));
  };
  const handleRemoveInnerObjectEntry = (idx: number, objectIdx: number) => {
    const row = rows[idx];
    if (!row) return;

    const parsed = parseRowValue(row.value);
    if (!isContainer(parsed)) return;

    const draftId = `${row.id}::${objectIdx}`;
    setObjectKeyDrafts((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
    setObjectKeyErrors((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });

    if (Array.isArray(parsed)) {
      const nextArr = parsed.filter((_, i) => i !== objectIdx);
      push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextArr) } : r)));
      return;
    }

    const entries = Object.entries(parsed);
    if (!entries[objectIdx]) return;
    const nextEntries = entries.filter((_, i) => i !== objectIdx);
    const nextObj = Object.fromEntries(nextEntries);
    push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextObj) } : r)));
  };
  const handleAddInnerObjectEntry = (idx: number) => {
    const row = rows[idx];
    if (!row) return;
    
    const parsed = parseRowValue(row.value);
    
    if (Array.isArray(parsed)) {
      const nextArr = [...parsed, ""];
      push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextArr) } : r)));
      setExpandedObjectRowId(row.id);
      return;
    }

    const entries = Object.entries(isPlainObject(parsed) ? parsed : {});
    entries.push(["", ""]);
    const nextObj = Object.fromEntries(entries);
    push(rows.map((r, i) => (i === idx ? { ...r, value: JSON.stringify(nextObj) } : r)));
    setExpandedObjectRowId(row.id);
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);

    try {
      const parsed = value.trim() ? JSON.parse(value) : {};
      if (!isPlainObject(parsed)) {
        setJsonError("JSON must be an object with key/value pairs.");
        return;
      }

      setJsonError(null);
      prevRef.current = normalizeRecordForSync(parsed);
      setRows(buildRows(parsed));
      onChange(parsed);
    } catch {
      setJsonError(
        "Invalid JSON. Fix the syntax to sync the key/value entries.",
      );
    }
  };

  const previewJson = derive(rows);
  const activeCount = Object.keys(previewJson).length;
  const enabledStaticCount = rows.filter((r) => r.isStatic && r.enabled).length;
  const totalStaticCount = rows.filter((r) => r.isStatic).length;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats bar ── */}
      {totalStaticCount > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-neutral-50 dark:bg-neutral-dark-200 border border-neutral-100 dark:border-neutral-700/60">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">
            Enabled
          </span>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
            {enabledStaticCount} / {totalStaticCount}
          </span>
          <span className="text-neutral-200 dark:text-neutral-700 mx-1">|</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">
            Total entries
          </span>
          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
            {activeCount}
          </span>
        </div>
      )}

      {/* ── Column headers ── */}
      <div
        className="grid items-center gap-2 px-3"
        style={{ gridTemplateColumns: "1.25rem 1fr 0.75rem 1fr 1.25rem" }}
      >
        <span />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          {keyLabel}
        </span>
        <span />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          {valueLabel}
        </span>
        <span />
      </div>

      {/* ── Row list ── */}
      <div className="space-y-1 pr-0.5">
        {rows.length === 0 && (
          <div className="flex items-center justify-center h-12 rounded-sm border border-dashed border-neutral-200 dark:border-neutral-700 text-xs text-neutral-400 dark:text-neutral-500">
            No entries yet — click &quot;Add entry&quot; below
          </div>
        )}

        {rows.map((row, idx) => {
          const parsedValue = parseRowValue(row.value);
          const isObject = isPlainObject(parsedValue);
          const isArray = Array.isArray(parsedValue);
          const isContainerRow = isObject || isArray;
          const isExpanded = expandedObjectRowId === row.id && isContainerRow;

          return (
          <div key={row.id} className="space-y-2">
            <div
              className={`grid items-center gap-2 px-2 py-1.5 rounded-xs border transition-colors ${
                row.enabled
                  ? "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-dark-100"
                  : "border-neutral-100 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-dark-200 opacity-50"
              } ${!row.isStatic ? "border-dashed !border-brand-200 dark:!border-brand-800/50" : ""}`}
              style={{ gridTemplateColumns: "1.25rem 1fr 0.75rem 1fr auto" }}
            >
            {/* Enable toggle */}
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={() => handleToggle(idx)}
              className="w-3.5 h-3.5 rounded border-neutral-300 accent-brand-600 cursor-pointer"
            />

            {/* Key */}
            {row.isStatic ? (
              <span
                className={`text-xs font-mono font-semibold truncate ${
                  row.enabled
                    ? "text-neutral-700 dark:text-neutral-200"
                    : "text-neutral-400 dark:text-neutral-600"
                }`}
                title={row.key}
              >
                {row.key}
              </span>
            ) : (
              <div className="space-y-0.5">
                <input
                  type="text"
                  value={mainKeyDrafts[row.id] ?? row.key}
                  onChange={(e) => handleKeyChange(idx, e.target.value)}
                  placeholder="key"
                  disabled={!row.enabled}
                  className={`h-7 w-full px-2 rounded-xs border bg-neutral-50 dark:bg-neutral-dark-100 text-neutral-900 dark:text-neutral-100 text-xs font-mono outline-none focus:ring-1 transition-colors disabled:opacity-50 min-w-0 ${
                    mainKeyErrors[row.id]
                      ? "border-error-400 focus:ring-error-500"
                      : "border-neutral-200 dark:border-neutral-700 focus:ring-brand-500"
                  }`}
                />
                {mainKeyErrors[row.id] && (
                  <p className="text-[10px] text-error-500 dark:text-error-400">
                    {mainKeyErrors[row.id]}
                  </p>
                )}
              </div>
            )}

            {/* Separator */}
            <span className="text-neutral-700 dark:text-neutral-400 text-lg font-bold  text-center select-none">
              <ArrowRight className="w-3 h-3" />
            </span>

            {/* Value */}
            <input
              type="text"
              value={
                isExpanded
                  ? isArray
                    ? "[...array]"
                    : "{...object}"
                  : row.value
              }
              onChange={(e) => {
                if (isExpanded) return;
                handleValueChange(idx, e.target.value);
              }}
              placeholder={isContainerRow ? "JSON value" : "value"}
              disabled={!row.enabled}
              readOnly={isExpanded}
              className="h-7 px-2 rounded-xs border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-dark-100 text-neutral-900 dark:text-neutral-100 text-xs outline-none focus:ring-1 focus:ring-brand-500 transition-colors disabled:opacity-50 w-full min-w-0"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleObjectToggle(idx)}
                disabled={!row.enabled}
                className={`p-0.5 rounded transition-colors disabled:opacity-40 ${
                  isExpanded
                    ? "text-brand-600 bg-brand-50 dark:bg-brand-900/20"
                    : "text-neutral-700 dark:text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                }`}
                title={isContainerRow ? "Edit JSON structure" : "Convert value to JSON"}
              >
                <Braces className="w-3.5 h-3.5" />
              </button>
              {isContainerRow && (
                <button
                  type="button"
                  onClick={() => handleAddInnerObjectEntry(idx)}
                  disabled={!row.enabled}
                  className="p-0.5 rounded-full text-neutral-700 dark:text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-40"
                  title="Add object field"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              {!row.isStatic ? (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-0.5 rounded-full text-neutral-700 dark:text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span />
              )}
            </div>
            </div>
            {isExpanded && (
              <div className="rounded-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Internal {isArray ? "array" : "object"} editor
                </p>
                <div className="space-y-1.5">
                  {Object.entries(parsedValue as object).length === 0 && (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">No fields yet.</div>
                  )}
                  {Object.entries(parsedValue as object).map(([k, v], objectIdx) => (
                    <div key={`${row.id}-obj-${objectIdx}`} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                      <div className="space-y-0.5">
                        <input
                          type="text"
                          value={objectKeyDrafts[`${row.id}::${objectIdx}`] ?? k}
                          onChange={(e) => handleObjectPairKeyChange(idx, objectIdx, e.target.value)}
                          placeholder={isArray ? "index" : "object key"}
                          readOnly={isArray}
                          className={`h-7 w-full px-2 rounded-xs border bg-neutral-50 dark:bg-neutral-dark-50 text-neutral-900 dark:text-neutral-100 text-xs font-mono outline-none focus:ring-1 transition-colors ${
                            isArray ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            objectKeyErrors[`${row.id}::${objectIdx}`]
                              ? "border-error-400 focus:ring-error-500"
                              : "border-neutral-200 dark:border-neutral-700 focus:ring-brand-500"
                          }`}
                        />
                        {objectKeyErrors[`${row.id}::${objectIdx}`] && (
                          <p className="text-[10px] text-error-500 dark:text-error-400">
                            {objectKeyErrors[`${row.id}::${objectIdx}`]}
                          </p>
                        )}
                      </div>
                      <input
                        type="text"
                        value={stringifyRowValue(v)}
                        onChange={(e) => handleObjectPairValueChange(idx, objectIdx, e.target.value)}
                        placeholder="object value"
                        className="h-7 px-2 rounded-xs border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-dark-50 text-neutral-900 dark:text-neutral-100 text-xs outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveInnerObjectEntry(idx, objectIdx)}
                        className="p-1 rounded-xs text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove object field"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )})}
      </div>

      {/* ── Footer: Add + preview toggle ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-dashed border-neutral-300 dark:border-neutral-600 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:border-brand-400 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add entry
        </button>

        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors ml-auto"
        >
          <Code2 className="w-3.5 h-3.5" />
          {showPreview ? "Hide" : "Show"} JSON
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Live JSON preview ── */}
      {showPreview && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
            <span className="w-2 h-2 rounded-full bg-red-400/70" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
            <span className="w-2 h-2 rounded-full bg-green-400/70" />
            <span className="ml-2 text-[10px] text-neutral-500 dark:text-neutral-500 font-mono">
              {previewLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(jsonText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              title="Copy JSON"
            >
              <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
            </button>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-600 font-mono">
              {activeCount} entries
            </span>
          </div>
          <div className="bg-neutral-200 dark:bg-neutral-950">
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={Math.max(14, jsonText.split("\n").length)}
              spellCheck={false}
              className="w-full p-3 text-xs font-mono leading-relaxed overflow-auto bg-white text-neutral-800 dark:bg-neutral-950 dark:text-brand-300 outline-none resize-y min-h-[280px] max-h-[520px]"
            />

            {jsonError && (
              <div className="px-3 pb-3 text-xs text-error-500 dark:text-error-dark-500">
                {jsonError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};