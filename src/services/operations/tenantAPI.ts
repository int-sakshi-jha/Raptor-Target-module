import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Types -----------------------------

import { api } from "../api";
import { tenantEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";

export interface TenantBranding {
  primary_color?: string | null;
  secondary_color?: string | null;
  logo_dark?: string | null;
  logo_light?: string | null;
  favicon?: string | null;
  custom_domain?: string | null;
}

export interface CreateTenantInput {
  name: string;
  email: string;
  username: string;
  is_active: boolean;
  is_password_login_enable: boolean;
  permissions?: string[] | null;
  password?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_person_designation?: string | null;
  taluka?: string | null;
  create_generation_table?: boolean;
  data_retention_days?: number;
  settings?: Record<string, unknown> | null;
  tags?: string[] | null;
  branding?: TenantBranding | null;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  taluka?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_person_designation?: string | null;
  create_generation_table?: boolean;
  generation_table_name?: string | null;
  settings?: Record<string, unknown> | null;
  branding?: TenantBranding | null;
  data_retention_days?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GetAllTenantsResponse {
  success: boolean;
  code: number;
  data: {
    data: Tenant[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
}

export interface GetTenantDetailsResponse {
  success: boolean;
  code: number;
  data: Tenant;
  message?: string;
}

export interface CreateTenantResponse {
  success: boolean;
  code: number;
  data: { data: Tenant; message: string };
  message?: string;
}

export interface UpdateTenantResponse {
  success: boolean;
  code: number;
  data: {
    data?: Tenant;
    message?: string;
    modifiedProperties?: Partial<Tenant>;
  };
  message?: string;
}

export interface DeleteTenantResponse {
  success: boolean;
  code: number;
  data?: {
    tenants?: {
      notFoundTenantIds?: string[];
      totalDeleted?: number;
      totalRequested?: number;
    };
    message?: string;
  };
  message?: string;
}

export interface ToggleTenantStatusResponse {
  success: boolean;
  code: number;
  data?: { message?: string };
  message?: string;
}

export interface CreateTenantGenerationTableInput {
  tenant_id: string;
}

export interface CreateTenantGenerationTableResponse {
  success: boolean;
  code: number;
  data?: {
    data?: {
      tenant_id: string;
      tenant_name: string;
      table_name: string;
    };
    message?: string;
  };
  message?: string;
}

export interface RestoreTenantGenerationTableInput {
  table_name: string;
  batch_size: number;
  tenant_id?: string;
}

export interface RestoreTenantGenerationTableResponse {
  success: boolean;
  code: number;
  data?: {
    data?: {
      table_name: string;
      batch_size: number;
      moved_rows?: number;
    };
    message?: string;
  };
  message?: string;
}

export interface UpdateTenantInput
  extends Partial<
    Omit<CreateTenantInput, "is_active" | "is_password_login_enable" | "permissions">
  > {
  id: string;
}

export interface TenantNameItem {
  id: string;
  name: string;
}

export interface TenantOption {
  id: string;
  name?: string;
  display_name?: string;
  tenant_name?: string;
  is_active?: boolean;
}

export interface GetTenantNamesResponse {
  success: boolean;
  code: number;
  data: {
    data: TenantNameItem[];
    message?: string;
  };
}

export type TenantListFilters = Record<string, string | string[] | boolean | undefined | null>;

const mergeTenantWithUpdate = (
  existing: Tenant | undefined,
  input: Partial<
    Omit<CreateTenantInput, "is_active" | "is_password_login_enable" | "permissions">
  > & { id: string },
): Tenant => {
  const baseTenant: Tenant = existing ?? {
    id: input.id,
    name: input.name ?? "",
    email: input.email ?? "",
  };

  return {
    ...baseTenant,
    ...input,
    id: input.id,
    name: input.name ?? baseTenant.name,
    email: input.email ?? baseTenant.email,
    updated_at: new Date().toISOString(),
  };
};


export const useGetTenantListQuery = ({
  search = "",
  filters = {},
  columns,
  page = 1,
  limit = 50,
}: {
  search?: string;
  filters?: TenantListFilters;
  columns?: string[];
  page?: number;
  limit?: number;
} = {}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);
  const columnsKey = columns ? JSON.stringify([...columns].sort()) : "";

  return useQuery({
    queryKey: ["tenant", "list", search, filterKey, columnsKey, page, limit],
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: String(page),
        limit: String(limit),
        ...cleanFilters,
      };
      const params = toURLSearchParams(rawParams);
      const { data } = await api.get<GetAllTenantsResponse>(
        tenantEndpoints.GET_ALL_TENANTS,
        { params },
      );
      return data;
    },
    staleTime: 30_000,
  });
};

export const useGetTenantDetailsQuery = (
  id: string | null | undefined,
  options?: { enabled?: boolean; staleTime?: number },
) =>
  useQuery({
    queryKey: ["tenant", "details", id],
    queryFn: async () => {
      if (!id) throw new Error("Tenant ID is required");
      const { data } = await api.get<GetTenantDetailsResponse>(
        tenantEndpoints.GET_TENANT_BY_ID(id),
      );
      return data;
    },
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: options?.staleTime ?? 60_000,
  });

export const useGetTenantNamesQuery = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) =>
  useQuery({
    queryKey: ["tenants", "names"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<GetTenantNamesResponse>(
        tenantEndpoints.GET_ALL_TENANT_NAME,
      );
      return data;
    },
  });

export const useGetAllTenantsQuery = ({
  page = 1,
  limit = 1000,
  enabled = true,
}: {
  page?: number;
  limit?: number;
  enabled?: boolean;
} = {}) =>
  useQuery({
    queryKey: ["tenants", "all", page, limit],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<GetAllTenantsResponse>(
        tenantEndpoints.GET_ALL_TENANTS,
        {
          params: { page, limit },
        },
      );
      return data;
    },
  });

export const fetchTenantNames = async (
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const { data } = await api.get<GetTenantNamesResponse>(
    tenantEndpoints.GET_ALL_TENANT_NAME,
    { params },
  );

  const tenants = data.data?.data ?? [];

  return tenants.map((tenant) => ({
    value: String(tenant.id),
    label: String(tenant.name),
  }));
};

export const useCreateTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const { data } = await api.post<CreateTenantResponse>(
        tenantEndpoints.CREATE_TENANT,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Tenant created successfully");
      queryClient.invalidateQueries({ queryKey: ["tenant", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdateTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTenantInput) => {
      const requestBody: Record<string, unknown> = { ...input };
      delete requestBody.permissions;
      const { data } = await api.put<UpdateTenantResponse>(
        tenantEndpoints.UPDATE_TENANT(id),
        requestBody,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<GetTenantDetailsResponse | undefined>(
        ["tenant", "details", variables.id],
        (previous) => {
          const previousTenant = previous?.data;
          const nextTenant = mergeTenantWithUpdate(previousTenant, variables);

          return {
            success: previous?.success ?? true,
            code: previous?.code ?? 200,
            message: previous?.message,
            data: nextTenant,
          };
        },
      );

      queryClient.setQueriesData<GetAllTenantsResponse | undefined>(
        { queryKey: ["tenant", "list"] },
        (previous) => {
          if (!previous?.data?.data) return previous;

          return {
            ...previous,
            data: {
              ...previous.data,
              data: previous.data.data.map((tenant) =>
                tenant.id === variables.id
                  ? mergeTenantWithUpdate(tenant, variables)
                  : tenant,
              ),
            },
          };
        },
      );

      toast.success(data.message || data.data?.message || "Tenant updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tenant", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["tenant", "details", variables.id],
      });
    },
    onError: toastError,
  });
};

export const useToggleTenantStatusMutation = () => {
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
      const tenantIds =
        ids?.map((value) => String(value).trim()).filter(Boolean) ??
        (id ? [String(id).trim()] : []);
      if (tenantIds.length === 0) {
        throw new Error("At least one tenant id is required");
      }

      const { data } = await api.put<ToggleTenantStatusResponse>(
        tenantEndpoints.TOGGLE_TENANT_STATUS,
        { tenant_ids: tenantIds, is_active: Boolean(is_active) },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        data.data?.message || data.message || "Tenant status updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tenant", "list"] });
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: ["tenant", "details", variables.id],
        });
      }
      variables.ids?.forEach((tenantId) => {
        queryClient.invalidateQueries({
          queryKey: ["tenant", "details", tenantId],
        });
      });
    },
    onError: toastError,
  });
};

export const useDeleteTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<DeleteTenantResponse>(
        tenantEndpoints.DELETE_TENANT(id),
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Tenant deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tenant", "list"] });
    },
    onError: toastError,
  });
};

export const useCreateTenantGenerationTableMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenant_id }: CreateTenantGenerationTableInput) => {
      const { data } = await api.post<CreateTenantGenerationTableResponse>(
        tenantEndpoints.CREATE_TENANT_GENERATION_TABLE,
        { tenant_id },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        data.data?.message || data.message || "Generation table created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tenant", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["tenant", "details", variables.tenant_id],
      });
    },
    onError: toastError,
  });
};

export const useRestoreTenantGenerationTableMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      table_name,
      batch_size,
      tenant_id,
    }: RestoreTenantGenerationTableInput) => {
      const { data } = await api.post<RestoreTenantGenerationTableResponse>(
        tenantEndpoints.RESTORE_TENANT_GENERATION_TABLE,
        { table_name, batch_size },
      );
      return { payload: data, tenant_id };
    },
    onSuccess: ({ payload, tenant_id }) => {
      toast.success(
        payload.data?.message || payload.message || "Generation table restored successfully",
      );
      if (tenant_id) {
        queryClient.invalidateQueries({
          queryKey: ["tenant", "details", tenant_id],
        });
      }
    },
    onError: toastError,
  });
};
