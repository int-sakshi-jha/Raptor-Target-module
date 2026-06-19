import type React from "react";
import { AllTimeStatsWidget } from "../all-time-stats/AllTimeStatsWidget";
import { AlarmPanelWidget } from "../alarm-panel/AlarmPanelWidget";
import { DcChannelHeatmapWidget } from "../dc-channel-heatmap/DcChannelHeatmapWidget";
import { DevicesOverviewWidget } from "../devices-overview/DevicesOverviewWidget";
import { EarningsBreakdownWidget } from "../earnings-breakdown/EarningsBreakdownWidget";
import { EnergyFlowWidget } from "../energy-flow/EnergyFlowWidget";
import { EquipmentStatusWidget } from "../equipment-status/EquipmentStatusWidget";
import { GenerationAnalyticsWidget } from "../generation-analytics/GenerationAnalyticsWidget";
import { GenerationGraphWidget } from "../generation-graph/GenerationGraphWidget";
import { InverterOverviewWidget } from "../inverter-overview/InverterOverviewWidget";
import { LowPerformingComponentsWidget } from "../low-performing-components/LowPerformingComponentsWidget";
import { MeterAnalyticsWidget } from "../meter-analytics/MeterAnalyticsWidget";
import { NonAvailabilityWidget } from "../non-availability/NonAvailabilityWidget";
import { PerformanceIndicatorWidget } from "../performance-indicator/PerformanceIndicatorWidget";
import { PlantSldWidget } from "../plant-sld/PlantSldWidget";
import { PlantStatsWidget } from "../plant-stats/PlantStatsWidget";
import { PowerMeterWidget } from "../power-meter/PowerMeterWidget";
import { WeatherForecastWidget } from "../weather-forecast/WeatherForecastWidget";
import { WeatherPanelWidget } from "../weather-panel/WeatherPanelWidget";
import type {
  PlantDashboardWidgetProps,
  PlantDashboardWidgetType,
} from "./dashboardTypes";

export interface PlantDashboardWidgetDefinition {
  type: PlantDashboardWidgetType;
  label: string;
  component: React.ComponentType<PlantDashboardWidgetProps>;
}

export const PLANT_DASHBOARD_WIDGET_REGISTRY: Record<
  PlantDashboardWidgetType,
  PlantDashboardWidgetDefinition
> = {
  plantStats: {
    type: "plantStats",
    label: "Plant Stats",
    component: PlantStatsWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  powerMeter: {
    type: "powerMeter",
    label: "Power Meter",
    component: PowerMeterWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  generationGraph: {
    type: "generationGraph",
    label: "Generation Graph",
    component: GenerationGraphWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  earningsBreakdown: {
    type: "earningsBreakdown",
    label: "Earnings Breakdown",
    component: EarningsBreakdownWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  performanceIndicator: {
    type: "performanceIndicator",
    label: "Performance Indicator",
    component: PerformanceIndicatorWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  nonAvailability: {
    type: "nonAvailability",
    label: "Non Availability",
    component: NonAvailabilityWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  lowPerformingComponents: {
    type: "lowPerformingComponents",
    label: "Low Performing Components",
    component: LowPerformingComponentsWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  devicesOverview: {
    type: "devicesOverview",
    label: "Devices Overview",
    component: DevicesOverviewWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  allTimeStats: {
    type: "allTimeStats",
    label: "All Time Stats",
    component: AllTimeStatsWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  weatherForecast: {
    type: "weatherForecast",
    label: "Weather Forecast",
    component: WeatherForecastWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  alarmPanel: {
    type: "alarmPanel",
    label: "Alarms",
    component: AlarmPanelWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  equipmentStatus: {
    type: "equipmentStatus",
    label: "Equipment Status",
    component: EquipmentStatusWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  weatherPanel: {
    type: "weatherPanel",
    label: "Weather Panel",
    component: WeatherPanelWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  energyFlow: {
    type: "energyFlow",
    label: "Energy Flow",
    component: EnergyFlowWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  plantSld: {
    type: "plantSld",
    label: "Plant SLD",
    component: PlantSldWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  dcChannelHeatmap: {
    type: "dcChannelHeatmap",
    label: "DC Channel Heatmap",
    component: DcChannelHeatmapWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  inverterOverview: {
    type: "inverterOverview",
    label: "Inverter Overview",
    component: InverterOverviewWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  meterAnalytics: {
    type: "meterAnalytics",
    label: "Meter Analytics",
    component: MeterAnalyticsWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
  generationAnalytics: {
    type: "generationAnalytics",
    label: "Generation Analytics",
    component: GenerationAnalyticsWidget as React.ComponentType<PlantDashboardWidgetProps>,
  },
};
