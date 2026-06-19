import type { WidgetTagBindingItem } from "./tagTemplateRuntime";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { ComponentLiveProcessed } from "@/lib/plant/plantLiveProcessed";
import type { CommonColumnConfig } from "@/components/core/table/CommonTable";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import { toTitleCaseLabel } from "@/utils/plantLiveFormatters";

export function parseTagKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function resolveLiveTagValue(
  processed: ComponentLiveProcessed | undefined,
  tagKey: string,
): unknown {
  if (!processed || !tagKey) return null;
  const fields = processed.lastFields ?? {};
  if (tagKey in fields) return fields[tagKey];
  const lower = tagKey.toLowerCase();
  const match = Object.keys(fields).find((key) => key.toLowerCase() === lower);
  return match ? fields[match] : null;
}

export function formatWidgetValue(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export interface TagGroupTableRow {
  id: string;
  component_id: string;
  component_name: string;
  [key: string]: unknown;
}

export function collectTagKeysFromConfig(
  tagConfig: WidgetTagBindingItem[],
  explicitKeys: string[],
): string[] {

  const fromConfig = tagConfig.flatMap((item) => item.tag_ids ?? []);
  const merged = [...explicitKeys, ...fromConfig];
  return [...new Set(merged.map((key) => key.trim()).filter(Boolean))];
}

export function buildTagGroupTableColumns(tagKeys: string[]): CommonColumnConfig[] {
  const columns: CommonColumnConfig[] = [
    buildTextColumn("component_name", "Component", { pinned: "left", minWidth: 160 }),
  ];

  tagKeys.forEach((tagKey) => {
    columns.push(
      buildTextColumn(tagKey, toTitleCaseLabel(tagKey.replace(/_/g, " ")), {
        minWidth: 120,
        valueFormatter: (params) => formatWidgetValue(params.value),
      }),
    );
  });

  return columns;
}

export function buildTagGroupTableRows(args: {
  tagConfig: WidgetTagBindingItem[];
  tagKeys: string[];
  processedByComponentId: ReadonlyMap<string, ComponentLiveProcessed>;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): TagGroupTableRow[] {
  const { tagConfig, tagKeys, processedByComponentId, componentById } = args;
  const entries =
    tagConfig.length > 0
      ? tagConfig
      : [...componentById.values()].map((component) => ({
          component_id: component.id,
          component_name: component.component_name,
          tag_ids: tagKeys,
        }));

  return entries.map((entry) => {
    const component = componentById.get(entry.component_id);
    const processed = processedByComponentId.get(entry.component_id);
    const keysForRow =
      entry.tag_ids?.length > 0 ? entry.tag_ids : tagKeys;

    const row: TagGroupTableRow = {
      id: entry.component_id,
      component_id: entry.component_id,
      component_name:
        entry.component_name ??
        component?.component_name ??
        component?.component_code ??
        entry.component_id,
    };

    keysForRow.forEach((tagKey) => {
      row[tagKey] = resolveLiveTagValue(processed, tagKey);
    });

    return row;
  });
}

export interface TagGroupChartPoint {
  name: string;
  value: number;
}

export function buildTagGroupBarSeries(args: {
  tagConfig: WidgetTagBindingItem[];
  tagKeys: string[];
  processedByComponentId: ReadonlyMap<string, ComponentLiveProcessed>;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  seriesName?: string;
}): { categories: string[]; series: { name: string; data: TagGroupChartPoint[] }[] } {
  const rows = buildTagGroupTableRows(args);
  const primaryTag = args.tagKeys[0] ?? args.tagConfig[0]?.tag_ids?.[0] ?? "value";

  const categories = rows.map((row) => String(row.component_name));
  const data = rows.map((row) => {
    const raw = row[primaryTag];
    const value =
      typeof raw === "number"
        ? raw
        : Number(String(raw ?? "").replace(/,/g, "").trim());
    return {
      name: String(row.component_name),
      value: Number.isFinite(value) ? value : 0,
    };
  });

  return {
    categories,
    series: [{ name: args.seriesName ?? toTitleCaseLabel(primaryTag), data }],
  };
}

export function buildTagGroupGaugeValue(args: {
  tagConfig: WidgetTagBindingItem[];
  tagKey: string;
  processedByComponentId: ReadonlyMap<string, ComponentLiveProcessed>;
}): number | null {
  const { tagConfig, tagKey, processedByComponentId } = args;
  if (!tagKey) return null;

  const values: number[] = [];
  for (const entry of tagConfig) {
    const processed = processedByComponentId.get(entry.component_id);
    const raw = resolveLiveTagValue(processed, tagKey);
    const value =
      typeof raw === "number"
        ? raw
        : Number(String(raw ?? "").replace(/,/g, "").trim());
    if (Number.isFinite(value)) values.push(value);
  }

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
