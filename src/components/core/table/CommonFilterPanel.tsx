import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { debounce } from "lodash";
import {
  X,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import Input from "../../common/Input";
import Button from "../../common/Button";
import DebouncedSearchInput from "./DebouncedSearchInput";
import AsyncSelect, { type Option } from "../../common/AsyncSelect";
import CommonDateRangeSelector from "../../common/CommonDataRangeSelector";
import { format } from "date-fns";

export interface FilterFieldOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  helperText?: string;
  type?:
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "async-select"
  | "async-multiselect"
  | "daterange";
  placeholder?: string;
  options?: FilterFieldOption[];
  /**
   * When type is 'async-multiselect', called to load dropdown options.
   * Receives the current search string when `apiSearch` is true.
   */
  loadOptions?: (search?: string) => Promise<Option[]>;
  /**
   * When true, typing in the async-multiselect sends the search to `loadOptions`
   * (server-side search). When false (default), options are loaded once and
   * filtered locally.
   */
  apiSearch?: boolean;
  startKey?: string;
  endKey?: string;
  min?: number;
  max?: number;
}

export type FilterValues = Record<string, string>;
type AuditFilterDateMode = "date" | "daterange";

export type AuditFilterFieldOptions = {
  CreatedBy?: boolean;
  UpdatedBy?: boolean;
  CreatedAt?: boolean;
  UpdatedAt?: boolean;
  userLoadOptions?: (search?: string) => Promise<Array<{ value: string; label: string }>>;
  dateMode?: AuditFilterDateMode;
  createdByLabel?: string;
  updatedByLabel?: string;
  createdAtLabel?: string;
  updatedAtLabel?: string;
  createdAtKey?: string;
  updatedAtKey?: string;
  createdAtStartKey?: string;
  createdAtEndKey?: string;
  updatedAtStartKey?: string;
  updatedAtEndKey?: string;
};

/** Shared filter presets & parsers live on the default export (Fast Refresh–safe). */
const BOOL_FILTER_OPTIONS: FilterFieldOption[] = [
  { value: "", label: "All" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const ACTIVE_INACTIVE_FILTER_OPTIONS: FilterFieldOption[] = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const ASC_DESC_SORT_OPTIONS: FilterFieldOption[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

const DESC_ASC_SORT_OPTIONS: FilterFieldOption[] = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

function createFilterDefaults({
  keys = [],
  sortBy = "created_at",
  sortOrder = "desc",
}: {
  keys?: string[];
  sortBy?: string;
  sortOrder?: string;
} = {}): FilterValues {
  return keys.reduce<FilterValues>(
    (acc, key) => {
      acc[key] = "";
      return acc;
    },
    { sort_by: sortBy, sort_order: sortOrder },
  );
}

function buildSortFilterFields({
  sortOptions,
  sortByLabel = "Sort By",
  sortOrderLabel = "Sort Order",
  sortOrderOptions = ASC_DESC_SORT_OPTIONS,
}: {
  sortOptions: FilterFieldOption[];
  sortByLabel?: string;
  sortOrderLabel?: string;
  sortOrderOptions?: FilterFieldOption[];
}): FilterFieldConfig[] {
  return [
    { key: "sort_by", label: sortByLabel, type: "select", options: sortOptions },
    {
      key: "sort_order",
      label: sortOrderLabel,
      type: "select",
      options: sortOrderOptions,
    },
  ];
}

function buildAsyncUserFilterField({
  key = "created_by",
  label = "Created By",
  placeholder = "Type to search users...",
  loadOptions,
}: {
  key?: string;
  label?: string;
  placeholder?: string;
  loadOptions: (search?: string) => Promise<Array<{ value: string; label: string }>>;
}): FilterFieldConfig {
  return {
    key,
    label,
    type: "async-multiselect",
    apiSearch: true,
    placeholder,
    loadOptions,
  };
}

function buildDateFilterField({
  key,
  label,
  helperText,
}: {
  key: string;
  label: string;
  helperText?: string;
}): FilterFieldConfig {
  return { key, label, helperText, type: "date" };
}

function buildDateRangeFilterField({
  key,
  label,
  startKey,
  endKey,
}: {
  key: string;
  label: string;
  startKey: string;
  endKey: string;
}): FilterFieldConfig {
  return { key, label, type: "daterange", startKey, endKey };
}

function buildAuditFilterFields({
  CreatedBy = false,
  UpdatedBy = false,
  CreatedAt = false,
  UpdatedAt = false,
  userLoadOptions,
  dateMode = "date",
  createdByLabel = "Created By",
  updatedByLabel = "Updated By",
  createdAtLabel = "Created At",
  updatedAtLabel = "Updated At",
  createdAtKey = "created_at",
  updatedAtKey = "updated_at",
  createdAtStartKey = "created_at_start",
  createdAtEndKey = "created_at_end",
  updatedAtStartKey = "updated_at_start",
  updatedAtEndKey = "updated_at_end",
}: AuditFilterFieldOptions = {}): FilterFieldConfig[] {
  const fields: FilterFieldConfig[] = [];
  if (CreatedBy && userLoadOptions) {
    fields.push(
      buildAsyncUserFilterField({
        key: "created_by",
        label: createdByLabel,
        loadOptions: userLoadOptions,
      }),
    );
  }
  if (UpdatedBy && userLoadOptions) {
    fields.push(
      buildAsyncUserFilterField({
        key: "updated_by",
        label: updatedByLabel,
        loadOptions: userLoadOptions,
      }),
    );
  }
  if (dateMode === "daterange") {
    if (CreatedAt) {
      fields.push(
        buildDateRangeFilterField({
          key: createdAtKey,
          label: createdAtLabel,
          startKey: createdAtStartKey,
          endKey: createdAtEndKey,
        }),
      );
    }
    if (UpdatedAt) {
      fields.push(
        buildDateRangeFilterField({
          key: updatedAtKey,
          label: updatedAtLabel,
          startKey: updatedAtStartKey,
          endKey: updatedAtEndKey,
        }),
      );
    }
    return fields;
  }
  if (CreatedAt) {
    fields.push(buildDateFilterField({ key: createdAtKey, label: createdAtLabel }));
  }
  if (UpdatedAt) {
    fields.push(buildDateFilterField({ key: updatedAtKey, label: updatedAtLabel }));
  }
  return fields;
}

// ─── Concise filter-field builders (mirror column-builder pattern) ─────────────

function buildSelectFilter(
  key: string,
  label: string,
  options: FilterFieldOption[],
): FilterFieldConfig {
  return { key, label, type: "select", options };
}

function buildNumberFilter(key: string, label: string): FilterFieldConfig {
  return { key, label, type: "number" };
}

function buildTextFilter(key: string, label: string): FilterFieldConfig {
  return { key, label, type: "text" };
}

function buildBoolSelectFilter(key: string, label: string): FilterFieldConfig {
  return { key, label, type: "select", options: BOOL_FILTER_OPTIONS };
}

function buildActiveStatusFilter(key: string, label: string): FilterFieldConfig {
  return { key, label, type: "select", options: ACTIVE_INACTIVE_FILTER_OPTIONS };
}

function buildAsyncMultiselectFilter(
  key: string,
  label: string,
  loadOptions: (search?: string) => Promise<Option[]>,
  opts: { apiSearch?: boolean; placeholder?: string } = {},
): FilterFieldConfig {
  return {
    key,
    label,
    type: "async-multiselect",
    apiSearch: opts.apiSearch ?? true,
    placeholder: opts.placeholder,
    loadOptions,
  };
}

function buildAsyncSelectFilter(
  key: string,
  label: string,
  loadOptions: (search?: string) => Promise<Option[]>,
  opts: { apiSearch?: boolean; placeholder?: string } = {},
): FilterFieldConfig {
  return {
    key,
    label,
    type: "async-select",
    apiSearch: opts.apiSearch ?? true,
    placeholder: opts.placeholder,
    loadOptions,
  };
}

/** List pages: API query params from stored filter strings. */
function parseMultiFilter(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) =>
      typeof item === "object" && item !== null && "value" in item
        ? String((item as { value: unknown }).value)
        : String(item),
    );
  } catch {
    return [];
  }
}

function parseSingleFilter(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (!first) return undefined;
      return typeof first === "object" && first !== null && "value" in first
        ? String((first as { value: unknown }).value)
        : String(first);
    }
    if (typeof parsed === "object" && parsed !== null && "value" in parsed) {
      return String((parsed as { value: unknown }).value);
    }
    return typeof parsed === "string" ? parsed : undefined;
  } catch {
    return raw;
  }
}

/** Stored async-multiselect JSON → AsyncSelect tags. */
function parseMultiSelectOptions(raw: string): Option[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown) =>
        typeof item === "object" && item !== null && "value" in item
          ? {
            value: String((item as { value: unknown }).value),
            label: String(
              (item as { label?: unknown }).label ?? (item as { value: unknown }).value,
            ),
          }
          : { value: String(item), label: String(item) },
      )
      .filter((o) => o.value.trim() !== "");
  } catch {
    return [];
  }
}

/** Stored async-select JSON → single AsyncSelect value. */
function parseSingleSelectOption(raw: string): Option | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (!first) return null;
      const opt =
        typeof first === "object" && first !== null && "value" in first
          ? {
            value: String((first as { value: string }).value),
            label: String(
              (first as { label?: string }).label ?? (first as { value: string }).value,
            ),
          }
          : { value: String(first), label: String(first) };
      if (!opt.value.trim()) return null;
      return opt;
    }

    if (typeof parsed === "object" && parsed !== null && "value" in parsed) {
      const v = String((parsed as { value: string }).value);
      if (!v.trim()) return null;
      return {
        value: v,
        label: String(
          (parsed as { label?: string }).label ?? v,
        ),
      };
    }
  } catch {
    return { value: raw, label: raw };
  }

  return null;
}

/** Non-empty filter strings worth persisting to URL (cleared async-multi is "" not "[]"). */
function shouldWriteFilterToUrl(raw: string | undefined): boolean {
  const t = (raw ?? "").trim();
  if (!t) return false;
  if (t === "[]") return false;
  return true;
}

function setBooleanFilterParam(
  base: Record<string, unknown>,
  filters: FilterValues,
  key: string,
) {
  const value = filters[key];
  if (value === "true" || value === "false") {
    base[key] = value === "true";
  }
}

function setScalarFilterParam(
  base: Record<string, unknown>,
  filters: FilterValues,
  key: string,
) {
  const value = filters[key]?.trim();
  if (value) base[key] = value;
}

function setMultiSelectFilterParam(
  base: Record<string, unknown>,
  filters: FilterValues,
  key: string,
) {
  const value = parseMultiFilter(filters[key]);
  if (value.length > 0) base[key] = value;
}

function setSingleSelectFilterParam(
  base: Record<string, unknown>,
  filters: FilterValues,
  key: string,
) {
  const value = parseSingleFilter(filters[key]);
  if (value) base[key] = value;
}

type CommonFilterPanelProps = {
  open: boolean;
  onClose: () => void;
  filterFields: FilterFieldConfig[];
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  title?: string;
  entityKey: string;
  defaultFilters?: FilterValues;
  className?: string;
};

const getFiltersKey = (entity: string) => `${entity}TableFilters`;
const getFilterQueryParamKey = (entity: string, key: string) =>
  `f_${entity}_${key}`;

const CommonFilterPanelInner: React.FC<CommonFilterPanelProps> = ({
  open,
  onClose,
  filterFields,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  title = "Advanced Filters",
  entityKey,
  defaultFilters = {},
  className = "",
}) => {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);
  const [activeTab, setActiveTab] = useState<"filters" | "saved">("filters");
  const [savedFilters, setSavedFilters] = useState<
    Array<{ name: string; filters: FilterValues }>
  >([]);
  const [newFilterName, setNewFilterName] = useState("");
  const [autoFilter, setAutoFilter] = useState(true);
  const hasHydratedFromUrlRef = useRef(false);
  const localFiltersRef = useRef<FilterValues>(filters);
  const fieldKeysForUrl = useMemo(() => {
    const keys = new Set<string>(Object.keys(defaultFilters));
    filterFields.forEach((field) => {
      keys.add(field.key);
      if (field.startKey) keys.add(field.startKey);
      if (field.endKey) keys.add(field.endKey);
    });
    return Array.from(keys);
  }, [defaultFilters, filterFields]);

  const writeFiltersToUrl = useCallback(
    (nextFilters: FilterValues) => {
      if (typeof window === "undefined") return;
      const currentUrl = new URL(window.location.href);
      const params = currentUrl.searchParams;

      fieldKeysForUrl.forEach((key) => {
        params.delete(getFilterQueryParamKey(entityKey, key));
      });

      fieldKeysForUrl.forEach((key) => {
        const raw = nextFilters[key] ?? "";
        if (shouldWriteFilterToUrl(raw)) {
          params.set(getFilterQueryParamKey(entityKey, key), raw.trim());
        }
      });

      const nextSearch = params.toString();
      const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${currentUrl.hash}`;
      window.history.replaceState(null, "", nextUrl);
    },
    [entityKey, fieldKeysForUrl]
  );

  const debouncedPropagate = useMemo(
    () =>
      debounce(() => {
        const next = localFiltersRef.current;
        onFiltersChange(next);
        writeFiltersToUrl(next);
      }, 300),
    [onFiltersChange, writeFiltersToUrl],
  );

  useEffect(() => {
    return () => {
      debouncedPropagate.cancel();
    };
  }, [debouncedPropagate]);

  useEffect(() => {
    localFiltersRef.current = localFilters;
  }, [localFilters]);

  useEffect(() => {
    debouncedPropagate.cancel();
    setLocalFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasHydratedFromUrlRef.current) return;
    hasHydratedFromUrlRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlFilters: FilterValues = {};
    let hasAnyUrlFilter = false;

    fieldKeysForUrl.forEach((key) => {
      const value = params.get(getFilterQueryParamKey(entityKey, key));
      if (value == null) return;
      const trimmed = value.trim();
      const normalized = trimmed === "[]" ? "" : value;
      urlFilters[key] = normalized;
      if (normalized.trim() !== "") hasAnyUrlFilter = true;
    });

    if (!hasAnyUrlFilter) return;

    const mergedFilters = { ...defaultFilters, ...filters, ...urlFilters };
    setLocalFilters(mergedFilters);
    onFiltersChange(mergedFilters);
    onApplyFilters();
  }, [
    defaultFilters,
    entityKey,
    fieldKeysForUrl,
    filters,
    onApplyFilters,
    onFiltersChange,
  ]);

  // Load saved filters from localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(`${getFiltersKey(entityKey)}_saved`);
      if (saved) {
        try {
          setSavedFilters(JSON.parse(saved));
        } catch (error) {
          console.error("Error loading saved filters:", error);
        }
      }
    }
  }, [open, entityKey]);

  const handleFilterChange = (
    key: string,
    value: string,
    opts?: { debouncePropagate?: boolean },
  ) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    if (!autoFilter) return;
    if (opts?.debouncePropagate) {
      debouncedPropagate();
    } else {
      debouncedPropagate.cancel();
      onFiltersChange(newFilters);
      writeFiltersToUrl(newFilters);
    }
  };

  const handleMultiFilterChange = (changes: Record<string, string>) => {
    const newFilters = { ...localFilters, ...changes };
    setLocalFilters(newFilters);
    if (!autoFilter) return;
    debouncedPropagate.cancel();
    onFiltersChange(newFilters);
    writeFiltersToUrl(newFilters);
  };

  const toSingleOption = (
    value: Option | readonly Option[] | null,
  ): Option | null => {
    if (!value || Array.isArray(value)) return null;
    return value as Option;
  };

  // const handleApply = () => {
  //   onApplyFilters();
  //   onClose();
  // };
  const handleApply = () => {
    debouncedPropagate.cancel();
    onFiltersChange(localFilters); // push latest local state up
    writeFiltersToUrl(localFilters);
    onApplyFilters();
    onClose();
  };

  const handleClear = () => {
    debouncedPropagate.cancel();
    setLocalFilters(defaultFilters);
    writeFiltersToUrl(defaultFilters);
    onClearFilters();
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;

    const newSavedFilters = [
      ...savedFilters,
      { name: newFilterName.trim(), filters: localFilters },
    ];
    setSavedFilters(newSavedFilters);
    localStorage.setItem(
      `${getFiltersKey(entityKey)}_saved`,
      JSON.stringify(newSavedFilters),
    );
    setNewFilterName("");
  };

  const handleLoadFilter = (savedFilter: FilterValues) => {
    debouncedPropagate.cancel();
    setLocalFilters(savedFilter);
    writeFiltersToUrl(savedFilter);
    onFiltersChange(savedFilter);
  };

  const handleDeleteFilter = (index: number) => {
    const newSavedFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newSavedFilters);
    localStorage.setItem(
      `${getFiltersKey(entityKey)}_saved`,
      JSON.stringify(newSavedFilters),
    );
  };

  const getFieldIcon = (type?: string) => {
    switch (type) {
      case "date":
        return <Calendar className="w-4 h-4" />;
      case "number":
        return <Search className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getFieldType = (type?: string) => {
    switch (type) {
      case "date":
        return "date";
      case "number":
        return "number";
      default:
        return "text";
    }
  };

  const getFieldPlaceholder = (type?: string, label?: string) => {
    switch (type) {
      case "date":
        return "Select date...";
      case "number":
        return `Enter ${label?.toLowerCase()}...`;
      case "select":
        return `Select ${label?.toLowerCase()}...`;
      default:
        return `Search ${label?.toLowerCase()}...`;
    }
  };

  const isTextSearchFilterField = (field: FilterFieldConfig) =>
    field.type === "text" || field.type === undefined;

  const renderField = (field: FilterFieldConfig) => {
    const value = localFilters[field.key] ?? "";
    if (field.type === "async-multiselect" && field.loadOptions) {
      // Parse back stored {value, label}[] so selected tags show real names
      const selectedOptions: Option[] = parseMultiSelectOptions(value);

      return (
        <AsyncSelect
          loadOptions={field.loadOptions}
          apiSearch={field.apiSearch}
          isMulti
          value={selectedOptions}
          placeholder={
            field.placeholder ?? getFieldPlaceholder(field.type, field.label)
          }
          onChange={(v) => {
            // Store full {value, label} objects so labels survive re-render
            const arr = Array.isArray(v)
              ? v.map((x) => ({ value: x.value, label: x.label }))
              : [];
            handleFilterChange(
              field.key,
              arr.length > 0 ? JSON.stringify(arr) : "",
            );
          }}
          menuPortalTarget={document.body}
        />
      );
    }
    if (field.type === "async-select" && field.loadOptions) {
      const selectedOption = parseSingleSelectOption(value);

      return (
        <AsyncSelect
          loadOptions={field.loadOptions}
          apiSearch={field.apiSearch}
          value={selectedOption}
          placeholder={
            field.placeholder ?? getFieldPlaceholder(field.type, field.label)
          }
          onChange={(v) => {
            const selected = toSingleOption(v);
            const nextValue =
              selected && String(selected.value ?? "").trim()
                ? JSON.stringify({
                  value: selected.value,
                  label: selected.label,
                })
                : "";
            handleFilterChange(field.key, nextValue);
          }}
          menuPortalTarget={document.body}
        />
      );
    }
    if (field.type === "select" && field.options) {
      const selectOpts = field.options.map(o => ({ value: o.value, label: o.label }));
      const currentOpt = selectOpts.find(o => o.value === value) ?? null;
      return (
        <AsyncSelect
          loadOptions={async () => selectOpts}
          value={currentOpt}
          onChange={(v) =>
            handleFilterChange(field.key, String((v as import('react-select').SingleValue<Option>)?.value ?? ""))
          }
          isClearable={false}
          menuPortalTarget={document.body}
        />
      );
    }
    if (field.type === "daterange" && field.startKey && field.endKey) {
      const startStr = localFilters[field.startKey];
      const endStr = localFilters[field.endKey];
      const hasSelectedRange = Boolean(startStr && endStr);
      const today = new Date();
      const parsedStartDate = startStr ? new Date(startStr) : null;
      const parsedEndDate = endStr ? new Date(endStr) : null;
      const startDate =
        parsedStartDate && !Number.isNaN(parsedStartDate.getTime())
          ? parsedStartDate
          : today;
      const endDate =
        parsedEndDate && !Number.isNaN(parsedEndDate.getTime())
          ? parsedEndDate
          : startDate;
      return (
        <CommonDateRangeSelector
          dateRange={{ startDate, endDate }}
          isEmpty={!hasSelectedRange}
          placeholder="Select date range"
          onClear={() =>
            handleMultiFilterChange({
              [field.startKey!]: "",
              [field.endKey!]: "",
            })
          }
          onDateRangeChange={(range) => {
            handleMultiFilterChange({
              [field.startKey!]: format(range.startDate, "yyyy-MM-dd"),
              [field.endKey!]: format(range.endDate, "yyyy-MM-dd"),
            });
          }}
        />
      );
    }
    if (isTextSearchFilterField(field)) {
      return (
        <DebouncedSearchInput
          value={value}
          onChange={(v) =>
            handleFilterChange(field.key, v, { debouncePropagate: true })
          }
          debounceMs={0}
          trimOnCommit={false}
          placeholder={
            field.placeholder ?? getFieldPlaceholder(field.type, field.label)
          }
          className="w-full"
          inputClassName="w-full"
        />
      );
    }
    return (
      <Input
        type={getFieldType(field.type)}
        placeholder={getFieldPlaceholder(field.type, field.label)}
        value={value}
        onChange={(e) =>
          handleFilterChange(field.key, e.target.value, {
            debouncePropagate: true,
          })
        }
        className="w-full"
        min={field.min}
        max={field.max}
      />
    );
  };

  const panelContent = (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
        aria-hidden
      />
      {/* Outer wrapper: fixed only (no glass) so position is never overridden by glass-morphism-card */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[101] flex h-full w-[min(24rem,100vw)] max-w-full flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"
          } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-panel-title"
      >
        <div className={`h-full w-full flex flex-col border-l border-neutral-200 dark:border-neutral-dark-200 bg-white/90 dark:bg-neutral-dark-100/95 backdrop-blur-md overflow-hidden`}>
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 p-2 rounded-xs bg-brand-50 dark:bg-brand-600/10">
                <Filter className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="min-w-0">
                <h2
                  id="filter-panel-title"
                  className="font-semibold text-base text-neutral-900 dark:text-neutral-dark-950 truncate"
                >
                  {title}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-dark-500 mt-0.5">
                  {filterFields?.length || 0} options
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* ── Auto Filter toggle ── */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500">
                  Auto
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoFilter}
                  onClick={() => setAutoFilter((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${autoFilter
                    ? "bg-brand-600 dark:bg-brand-500"
                    : "bg-neutral-300 dark:bg-neutral-dark-400"
                    }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoFilter ? "translate-x-4" : "translate-x-1"
                      }`}
                  />
                </button>
              </label>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-dark-900 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="shrink-0 flex border-b border-neutral-200 dark:border-neutral-dark-200 bg-neutral-100 dark:bg-neutral-dark-100">
            <button
              type="button"
              onClick={() => setActiveTab("filters")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "filters"
                ? "text-brand-600 dark:text-brand-400 bg-white dark:bg-neutral-dark-100 border-b-2 border-brand-600 -mb-px"
                : "text-neutral-600 dark:text-neutral-dark-500 hover:text-neutral-900 dark:hover:text-neutral-dark-950"
                }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "saved"
                ? "text-brand-600 dark:text-brand-400 bg-white dark:bg-neutral-dark-100 border-b-2 border-brand-600 -mb-px"
                : "text-neutral-600 dark:text-neutral-dark-500 hover:text-neutral-900 dark:hover:text-neutral-dark-950"
                }`}
            >
              <Save className="w-4 h-4" />
              Saved ({savedFilters.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === "filters" ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                  {filterFields?.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500 uppercase tracking-wider">
                        Filter by
                      </p>
                      {filterFields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-dark-900">
                            {getFieldIcon(field.type)}
                            {field.label}
                          </label>
                          {renderField(field)}
                          {field.helperText && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-dark-500">
                              {field.helperText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <Filter className="w-12 h-12 text-neutral-300 dark:text-neutral-dark-400 mb-3" />
                      <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-dark-950 mb-1">
                        No filters available
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
                        Filter fields will appear when configured
                      </p>
                    </div>
                  )}
                </div>
                {filterFields?.length > 0 && (
                  <div className="shrink-0 px-5 py-4 border-t border-neutral-200 dark:border-neutral-dark-200 bg-neutral-100 dark:bg-neutral-dark-100">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500 mb-2">
                      Save current filters
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Filter name..."
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveFilter}
                        disabled={!newFilterName.trim()}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
                {savedFilters.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500 uppercase tracking-wider mb-3">
                      Saved filters
                    </p>
                    {savedFilters.map((savedFilter, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 hover:border-brand-500 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-dark-950 truncate">
                            {savedFilter.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleDeleteFilter(index)}
                            className="shrink-0 p-1.5 rounded-xs text-neutral-400 hover:text-error-500 hover:bg-error-500/10 transition-colors"
                            aria-label="Delete saved filter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-dark-500 mb-3 line-clamp-2">
                          {Object.entries(savedFilter.filters)
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            .filter(([_, value]) => value)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ") || "No active filters"}
                        </p>
                        <Button
                          onClick={() => handleLoadFilter(savedFilter.filters)}
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Load
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Save className="w-12 h-12 text-neutral-300 dark:text-neutral-dark-400 mb-3" />
                    <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-dark-950 mb-1">
                      No saved filters
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
                      Save current filters to use them later
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100/50">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear
              </Button>
              <Button onClick={handleApply} className="flex-1 gap-2">
                <Filter className="w-4 h-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(
    <RemoveScroll enabled={open}>{panelContent}</RemoveScroll>,
    document.body,
  );
};

CommonFilterPanelInner.displayName = "CommonFilterPanel";

// ─── Statics (parsers + option presets) attached for backward compat ──────────

type CommonFilterPanelStatics = {
  BOOL_FILTER_OPTIONS: FilterFieldOption[];
  ACTIVE_INACTIVE_FILTER_OPTIONS: FilterFieldOption[];
  ASC_DESC_SORT_OPTIONS: FilterFieldOption[];
  DESC_ASC_SORT_OPTIONS: FilterFieldOption[];
  parseMultiFilter: typeof parseMultiFilter;
  parseSingleFilter: typeof parseSingleFilter;
  parseMultiSelectOptions: typeof parseMultiSelectOptions;
  parseSingleSelectOption: typeof parseSingleSelectOption;
  setBooleanFilterParam: typeof setBooleanFilterParam;
  setScalarFilterParam: typeof setScalarFilterParam;
  setMultiSelectFilterParam: typeof setMultiSelectFilterParam;
  setSingleSelectFilterParam: typeof setSingleSelectFilterParam;
  createFilterDefaults: typeof createFilterDefaults;
  buildSortFilterFields: typeof buildSortFilterFields;
  buildAsyncUserFilterField: typeof buildAsyncUserFilterField;
  buildDateFilterField: typeof buildDateFilterField;
  buildDateRangeFilterField: typeof buildDateRangeFilterField;
  buildAuditFilterFields: typeof buildAuditFilterFields;
  buildSelectFilter: typeof buildSelectFilter;
  buildNumberFilter: typeof buildNumberFilter;
  buildTextFilter: typeof buildTextFilter;
  buildBoolSelectFilter: typeof buildBoolSelectFilter;
  buildActiveStatusFilter: typeof buildActiveStatusFilter;
  buildAsyncMultiselectFilter: typeof buildAsyncMultiselectFilter;
  buildAsyncSelectFilter: typeof buildAsyncSelectFilter;
};

export type CommonFilterPanelWithUtils = React.FC<CommonFilterPanelProps> &
  CommonFilterPanelStatics;

const CommonFilterPanel = Object.assign(CommonFilterPanelInner, {
  BOOL_FILTER_OPTIONS,
  ACTIVE_INACTIVE_FILTER_OPTIONS,
  ASC_DESC_SORT_OPTIONS,
  DESC_ASC_SORT_OPTIONS,
  parseMultiFilter,
  parseSingleFilter,
  parseMultiSelectOptions,
  parseSingleSelectOption,
  setBooleanFilterParam,
  setScalarFilterParam,
  setMultiSelectFilterParam,
  setSingleSelectFilterParam,
  createFilterDefaults,
  buildSortFilterFields,
  buildAsyncUserFilterField,
  buildDateFilterField,
  buildDateRangeFilterField,
  buildAuditFilterFields,
  buildSelectFilter,
  buildNumberFilter,
  buildTextFilter,
  buildBoolSelectFilter,
  buildActiveStatusFilter,
  buildAsyncMultiselectFilter,
  buildAsyncSelectFilter,
}) as CommonFilterPanelWithUtils;

export default CommonFilterPanel;
