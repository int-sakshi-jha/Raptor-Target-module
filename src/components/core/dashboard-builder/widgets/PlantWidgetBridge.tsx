import { PLANT_DASHBOARD_WIDGET_REGISTRY } from "@/components/core/plant-dashboard/shared/widgetRegistry";
import { PlantDashboardWidgetChromeContext } from "@/components/core/plant-dashboard/shared/PlantDashboardWidgetChromeContext";
import type { PlantDashboardWidgetType } from "@/components/core/plant-dashboard/shared/dashboardTypes";
import type { WidgetLibraryType } from "../types/document";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import { widgetShowHeading } from "../core/tagTemplateRuntime";

const TYPE_MAP: Partial<Record<WidgetLibraryType, PlantDashboardWidgetType>> = {
  plant_stats: "plantStats",
  power_meter: "powerMeter",
  generation_graph: "generationGraph",
  earnings_breakdown: "earningsBreakdown",
  performance_indicator: "performanceIndicator",
  non_availability: "nonAvailability",
  low_performing_components: "lowPerformingComponents",
  devices_overview: "devicesOverview",
  all_time_stats: "allTimeStats",
  weather_forecast: "weatherForecast",
  alarm_panel: "alarmPanel",
  equipment_status: "equipmentStatus",
  weather_panel: "weatherPanel",
  energy_flow: "energyFlow",
  plant_sld: "plantSld",
  dc_channel_heatmap: "dcChannelHeatmap",
  inverter_overview: "inverterOverview",
  meter_analytics: "meterAnalytics",
  generation_analytics: "generationAnalytics",
};

interface PlantWidgetBridgeProps extends WidgetRenderProps {
  type: WidgetLibraryType;
}

export function PlantWidgetBridge({ type, plantId, title, config }: PlantWidgetBridgeProps) {
  const plantType = TYPE_MAP[type];
  if (!plantType) return null;

  const definition = PLANT_DASHBOARD_WIDGET_REGISTRY[plantType];
  const Widget = definition.component;
  const def = WIDGET_LIBRARY_BY_TYPE[type];
  const displayTitle = title?.trim() || def?.label;
  const showHeading = widgetShowHeading(config);

  return (
    <PlantDashboardWidgetChromeContext.Provider
      value={{ titleOverride: displayTitle, showHeading, embedded: true }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Widget plantId={plantId} title={displayTitle} config={config as never} embedded />
      </div>
    </PlantDashboardWidgetChromeContext.Provider>
  );
}
