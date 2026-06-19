import type { ChartType } from "@/components/core/charts/ChartCard";
import type { DevicesOverviewDeviceType, DevicesOverviewTimeRange } from "../devices-overview/devicesOverview";
import type { PlantDashboardAccent } from "./plantDashboardTheme";

export type PlantStatsMetricId =
  | "dailyYield"
  | "todayGenerationKwh"
  | "performanceRatio"
  | "liveAlarms"
  | "highImpactAlarms"
  | "mostUnavailableComponent"
  | "plantUptime"
  | "treesPlanted"
  | "coalSavedTon"
  | "co2SavedTon";

export type PlantDashboardWidgetType =
  | "plantStats"
  | "powerMeter"
  | "generationGraph"
  | "earningsBreakdown"
  | "performanceIndicator"
  | "nonAvailability"
  | "lowPerformingComponents"
  | "devicesOverview"
  | "allTimeStats"
  | "weatherForecast"
  | "alarmPanel"
  | "equipmentStatus"
  | "weatherPanel"
  | "energyFlow"
  | "plantSld"
  | "dcChannelHeatmap"
  | "inverterOverview"
  | "meterAnalytics"
  | "generationAnalytics";

export interface PlantStatsWidgetConfig {
  visibleMetrics?: PlantStatsMetricId[];
  /** Per-metric glass accent overrides for KPI cards. */
  metricAccents?: Partial<Record<PlantStatsMetricId, PlantDashboardAccent>>;
  /** When true, shows widget title header in the dashboard cell. */
  showHeading?: boolean;
}

export interface DevicesOverviewWidgetConfig {
  defaultComponentType?: DevicesOverviewDeviceType["id"];
  enabledComponentTypes?: DevicesOverviewDeviceType["id"][];
  defaultTimeRange?: DevicesOverviewTimeRange;
  enabledTimeRanges?: DevicesOverviewTimeRange[];
  visibleColumns?: string[];
  pageSize?: number;
  tableHeight?: number;
  showComponentTypeTabs?: boolean;
  showTimeRangeTabs?: boolean;
}

export interface GenerationGraphWidgetConfig {
  chartType?: ChartType;
  allowedChartTypes?: ChartType[];
  seriesName?: string;
  yAxisTitle?: string;
  yAxisSuffix?: string;
  tooltipSuffix?: string;
  xAxisTitle?: string;
  sourceGroups?: string[];
  dayStartHour?: number;
  dayEndHour?: number;
  slotMinutes?: number;
  showLegend?: boolean;
}

export interface AlarmPanelWidgetConfig {
  pageSize?: number;
  tableHeight?: number;
  activeOnly?: boolean;
  showTabs?: boolean;
}

export interface EquipmentStatusWidgetConfig {
  componentType?: DevicesOverviewDeviceType["id"];
}

export interface InverterOverviewWidgetConfig {
  pageSize?: number;
  tableHeight?: number;
}

export interface PlantDashboardWidgetConfigMap {
  plantStats: PlantStatsWidgetConfig;
  powerMeter: Record<string, never>;
  generationGraph: GenerationGraphWidgetConfig;
  earningsBreakdown: Record<string, never>;
  performanceIndicator: Record<string, never>;
  nonAvailability: Record<string, never>;
  lowPerformingComponents: Record<string, never>;
  devicesOverview: DevicesOverviewWidgetConfig;
  allTimeStats: Record<string, never>;
  weatherForecast: Record<string, never>;
  alarmPanel: AlarmPanelWidgetConfig;
  equipmentStatus: EquipmentStatusWidgetConfig;
  weatherPanel: Record<string, never>;
  energyFlow: Record<string, never>;
  plantSld: Record<string, never>;
  dcChannelHeatmap: Record<string, never>;
  inverterOverview: InverterOverviewWidgetConfig;
  meterAnalytics: Record<string, never>;
  generationAnalytics: Record<string, never>;
}

export type PlantDashboardAnyWidgetConfig =
  PlantDashboardWidgetConfigMap[keyof PlantDashboardWidgetConfigMap];

export interface PlantDashboardBaseItem {
  id: string;
  enabled?: boolean;
  className?: string;
}

export type PlantDashboardWidgetItem = PlantDashboardBaseItem & {
  type: PlantDashboardWidgetType;
  title?: string;
  config?: PlantDashboardAnyWidgetConfig;
};

export type PlantDashboardGroupItem = PlantDashboardBaseItem & {
  type: "group";
  children: PlantDashboardItem[];
};

export type PlantDashboardItem = PlantDashboardWidgetItem | PlantDashboardGroupItem;

export interface PlantDashboardConfig {
  version: number;
  root: PlantDashboardGroupItem;
}

export interface PlantDashboardWidgetProps<TConfig = PlantDashboardAnyWidgetConfig> {
  plantId?: string;
  title?: string;
  config?: TConfig;
  /** When true, widget is rendered inside a dashboard grid cell (no duplicate card chrome). */
  embedded?: boolean;
}
