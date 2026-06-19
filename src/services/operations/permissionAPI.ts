import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { permissionEndpoints } from "../endpoints";
import toast from "react-hot-toast";
import { toastError } from "@/utils/errorFormatter";
import { PERMISSION_ROLE_FILTER_OPTIONS } from "@/utils/selectOptions";

// --- Types ---

export interface CreatePermissionInput {
  name: string;
  display_name: string;
  module: string;
  roles: string[];
  parent_permission_id?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  module: string;
  roles: string[];
  parent_permission_name?: string | null;
  is_default: boolean;
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
  group_module?: string | null;
}

export interface PermissionModuleGroup {
  module: string;
  permissions: PermissionNameRoleWise[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Backend responses for assignable permissions are not fully consistent:
 * - sometimes `{ data: PermissionModuleGroup[] }`
 * - sometimes directly `PermissionModuleGroup[]` (wrapped by response handler)
 *
 * Normalize to `PermissionModuleGroup[]` for UI consumption.
 */
export function extractAssignablePermissionGroups(response: unknown): PermissionModuleGroup[] {
  if (Array.isArray(response)) return response as PermissionModuleGroup[];
  if (!isRecord(response)) return [];

  const data = (response as Record<string, unknown>).data;
  if (Array.isArray(data)) return data as PermissionModuleGroup[];
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>).permissions)) {
    return (data as { permissions: PermissionModuleGroup[] }).permissions ?? [];
  }

  return [];
}

export interface GetAllPermissionsResponse {
  success: boolean;
  code: number;
  data: {
    permissions: Permission[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

export interface GetPermissionDetailsResponse {
  success: boolean;
  code: number;
  data: Permission;
  message?: string;
}

export interface CreatePermissionResponse {
  success: boolean;
  code: number;
  data: {
    data: Permission;
    message: string;
  };
  message?: string;
}

export interface UpdatePermissionResponse {
  success: boolean;
  code: number;
  data: {
    data?: Permission;
    message?: string;
    modifiedProperties?: Partial<Permission>;
  };
  message?: string;
}

export interface DeletePermissionResponse {
  success: boolean;
  code: number;
  data?: {
    permissions?: {
      notFoundPermissionIds?: string[];
      totalDeleted?: number;
      totalRequested?: number;
    };
    message?: string;
  };
  message?: string;
}

export interface TogglePermissionStatusResponse {
  success: boolean;
  code: number;
  data?: {
    message?: string;
  };
  message?: string;
}

export interface UpdatePermissionInput extends Partial<CreatePermissionInput> {
  id: string;
}


export interface GetAssignablePermissionsGroupedResponse {
  success: boolean;
  code: number;
  data: PermissionModuleGroup[];
}


export interface PermissionNameRoleWise {
  id?: string;
  name: string;
  display_name?: string;
  is_default?: boolean;
  module?: string;
  roles?: string[];
}

export async function loadPermissionRoleFilterOptions(search = ""): Promise<
  { value: string; label: string }[]
> {
  const q = search.trim().toLowerCase();
  return PERMISSION_ROLE_FILTER_OPTIONS.filter(
    (option) =>
      !q ||
      option.label.toLowerCase().includes(q) ||
      option.value.toLowerCase().includes(q),
  );
}

export async function loadPermissionParentFilterOptions(search = ""): Promise<
  { value: string; label: string }[]
> {
  const { data } = await api.get<GetAllPermissionsResponse>(
    permissionEndpoints.GET_PERMISSION_LIST,
    {
      params: {
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
        sort_by: "display_name",
        sort_order: "asc",
      },
    },
  );

  return (data.data.permissions ?? [])
    .map((permission) => ({
      value: permission.id,
      label:
        permission.display_name?.trim() || permission.name?.trim() || permission.id,
    }))
    .filter((option) => option.value);
}

/** Filter keys sent to the list API (query params). Omit empty values. */
export type PermissionListFilters = Record<
  string,
  string | string[] | boolean | undefined | null
>;

const SUPPORTED_PERMISSION_FILTER_KEYS = new Set([
  "module",
  "parent_permission_id",
  "is_active",
  "is_default",
  "roles",
  "created_at_start",
  "created_at_end",
  "updated_at_start",
  "updated_at_end",
  "sort_by",
  "sort_order",
]);


// --- Queries ---

export const useGetPermissionListQuery = ({
  search = "",
  filters = {},
  columns,
  page = 1,
  limit = 10,
  enabled = true,
}: {
  search?: string;
  filters?: PermissionListFilters;
  columns?: string[];
  page?: number;
  limit?: number;
  /** Set false when a parent component already orchestrates this query (e.g. modal closed). */
  enabled?: boolean;
} = {}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([key, v]) =>
        SUPPORTED_PERMISSION_FILTER_KEYS.has(key) &&
        v !== undefined &&
        v !== null &&
        (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ""),
    ),
  ) as PermissionListFilters;
  const filterKey = JSON.stringify(cleanFilters);
  const columnsKey = columns ? JSON.stringify(columns.sort()) : "";

  return useQuery({
    queryKey: ["permission", "list", search, filterKey, columnsKey, page, limit],
    queryFn: async () => {
      const params: Record<string, string | string[] | boolean> = {
        ...(search ? { search } : {}),
        ...(page ? { page: page.toString() } : {}),
        ...(limit ? { limit: limit.toString() } : {}),
        ...cleanFilters,
        // ...(columns && columns.length > 0 ? { columns } : {}),
      };
      const { data } = await api.get<GetAllPermissionsResponse>(permissionEndpoints.GET_PERMISSION_LIST, {
        params,
      });
      return data;
    },
    staleTime: 30_000,
    enabled,
  });
};

export const useTogglePermissionStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<TogglePermissionStatusResponse>(
        permissionEndpoints.TOGGLE_STATUS(id),
      );
      return data;
    },
    onSuccess: (data, id) => {
      toast.success(
        data.data?.message || data.message || "Permission status updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["permission", "list"] });
      queryClient.invalidateQueries({ queryKey: ["permission", "details", id] });
    },
    onError: toastError,
  });
};

/** Params for parent-permission dropdowns; use with `useGetPermissionListQuery` so cache matches other list fetches. */
export const PERMISSION_PARENT_OPTIONS_LIST_PARAMS = {
  page: 1,
  limit: 1000,
} as const;

export const useGetPermissionNameRoleWiseQuery = (options?: {
  role?: string | null;
  enabled?: boolean;
}) => {
  const role = options?.role != null && String(options.role).trim() !== "" ? String(options.role).trim() : undefined;
  const enabled = (options?.enabled ?? true) && !!role;

  const query = useQuery({
    queryKey: ["permissions", "assignable", "grouped", role ?? "__no_role__"],
    staleTime: 60_000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<GetAssignablePermissionsGroupedResponse>(
        permissionEndpoints.GET_ASSIGNABLE_PERMISSION_NAMES(role!),
      );
      return data;
    },
  });

  const permissionGroups = extractAssignablePermissionGroups(query.data);
  const allPermissionNames = permissionGroups
    .flatMap((group) => group.permissions ?? [])
    .map((permission) => permission?.name)
    .filter(Boolean) as string[];

  return {
    ...query,
    role,
    permissionGroups,
    allPermissionNames,
  };
};




// Note: role filtering is enforced by backend for assignable permissions.

export const useGetPermissionDetailsQuery = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ["permission", "details", id],
    queryFn: async () => {
      if (!id) throw new Error("Permission ID is required");
      const { data } = await api.get<GetPermissionDetailsResponse>(
        permissionEndpoints.GET_PERMISSION_BY_ID(id)
      );
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
};

// --- Mutations ---

export const useCreatePermissionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePermissionInput) => {
      // Convert empty strings to null
      const cleanedInput = Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ])
      ) as CreatePermissionInput;

      const { data } = await api.post<CreatePermissionResponse>(
        permissionEndpoints.CREATE_PERMISSION,
        cleanedInput
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Permission created successfully");
      queryClient.invalidateQueries({ queryKey: ["permission", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdatePermissionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePermissionInput) => {
      // Convert empty strings to null
      const cleanedInput = Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ])
      ) as Partial<CreatePermissionInput>;

      const { data } = await api.put<UpdatePermissionResponse>(
        permissionEndpoints.UPDATE_PERMISSION(id),
        cleanedInput
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || data.data?.message || "Permission updated successfully");
      queryClient.invalidateQueries({ queryKey: ["permission", "list"] });
      queryClient.invalidateQueries({ queryKey: ["permission", "details", variables.id] });
    },
    onError: toastError,
  });
};

export const useDeletePermissionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const { data } = await api.put<DeletePermissionResponse>(
        permissionEndpoints.DELETE_PERMISSION,
        {
          permission_ids: permissionIds,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.data?.message || data.message || "Permission(s) deleted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["permission", "list"] });
    },
    onError: toastError,
  });
};
