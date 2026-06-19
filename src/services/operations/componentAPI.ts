/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import { componentEndpoints } from "../endpoints";
import {
  formatErrorMessage,
  toastError,
  getErrorHttpStatus,
} from "@/utils/errorFormatter";
import { store } from "@/store";
import {
  canGetAllComponents,
  canGetAllComponentNames,
  canGetMyComponentNames,
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
  usesScopedComponentListAccess,
} from "@/utils/permissions";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";

export type ComponentType = string;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ComponentRow {
  id: string;
  plant_id: string;
  tenant_id?: string | null;
  parent_id?: string | null;
  share_component_id?: string | null;
  share_component_type?: string | null;
  share_component_name?: string | null;
  share_component_plant_id?: string | null;
  share_component_plant_name?: string | null;
  shared_component_id?: string | null;
  shared_component_type?: string | null;
  shared_component_name?: string | null;
  shared_component_plant_id?: string | null;
  shared_component_plant_name?: string | null;
  plant_ref_id?: string | null;
  tenant_ref_id?: string | null;
  component_type: string;
  component_name: string;
  component_code: string;
  identifier?: number | null;
  serial_number?: string | null;
  device_id?: string | null;
  inverter_type_id?: string | null;
  tag_template_id?: string | null;
  alarm_tag_template_id?: string | null;
  share_component_tag_template_id?: string | null;
  share_component_tag_template_name?: string | null;
  vd_number?: number | null;
  ac_capacity_kw?: number | null;
  dc_capacity_kw?: number | null;
  meter_type?: string | null;
  module_count?: number | null;
  is_dynamic_component?: boolean | null;
  is_dynamic?: boolean | null;
  is_bot_layer_process?: boolean | null;
  metadata?: {
    dc_channel?: Array<{
      index: number;
      is_active: boolean;
      dc_capacity: number;
    }>;
  } | null;

  is_active?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  plant_name?: string | null;
  tenant_name?: string | null;
  parent_name?: string | null;
  parent_component_name?: string | null;
  /** Display-only code from API when parent is a named component. */
  parent_component_code?: string | null;
  device_name?: string | null;
  inverter_type_name?: string | null;
  /** Display-only code from API (e.g. inverter SKU/code). */
  inverter_type_code?: string | null;
  tag_template_name?: string | null;
  alarm_tag_template_name?: string | null;
  alarm_tag_template_version?: number | null;
  tag_template_tag_map?: Record<string, unknown> | null;
  alarm_tag_template_tag_map?: Record<string, unknown> | null;
  default_alarm_template?: boolean | null;
  is_default_bot_process_template?: boolean | null;
  share_component_tag_template_tag_map?: Record<string, unknown> | null;
  status?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

export interface ComponentNameRow {
  id: string;
  component_name: string;
}

export interface GetAllComponentsResponse {
  success: boolean;
  code: number;
  data: {
    data: ComponentRow[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
  message?: string;
}

export interface GetComponentDetailsResponse {
  success: boolean;
  code: number;
  data: ComponentRow;
  message?: string;
}

export interface GetComponentNamesResponse {
  success: boolean;
  code: number;
  data: {
    data: ComponentNameRow[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
  message?: string;
}

export interface CreateComponentInput {
  plant_id: string;
  parent_id?: string | null;
  share_component_id?: string | null;
  shared_component_id?: string | null;
  shared_component_type?: string | null;
  component_type: string;
  component_name: string;
  component_code: string;
  serial_number?: string | null;
  device_id?: string | null;
  inverter_type_id?: string | null;
  tag_template_id?: string | null;
  alarm_tag_template_id?: string | null;
  share_component_tag_template_id?: string | null;
  vd_number?: number | null;
  ac_capacity_kw?: number | null;
  dc_capacity_kw?: number | null;
  brand?: string | null;
  model?: string | null;
  mppt_count?: number | null;
  strings_per_mppt?: number | null;
  phase_type?: string | null;
  meter_type?: string | null;
  module_count?: number | null;
  string_length?: number | null;
  ct_ratio?: number | null;
  channels?: number | null;
  area_sqm?: number | null;
  is_dynamic_component?: boolean | null;
  is_dynamic?: boolean | null;
  is_bot_layer_process?: boolean | null;
  default_alarm_template?: boolean | null;
  is_default_bot_process_template?: boolean | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  is_active?: boolean;
  identifier?: number | null;
  metadata?: {
    dc_channel: Array<{
      index: number;
      is_active: boolean;
      dc_capacity: number;
    }>;
  } | null;
}

export interface UpdateComponentInput
  extends Partial<Omit<CreateComponentInput, "plant_id">> {
  id: string;
}

export interface DeleteComponentInput {
  id: string;
  is_delete_child?: boolean;
}

export const COMPONENT_TECHNICAL_FIELDS_BY_TYPE: Partial<
  Record<string, readonly string[]>
> = {
  P: ["ac_capacity_kw", "dc_capacity_kw"],
  B: ["ac_capacity_kw", "dc_capacity_kw"],
  INV: [
    "ac_capacity_kw",
    "dc_capacity_kw",
  ],
  STR: ["dc_capacity_kw"],
  M: ["meter_type"],
  AC: ["ac_capacity_kw", "dc_capacity_kw"],
  ACDB: ["ac_capacity_kw", "dc_capacity_kw"],
  DC: ["dc_capacity_kw"],
  DCDB: ["dc_capacity_kw"],
  WS: [],
  T: ["ac_capacity_kw", "dc_capacity_kw"],
  TRC: ["ac_capacity_kw", "dc_capacity_kw"],
  SCB: ["ac_capacity_kw", "dc_capacity_kw"],
  ICB: ["ac_capacity_kw", "dc_capacity_kw"],
  O: ["ac_capacity_kw", "dc_capacity_kw"],
};

export function shouldShowComponentTechnicalField(
  componentType: string,
  field: string,
): boolean {
  const t = componentType.trim().toUpperCase();
  if (!t) return false;
  const keys = COMPONENT_TECHNICAL_FIELDS_BY_TYPE[t];
  if (!keys) return true;
  return keys.includes(field);
}

export function componentTechnicalAttributesAreConfiguredEmpty(
  componentType: string,
): boolean {
  const t = componentType.trim().toUpperCase();
  if (!t) return false;
  const keys = COMPONENT_TECHNICAL_FIELDS_BY_TYPE[t];
  return keys !== undefined && keys.length === 0;
}


export function shouldShowComponentWarrantyDates(componentType: string): boolean {
  void componentType;
  return false;
}

export const normalizeComponentMeterTypeValue = (value?: string | null): string | null => {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (upper === "HT" || upper === "LT") return upper;
  return null;
};

/** Get a human-friendly label for a component type code (fallback when options not loaded). */
export const getComponentTypeLabel = (value?: string | null): string => {
  if (!value) return "Unknown";
  return String(value).trim();
};

/** Get a human-friendly label for a meter type code. */
export const getComponentMeterTypeLabel = (value?: string | null): string => {
  if (!value) return "Unknown";
  const upper = String(value).trim().toUpperCase();
  if (upper === "HT") return "HT Meter";
  if (upper === "LT") return "LT Meter";
  return upper;
};

export const COMPONENT_SORT_ORDER_OPTIONS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

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

export type ComponentSelectOption = {
  value: ComponentType;
  label: string;
};




export const fetchComponentTypeOptions = async (
  search = "",
  tenantId?: string | null,
): Promise<ComponentSelectOption[]> => {
  const params = new URLSearchParams();
  if (search.trim()) params.append("search", search.trim());
  if (tenantId) params.append("tenant_id", tenantId);

  const { data } = await api.get<GetSelectOptionsResponse>(
    componentEndpoints.GET_COMPONENT_TYPES,
    { params },
  );

  const rows = Array.isArray(data.data) ? data.data : [];
  const options = rows.map((row) => ({
    id:row.id,
    value: row.value as ComponentType,
    label: row.label,
  }));

  return options;
};

export const useGetComponentTypeOptionsQuery = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["selectOptions", "component_type"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => fetchComponentTypeOptions(),
  });

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getComponentListEndpoint = () => {
  const { permissions, user } = store.getState().auth;

  if (usesScopedComponentListAccess(permissions, user?.role)) {
    return componentEndpoints.GET_MY_LIST;
  }

  if (canGetAllComponents(permissions)) {
    return componentEndpoints.GET_ALL;
  }

  return componentEndpoints.GET_ALL;
};

const getComponentNamesEndpoint = () => {
  const { permissions, user } = store.getState().auth;

  if (isTenantOrUserRole(user?.role)) {
    return componentEndpoints.GET_MY_NAMES;
  }

  if (isAdminOrSuperAdminRole(user?.role)) {
    return componentEndpoints.GET_NAMES;
  }

  if (
    canGetMyComponentNames(permissions) ||
    usesScopedComponentListAccess(permissions, user?.role)
  ) {
    return componentEndpoints.GET_MY_NAMES;
  }

  if (canGetAllComponentNames(permissions) || canGetAllComponents(permissions)) {
    return componentEndpoints.GET_NAMES;
  }

  return componentEndpoints.GET_NAMES;
};

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Route / query param IDs must be non-empty and not the literal strings
 * "undefined" or "null" (avoids GET /component/undefined → API 404).
 */
export function isValidComponentRouteId(id: string | null | undefined): id is string {
  if (id == null) return false;
  const t = String(id).trim();
  if (!t) return false;
  if (t === "undefined" || t === "null") return false;
  return true;
}

export const useGetAllComponentQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  search?: string;
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters);
  const filterKey = JSON.stringify(cleanFilters);
  const endpoint = getComponentListEndpoint();
  const queryKey = useMemo(
    () => ["component", "list", endpoint, search, filterKey, page, limit] as const,
    [endpoint, search, filterKey, page, limit],
  );

  return useQuery({
    queryKey,
    staleTime: 30_000,
    enabled,
    queryFn: async () => {
      const params = toURLSearchParams({
        ...(search ? { search } : {}),
        ...(page ? { page: String(page) } : {}),
        ...(limit ? { limit: String(limit) } : {}),
        ...cleanFilters,
      });
      const { data } = await api.get<GetAllComponentsResponse>(endpoint, { params });
      return data;
    },
  });
};

export const useGetComponentDetailsQuery = (
  id: string | null | undefined,
  options?: {
    staleTime?: number;
    refetchOnMount?: boolean | "always";
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
  },
) =>
  useQuery({
    queryKey: ["component", "details", id],
    enabled: (options?.enabled ?? true) && isValidComponentRouteId(id),
    staleTime: options?.staleTime ?? 60_000,
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options?.refetchOnReconnect ?? false,
    queryFn: async () => {
      if (!isValidComponentRouteId(id)) throw new Error("Component ID is required");
      const { data } = await api.get<GetComponentDetailsResponse>(
        componentEndpoints.GET_BY_ID(encodeURIComponent(id)),
      );
      return data;
    },
  });

export const fetchComponentNames = async (
  search = "",
  page = 1,
  limit = 50,
  plant_id?: string,
  options?: {
    excludeId?: string | null;
  },
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (plant_id) params.append("plant_id", plant_id);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const { data } = await api.get<GetComponentNamesResponse>(
    getComponentNamesEndpoint(),
    { params },
  );

  return (data?.data?.data ?? [])
    .filter(
      (component) =>
        options?.excludeId == null ||
        String(component.id) !== String(options.excludeId),
    )
    .map((component) => ({
      value: component.id,
      label: component.component_name,
    }));
};

/** Full component rows for a plant (template sampling, smart plant wizard, etc.). */
export async function fetchComponentRowsForPlant(
  plantId: string,
  limit = 500,
  search = "",
): Promise<ComponentRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const endpoint = getComponentListEndpoint();
  const params = toURLSearchParams({
    plant_id: plantId,
    ...(search.trim() ? { search: search.trim() } : {}),
    page: 1,
    limit: safeLimit,
  });
  const { data } = await api.get<GetAllComponentsResponse>(endpoint, { params });
  return data?.data?.data ?? [];
}

/** Nested smart-plant payload (no `parent_id` — server assigns from `children`). */
export type SmartPlantCreatePayload = {
  data: Record<string, unknown>[];
};

export async function submitSmartPlantCreate(
  plantId: string,
  payload: SmartPlantCreatePayload,
): Promise<{ created_count: number; root_component_id: string }> {
  const { data } = await api.post(
    componentEndpoints.SMART_PLANT_CREATE(plantId),
    payload,
  );
  const res = data as {
    data?: {
      created_count?: number;
      root_component?: { id: string };
      message?: string;
    };
  };
  const inner = res?.data;
  const created = inner?.created_count ?? 0;
  const rootId = inner?.root_component?.id;
  if (!rootId) {
    throw new Error("Smart plant create did not return root component id");
  }
  return { created_count: created, root_component_id: rootId };
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateComponentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateComponentInput) => {
      const { plant_id, ...body } = input;
      const { data } = await api.post(
        componentEndpoints.CREATE(plant_id),
        body,
      );
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        (data as any)?.message ||
        (data as any)?.data?.message ||
        "Component created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["component"] });
    },
    onError: toastError,
  });
};

export const useUpdateComponentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComponentInput) => {
      const requestBody: Record<string, unknown> = { ...input };
      delete requestBody.plant_id;
      const { data } = await api.put(componentEndpoints.UPDATE(id), requestBody);
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["component"] });
      toast.success(
        (data as any)?.message ||
        (data as any)?.data?.message ||
        "Component updated successfully",
      );
    },
    onError: toastError,
  });
};

/** Backend requires `is_delete_child: true` when the row has direct children (409 Conflict). */
export function isComponentDeleteChildrenConflict(error: unknown): boolean {
  if (getErrorHttpStatus(error) !== 409) return false;
  const msg = formatErrorMessage(error).toLowerCase();
  return msg.includes("child") || msg.includes("subtree");
}

/** Backend returns 400 when the row has children unless `is_children_status: true` is sent. */
export function isComponentStatusChildrenConflict(error: unknown): boolean {
  if (getErrorHttpStatus(error) !== 400) return false;
  const msg = formatErrorMessage(error).toLowerCase();
  return (
    msg.includes("child") &&
    (msg.includes("status") || msg.includes("active"))
  );
}

export const useToggleComponentStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
      is_children_status,
    }: {
      id: string;
      is_active: boolean;
      is_children_status?: boolean;
    }) => {
      const body: Record<string, unknown> = {
        status: is_active,
      };
      if (typeof is_children_status === "boolean") {
        body.is_children_status = is_children_status;
      }
      const { data } = await api.put(componentEndpoints.TOGGLE_STATUS(id), body);
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["component"] });
      toast.success(
        (data as any)?.message ||
        (data as any)?.data?.message ||
        "Component status updated successfully",
      );
    },
    onError: (error: unknown) => {
      if (isComponentStatusChildrenConflict(error)) return;
      toastError(error);
    },
  });
};

export const useDeleteComponentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_delete_child }: DeleteComponentInput) => {
      const { data } = await api.put(componentEndpoints.DELETE(id), {
        is_children_delete: Boolean(is_delete_child),
      });
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        (data as any)?.message ||
        (data as any)?.data?.message ||
        "Component deleted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["component"] });
    },
    onError: (error: unknown) => {
      if (isComponentDeleteChildrenConflict(error)) return;
      toastError(error);
    },
  });
};
