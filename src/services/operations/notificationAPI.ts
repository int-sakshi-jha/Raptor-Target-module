import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../api";
import { notificationEndpoints } from "../endpoints";

export interface NotificationRow {
  id: string;
  user_id?: string;
  plant_id?: string | null;
  device_id?: string | null;
  component_id?: string | null;
  title: string;
  body: string | null;
  type: string;
  priority?: string | null;
  is_read: boolean;
  read_at: string | null;
  expires_at?: string | null;
  action_url?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface MyNotificationsResult {
  notifications: NotificationRow[];
  pagination: NotificationsPagination;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

interface GetMyNotificationsResponse {
  success: boolean;
  code: number;
  data?: {
    data?: NotificationRow[];
    pagination?: NotificationsPagination;
  };
}

interface GetNotificationCountResponse {
  success: boolean;
  code: number;
  data?: {
    data?: {
      total: number;
      unread: number;
    };
  };
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: ListNotificationsParams) =>
    [...notificationKeys.all, "list", params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

function mergeListParams(params: ListNotificationsParams): ListNotificationsParams {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    unread_only: params.unread_only ?? false,
  };
}

function parseMyNotificationsResponse(
  body: GetMyNotificationsResponse | undefined,
  page: number,
  limit: number,
): MyNotificationsResult {
  const root = body?.data;
  return {
    notifications: root?.data ?? [],
    pagination: root?.pagination ?? {
      page,
      limit,
      totalCount: 0,
      totalPages: 1,
    },
  };
}

function parseUnreadCountResponse(body: GetNotificationCountResponse | undefined): number {
  return body?.data?.data?.unread ?? 0;
}

export function myNotificationsQueryOptions(params: ListNotificationsParams = {}) {
  const merged = mergeListParams(params);
  const { page, limit, unread_only } = merged;

  return queryOptions({
    queryKey: notificationKeys.list(merged),
    queryFn: async (): Promise<MyNotificationsResult> => {
      try {
        const { data } = await api.get<GetMyNotificationsResponse>(notificationEndpoints.LIST_MINE, {
          params: { page, limit, unread_only },
        });
        return parseMyNotificationsResponse(data, page!, limit!);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) {
          return parseMyNotificationsResponse(undefined, page!, limit!);
        }
        throw e;
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function notificationUnreadCountQueryOptions() {
  return queryOptions({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      try {
        const { data } = await api.get<GetNotificationCountResponse>(notificationEndpoints.COUNT);
        return parseUnreadCountResponse(data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) return 0;
        throw e;
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useMyNotificationsQuery(
  params: ListNotificationsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...myNotificationsQueryOptions(params),
    enabled: options?.enabled ?? true,
  });
}

export function useNotificationUnreadCountQuery() {
  return useQuery(notificationUnreadCountQueryOptions());
}

async function markReadRequest(id: string): Promise<void> {
  try {
    await api.post(notificationEndpoints.UPDATE_MANY, {
      read_all: false,
      ids: [id],
      is_read: true,
    });
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return;
    throw e;
  }
}

async function markAllReadRequest(): Promise<void> {
  try {
    await api.post(notificationEndpoints.UPDATE_MANY, {
      read_all: true,
    });
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return;
    throw e;
  }
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markReadRequest(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllReadRequest(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

async function deleteNotificationsRequest(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await api.post(notificationEndpoints.DELETE_NOTIFICATIONS, { ids });
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return;
    throw e;
  }
}

export function useDeleteNotificationsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteNotificationsRequest(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
