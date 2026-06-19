import type { ComponentType } from "react";
import type { WidgetLibraryType } from "../types/document";
import type { GridLayoutItem } from "../types/document";

export type WidgetCategory =
  | "kpi"
  | "charts"
  | "tables"
  | "solar"
  | "equipment"
  | "analytics"
  | "alarms"
  | "weather";

export interface WidgetDefinition {
  type: WidgetLibraryType;
  label: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultSize: GridLayoutItem;
  minSize?: Pick<GridLayoutItem, "minW" | "minH">;
  maxSize?: Pick<GridLayoutItem, "maxW" | "maxH">;
  preserveAspectRatio?: boolean;
  /** When set, widget only appears if capability predicate passes. */
  requiresCapability?: keyof WidgetCapabilityFlags;
  defaultConfig?: Record<string, unknown>;
  status: "ready" | "beta" | "planned";
}

export interface WidgetCapabilityFlags {
  hasInverters: boolean;
  hasMeters: boolean;
  hasWeatherStations: boolean;
  hasDcChannels: boolean;
  hasPpaRate: boolean;
  hasBlocks: boolean;
}

export interface WidgetRenderProps {
  plantId?: string;
  title?: string;
  config: Record<string, unknown>;
  editMode?: boolean;
}

export type WidgetRenderer = ComponentType<WidgetRenderProps>;

const size = (
  w: number,
  h: number,
  minW = 3,
  minH = 3,
  maxW?: number,
  maxH?: number,
): GridLayoutItem => ({ x: 0, y: 0, w, h, minW, minH, maxW, maxH });

export const WIDGET_LIBRARY: WidgetDefinition[] = [
  {
    type: "kpi_card",
    label: "KPI Card",
    description: "Single live metric with label and unit.",
    category: "kpi",
    icon: "Gauge",
    defaultSize: size(5, 4, 3, 3),
    status: "ready",
    defaultConfig: { metricKey: "today_generation", label: "Today Generation", unit: "kWh" },
  },
  {
    type: "multi_kpi_card",
    label: "Multi KPI",
    description: "Row of compact KPI metrics.",
    category: "kpi",
    icon: "LayoutGrid",
    defaultSize: size(14, 4, 8, 3),
    status: "ready",
    defaultConfig: { metrics: ["daily_yield", "performance_ratio", "live_alarms"] },
  },
  {
    type: "line_chart",
    label: "Line Chart",
    description: "Time-series line chart from live or history.",
    category: "charts",
    icon: "LineChart",
    defaultSize: size(12, 9, 6, 6),
    status: "ready",
    defaultConfig: { title: "Line Chart", yAxisSuffix: " kW" },
  },
  {
    type: "area_chart",
    label: "Area Chart",
    description: "Filled area time-series chart.",
    category: "charts",
    icon: "AreaChart",
    defaultSize: size(12, 9, 6, 6),
    status: "ready",
    defaultConfig: { title: "Area Chart", yAxisSuffix: " kW" },
  },
  {
    type: "bar_chart",
    label: "Bar Chart",
    description: "Comparative bar chart.",
    category: "charts",
    icon: "BarChart3",
    defaultSize: size(10, 8, 6, 5),
    status: "ready",
    defaultConfig: { title: "Bar Chart", yAxisSuffix: " kWh" },
  },
  {
    type: "gauge",
    label: "Gauge",
    description: "Radial gauge for capacity or PR.",
    category: "charts",
    icon: "Gauge",
    defaultSize: size(5, 6, 4, 5),
    preserveAspectRatio: true,
    status: "ready",
    defaultConfig: { label: "Performance Ratio", tagKey: "performance_ratio", unit: "%", min: 0, max: 100 },
  },
  {
    type: "heatmap",
    label: "Heatmap",
    description: "Matrix heatmap for equipment performance.",
    category: "charts",
    icon: "Grid3x3",
    defaultSize: size(14, 9, 8, 6),
    status: "ready",
    defaultConfig: { componentType: "inverter" },
  },
  {
    type: "data_table",
    label: "Data Table",
    description: "Configurable AG Grid table from tag groups.",
    category: "tables",
    icon: "Table",
    defaultSize: size(24, 11, 10, 7),
    status: "ready",
    defaultConfig: { componentType: "inverter", pageSize: 10, tableHeight: 360 },
  },
  {
    type: "plant_stats",
    label: "Plant Stats",
    description: "Plant-level KPI strip.",
    category: "solar",
    icon: "RadioTower",
    defaultSize: size(24, 3, 12, 2),
    status: "ready",
    defaultConfig: {
      visibleMetrics: [
        "dailyYield",
        "todayGenerationKwh",
        "performanceRatio",
        "liveAlarms",
        "highImpactAlarms",
        "mostUnavailableComponent",
        "plantUptime",
        "treesPlanted",
        "coalSavedTon",
        "co2SavedTon",
      ],
    },
  },
  {
    type: "power_meter",
    label: "Power Meter",
    description: "Live import/export/generation flow.",
    category: "solar",
    icon: "Gauge",
    defaultSize: size(8, 9, 5, 7),
    status: "ready",
  },
  {
    type: "generation_graph",
    label: "Generation Graph",
    description: "Intraday active power curve.",
    category: "solar",
    icon: "LineChart",
    defaultSize: size(10, 9, 6, 7),
    requiresCapability: "hasInverters",
    status: "ready",
    defaultConfig: {
      chartType: "area",
      allowedChartTypes: ["area", "line"],
      sourceGroups: ["inverter"],
      seriesName: "Active Power",
      yAxisTitle: "Active Power",
      yAxisSuffix: " kW",
      tooltipSuffix: " kW",
      xAxisTitle: "Time of Day",
      dayStartHour: 6,
      dayEndHour: 19,
      slotMinutes: 30,
      showLegend: false,
    },
  },
  {
    type: "earnings_breakdown",
    label: "Earnings",
    description: "Today vs max possible earnings.",
    category: "solar",
    icon: "IndianRupee",
    defaultSize: size(6, 6, 4, 5),
    requiresCapability: "hasPpaRate",
    status: "ready",
  },
  {
    type: "performance_indicator",
    label: "Performance",
    description: "Yield, PR, CUF indicators.",
    category: "solar",
    icon: "Activity",
    defaultSize: size(6, 6, 4, 5),
    requiresCapability: "hasInverters",
    status: "ready",
  },
  {
    type: "non_availability",
    label: "Non Availability",
    description: "Offline component counts.",
    category: "equipment",
    icon: "WifiOff",
    defaultSize: size(6, 6, 4, 5),
    status: "ready",
  },
  {
    type: "low_performing_components",
    label: "Low Performing",
    description: "Underperforming inverters/channels.",
    category: "equipment",
    icon: "TrendingDown",
    defaultSize: size(6, 6, 4, 5),
    requiresCapability: "hasInverters",
    status: "ready",
  },
  {
    type: "devices_overview",
    label: "Devices Overview",
    description: "Tabbed equipment table.",
    category: "equipment",
    icon: "BarChart3",
    defaultSize: size(24, 12, 12, 8),
    status: "ready",
    defaultConfig: { defaultComponentType: "inverter", defaultTimeRange: "live" },
  },
  {
    type: "all_time_stats",
    label: "All Time Stats",
    description: "Lifetime generation and revenue.",
    category: "analytics",
    icon: "History",
    defaultSize: size(8, 9, 5, 6),
    requiresCapability: "hasInverters",
    status: "ready",
  },
  {
    type: "weather_forecast",
    label: "Weather",
    description: "Weather station live metrics.",
    category: "weather",
    icon: "CloudSun",
    defaultSize: size(8, 11, 5, 7),
    requiresCapability: "hasWeatherStations",
    status: "ready",
  },
  {
    type: "alarm_panel",
    label: "Alarms",
    description: "Live alarm list and severity.",
    category: "alarms",
    icon: "Bell",
    defaultSize: size(10, 9, 5, 6),
    status: "ready",
    defaultConfig: { pageSize: 8, tableHeight: 320, activeOnly: true },
  },
  {
    type: "equipment_status",
    label: "Equipment Status",
    description: "Component communication status grid.",
    category: "equipment",
    icon: "Cpu",
    defaultSize: size(14, 9, 8, 6),
    status: "ready",
    defaultConfig: { componentType: "inverter" },
  },
  {
    type: "weather_panel",
    label: "Weather Panel",
    description: "Extended weather analytics.",
    category: "weather",
    icon: "CloudRain",
    defaultSize: size(10, 9, 5, 6),
    requiresCapability: "hasWeatherStations",
    status: "ready",
  },
  {
    type: "energy_flow",
    label: "Energy Flow",
    description: "Sankey-style energy flow diagram.",
    category: "solar",
    icon: "GitBranch",
    defaultSize: size(12, 10, 6, 7),
    status: "ready",
  },
  {
    type: "plant_sld",
    label: "Plant SLD",
    description: "Single-line diagram view.",
    category: "solar",
    icon: "Network",
    defaultSize: size(18, 12, 10, 8),
    status: "ready",
  },
  {
    type: "dc_channel_heatmap",
    label: "DC Channel Heatmap",
    description: "Per-channel generation matrix.",
    category: "equipment",
    icon: "Grid3x3",
    defaultSize: size(14, 9, 8, 6),
    requiresCapability: "hasDcChannels",
    status: "ready",
  },
  {
    type: "inverter_overview",
    label: "Inverter Overview",
    description: "Inverter fleet summary.",
    category: "equipment",
    icon: "Zap",
    defaultSize: size(14, 9, 8, 6),
    requiresCapability: "hasInverters",
    status: "ready",
    defaultConfig: { pageSize: 8, tableHeight: 280 },
  },
  {
    type: "meter_analytics",
    label: "Meter Analytics",
    description: "Import/export meter analytics.",
    category: "analytics",
    icon: "Activity",
    defaultSize: size(12, 9, 6, 6),
    requiresCapability: "hasMeters",
    status: "ready",
  },
  {
    type: "generation_analytics",
    label: "Generation Analytics",
    description: "Plant generation analytics suite.",
    category: "analytics",
    icon: "BarChart3",
    defaultSize: size(14, 9, 8, 6),
    requiresCapability: "hasInverters",
    status: "ready",
  },
];

export const WIDGET_LIBRARY_BY_TYPE: Record<WidgetLibraryType, WidgetDefinition> =
  WIDGET_LIBRARY.reduce(
    (acc, def) => {
      acc[def.type] = def;
      return acc;
    },
    {} as Record<WidgetLibraryType, WidgetDefinition>,
  );

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: "kpi", label: "KPI" },
  { id: "charts", label: "Charts" },
  { id: "tables", label: "Tables" },
  { id: "solar", label: "Solar" },
  { id: "equipment", label: "Equipment" },
  { id: "analytics", label: "Analytics" },
  { id: "alarms", label: "Alarms" },
  { id: "weather", label: "Weather" },
];

export function filterWidgetsByCapabilities(
  capabilities: WidgetCapabilityFlags,
): WidgetDefinition[] {
  return WIDGET_LIBRARY.filter((def) => {
    if (!def.requiresCapability) return true;
    return capabilities[def.requiresCapability];
  });
}
