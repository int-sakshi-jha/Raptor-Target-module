import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { plantEndpoints } from "../endpoints";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";
import type { PlantEquipmentComponentType } from "@/utils/selectOptions";

export interface PlantEquipmentDashboardFilters {
  component_type: PlantEquipmentComponentType;
  meter_type?: string;
  block_id?: string;
  acdb_id?: string;
  inverter_id?: string;
  device_id?: string;
  search?: string;
}

export interface PlantEquipmentDashboardColumnMeta {
  field: string;
  headerName: string;
  kind?: "text" | "number" | "datetime" | "status";
  minWidth?: number;
  visible?: boolean;
}

export interface PlantEquipmentDashboardSummaryCard {
  key: string;
  label: string;
  value: string | number;
  tone?: "brand" | "success" | "warning" | "neutral";
}

export type PlantEquipmentDashboardRow = Record<string, unknown>;

interface PlantEquipmentDashboardApiResponse {
  success: boolean;
  code: number;
  data?: {
    data?: PlantEquipmentDashboardRow[];
    columns?: PlantEquipmentDashboardColumnMeta[];
    summary_cards?: PlantEquipmentDashboardSummaryCard[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface PlantEquipmentDashboardResult {
  rows: PlantEquipmentDashboardRow[];
  columns: PlantEquipmentDashboardColumnMeta[];
  summaryCards: PlantEquipmentDashboardSummaryCard[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const useGetPlantEquipmentDashboardQuery = ({
  plantId,
  page = 1,
  limit = 50,
  filters,
  enabled = true,
}: {
  plantId: string | null | undefined;
  page?: number;
  limit?: number;
  filters: PlantEquipmentDashboardFilters;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["plant", "equipment-dashboard", plantId, filterKey, page, limit],
    enabled: enabled && !!plantId,
    staleTime: 30_000,
    queryFn: async (): Promise<PlantEquipmentDashboardResult> => {
      if (!plantId) throw new Error("Plant id is required");

      const params = toURLSearchParams({
        page: String(page),
        limit: String(limit),
        ...cleanFilters,
      });

      try {
        const { data } = await api.get<PlantEquipmentDashboardApiResponse>(
          plantEndpoints.GET_PLANT_EQUIPMENT_DASHBOARD(plantId),
          { params },
        );

        return {
          rows: data?.data?.data ?? [],
          columns: data?.data?.columns ?? [],
          summaryCards: data?.data?.summary_cards ?? [],
          pagination: data?.data?.pagination ?? {
            page,
            limit,
            totalCount: 0,
            totalPages: 1,
          },
        };
      } catch {
        return {
          rows: [],
          columns: [],
          summaryCards: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 1,
          },
        };
      }
    },
  });
};
