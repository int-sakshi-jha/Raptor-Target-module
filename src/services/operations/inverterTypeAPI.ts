import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api";
import { inverterTypeEndpoints } from "../endpoints";
import toast from "react-hot-toast";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";
export type InverterCommunicationInterface =
  | "wifi"
  | "rs485"
  | "can_bus"
  | "ethernet"
  | "display";

export type InverterRegisterMap  = Record<string, string | number>;
export type InverterDataPoints   = Record<string, string>;

export interface InverterSpecifications {
  mounting?: string;
  topology?: string;
  isolation?: string;
  [key: string]: string | undefined;
}

export interface InverterMetadata {
  notes?: string;
  last_tested?: string;
  firmware_version?: string;
  added_from?: string;
  [key: string]: unknown;
}
export interface CreateInverterInput {
  brand: string;
  model: string;
  phase_type: string;
  currency: string;
  model_number?: string;
  manufacturer?: string;
  country_of_origin?: string;
  cooling_method?: string;
  protection_rating?: string;
  datasheet_url?: string;
  manual_url?: string;
  capacity_kw: number;
  max_ac_power_kw?: number;
  max_dc_power_kw?: number;
  nominal_power_kw?: number;
  max_efficiency_percent?: number;
  max_dc_voltage?: number;
  min_dc_voltage?: number;
  mppt_voltage_range_min?: number;
  mppt_voltage_range_max?: number;
  max_dc_current_per_mppt?: number;
  max_short_circuit_current?: number;
  ac_voltage_nominal?: number;
  ac_voltage_range_min?: number;
  ac_voltage_range_max?: number;
  ac_frequency_nominal?: number;
  ac_frequency_range_min?: number;
  ac_frequency_range_max?: number;
  max_ac_current?: number;
  power_factor_range_min?: number;
  power_factor_range_max?: number;
  weight_kg?: number;
  noise_level_db?: number;
  operating_temp_min?: number;
  operating_temp_max?: number;
  list_price?: number;
  mppt_count: number;
  strings_per_mppt: number;
  max_string_count: number;
  phase_count: number;
  warranty_years: number;
  has_wifi: boolean;
  has_ethernet: boolean;
  has_rs485: boolean;
  has_display: boolean;
  is_active: boolean;
  protocols_supported: string[] | null;
  certifications: string[] | null;
  tags: string[] | null;
  /** JSON array: strings and/or objects (backend JSONB). */
  communication_interfaces: unknown[] | null;
  register_map: InverterRegisterMap;
  data_points: InverterDataPoints;
  specifications: InverterSpecifications;
  metadata: InverterMetadata;
  alarm_tag_template_id: string | null;
  alarm_decode_mode: "bitmap" | "direct";
  modbus_start_index: 0 | 1;
  alarm_bitmap_bits: 8 | 16 | 32 | 64;
  alarm_bit_order: "left" | "right";
}

export interface Inverter {
  id: string;
  brand: string;
  model: string;
  model_number?: string;
  manufacturer?: string;
  country_of_origin?: string;
  /** API may return numeric fields as strings (e.g. `"10"`). */
  capacity_kw: number | string;
  max_ac_power_kw?: number;
  max_dc_power_kw?: number;
  nominal_power_kw?: number;
  max_efficiency_percent?: number;
  mppt_count: number;
  strings_per_mppt: number;
  max_string_count: number;
  max_dc_voltage?: number;
  min_dc_voltage?: number;
  mppt_voltage_range_min?: number;
  mppt_voltage_range_max?: number;
  max_dc_current_per_mppt?: number;
  max_short_circuit_current?: number;
  ac_voltage_nominal?: number;
  ac_voltage_range_min?: number;
  ac_voltage_range_max?: number;
  ac_frequency_nominal?: number;
  ac_frequency_range_min?: number;
  ac_frequency_range_max?: number;
  max_ac_current?: number;
  power_factor_range_min?: number;
  power_factor_range_max?: number;
  phase_type: string;
  phase_count: number;
  weight_kg?: number;
  cooling_method?: string;
  protection_rating?: string;
  noise_level_db?: number;
  operating_temp_min?: number;
  operating_temp_max?: number;
  storage_temp_min?: number;
  storage_temp_max?: number;
  communication_interfaces?: unknown[];
  protocols_supported?: string[];
  has_wifi?: boolean;
  has_ethernet?: boolean;
  has_rs485?: boolean;
  has_can_bus?: boolean;
  has_display?: boolean;
  has_battery_support?: boolean;
  has_dc_switch?: boolean;
  has_arc_fault_detection?: boolean;
  has_pid_prevention?: boolean;
  reactive_power_control?: boolean;
  grid_support_features?: string[];
  alarm_tag_template_id?: string | null;
  alarm_tag_template_name?: string;
  certifications?: string[];
  warranty_years?: number;
  alarm_data?: Record<string, unknown>;
  fault_codes?: Record<string, unknown>;
  warning_codes?: Record<string, unknown>;
  register_map?: InverterRegisterMap;
  data_points?: InverterDataPoints;
  specifications?: InverterSpecifications;
  datasheet_url?: string;
  manual_url?: string;
  list_price?: number;
  currency?: string;
  is_active?: boolean;
  metadata?: InverterMetadata;
  tags?: string[];
  alarm_decode_mode?: "bitmap" | "direct";
  modbus_start_index?: 0 | 1;
  alarm_bitmap_bits?: 8 | 16 | 32 | 64;
  alarm_bit_order?: "left" | "right";
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  created_by_name?: string;
  updated_by_name?: string;
}
export interface GetAllInverterResponse {
  success: boolean;
  code: number;
  data: {
    data: Inverter[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
}
export interface GetInverterDetailsResponse {
  success: boolean;
  code: number;
  data: Inverter;
}

export interface CreateInverterResponse {
  success: boolean;
  code: number;
  data: {
    inverter: Inverter;
    message: string;
  };
}

export interface UpdateInverterResponse {
  success: boolean;
  code: number;
  data?: {
    data?: Inverter;
    message?: string;
    modifiedProperties?: Partial<Inverter>;
  };
  message?: string;
}

export interface DeleteInverterResponse {
  success: boolean;
  code: number;
  data?: { message?: string };
  message?: string;
}

export interface ToggleStatusResponse {
  success: boolean;
  code: number;
  data: {
    data: {
      notFoundIds: string[];
      totalUpdated: number;
      totalRequested: number;
    };
    message: string;
  };
}

export type UpdateInverterInput = Partial<CreateInverterInput> & {
  id: string;
}


/** Query params for `GET` inverter list — matches `internalName` / future `inverterTypeFieldConfigs` filters. */
export type InverterListFilters = Record<
  string,
  string | string[] | boolean | undefined | null
>;

export const fetchInverterTypeNames = async (
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const { data } = await api.get<GetAllInverterResponse>(
    inverterTypeEndpoints.GET_INVERTER_TYPE_NAMES,
    { params },
  );
  const raw = data?.data?.data ?? [];
  return raw.map((item) => ({
    value: String(item.id),
    label: String(item.model ?? item.model_number ?? item.id),
  }));
};

/** Resolve model label for a stored inverter-type id when `inverter_type_name` was not persisted. */
export const fetchInverterTypeDisplayLabelById = async (
  id: string,
): Promise<string | null> => {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  try {
    const { data } = await api.get<GetInverterDetailsResponse>(
      inverterTypeEndpoints.GET_INVERTER_BY_ID(trimmed),
    );
    const inv = data?.data;
    if (!inv || typeof inv !== "object") return null;
    return String(inv.model ?? inv.model_number ?? inv.id);
  } catch {
    return null;
  }
};

export const useGetInverterListQuery = ({
  page = 1,
  limit = 50,
  search = "",
  filters = {},
  enabled = true,
}: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: InverterListFilters;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);
  const queryKey = useMemo(
    () => ["inverter", "list", page, limit, search, filterKey] as const,
    [page, limit, search, filterKey],
  );

  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: String(page),
        limit: String(limit), 
        ...cleanFilters,
      };
      const params = toURLSearchParams(rawParams);
      const { data } = await api.get<GetAllInverterResponse>(
        inverterTypeEndpoints.GET_ALL_INVERTER_TYPES,
        { params },
      );
      return data;
    },
    staleTime: 30_000,
  });
};

export const useGetInverterDetailsQuery = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ["inverter", "details", id],
    queryFn: async () => {
      if (!id) throw new Error("Inverter ID is required");
      const { data } = await api.get<GetInverterDetailsResponse>(
        inverterTypeEndpoints.GET_INVERTER_BY_ID(id),
      );
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
};

export const useCreateInverterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInverterInput) => {
      const { data } = await api.post<CreateInverterResponse>(
        inverterTypeEndpoints.CREATE_INVERTER,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || "Inverter created successfully");
      queryClient.invalidateQueries({ queryKey: ["inverter", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdateInverterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateInverterInput) => {
      const { data } = await api.put<UpdateInverterResponse>(
        inverterTypeEndpoints.UPDATE_INVERTER(id),
        input,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || data.data?.message || "Inverter updated successfully");
      queryClient.invalidateQueries({ queryKey: ["inverter", "list"] });
      queryClient.invalidateQueries({ queryKey: ["inverter", "details", variables.id] });
    },
    onError: toastError,
  });
};

// DELETE 
export const useDeleteInverterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.put<DeleteInverterResponse>(
        inverterTypeEndpoints.DELETE_INVERTER,
        { inverter_type_ids: ids },
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || "Inverter deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["inverter", "list"] });
    },
    onError: toastError,
  });
};
export const useToggleInverterStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ids,
      is_active,
    }: {
      id?: string;
      ids?: string[];
      is_active: boolean;
    }) => {
      const inverterIds =
        ids?.map((value) => String(value).trim()).filter(Boolean) ??
        (id ? [String(id).trim()] : []);
      if (inverterIds.length === 0) {
        throw new Error("At least one inverter type id is required");
      }
      const { data } = await api.put<ToggleStatusResponse>(
        inverterTypeEndpoints.TOGGLE_STATUS,
        { inverter_type_ids: inverterIds, is_active },
      );
      return data;
    },
    onSuccess: (data, { id, ids, is_active }) => {
      toast.success(
        data.data?.message ||
          `Inverter type ${is_active ? "activated" : "deactivated"} successfully`,
      );
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["inverter", "list"] });
        if (id) {
          queryClient.refetchQueries({ queryKey: ["inverter", "details", id] });
        }
        ids?.forEach((inverterId) => {
          queryClient.refetchQueries({ queryKey: ["inverter", "details", inverterId] });
        });
      }, 800);
    },
    onError: toastError,
  });
};
