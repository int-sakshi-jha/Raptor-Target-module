import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "../api";
import {
  componentEndpoints,
  historyEndpoints,
  tagGroupEndpoints,
  tagGroupCategoryEndpoints,
} from "../endpoints";
import { store } from "@/store";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";
import {
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
} from "@/utils/permissions";
import {
  type GetPlantComponentsResponse,
  type PlantComponentSummaryRow,
} from "./plantAPI";
import type { Option } from "@/components/common/AsyncSelect";

export type HistoryValue = string | number | boolean | null | Record<string, unknown> | unknown[];

export type HistoryRow = Record<string, HistoryValue> & {
  id?: string;
  plant_id?: string;
  device_id?: string;
  device_name?: string | null;
  component_id?: string;
  component_name?: string | null;
  component_type?: string | null;
  date?: string;
  timestamp?: string;
  created_at?: string;
  updated_at?: string | null;
  data?: Record<string, unknown> | string | null;
  processed_data?: Record<string, unknown> | string | null;
  processed_data_json?: string | null;
};

export interface HistoryListFilters {
  sort_by?: string;
  sort_order?: string;
  device_id?: string;
  component_id?: string;
  component_type?: string;
  tag_group_id?: string;
  category?: string;
  date_start?: string;

  date_end?: string;
  created_at_start?: string;
  created_at_end?: string;
  json_key?: string | string[];
  last_only?: boolean | string;
}

interface GetPlantHistoryResponse {
  success?: boolean;
  code?: number;
  data?: {
    data?: HistoryRow[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
  message?: string;
}

const HISTORY_PAGE_FALLBACK = {
  page: 1,
  limit: 50,
  totalCount: 0,
  totalPages: 1,
};

function getHistoryEndpoint(plantId: string) {
  const role = store.getState().auth.user?.role;

  if (isTenantOrUserRole(role)) {
    return historyEndpoints.GET_MY_PLANT_HISTORY(plantId);
  }

  if (isAdminOrSuperAdminRole(role)) {
    return historyEndpoints.GET_PLANT_HISTORY(plantId);
  }

  return historyEndpoints.GET_MY_PLANT_HISTORY(plantId);
}

function isNoContentError(error: unknown) {
  const status = (error as AxiosError)?.response?.status;
  return status === 204 || status === 404;
}

export const fetchComponentOptions = async (
  plantId: string,
  componentType?: string,
  parentId?: string,
  search = "",
): Promise<Option[]> => {
  try {
    const params = new URLSearchParams();
    params.append("plant_id", plantId);
    params.append("page", "1");
    params.append("limit", "100");
    if (componentType) params.append("component_type", componentType);
    if (parentId) params.append("parent_id", parentId);
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<GetPlantComponentsResponse>(
      componentEndpoints.GET_ALL,
      { params },
    );
    const rows = data?.data?.data ?? [];
    return rows.map((component) => ({
      value: component.id,
      label: component.component_name,
    }));
  } catch {
    return [];
  }
};

export const fetchHistoryTagGroupOptions = async (
  plantId: string,
  search = "",
): Promise<Option[]> => {
  try {
    const params = new URLSearchParams();
    params.append("plant_id", plantId);
    params.append("is_active", "true");
    params.append("page", "1");
    params.append("limit", "100");
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<{
      data?: {
        data?: Array<{ id?: string; name?: string; category?: string | null }>;
      };
    }>(tagGroupEndpoints.GET_ALL, { params });

    return (data?.data?.data ?? [])
      .filter((row) => row.id)
      .map((row) => ({
        value: String(row.id),
        label: row.category ? `${row.name ?? row.id} (${row.category})` : String(row.name ?? row.id),
      }));
  } catch {
    return [];
  }
};

export const fetchTagGroupCategoryOptions = async (
  search = "",
): Promise<Option[]> => {
  try {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<{
      data?: Array<{ value: string; label: string }>;
    }>(tagGroupCategoryEndpoints.GET_ALL, { params });

    return (data?.data ?? []).map((cat) => ({
      value: cat.value,
      label: cat.label,
    }));
  } catch {
    return [];
  }
};


export const fetchTagMapKeyOptions = async (
  componentIds: string[],
  search = "",
): Promise<Option[]> => {
  try {
    const ids = componentIds.filter(Boolean);
    if (ids.length === 0) return [];

    const params = new URLSearchParams();
    ids.forEach((id) => params.append("component_ids", id));
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<{ data?: string[] }>(
      componentEndpoints.GET_TAG_MAP_KEYS,
      { params },
    );

    return (data?.data ?? []).map((key) => ({ value: key, label: key }));
  } catch {
    return [];
  }
};

export const toComponentOptions = (rows: PlantComponentSummaryRow[] | undefined) =>
  (rows ?? []).map((component) => ({
    value: component.id,
    label: component.component_name,
  }));

export const findComponentLabel = (
  allComponents: PlantComponentSummaryRow[] | undefined,
  id: string,
) => (allComponents ?? []).find((component) => component.id === id)?.component_name ?? id;

export const useGetPlantHistoryQuery = ({
  plantId,
  page = 1,
  limit = 50,
  filters = {},
  enabled = true,
}: {
  plantId: string | null | undefined;
  page?: number;
  limit?: number;
  filters?: HistoryListFilters;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["history", "plant", plantId, filterKey, page, limit],
    enabled: enabled && !!plantId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!plantId) throw new Error("Plant id is required");

      const params = toURLSearchParams({
        page,
        limit,
        ...cleanFilters,
      });

      try {
        const { data } = await api.get<GetPlantHistoryResponse>(
          getHistoryEndpoint(plantId),
          { params },
        );
        const root = data?.data;
        return {
          rows: root?.data ?? [],
          pagination: root?.pagination ?? {
            ...HISTORY_PAGE_FALLBACK,
            page,
            limit,
          },
        };
      } catch (error) {
        if (isNoContentError(error)) {
          return {
            rows: [],
            pagination: {
              ...HISTORY_PAGE_FALLBACK,
              page,
              limit,
            },
          };
        }
        throw error;
      }
    },
  });
};
