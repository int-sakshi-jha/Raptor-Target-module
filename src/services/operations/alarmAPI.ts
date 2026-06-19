import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { alarmEndpoints } from "../endpoints";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";

export interface AlarmRow {
  id: string;
  component_id: string;
  plant_id: string;
  device_id?: string | null;
  alarm_code: string;
  alarm_name?: string | null;
  alarm_description?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_active: boolean;
  occurred_at: string;
  cleared_at?: string | null;
  duration_seconds?: number | null;
  // enriched
  component_name?: string | null;
  device_name?: string | null;
  plant_name?: string | null;
  tenant_name?: string | null;
}

export interface AlarmListFilters {
  severity?: string;
  is_active?: string;
  alarm_code?: string;
  device_id?: string;
  component_id?: string;
  occurred_at_start?: string;
  occurred_at_end?: string;
  cleared_at_start?: string;
  cleared_at_end?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface AlarmTodayStats {
  total: number;
  active: number;
  resolved: number;
  by_severity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

interface GetPlantAlarmsResponse {
  success: boolean;
  code: number;
  data?: {
    data?: AlarmRow[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
  message?: string;
}

interface GetTodayAlarmsResponse {
  success: boolean;
  code: number;
  data?: {
    data?: AlarmRow[];
    stats?: AlarmTodayStats;
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
  message?: string;
}

export const ALARM_SEVERITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const ALARM_ACTIVE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Cleared" },
];

export const ALARM_SORT_OPTIONS = [
  { value: "occurred_at", label: "Occurred at" },
  { value: "severity", label: "Severity" },
  { value: "alarm_code", label: "Alarm code" },
  { value: "created_at", label: "Created at" },
];

export const useGetPlantAlarmsQuery = ({
  plantId,
  page = 1,
  limit = 50,
  search = "",
  filters = {},
  enabled = true,
}: {
  plantId: string | null | undefined;
  page?: number;
  limit?: number;
  search?: string;
  filters?: AlarmListFilters;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["alarms", "plant", plantId, search, filterKey, page, limit],
    enabled: enabled && !!plantId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!plantId) throw new Error("Plant id is required");
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
      };
      const params = toURLSearchParams(rawParams);
      const { data } = await api.get<GetPlantAlarmsResponse>(
        alarmEndpoints.GET_PLANT_ALARMS(plantId),
        { params },
      );
      const root = data?.data;
      return {
        rows: root?.data ?? [],
        pagination: root?.pagination ?? {
          page,
          limit,
          totalCount: 0,
          totalPages: 1,
        },
      };
    },
  });
};

export const useGetTodayAlarmsQuery = ({
  page = 1,
  limit = 50,
  search = "",
  filters = {},
  enabled = true,
}: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: AlarmListFilters;
  enabled?: boolean;
} = {}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["alarms", "today", search, filterKey, page, limit],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
      };
      const params = toURLSearchParams(rawParams);
      const { data } = await api.get<GetTodayAlarmsResponse>(
        alarmEndpoints.GET_TODAY_ALARMS,
        { params },
      );
      const root = data?.data;
      return {
        rows: root?.data ?? [],
        stats: root?.stats ?? {
          total: 0,
          active: 0,
          resolved: 0,
          by_severity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        },
        pagination: root?.pagination ?? {
          page,
          limit,
          totalCount: 0,
          totalPages: 1,
        },
      };
    },
  });
};
