import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { plantEndpoints } from "../endpoints";
import { DEFAULT_MAIN_DASHBOARD_CONFIG } from "@/components/core/main-dashboard/constants/defaultTopicConfig";
import type { MainDashboardConfig } from "@/components/core/main-dashboard/types/dashboard.types";

type ApiEnvelope<T> = {
  success: boolean;
  code: number;
  data?: T;
  message?: string;
};

export const mainDashboardQueryKeys = {
  config: ["main-dashboard", "config"] as const,
};

export function useMainDashboardConfigQuery(enabled = true) {
  return useQuery({
    queryKey: mainDashboardQueryKeys.config,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MainDashboardConfig> => {
      try {
        const response = await api.get<ApiEnvelope<MainDashboardConfig>>(
          plantEndpoints.GET_MAIN_DASHBOARD_CONFIG,
        );
        const payload = response.data?.data;
        if (payload?.topicConfig?.length) {
          return {
            ...DEFAULT_MAIN_DASHBOARD_CONFIG,
            ...payload,
            topicConfig: payload.topicConfig,
          };
        }
      } catch {
        // Backend endpoint may not exist yet — fall back to defaults.
      }
      return DEFAULT_MAIN_DASHBOARD_CONFIG;
    },
  });
}
