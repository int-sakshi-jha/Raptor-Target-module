import type { DashboardTopicConfig, MainDashboardConfig } from "../types/dashboard.types";

export const DEFAULT_DASHBOARD_TOPIC_CONFIG: DashboardTopicConfig[] = [
  { key: "current_power", label: "Current Power", datatype: "number", source: "mqtt", unit: "kW", group: "kpi" },
  { key: "installed_capacity", label: "Installed Capacity", datatype: "number", source: "plant", unit: "kW", group: "kpi" },
  { key: "daily_earnings", label: "Daily Earnings", datatype: "number", source: "mqtt", unit: "INR", group: "earnings" },
  { key: "weekly_earnings", label: "Weekly Earnings", datatype: "number", source: "mqtt", unit: "INR", group: "earnings" },
  { key: "monthly_earnings", label: "Monthly Earnings", datatype: "number", source: "mqtt", unit: "INR", group: "earnings" },
  { key: "yearly_earnings", label: "Yearly Earnings", datatype: "number", source: "mqtt", unit: "INR", group: "earnings" },
  { key: "daily_full_load_hours", label: "Daily Full Load Hours", datatype: "number", source: "mqtt", unit: "h", group: "earnings" },
  { key: "weekly_full_load_hours", label: "Weekly Full Load Hours", datatype: "number", source: "mqtt", unit: "h", group: "earnings" },
  { key: "monthly_full_load_hours", label: "Monthly Full Load Hours", datatype: "number", source: "mqtt", unit: "h", group: "earnings" },
  { key: "yearly_full_load_hours", label: "Yearly Full Load Hours", datatype: "number", source: "mqtt", unit: "h", group: "earnings" },
  { key: "plant_status", label: "Plant Status", datatype: "string", source: "mqtt", group: "status" },
  { key: "export_power", label: "Export Power", datatype: "number", source: "mqtt", unit: "kW", group: "plant" },
  { key: "import_power", label: "Import Power", datatype: "number", source: "mqtt", unit: "kW", group: "plant" },
  { key: "today_generation", label: "Today Generation", datatype: "number", source: "mqtt", unit: "kWh", group: "plant" },
  { key: "total_generation", label: "Total Generation", datatype: "number", source: "mqtt", unit: "kWh", group: "plant" },
  { key: "export_energy", label: "Export Energy", datatype: "number", source: "mqtt", unit: "kWh", group: "plant" },
  { key: "import_energy", label: "Import Energy", datatype: "number", source: "mqtt", unit: "kWh", group: "plant" },
  { key: "ppa_rate", label: "PPA Rate", datatype: "number", source: "plant", unit: "INR/kWh", group: "plant" },
  { key: "revenue_type", label: "Revenue Type", datatype: "string", source: "plant", group: "plant" },
  { key: "active_alerts", label: "Active Alerts", datatype: "number", source: "mqtt", group: "alerts" },
  { key: "active_alarms", label: "Active Alarms", datatype: "number", source: "mqtt", group: "alerts" },
  { key: "inactive_components", label: "Inactive Components", datatype: "number", source: "mqtt", group: "plant" },
  { key: "performance_ratio", label: "Performance Ratio", datatype: "number", source: "mqtt", group: "plant" },
  { key: "cuf", label: "CUF", datatype: "number", source: "mqtt", group: "plant" },
];

export const DEFAULT_MAIN_DASHBOARD_CONFIG: MainDashboardConfig = {
  topicConfig: DEFAULT_DASHBOARD_TOPIC_CONFIG,
  defaultRevenueType: "net",
  defaultCompareMetric: "yield",
  refreshIntervalMs: 5_000,
};
