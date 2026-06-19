export type PlantOperationalStatus = "active" | "inactive" | "partial" | "unknown";

export type RevenueType =
  | "export"
  | "import"
  | "net"
  | "ppa"
  | "custom";

export type CompareMetric =
  | "yield"
  | "revenue"
  | "power"
  | "generation"
  | "export"
  | "import"
  | "ac_capacity"
  | "dc_capacity"
  | "alerts"
  | "pr"
  | "cuf";

export type TimeRangePreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year"
  | "custom";

export type PlantCardsViewMode = "cards" | "list" | "map" | "charts";

export interface DashboardTopicConfig {
  key: string;
  label: string;
  datatype: "number" | "string" | "boolean" | "datetime";
  source: string;
  calculation?: string;
  unit?: string;
  group?: "kpi" | "plant" | "earnings" | "status" | "alerts";
}

export interface MainDashboardConfig {
  topicConfig: DashboardTopicConfig[];
  defaultRevenueType: RevenueType;
  defaultCompareMetric: CompareMetric;
  refreshIntervalMs?: number;
}

export interface PlantDashboardMetrics {
  plantId: string;
  plantName: string;
  status: PlantOperationalStatus;
  currentPowerKw: number | null;
  exportPowerKw: number | null;
  importPowerKw: number | null;
  todayGenerationKwh: number | null;
  totalGenerationKwh: number | null;
  revenue: number | null;
  acCapacityKw: number | null;
  dcCapacityKw: number | null;
  alertsCount: number;
  inactiveComponentsCount: number;
  yield: number | null;
  performanceRatio: number | null;
  cuf: number | null;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: string | null;
  revenueType: RevenueType;
  exportEnergyKwh: number | null;
  importEnergyKwh: number | null;
  ppaRate: number | null;
  hasLiveData: boolean;
}

export interface KpiAggregateMetrics {
  currentPowerMw: number;
  installedCapacityMw: number;
  earnings: {
    daily: { earnings: number; fullLoadHours: number };
    weekly: { earnings: number; fullLoadHours: number };
    monthly: { earnings: number; fullLoadHours: number };
    yearly: { earnings: number; fullLoadHours: number };
  };
  plantStatus: {
    online: number;
    offline: number;
    unknown: number;
    total: number;
  };
  alerts: {
    activeAlerts: number;
    activeAlarms: number;
  };
  lastUpdated: string | null;
  isLive: boolean;
}

export interface MainDashboardFilters {
  timeRange: TimeRangePreset;
  customDateFrom?: string | null;
  customDateTo?: string | null;
  compareBy: CompareMetric;
  status: PlantOperationalStatus[];
  revenueType: RevenueType;
  capacityMinKw: number;
  capacityMaxKw: number;
  selectedPlantIds: string[];
  search: string;
}

export const DEFAULT_MAIN_DASHBOARD_FILTERS: MainDashboardFilters = {
  timeRange: "today",
  compareBy: "yield",
  status: [],
  revenueType: "net",
  capacityMinKw: 0,
  capacityMaxKw: 100_000,
  selectedPlantIds: [],
  search: "",
};
