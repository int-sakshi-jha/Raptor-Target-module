import type { PlantDashboardConfig } from "./dashboardTypes";

export const DEFAULT_PLANT_DASHBOARD_CONFIG: PlantDashboardConfig = {
  version: 1,
  root: {
    id: "root",
    type: "group",
    className: "grid grid-cols-1 gap-2.5 xl:grid-cols-12 xl:items-stretch",
    children: [
      {
        id: "main-column",
        type: "group",
        className: "flex h-full min-h-0 flex-col gap-2.5 xl:col-span-10 xl:col-start-1",
        children: [
          {
            id: "plant-stats",
            type: "plantStats",
            config: {
              visibleMetrics: [
                "dailyYield",
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
            id: "top-middle-row",
            type: "group",
            className:
              "grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.1fr)] lg:items-stretch",
            children: [
              { id: "power-meter", type: "powerMeter", className: "h-full min-h-0" },
              {
                id: "generation-graph",
                type: "generationGraph",
                className: "h-full min-h-0",
                config: {
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
                id: "performance-grid",
                type: "group",
                className:
                  "grid h-full min-h-0 grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-2",
                children: [
                  {
                    id: "earnings-breakdown",
                    type: "earningsBreakdown",
                    className: "h-full min-h-0",
                  },
                  {
                    id: "performance-indicator",
                    type: "performanceIndicator",
                    className: "h-full min-h-0",
                  },
                  {
                    id: "non-availability",
                    type: "nonAvailability",
                    className: "h-full min-h-0",
                  },
                  {
                    id: "low-performing-components",
                    type: "lowPerformingComponents",
                    className: "h-full min-h-0",
                  },
                ],
              },
            ],
          },
          {
            id: "bottom-overview-row",
            type: "group",
            className: "grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:items-stretch",
            children: [
              {
                id: "devices-overview",
                type: "devicesOverview",
                config: {
                  defaultComponentType: "inverter",
                  defaultTimeRange: "live",
                  pageSize: 10,
                  tableHeight: 360,
                },
              },
              {
                id: "alarm-panel",
                type: "alarmPanel",
                config: {
                  pageSize: 10,
                  tableHeight: 405,
                  showTabs: true,
                },
              },
            ],
          },
        ],
      },
      {
        id: "side-column",
        type: "group",
        className:
          "flex h-full min-h-0 flex-col gap-2.5 xl:col-span-2 xl:col-start-11 xl:row-start-1 xl:self-stretch",
        children: [
          { id: "all-time-stats", type: "allTimeStats" },
          {
            id: "weather-forecast",
            type: "weatherForecast",
            className: "min-h-0 flex-1",
          },
        ],
      },
    ],
  },
};
