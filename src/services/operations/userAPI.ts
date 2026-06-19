/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { userEndpoints } from "../endpoints";
import { formatErrorMessage, toastError } from "@/utils/errorFormatter";
import { useAppDispatch } from "@/store/hooks";
import { setTheme } from "@/store/authSlice";
import {
  cleanEmptyStrings,
  cleanQueryFilters,
  toURLSearchParams,
} from "@/utils/requestQuery";

// -----------------------------
// Types
// -----------------------------

export type UserRole = "super_admin" | "admin" | "tenant" | "user";

export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  username?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  role: string;
  permissions?: string[];
  plant_ids?: string[] | null;
  is_active?: boolean;

  enable_api_access?: boolean;
  web_max_login_number?: number;
  app_max_login_number?: number;
  web_login_enabled?: boolean;
  app_login_enabled?: boolean;
  language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  time_format?: string | null;
  theme?: string | null;
  push_notifications?: boolean | null;
  notification_preferences?: Record<string, unknown> | null;
  is_password_login_enable?: boolean;
  is_otp_login_enable?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface GetUsersResponse {
  users: UserRow[];
  pagination: PaginationInfo;
}

export interface GetUserProfileResponse {
  user: Partial<UserRow>;
}

export interface CreateUserInput {
  first_name: string;
  last_name: string;
  username?: string | null;
  email: string;
  role?: string | null;
  password?: string | null;
  phone?: string | null;
  tenant_id?: string | null;
  plant_ids?: string[] | null;
  permissions?: string[] | null;

  web_max_login_number?: number | null;
  app_max_login_number?: number | null;
  app_login_enabled?: boolean | null;
  web_login_enabled?: boolean | null;
  language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  time_format?: string | null;
  theme?: string | null;
  push_notifications?: boolean | null;
  notification_preferences?: Record<string, unknown> | null;
  enable_api_access?: boolean | null;
  is_password_login_enable?: boolean | null;
  is_otp_login_enable?: boolean | null;
  is_active?: boolean | null;
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
}

export interface UpdateUserSettingsInput {
  id?: string;
  language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  time_format?: string | null;
  theme?: string | null;
  web_max_login_number?: number | null;
  app_max_login_number?: number | null;
  app_login_enabled?: boolean | null;
  web_login_enabled?: boolean | null;
  is_password_login_enable?: boolean | null;
  is_otp_login_enable?: boolean | null;
  enable_api_access?: boolean | null;
  push_notifications?: boolean | null;
  notification_preferences?: Record<string, unknown> | null;
}

export interface ToggleUserStatusResponse {
  message?: string;
}

export interface DeleteUsersResponse {
  totalDeleted?: number;
  totalNotDeletable?: number;
  totalRequested?: number;
  message?: string;
  details?: {
    parameters?: Array<{
      name: string;
      location: string;
      value: string | null;
      message: string;
    }>;
  };
}


// -----------------------------
// Helpers
// -----------------------------

function toggleUserStatusInResponse(cached: unknown, userId: string): unknown {
  if (!cached || typeof cached !== "object") return cached;

  const root = cached as Record<string, any>;

  if (Array.isArray(root?.data?.users)) {
    return {
      ...root,
      data: {
        ...root.data,
        users: root.data.users.map((user: any) =>
          user?.id === userId ? { ...user, is_active: !user.is_active } : user,
        ),
      },
    };
  }

  if (root?.data?.user?.id === userId) {
    return {
      ...root,
      data: {
        ...root.data,
        user: {
          ...root.data.user,
          is_active: !root.data.user.is_active,
        },
      },
    };
  }

  return cached;
}

function patchUserInResponse(cached: unknown, userId: string, patch: Partial<CreateUserInput>): unknown {
  if (!cached || typeof cached !== "object") return cached;

  const root = cached as Record<string, any>;

  if (Array.isArray(root?.data?.users)) {
    return {
      ...root,
      data: {
        ...root.data,
        users: root.data.users.map((user: any) => {
          if (user?.id !== userId) return user;
          const nextUser = { ...user, ...patch };
          if (patch.first_name !== undefined || patch.last_name !== undefined) {
            nextUser.full_name = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
          }
          return nextUser;
        }),
      },
    };
  }

  if (root?.data?.user?.id === userId) {
    const nextUser = { ...root.data.user, ...patch };
    if (patch.first_name !== undefined || patch.last_name !== undefined) {
      nextUser.full_name = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
    }
    return {
      ...root,
      data: {
        ...root.data,
        user: nextUser,
      },
    };
  }

  if (root?.user?.id === userId) {
    const nextUser = { ...root.user, ...patch };
    if (patch.first_name !== undefined || patch.last_name !== undefined) {
      nextUser.full_name = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
    }
    return {
      ...root,
      user: nextUser,
    };
  }

  return cached;
}

// -----------------------------
// User list queries
// -----------------------------

export type UsersListFilters = Record<
  string,
  string | string[] | boolean | undefined | null
>;

export const useGetAllUsersQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  search?: string;
  filters?: UsersListFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["users", "list", "all", search, filterKey, page, limit],
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
      const { data } = await api.get<{ data: GetUsersResponse }>(
        userEndpoints.GET_ALL_USERS,
        { params },
      );
      // axios wrapper: {success, code, data: <payload>}
      return data as any;
    },
  });
};

export const useGetMyUsersQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  search?: string;
  filters?: UsersListFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["users", "list", "my", search, filterKey, page, limit],
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
      const { data } = await api.get<{ data: GetUsersResponse }>(
        userEndpoints.GET_MY_USERS,
        { params },
      );
      return data as any;
    },
  });
};

// -----------------------------
// User profile
// -----------------------------

export const useGetUserProfileQuery = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ["users", "profile", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!id) throw new Error("User id is required");
      const { data } = await api.get<{ data: GetUserProfileResponse }>(
        userEndpoints.GET_USER_PROFILE(id),
      );
      return data as any;
    },
  });
};

// -----------------------------
// Mutations
// -----------------------------

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const cleaned = cleanEmptyStrings(input) as CreateUserInput;
      const { data } = await api.post(userEndpoints.CREATE_USER, cleaned);
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        (data as any)?.data?.message || (data as any)?.message || "User created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput) => {
      const cleaned = cleanEmptyStrings(input) as Partial<CreateUserInput>;
      const { data } = await api.put(userEndpoints.UPDATE_USER(id), cleaned);
      return data as any;
    },
    onSuccess: (data, variables) => {
      toast.success((data as any)?.message || (data as any)?.data?.message || "User updated successfully");
      const { id, ...patch } = variables;
      queryClient.setQueriesData({ queryKey: ["users", "list"] }, (cached: unknown) =>
        patchUserInResponse(cached, id, patch),
      );
      queryClient.setQueryData(["users", "profile", id], (cached: unknown) =>
        patchUserInResponse(cached, id, patch),
      );
      queryClient.setQueryData(["profile", "user", id], (cached: unknown) =>
        patchUserInResponse(cached, id, patch),
      );
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["users", "profile", id], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["profile", "user", id], refetchType: "none" });
    },
    onError: toastError,
  });
};

export const useUpdateUserSettingsMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserSettingsInput) => {
      const cleaned = cleanEmptyStrings(input) as Omit<UpdateUserSettingsInput, "id">;
      const endpoint = id
        ? userEndpoints.UPDATE_USER_SETTINGS(id)
        : userEndpoints.UPDATE_MY_SETTINGS;
      const { data } = await api.put(endpoint, cleaned);
      return data as any;
    },
    onSuccess: (data, variables) => {
      toast.success((data as any)?.message || (data as any)?.data?.message || "User settings updated successfully");
      const { id, ...patch } = variables;

      // Sync theme with Redux if updating own settings
      if (!id && patch.theme) {
        dispatch(setTheme(patch.theme as any));
      }

      if (id) {
        queryClient.setQueriesData({ queryKey: ["users", "list"] }, (cached: unknown) =>
          patchUserInResponse(cached, id, patch),
        );
        queryClient.setQueryData(["users", "profile", id], (cached: unknown) =>
          patchUserInResponse(cached, id, patch),
        );
        queryClient.setQueryData(["profile", "user", id], (cached: unknown) =>
          patchUserInResponse(cached, id, patch),
        );
        queryClient.invalidateQueries({ queryKey: ["users", "list"] });
        queryClient.invalidateQueries({ queryKey: ["users", "profile", id], refetchType: "none" });
        queryClient.invalidateQueries({ queryKey: ["profile", "user", id] });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
    onError: toastError,
  });
};

export const useToggleUserStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<ToggleUserStatusResponse>(userEndpoints.TOGGLE_STATUS(id));
      return data as any;
    },
    onMutate: async (id) => {
      const listSnapshots = queryClient.getQueriesData({
        queryKey: ["users", "list"],
      });
      const userProfileSnapshot = queryClient.getQueryData(["users", "profile", id]);
      const userDetailSnapshot = queryClient.getQueryData(["profile", "user", id]);

      await queryClient.cancelQueries({ queryKey: ["users", "list"] });
      await queryClient.cancelQueries({ queryKey: ["users", "profile", id] });
      await queryClient.cancelQueries({ queryKey: ["profile", "user", id] });

      listSnapshots.forEach(([queryKey, cached]) => {
        queryClient.setQueryData(queryKey, toggleUserStatusInResponse(cached, id));
      });
      queryClient.setQueryData(
        ["users", "profile", id],
        toggleUserStatusInResponse(userProfileSnapshot, id),
      );
      queryClient.setQueryData(
        ["profile", "user", id],
        toggleUserStatusInResponse(userDetailSnapshot, id),
      );

      return {
        listSnapshots,
        userProfileSnapshot,
        userDetailSnapshot,
      };
    },
    onSuccess: (data, id) => {
      toast.success(
        (data as any)?.data?.message ||
        (data as any)?.message ||
        "User status updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["users", "profile", id] });
      queryClient.invalidateQueries({ queryKey: ["profile", "user", id] });
    },
    onError: (error: unknown, id, context) => {
      context?.listSnapshots?.forEach(([queryKey, cached]: [readonly unknown[], unknown]) => {
        queryClient.setQueryData(queryKey, cached);
      });
      queryClient.setQueryData(["users", "profile", id], context?.userProfileSnapshot);
      queryClient.setQueryData(["profile", "user", id], context?.userDetailSnapshot);

      toastError(error);
    },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data } = await api.put<{ success: boolean; code: number; data: DeleteUsersResponse }>(
        userEndpoints.DELETE_USER,
        { user_ids: userIds },
      );
      return data;
    },
    onSuccess: (response) => {
      const payload = (response as { data?: DeleteUsersResponse })?.data ?? {};

      if (payload.details?.parameters?.length) {
        toast.error(formatErrorMessage(payload.details.parameters));
      }

      if ((payload.totalDeleted ?? 0) > 0) {
        toast.success(payload.message || `${payload.totalDeleted} user(s) deleted successfully.`);
      }

      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: toastError,
  });
};

// -----------------------------
// User names (lightweight — for filter dropdowns)
// -----------------------------

/**
 * Fetches a minimal list of users (id + full_name) from /users/names.
 * Supports server-side ?search=, ?page=, ?limit=.
 *
 * Use as loadOptions for an apiSearch async-multiselect in filter panels.
 * Query is disabled by default — options only load when the select is opened.
 */
export const fetchUserNames = async (
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", String(page));
  params.append("limit", String(limit));
  const { data } = await api.get<any>(userEndpoints.GET_USER_NAMES, { params });
  const raw = (data as any)?.data;
  const users: any[] =
    raw?.users ?? raw?.data?.users ?? raw?.data ?? [];
  return users.map((u: any) => ({
    value: String(u.id),
    label: String(u.full_name || u.email || u.id),
  }));
};

/**
 * Fetches users filtered by tenant_id — for the PlantForm "existing user" dropdown.
 */
export const fetchUserNamesByTenant = async (
  tenantId: string,
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  try {
    const params = new URLSearchParams();
    params.append("tenant_id", tenantId);
    if (search) params.append("search", search);
    params.append("page", String(page));
    params.append("limit", String(limit));
    const { data } = await api.get<any>(userEndpoints.GET_ALL_USERS, { params });
    const raw = (data as any)?.data;
    const users: any[] =
      raw?.users ?? raw?.data?.users ?? raw?.data ?? [];
    return users.map((u: any) => ({
      value: String(u.id),
      label: String(u.full_name || u.email || u.id),
    }));
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 204 || status === 404) {
      return [];
    }
    throw error;
  }
};
