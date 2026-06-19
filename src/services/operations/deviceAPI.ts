import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { type ComponentRow } from "./componentAPI";
import { api } from "../api";
import { deviceEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";
import toast from "react-hot-toast";
import { store } from "@/store";
import {
  canGetAllDevices,
  canGetMyDevices,
  usesScopedDeviceListAccess,
} from "@/utils/permissions";
export interface Device {
  id: string;
  tenant_id?: string | null;
  plant_id?: string | null;
  plant_utility_type?: string | null;
  device_type?: string | null;
  device_name?: string | null;
  serial_number?: string | null;
  imei?: string | null;
  mac_address?: string | null;
  model_code?: string | null;
  manufacturer?: string | null;
  client_id?: string | null;
  username?: string | null;
  password?: string | null;
  config_json?: Record<string, unknown> | null;
  topics?: { topic: string; topic_name: string }[] | null;
  external_topics?: { topic: string; topic_name: string }[] | null;
  data_interval_seconds?: number | null;
  external_client_id?: string | null;
  external_vd_tag_name?: string | null;
  external_username?: string | null;
  external_password?: string | null;
  external_broker_url?: string | null;
  last_seen_at?: string | null;
  last_data?: Record<string, unknown> | null;
  last_heartbeat_at?: string | null;
  ip_address?: string | null;
  is_active?: boolean | null;
  is_online?: boolean | null;
  is_default_config?: boolean | null;
  health_vd?: number | null;
  health_tag_template_id?: string | null;
  tag_map?: Record<string, unknown> | null;
  share_component_map?: Record<string, unknown> | null;
  dynamic_component_map?:
    | { template_id: string; component_id: string }[]
    | null;
  tag_template_tag_map?: Record<string, unknown> | null;
  share_component_tag_template_tag_map?: Record<string, unknown> | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  tenant_name?: string | null;
  plant_name?: string | null;
  tag_template_name?: string | null;
  health_tag_template_name?: string | null;
}

export interface GetAllDevicesResponse {
  success: boolean;
  code: number;
  data: {
    data: Device[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
}

export interface GetDeviceDetailsResponse {
  success: boolean;
  code: number;
  data: {
    device: Device;
    components: ComponentRow[];
  };
  message?: string;
}

export interface CreateDeviceInput {
  tenant_id: string;
  plant_id?: string | null;
  plant_utility_type?: string | null;
  device_type?: string | null;
  device_name?: string | null;
  serial_number?: string | null;
  imei?: string | null;
  mac_address?: string | null;
  model_code?: string | null;
  manufacturer?: string | null;
  data_interval_seconds?: number | null;
  external_vd_tag_name?: string | null;
  external_broker_url?: string | null;
  external_client_id?: string | null;
  external_username?: string | null;
  external_password?: string | null;
  external_topics?: { topic: string; topic_name: string }[] | null;
  is_default_config?: boolean | null;
  health_vd?: number | null;
  health_tag_template_id?: string | null;
  metadata?: Record<string, unknown> | null;
  is_active?: boolean | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
}

type DeviceEditableBackendFields = {
  client_id?: string | null;
  username?: string | null;
  password?: string | null;
  config_json?: Record<string, unknown> | null;
  topics?: { topic: string; topic_name: string }[] | null;
  metadata?: Record<string, unknown> | null;
};

type DeviceUiLabels = {
  plant_name?: string | null;
  health_tag_template_name?: string | null;
};

export interface UpdateDeviceInput
  extends Partial<CreateDeviceInput>,
    DeviceEditableBackendFields,
    DeviceUiLabels {
  id: string;
}

export interface CreateDeviceResponse {
  success: boolean;
  code: number;
  data: { data: Device; message: string };
  message?: string;
}

export interface UpdateDeviceResponse {
  success: boolean;
  code: number;
  data: {
    data?: Device;
    newData?: Device;
    oldData?: Device;
    modifiedProperties?: Partial<Device>;
    message?: string;
  };
  message?: string;
}

export interface DeleteDeviceItem {
  device_id: string;
  tenant_id: string | null;
}

export type DeviceListFilters = Record<
  string,
  string | string[] | boolean | undefined | null
>;

export type DeviceListScope = "all" | "scoped";

type SelectOptionItem = {
  id: string;
  value: string;
  label: string;
};

type GetSelectOptionsResponse = {
  success: boolean;
  code: number;
  data: SelectOptionItem[];
};

export type DeviceSelectOption<T extends string> = {
  value: T;
  label: string;
};

const fetchScopedDeviceOptions = async <T extends string>(
  scope: string,
  search = "",
): Promise<DeviceSelectOption<T>[]> => {
  const params = new URLSearchParams();
  if (search.trim()) params.append("search", search.trim());

  const { data } = await api.get<GetSelectOptionsResponse>(
    scope === "device_type"
      ? deviceEndpoints.GET_DEVICE_TYPES
      : deviceEndpoints.GET_PLANT_UTILITY_TYPES,
    { params },
  );

  const rows = Array.isArray(data.data) ? data.data : [];

  return rows
    .filter((row): row is SelectOptionItem =>
      !!row &&
      typeof row.value === "string" &&
      typeof row.label === "string"
    )
    .map((row) => ({
      value: row.value as T,
      label: row.label,
    }));
};

export const fetchDeviceTypeOptions = async (search = "") => {
  return fetchScopedDeviceOptions(
    "device_type",
    search,
  );
};

export const fetchPlantUtilityTypeOptions = async (search = "") => {
  return fetchScopedDeviceOptions(
    "plant_utility_type",
    search,
  );
};

/**
 * `sort_by` values for device list — fields with `sortable: true` in device field config
 * (tenant/plant FKs and non-sortable metrics excluded).
 */
const getDeviceListEndpoint = () => {
  const { permissions, user } = store.getState().auth;

  if (canGetAllDevices(permissions)) {
    return deviceEndpoints.GET_DEVICE_LIST;
  }

  if (usesScopedDeviceListAccess(permissions, user?.role)) {
    return deviceEndpoints.GET_MY_DEVICE_LIST;
  }

  return deviceEndpoints.GET_DEVICE_LIST;
};

const getDeviceNameEndpoint = () => {
  const { permissions, user } = store.getState().auth;

  if (canGetAllDevices(permissions)) {
    return deviceEndpoints.GET_DEVICE_NAMES;
  }

  if (canGetMyDevices(permissions) || usesScopedDeviceListAccess(permissions, user?.role)) {
    return deviceEndpoints.GET_MY_DEVICE_NAMES;
  }

  return deviceEndpoints.GET_DEVICE_NAMES;
};


// --- Queries ---

export const useGetDeviceListQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  scope,
  enabled = true,
}: {
  search?: string;
  filters?: DeviceListFilters;
  page?: number;
  limit?: number;
  scope?: DeviceListScope;
  enabled?: boolean;
} = {}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);
  const endpoint =
    scope === "scoped"
      ? deviceEndpoints.GET_MY_DEVICE_LIST
      : scope === "all"
        ? deviceEndpoints.GET_DEVICE_LIST
        : getDeviceListEndpoint();
  const queryKey = useMemo(
    () => ["device", "list", endpoint, search, filterKey, page, limit] as const,
    [endpoint, search, filterKey, page, limit],
  );

  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        ...(page ? { page: page.toString() } : {}),
        ...(limit ? { limit: limit.toString() } : {}),
        ...cleanFilters,
      };
      const params = toURLSearchParams(rawParams);
      const { data } = await api.get<GetAllDevicesResponse>(
        endpoint,
        { params },
      );
      return data;
    },
    staleTime: 30_000,
  });
};

export const useGetDeviceDetailsQuery = (
  id: string | null | undefined,
  options?: {
    staleTime?: number;
    refetchOnMount?: boolean | "always";
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
  },
) => {
  return useQuery({
    queryKey: ["device", "details", id],
    queryFn: async () => {
      if (!id) throw new Error("Device ID is required");
      const { data } = await api.get<GetDeviceDetailsResponse>(
        deviceEndpoints.GET_DEVICE_BY_ID(id),
      );
      return data;
    },
    enabled: options?.enabled ?? !!id,
    staleTime: options?.staleTime ?? 60_000,
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options?.refetchOnReconnect ?? false,
  });
};

export const useCreateDeviceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviceInput) => {
      const { data } = await api.post<CreateDeviceResponse>(
        deviceEndpoints.CREATE_DEVICE,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Device created successfully");
      queryClient.invalidateQueries({ queryKey: ["device", "list"] });
    },
    // onError: toastError,
  });
};

export const useUpdateDeviceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDeviceInput) => {
      const requestBody: Record<string, unknown> = { ...input };
      delete requestBody.plant_name;
      delete requestBody.health_tag_template_name;
      const { data } = await api.put<UpdateDeviceResponse>(
        deviceEndpoints.UPDATE_DEVICE(id),
        requestBody,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.data?.message || data.message || "Device updated successfully");
      queryClient.invalidateQueries({ queryKey: ["device", "list"] });
      queryClient.invalidateQueries({ queryKey: ["device", "details", variables.id] });
    },
    onError: toastError,
  });
};
export const useToggleDeviceStatusMutation = () => {
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
      const deviceIds =
        ids?.map((value) => String(value).trim()).filter(Boolean) ??
        (id ? [String(id).trim()] : []);
      if (deviceIds.length === 0) {
        throw new Error("At least one device id is required");
      }
      const { data } = await api.put<{ success: boolean; code: number; data?: { message?: string }; message?: string }>(
        deviceEndpoints.TOGGLE_DEVICE_STATUS,
        { device_ids: deviceIds, is_active },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.data?.message || (data.data as any)?.device?.message || data.message || "Device status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["device", "list"] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ["device", "details", variables.id] });
      }
      variables.ids?.forEach((deviceId) => {
        queryClient.invalidateQueries({ queryKey: ["device", "details", deviceId] });
      });
    },
    onError: toastError,
  });
};

export const useDeleteDeviceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.put<{ success: boolean; code: number; data?: { message?: string }; message?: string }>(
        deviceEndpoints.DELETE_DEVICE,
        { device_ids: ids },
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Device deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["device", "list"] });
    },
    onError: toastError,
  });
};

export const fetchDeviceNames = async (
  search = "",
  page = 1,
  limit = 50,
  plant_id?: string | null,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", String(page));
  params.append("limit", String(limit));
  if (plant_id) params.append("plant_id", plant_id);

  const endpoint = getDeviceNameEndpoint();
  const { data } = await api.get<{
    data?: {
      data?: Pick<Device, "id" | "device_name">[];
      pagination?: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
      };
    };
  }>(endpoint, { params });

  const devices = data?.data?.data ?? [];

  return devices.map((device) => ({
    value: String(device.id),
    label: String(device.device_name ?? device.id),
  }));
};

export const useGetDeviceNamesQuery = ({
  search = "",
  page = 1,
  limit = 50,
  plantId,
  enabled = true,
}: {
  search?: string;
  page?: number;
  limit?: number;
  plantId?: string | null;
  enabled?: boolean;
} = {}) => {
  return useQuery({
    queryKey: ["device", "names", plantId, search, page, limit],
    queryFn: () => fetchDeviceNames(search, page, limit, plantId),
    enabled: enabled && (!!plantId || canGetAllDevices(store.getState().auth.permissions)),
    staleTime: 60_000,
  });
};

export const fetchDeviceNamesByIds = async (
  ids: string[],
): Promise<Record<string, string>> => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const responses = await Promise.allSettled(
    uniqueIds.map(async (id) => {
      const { data } = await api.get<GetDeviceDetailsResponse>(
        deviceEndpoints.GET_DEVICE_BY_ID(id),
      );
      return {
        id,
        device_name: data?.data?.device?.device_name ?? id,
      };
    }),
  );

  return responses.reduce<Record<string, string>>((acc, result) => {
    if (result.status === "fulfilled") {
      acc[result.value.id] = result.value.device_name;
    }
    return acc;
  }, {});
};
