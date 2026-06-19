import type { WidgetLibraryType } from "../types/document";

export type WidgetConfigField =
  | {
      type: "boolean";
      key: string;
      label: string;
      description?: string;
    }
  | {
      type: "text";
      key: string;
      label: string;
      placeholder?: string;
      description?: string;
    }
  | {
      type: "number";
      key: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      type: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      description?: string;
    }
  | {
      type: "multiselect";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      description?: string;
    }
  | {
      type: "tag_template";
      key: string;
      label: string;
      description?: string;
    }
  | {
      type: "tag_keys";
      key: string;
      label: string;
      description?: string;
      multiple?: boolean;
    }
  | {
      type: "metric_key";
      key: string;
      label: string;
      description?: string;
    }
  | {
      type: "metric_accent_palette";
      key: "metricAccents";
      label: string;
      metrics: { value: string; label: string }[];
      description?: string;
    };

export const PLANT_METRIC_OPTIONS = [
  { value: "dailyYield", label: "Daily Yield" },
  { value: "todayGenerationKwh", label: "Today Generation (kWh)" },
  { value: "performanceRatio", label: "Performance Ratio (%)" },
  { value: "liveAlarms", label: "Live Alarms" },
  { value: "highImpactAlarms", label: "High Impact Alarms" },
  { value: "mostUnavailableComponent", label: "Most Unavailable Component" },
  { value: "plantUptime", label: "Plant Up-Time (%)" },
  { value: "treesPlanted", label: "Trees Planted" },
  { value: "coalSavedTon", label: "Coal Saved (ton)" },
  { value: "co2SavedTon", label: "CO₂ Saved (ton)" },
] as const;

const PLANT_STATS_METRICS = PLANT_METRIC_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const DEVICE_TYPES = [
  { value: "inverter", label: "Inverter" },
  { value: "dc_channel", label: "DC Channel" },
  { value: "meter", label: "Meter" },
  { value: "weather_station", label: "Weather Station" },
  { value: "tracker", label: "Tracker" },
];

const TIME_RANGES = [
  { value: "live", label: "Live" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const CHART_TYPES = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
];

const SOURCE_GROUPS = [
  { value: "inverter", label: "Inverter" },
  { value: "meter", label: "Meter" },
  { value: "plant", label: "Plant" },
];

export const WIDGET_CONFIG_FIELDS: Partial<Record<WidgetLibraryType, WidgetConfigField[]>> = {
  plant_stats: [
    {
      type: "multiselect",
      key: "visibleMetrics",
      label: "Visible metrics",
      options: PLANT_STATS_METRICS,
    },
    {
      type: "metric_accent_palette",
      key: "metricAccents",
      label: "Metric colors",
      metrics: PLANT_STATS_METRICS,
      description: "Choose a glass accent color for each KPI card.",
    },
  ],
  generation_graph: [
    { type: "select", key: "chartType", label: "Chart type", options: CHART_TYPES },
    {
      type: "multiselect",
      key: "sourceGroups",
      label: "Data sources",
      options: SOURCE_GROUPS,
      description: "Which equipment groups feed the generation curve.",
    },
    { type: "text", key: "seriesName", label: "Series name" },
    { type: "text", key: "yAxisTitle", label: "Y-axis title" },
    { type: "text", key: "yAxisSuffix", label: "Y-axis suffix", placeholder: " kW" },
    { type: "text", key: "xAxisTitle", label: "X-axis title", placeholder: "Time of Day" },
    { type: "number", key: "dayStartHour", label: "Day start hour", min: 0, max: 23 },
    { type: "number", key: "dayEndHour", label: "Day end hour", min: 0, max: 23 },
    { type: "number", key: "slotMinutes", label: "Slot minutes", min: 5, max: 60, step: 5 },
    { type: "boolean", key: "showLegend", label: "Show legend" },
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template override",
      description: "Optional tag template for custom series binding.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      description: "Logical keys from the template tag map.",
      multiple: true,
    },
  ],
  devices_overview: [
    {
      type: "select",
      key: "defaultComponentType",
      label: "Default tab",
      options: DEVICE_TYPES,
    },
    {
      type: "select",
      key: "defaultTimeRange",
      label: "Default time range",
      options: TIME_RANGES,
    },
    { type: "number", key: "pageSize", label: "Page size", min: 5, max: 100 },
    { type: "number", key: "tableHeight", label: "Table height (px)", min: 200, max: 800 },
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Bind columns from a tag template tag map.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  kpi_card: [
    { type: "text", key: "label", label: "Label" },
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Use live tag map values instead of plant metrics.",
    },
    {
      type: "metric_key",
      key: "metricKey",
      label: "Metric / tag key",
      description: "Plant metric or logical key from the selected tag template.",
    },
    { type: "text", key: "unit", label: "Unit" },
  ],
  multi_kpi_card: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
    },
    {
      type: "tag_keys",
      key: "metrics",
      label: "Metrics / tag keys",
      description: "Plant metrics or tag map keys when a template is selected.",
      multiple: true,
    },
  ],
  line_chart: [
    { type: "text", key: "title", label: "Chart title" },
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  area_chart: [
    { type: "text", key: "title", label: "Chart title" },
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  bar_chart: [
    { type: "text", key: "title", label: "Chart title" },
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  data_table: [
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
    {
      type: "select",
      key: "componentType",
      label: "Fallback component type",
      options: DEVICE_TYPES,
      description: "Used when no tag template is selected.",
    },
    { type: "number", key: "pageSize", label: "Page size", min: 5, max: 100 },
    { type: "number", key: "tableHeight", label: "Table height (px)", min: 200, max: 800 },
  ],
  gauge: [
    { type: "text", key: "label", label: "Label" },
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "tag_keys",
      key: "tagKey",
      label: "Tag key",
      description: "Logical key from the template tag map.",
    },
    { type: "number", key: "min", label: "Minimum", min: 0, max: 1000 },
    { type: "number", key: "max", label: "Maximum", min: 1, max: 10000 },
    { type: "text", key: "unit", label: "Unit", placeholder: "%" },
  ],
  heatmap: [
    { type: "tag_template", key: "tagTemplateId", label: "Tag template" },
    {
      type: "select",
      key: "componentType",
      label: "Component type",
      options: DEVICE_TYPES,
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      description: "Optional keys to include in the heatmap matrix.",
      multiple: true,
    },
  ],
  alarm_panel: [
    { type: "number", key: "pageSize", label: "Page size", min: 5, max: 50 },
    { type: "number", key: "tableHeight", label: "Table height (px)", min: 200, max: 800 },
    { type: "boolean", key: "activeOnly", label: "Active alarms only" },
  ],
  equipment_status: [
    {
      type: "select",
      key: "componentType",
      label: "Default tab",
      options: DEVICE_TYPES,
    },
  ],
  inverter_overview: [
    { type: "number", key: "pageSize", label: "Page size", min: 5, max: 50 },
    { type: "number", key: "tableHeight", label: "Table height (px)", min: 200, max: 800 },
  ],
  power_meter: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Override meter tag bindings for this widget.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  performance_indicator: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Override yield / PR / CUF tag bindings.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  earnings_breakdown: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Override earnings tag bindings.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  non_availability: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Optional override for offline component tags.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  low_performing_components: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Optional override for underperformance tags.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  all_time_stats: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Override lifetime generation / revenue tags.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
  weather_forecast: [
    {
      type: "tag_template",
      key: "tagTemplateId",
      label: "Tag template",
      description: "Override weather station tag bindings.",
    },
    {
      type: "tag_keys",
      key: "tagKeys",
      label: "Tag keys",
      multiple: true,
    },
  ],
};
