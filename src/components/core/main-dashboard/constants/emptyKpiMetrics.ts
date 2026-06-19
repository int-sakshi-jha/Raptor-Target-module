import type { KpiAggregateMetrics } from "@/components/core/main-dashboard/types/dashboard.types";

export const EMPTY_KPI_METRICS: KpiAggregateMetrics = {
  currentPowerMw: 0,
  installedCapacityMw: 0,
  earnings: {
    daily: { earnings: 0, fullLoadHours: 0 },
    weekly: { earnings: 0, fullLoadHours: 0 },
    monthly: { earnings: 0, fullLoadHours: 0 },
    yearly: { earnings: 0, fullLoadHours: 0 },
  },
  plantStatus: { online: 0, offline: 0, unknown: 0, total: 0 },
  alerts: { activeAlerts: 0, activeAlarms: 0 },
  lastUpdated: null,
  isLive: false,
};
