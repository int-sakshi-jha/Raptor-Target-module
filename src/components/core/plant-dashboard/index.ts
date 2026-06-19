export { PlantDashboardCard } from "./shared/PlantDashboardCard";
export { PlantDashboardMetricBar, toneForMetric } from "./shared/PlantDashboardMetricBar";
export { PlantDashboardRenderer, PlantDashboardView } from "./shared/PlantDashboardRenderer";
export { DEFAULT_PLANT_DASHBOARD_CONFIG } from "./shared/defaultDashboardConfig";
export { PLANT_DASHBOARD_WIDGET_REGISTRY } from "./shared/widgetRegistry";
export {
  parsePlantDashboardOverride,
  resolvePlantDashboardConfig,
  usePlantDashboardConfig,
} from "./shared/plantDashboardConfig";
export type {
  DevicesOverviewWidgetConfig,
  GenerationGraphWidgetConfig,
  PlantDashboardConfig,
  PlantDashboardItem,
  PlantDashboardWidgetConfigMap,
  PlantDashboardWidgetItem,
  PlantDashboardWidgetProps,
  PlantDashboardWidgetType,
  PlantStatsMetricId,
  PlantStatsWidgetConfig,
} from "./shared/dashboardTypes";
export * from "./shared/plantLiveMetrics";
export {
  buildPlantPerformanceSummary,
  type PlantPerformanceSummary,
  type ComponentGroupCounts,
} from "./shared/plantPerformanceMetrics";

export { PlantStatsWidget } from "./plant-stats/PlantStatsWidget";
export {
  buildPlantStatsSummary,
  formatPlantUptime,
  type PlantStatsSummary,
  type PlantUptimeDisplay,
} from "./plant-stats/plantStats";

export { AllTimeStatsWidget } from "./all-time-stats/AllTimeStatsWidget";
export {
  buildAllTimeStatsSummary,
  type AllTimeStatsSummary,
} from "./all-time-stats/allTimeStats";

export { PowerMeterWidget } from "./power-meter/PowerMeterWidget";
export { PowerMeterFlowDiagram } from "./power-meter/PowerMeterFlowDiagram";
export {
  buildPowerMeterSummary,
  type PowerMeterSummary,
  type PowerMeterComparisonRow,
} from "./power-meter/powerMeter";

export { GenerationGraphWidget } from "./generation-graph/GenerationGraphWidget";
export { buildGenerationCurve, type GenerationCurvePoint } from "./generation-graph/generationGraph";

export { EarningsBreakdownWidget } from "./earnings-breakdown/EarningsBreakdownWidget";
export { PerformanceIndicatorWidget } from "./performance-indicator/PerformanceIndicatorWidget";
export { NonAvailabilityWidget } from "./non-availability/NonAvailabilityWidget";
export { LowPerformingComponentsWidget } from "./low-performing-components/LowPerformingComponentsWidget";

export { AlarmPanelWidget } from "./alarm-panel/AlarmPanelWidget";
export {
  buildLiveAlarmRows,
  mergeAlarmPanelRows,
  type AlarmPanelRow,
  type AlarmPanelTab,
} from "./alarm-panel/liveAlarms";
export {
  buildWeatherForecastSummary,
  type WeatherForecastSummary,
  type WeatherMetricItem,
} from "./weather-forecast/weatherForecast";
export { WeatherForecastWidget } from "./weather-forecast/WeatherForecastWidget";

export { DevicesOverviewWidget } from "./devices-overview/DevicesOverviewWidget";
export {
  DEVICES_OVERVIEW_FIELDS_BY_TYPE,
  DEVICES_OVERVIEW_TYPES,
  DEVICES_TIME_RANGES,
  enrichEquipmentRowsWithPlantDetails,
  filterRowsByTimeRange,
  orderDevicesOverviewFields,
  resolveDevicesOverviewDateRange,
  type DevicesOverviewDateRange,
  type DevicesOverviewDeviceType,
  type DevicesOverviewTimeRange,
} from "./devices-overview/devicesOverview";
