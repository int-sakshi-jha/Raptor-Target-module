import { Copy, Gauge, RotateCcw, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import type { SingleValue } from "react-select";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import { useGetTagTemplateDetailsQuery } from "@/services/operations/tagTemplateAPI";
import { buildTagKeyFieldOptions } from "../core/tagTemplateRuntime";
import { PLANT_METRIC_OPTIONS } from "./widgetConfigFields";
import type { DashboardWidgetInstance, GridLayoutItem } from "../types/document";
import { DEFAULT_ROW_HEIGHT, GRID_COLS } from "../core/constants";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import { WIDGET_CONFIG_FIELDS, type WidgetConfigField } from "./widgetConfigFields";
import {
  PLANT_STAT_ACCENT_OPTIONS,
  PLANT_STAT_METRIC_META,
} from "@/components/core/plant-dashboard/plant-stats/plantStatCardTheme";
import type { PlantDashboardAccent } from "@/components/core/plant-dashboard/shared/plantDashboardTheme";
import type { PlantStatsMetricId } from "@/components/core/plant-dashboard/shared/dashboardTypes";
import {
  clampGridLayoutItem,
  inferWidgetSizePreset,
  WIDGET_SIZE_PRESET_OPTIONS,
  type WidgetSizePreset,
} from "./widgetSizePresets";
import { WIDGET_CATEGORY_THEME, WIDGET_LIBRARY_ICONS } from "./widgetPaletteTheme";

interface WidgetInspectorProps {
  plantId?: string;
  widget: DashboardWidgetInstance | null;
  variant?: "sidebar" | "drawer";
  onClose?: () => void;
  onUpdate: (patch: Partial<DashboardWidgetInstance>) => void;
  onApplySizePreset: (preset: WidgetSizePreset) => void;
  onApplyLayout: (layout: GridLayoutItem) => void;
  onDuplicate: () => void;
  onResetConfig: () => void;
  onRemove: () => void;
}

function inspectorShellClass(variant: "sidebar" | "drawer") {
  return `dashboard-widget-inspector flex h-full flex-col border-neutral-200/80 bg-white dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100 ${
    variant === "sidebar"
      ? "w-full shrink-0 border-l sm:w-72 lg:w-80"
      : "w-full border-l shadow-xl"
  }`;
}

const inputClass =
  "w-full rounded-sm border border-neutral-200/80 bg-white px-2 py-1.5 text-xs dark:border-neutral-dark-300/60 dark:bg-neutral-dark-50";

const selectClass =
  "w-full rounded-sm border border-neutral-200/80 bg-white px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-50 dark:text-neutral-dark-950";

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-neutral-200/80 bg-neutral-50/50 p-2 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/20">
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const GRID_COLS_LG = GRID_COLS.lg;

export function WidgetInspector({
  plantId,
  widget,
  variant = "sidebar",
  onClose,
  onUpdate,
  onApplySizePreset,
  onApplyLayout,
  onDuplicate,
  onResetConfig,
  onRemove,
}: WidgetInspectorProps) {
  if (!widget) {
    return (
      <aside className={inspectorShellClass(variant)}>
        <div className="flex items-center justify-between gap-1.5 border-b border-neutral-200/80 px-2 py-1.5 dark:border-neutral-dark-300/60">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-dark-600">
            Widget settings
          </h3>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-neutral-200/80 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center text-xs text-neutral-500 dark:text-neutral-dark-600">
          <p>Select a widget to edit its layout, title, and data bindings.</p>
          <div className="rounded-xs border border-dashed border-neutral-200/80 px-3 py-2 text-[10px] leading-relaxed dark:border-neutral-dark-300/60">
            <p className="font-medium text-neutral-600 dark:text-neutral-dark-700">Quick tips</p>
            <p className="mt-1">Drag the top bar to move a widget</p>
            <p>Resize from the bottom or right edge</p>
            <p>Add widgets from the library on the left</p>
          </div>
        </div>
      </aside>
    );
  }

  const def = WIDGET_LIBRARY_BY_TYPE[widget.type];
  const theme = def ? WIDGET_CATEGORY_THEME[def.category] : null;
  const WidgetIcon = def ? (WIDGET_LIBRARY_ICONS[def.icon] ?? Gauge) : Gauge;
  const configFields = WIDGET_CONFIG_FIELDS[widget.type] ?? [];
  const currentLayout =
    widget.layouts.lg ?? def?.defaultSize ?? { x: 0, y: 0, w: 6, h: 4 };

  const setConfigValue = (key: string, value: unknown) => {
    onUpdate({ config: { ...widget.config, [key]: value } });
  };

  return (
    <aside className={inspectorShellClass(variant)}>
      <div className="flex items-center justify-between gap-1.5 border-b border-neutral-200/80 bg-gradient-to-br from-brand-500/8 via-white to-white px-2 py-1.5 dark:border-neutral-dark-300/60 dark:from-brand-500/10 dark:via-neutral-dark-100 dark:to-neutral-dark-100">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-dark-800">
          Widget settings
        </h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-neutral-200/80 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        <div
          className={`overflow-hidden rounded-sm border bg-gradient-to-r ${theme?.gradient ?? "from-neutral-100/50 to-transparent"} ${theme?.border ?? "border-neutral-200/80"}`}
        >
          <div className="flex items-start gap-2 bg-white/90 p-2 dark:bg-neutral-dark-100/90">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm ${theme?.iconBg ?? "bg-neutral-100"}`}
            >
              <WidgetIcon className={`h-3.5 w-3.5 ${theme?.iconText ?? "text-neutral-600"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1.5">
                <p className="min-w-0 text-[11px] font-semibold leading-tight text-neutral-900 dark:text-neutral-dark-950">
                  {def?.label ?? widget.type}
                </p>
                <StatusBadge status={def?.status ?? "planned"} />
              </div>
              {def?.description ? (
                <p className="mt-0.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-dark-600">
                  {def.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <InspectorSection title="Display">
          <label className="block text-[11px]">
            <span className="mb-1 block text-neutral-500">Title</span>
            <input
              type="text"
              value={widget.title ?? ""}
              onChange={(event) => onUpdate({ title: event.target.value })}
              placeholder={def?.label}
              className={inputClass}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={widget.config.showHeading === true}
              onChange={(event) =>
                setConfigValue("showHeading", event.target.checked ? true : undefined)
              }
              className="rounded-sm border-neutral-300 text-brand-600 focus:ring-brand-500/30"
            />
            <span className="text-neutral-700 dark:text-neutral-dark-800">Show widget heading</span>
          </label>
        </InspectorSection>

        <InspectorSection title="Layout on grid">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {GRID_COLS_LG} columns · {DEFAULT_ROW_HEIGHT}px row height · drag handle to move
          </p>

          <LayoutFields
            layout={currentLayout}
            def={def}
            onApply={(patch) =>
              onApplyLayout(clampGridLayoutItem({ ...currentLayout, ...patch }, def))
            }
          />

          <div className="space-y-1">
            <span className="text-[10px] font-medium text-neutral-500">Size presets</span>
            <div className="grid grid-cols-2 gap-1">
              {WIDGET_SIZE_PRESET_OPTIONS.map((option) => {
                const active =
                  inferWidgetSizePreset(currentLayout, def) === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onApplySizePreset(option.value)}
                    className={`rounded-sm border px-2 py-1.5 text-left text-[10px] transition-colors ${
                      active
                        ? "border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                        : "border-neutral-200/80 hover:bg-white dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/40"
                    }`}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span className="text-neutral-400">{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </InspectorSection>

        {configFields.length > 0 ? (
          <InspectorSection title="Data & configuration">
            {configFields.map((field) => (
              <ConfigField
                key={field.key}
                field={field}
                widgetConfig={widget.config}
                value={widget.config[field.key]}
                plantId={plantId}
                onChange={(value) => setConfigValue(field.key, value)}
              />
            ))}
          </InspectorSection>
        ) : (
          <section className="rounded-sm border border-dashed border-neutral-200/80 bg-neutral-50/50 px-2 py-2 text-[10px] text-neutral-500 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/20 dark:text-neutral-dark-600">
            This widget uses plant defaults. No extra configuration required.
          </section>
        )}

        <InspectorSection title="Actions">
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-neutral-200/80 px-2 py-1.5 text-xs font-medium hover:bg-white dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/40"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate widget
          </button>
          {def?.defaultConfig ? (
            <button
              type="button"
              onClick={onResetConfig}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-neutral-200/80 px-2 py-1.5 text-xs font-medium hover:bg-white dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset configuration
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove widget
          </button>
        </InspectorSection>
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: "ready" | "beta" | "planned" }) {
  const styles = {
    ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    beta: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    planned: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-dark-600",
  };
  const labels = { ready: "Ready", beta: "Beta", planned: "Planned" };
  return (
    <span
      className={`shrink-0 rounded-sm px-1.5 py-px text-[9px] font-semibold uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function LayoutFields({
  layout,
  def,
  onApply,
}: {
  layout: GridLayoutItem;
  def?: (typeof WIDGET_LIBRARY_BY_TYPE)[keyof typeof WIDGET_LIBRARY_BY_TYPE];
  onApply: (patch: Partial<GridLayoutItem>) => void;
}) {
  const minW = def?.defaultSize.minW ?? 2;
  const minH = def?.defaultSize.minH ?? 2;
  const maxW = def?.maxSize?.maxW ?? GRID_COLS_LG;
  const maxH = def?.maxSize?.maxH ?? 24;

  const fields: { key: keyof GridLayoutItem; label: string; min: number; max: number }[] = [
    { key: "x", label: "Column (X)", min: 0, max: GRID_COLS_LG - 1 },
    { key: "y", label: "Row (Y)", min: 0, max: 200 },
    { key: "w", label: "Width (cols)", min: minW, max: maxW },
    { key: "h", label: "Height (rows)", min: minH, max: maxH },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(({ key, label, min, max }) => (
        <label key={key} className="block text-[11px]">
          <span className="mb-1 block text-neutral-500">{label}</span>
          <input
            type="number"
            min={min}
            max={max}
            value={layout[key] ?? 0}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onApply({ [key]: next });
            }}
            className={inputClass}
          />
        </label>
      ))}
    </div>
  );
}

function ConfigField({
  field,
  widgetConfig,
  value,
  plantId,
  onChange,
}: {
  field: WidgetConfigField;
  widgetConfig: Record<string, unknown>;
  value: unknown;
  plantId?: string;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="rounded-xs border-neutral-300 text-brand-600 focus:ring-brand-500/30"
        />
        <span className="text-neutral-700 dark:text-neutral-dark-800">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block text-[11px]">
        <span className="mb-1 block text-neutral-500">{field.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          className={selectClass}
        >
          <option value="">Default</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.description ? (
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {field.description}
          </p>
        ) : null}
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="text-[11px]">
        <legend className="mb-1.5 block text-neutral-500">{field.label}</legend>
        <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xs border border-neutral-200/80 p-2 dark:border-neutral-dark-300/60">
          {field.options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xs px-1 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value];
                    onChange(next.length > 0 ? next : undefined);
                  }}
                  className="rounded-xs border-neutral-300 text-brand-600 focus:ring-brand-500/30"
                />
                <span className="text-xs text-neutral-800 dark:text-neutral-dark-900">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
        {field.description ? (
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {field.description}
          </p>
        ) : null}
      </fieldset>
    );
  }

  if (field.type === "tag_template") {
    return <TagTemplateField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === "tag_keys") {
    return (
      <TagKeysField
        field={field}
        tagTemplateId={widgetConfig.tagTemplateId}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.type === "metric_key") {
    return (
      <MetricKeyField
        field={field}
        tagTemplateId={widgetConfig.tagTemplateId}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.type === "metric_accent_palette") {
    return (
      <MetricAccentPaletteField
        field={field}
        widgetConfig={widgetConfig}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.type === "text") {
    return (
      <label className="block text-[11px]">
        <span className="mb-1 block text-neutral-500">{field.label}</span>
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value || undefined)}
          className={inputClass}
        />
        {field.description ? (
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {field.description}
          </p>
        ) : null}
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="block text-[11px]">
        <span className="mb-1 block text-neutral-500">{field.label}</span>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === "number" ? value : ""}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : undefined);
          }}
          className={inputClass}
        />
        {"description" in field && field.description ? (
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {field.description}
          </p>
        ) : null}
      </label>
    );
  }

  return null;
}

function TagTemplateField({
  field,
  value,
  onChange,
}: {
  field: Extract<WidgetConfigField, { type: "tag_template" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const tagTemplateId = typeof value === "string" ? value : "";
  const [labelById, setLabelById] = useState<Record<string, string>>({});

  const loadTemplates = useCallback(async (search = ""): Promise<Option[]> => {
    return fetchTagTemplateNames(search, 1, 100);
  }, []);

  useEffect(() => {
    if (!tagTemplateId || labelById[tagTemplateId]) return;
    let cancelled = false;
    void fetchTagTemplateNames("", 1, 100).then((options) => {
      if (cancelled) return;
      const match = options.find((option) => option.value === tagTemplateId);
      if (!match) return;
      setLabelById((previous) =>
        previous[tagTemplateId] === match.label
          ? previous
          : { ...previous, [tagTemplateId]: match.label },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [tagTemplateId, labelById]);

  const selected: Option | null = tagTemplateId
    ? { value: tagTemplateId, label: labelById[tagTemplateId] ?? tagTemplateId }
    : null;

  return (
    <div>
      <AsyncSelect
        label={field.label}
        labelClassName="text-[11px] text-neutral-500 mb-1"
        placeholder="Select tag template"
        isClearable
        apiSearch
        loadOptions={loadTemplates}
        value={selected}
        onChange={(next) => {
          const option = next as SingleValue<Option>;
          onChange(option?.value ?? undefined);
        }}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
      {field.description ? (
        <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          {field.description}
        </p>
      ) : null}
    </div>
  );
}

function TagKeysField({
  field,
  tagTemplateId,
  value,
  onChange,
}: {
  field: Extract<WidgetConfigField, { type: "tag_keys" }>;
  tagTemplateId: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const templateId =
    typeof tagTemplateId === "string" && tagTemplateId.trim() ? tagTemplateId.trim() : "";
  const templateQuery = useGetTagTemplateDetailsQuery(templateId, {
    enabled: Boolean(templateId),
  });

  const options = useMemo(() => {
    if (!templateId || !templateQuery.data) return [];
    return buildTagKeyFieldOptions(templateQuery.data.tag_map).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [templateId, templateQuery.data]);

  const selectedValues = field.multiple
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === "string" && value
      ? [value]
      : [];

  if (!templateId) {
    if (field.key === "metrics") {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="text-[11px]">
          <legend className="mb-1.5 block text-neutral-500">{field.label}</legend>
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xs border border-neutral-200/80 p-2 dark:border-neutral-dark-300/60">
            {PLANT_METRIC_OPTIONS.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-xs px-1 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value];
                      onChange(next.length > 0 ? next : undefined);
                    }}
                    className="rounded-xs border-neutral-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  <span className="text-xs text-neutral-800 dark:text-neutral-dark-900">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
          {field.description ? (
            <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
              {field.description}
            </p>
          ) : null}
        </fieldset>
      );
    }

    return (
      <div className="text-[11px]">
        <span className="mb-1 block text-neutral-500">{field.label}</span>
        <p className="rounded-xs border border-dashed border-neutral-200/80 px-2 py-2 text-[10px] text-neutral-500 dark:border-neutral-dark-300/60 dark:text-neutral-dark-600">
          Select a tag template first to pick tag keys from its tag map.
        </p>
      </div>
    );
  }

  if (field.multiple) {
    return (
      <fieldset className="text-[11px]">
        <legend className="mb-1.5 block text-neutral-500">{field.label}</legend>
        {templateQuery.isLoading ? (
          <p className="text-[10px] text-neutral-500">Loading tag map keys…</p>
        ) : options.length === 0 ? (
          <p className="text-[10px] text-neutral-500">No tag keys found in this template.</p>
        ) : (
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xs border border-neutral-200/80 p-2 dark:border-neutral-dark-300/60">
            {options.map((option) => {
              const checked = selectedValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-xs px-1 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selectedValues.filter((item) => item !== option.value)
                        : [...selectedValues, option.value];
                      onChange(next.length > 0 ? next : undefined);
                    }}
                    className="mt-0.5 rounded-xs border-neutral-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  <span className="text-xs text-neutral-800 dark:text-neutral-dark-900">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {field.description ? (
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
            {field.description}
          </p>
        ) : null}
      </fieldset>
    );
  }

  return (
    <label className="block text-[11px]">
      <span className="mb-1 block text-neutral-500">{field.label}</span>
      <select
        value={selectedValues[0] ?? ""}
        disabled={templateQuery.isLoading || options.length === 0}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={selectClass}
      >
        <option value="">
          {templateQuery.isLoading ? "Loading…" : "Select tag key"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.description ? (
        <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          {field.description}
        </p>
      ) : null}
    </label>
  );
}

function MetricKeyField({
  field,
  tagTemplateId,
  value,
  onChange,
}: {
  field: Extract<WidgetConfigField, { type: "metric_key" }>;
  tagTemplateId: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const templateId =
    typeof tagTemplateId === "string" && tagTemplateId.trim() ? tagTemplateId.trim() : "";
  const templateQuery = useGetTagTemplateDetailsQuery(templateId, {
    enabled: Boolean(templateId),
  });

  const tagOptions = useMemo(() => {
    if (!templateId || !templateQuery.data) return [];
    return buildTagKeyFieldOptions(templateQuery.data.tag_map);
  }, [templateId, templateQuery.data]);

  const current = typeof value === "string" ? value : "";

  return (
    <label className="block text-[11px]">
      <span className="mb-1 block text-neutral-500">{field.label}</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={selectClass}
      >
        <option value="">Select metric</option>
        {!templateId ? (
          <optgroup label="Plant metrics">
            {PLANT_METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {templateId && tagOptions.length > 0 ? (
          <optgroup label="Tag map keys">
            {tagOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {templateId && !templateQuery.isLoading && tagOptions.length === 0 ? (
          <option value="" disabled>
            No tag keys in template
          </option>
        ) : null}
      </select>
      {field.description ? (
        <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          {field.description}
        </p>
      ) : null}
    </label>
  );
}

function MetricAccentPaletteField({
  field,
  widgetConfig,
  value,
  onChange,
}: {
  field: Extract<WidgetConfigField, { type: "metric_accent_palette" }>;
  widgetConfig: Record<string, unknown>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const accents =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<PlantStatsMetricId, PlantDashboardAccent>>)
      : {};

  const visibleMetrics = Array.isArray(widgetConfig.visibleMetrics)
    ? (widgetConfig.visibleMetrics as PlantStatsMetricId[])
    : null;

  const metrics = field.metrics.filter((metric) => {
    if (!visibleMetrics?.length) return true;
    return visibleMetrics.includes(metric.value as PlantStatsMetricId);
  });

  const setAccent = (metricId: PlantStatsMetricId, accent: PlantDashboardAccent) => {
    const defaultAccent = PLANT_STAT_METRIC_META[metricId].accent;
    const next = { ...accents };

    if (accent === defaultAccent) {
      delete next[metricId];
    } else {
      next[metricId] = accent;
    }

    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const resetMetric = (metricId: PlantStatsMetricId) => {
    const next = { ...accents };
    delete next[metricId];
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  return (
    <fieldset className="text-[11px]">
      <legend className="mb-1.5 block text-neutral-500">{field.label}</legend>
      <div className="max-h-56 space-y-2 overflow-y-auto rounded-xs border border-neutral-200/80 p-2 dark:border-neutral-dark-300/60">
        {metrics.map((metric) => {
          const metricId = metric.value as PlantStatsMetricId;
          const defaultAccent = PLANT_STAT_METRIC_META[metricId]?.accent ?? "neutral";
          const selectedAccent = accents[metricId] ?? defaultAccent;
          const isCustom = accents[metricId] != null;

          return (
            <div
              key={metricId}
              className="rounded-xs border border-neutral-200/70 bg-white/60 p-2 dark:border-neutral-dark-300/50 dark:bg-neutral-dark-100/40"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium text-neutral-800 dark:text-neutral-dark-900">
                  {metric.label}
                </span>
                {isCustom ? (
                  <button
                    type="button"
                    onClick={() => resetMetric(metricId)}
                    className="shrink-0 text-[9px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {PLANT_STAT_ACCENT_OPTIONS.map((option) => {
                  const active = selectedAccent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      title={option.label}
                      aria-label={`${metric.label}: ${option.label}`}
                      aria-pressed={active}
                      onClick={() => setAccent(metricId, option.value)}
                      className={[
                        "relative h-5 w-5 rounded-full border-2 transition-transform",
                        option.swatch,
                        active
                          ? "scale-110 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)] ring-2 ring-brand-500/60 dark:border-neutral-dark-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                          : "border-white/80 opacity-80 hover:scale-105 hover:opacity-100 dark:border-neutral-dark-200/80",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {field.description ? (
        <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
          {field.description}
        </p>
      ) : null}
    </fieldset>
  );
}
