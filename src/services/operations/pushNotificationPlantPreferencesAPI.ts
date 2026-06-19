import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { api } from "../api";
import { pushNotificationPlantPreferenceEndpoints } from "../endpoints";
import { formatErrorMessage } from "@/utils/errorFormatter";

export type PushNotificationPreferenceContext = "me" | "user";

export interface PushNotificationPlantPreference {
  plant_id: string;
  plant_name: string;
  push_notifications_enabled: boolean;
}

export interface PushNotificationPlantPreferencesPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface PushNotificationPlantPreferencesResult {
  preferences: PushNotificationPlantPreference[];
  pagination: PushNotificationPlantPreferencesPagination;
}

interface QueryArgs {
  context: PushNotificationPreferenceContext;
  userId?: string | null;
  enabled?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

interface UpdateMutationArgs {
  plantId: string;
  enabled: boolean;
}

interface InternalUpdatePayload extends UpdateMutationArgs {
  context: PushNotificationPreferenceContext;
  userId?: string | null;
}

const queryKeys = {
  list: (
    context: PushNotificationPreferenceContext,
    userId?: string | null,
    page = 1,
    limit = 50,
    search = "",
  ) => ["notifications", "push-plant-preferences", context, userId ?? "me", page, limit, search] as const,
  prefix: (context: PushNotificationPreferenceContext, userId?: string | null) =>
    ["notifications", "push-plant-preferences", context, userId ?? "me"] as const,
};

function getResponseRoot(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object") {
    return root.data as Record<string, unknown>;
  }
  return root;
}

function normalizePreference(item: unknown, index: number): PushNotificationPlantPreference | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  const rawPlantId = row.id;
  const plantId = rawPlantId === null || rawPlantId === undefined ? "" : String(rawPlantId).trim();
  if (!plantId) return null;

  const rawPlantName = row.name;
  const normalizedPlantName =
    rawPlantName === null || rawPlantName === undefined ? "" : String(rawPlantName).trim();
  const plantName = normalizedPlantName || `Plant ${index + 1}`;

  const enabled = row.is_notified === true;

  return {
    plant_id: plantId,
    plant_name: plantName,
    push_notifications_enabled: enabled,
  };
}

function normalizePreferences(
  raw: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): PushNotificationPlantPreferencesResult {
  const root = getResponseRoot(raw);
  const items = Array.isArray(root.notify_plants) ? root.notify_plants : [];

  const normalized = items
    .map((item, index) => normalizePreference(item, index))
    .filter((item): item is PushNotificationPlantPreference => Boolean(item));

  const byPlantId = new Map<string, PushNotificationPlantPreference>();
  for (const item of normalized) {
    byPlantId.set(item.plant_id, item);
  }

  const paginationRaw =
    root.pagination && typeof root.pagination === "object"
      ? (root.pagination as Record<string, unknown>)
      : {};
  const page = Number(paginationRaw.page);
  const limit = Number(paginationRaw.limit);
  const totalCount = Number(paginationRaw.totalCount);
  const totalPages = Number(paginationRaw.totalPages);

  return {
    preferences: Array.from(byPlantId.values()),
    pagination: {
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : fallbackPage,
      limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : fallbackLimit,
      totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? Math.floor(totalCount) : byPlantId.size,
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1,
    },
  };
}

function createEmptyResult(page: number, limit: number): PushNotificationPlantPreferencesResult {
  return {
    preferences: [],
    pagination: {
      page,
      limit,
      totalCount: 0,
      totalPages: 1,
    },
  };
}

async function fetchPreferences({
  context,
  userId,
  page = 1,
  limit = 50,
  search = "",
}: {
  context: PushNotificationPreferenceContext;
  userId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PushNotificationPlantPreferencesResult> {
  if (context === "user" && !userId) return createEmptyResult(page, limit);

  const endpoint =
    context === "me"
      ? pushNotificationPlantPreferenceEndpoints.GET_MY
      : pushNotificationPlantPreferenceEndpoints.GET_USER(userId!);

  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  if (search.trim()) params.search = search.trim();

  try {
    const { data } = await api.get<unknown>(endpoint, { params });
    return normalizePreferences(data, page, limit);
  } catch (error) {
    if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 204)) {
      return createEmptyResult(page, limit);
    }
    throw error;
  }
}

async function updatePreference({
  context,
  userId,
  plantId,
  enabled,
}: InternalUpdatePayload): Promise<void> {
  if (context === "user" && !userId) return;

  const action = enabled ? "add" : "remove";

  if (context === "me") {
    await api.put(pushNotificationPlantPreferenceEndpoints.UPDATE_MY, {
      plant_id: plantId,
      action,
    });
    return;
  }

  await api.put(pushNotificationPlantPreferenceEndpoints.UPDATE_USER(plantId), {
    user_id: userId!,
    action,
  });
}

export function usePushNotificationPlantPreferencesQuery({
  context,
  userId,
  enabled = true,
  page = 1,
  limit = 50,
  search = "",
}: QueryArgs) {
  return useQuery({
    queryKey: queryKeys.list(context, userId, page, limit, search),
    enabled: enabled && (context === "me" || Boolean(userId)),
    staleTime: 30_000,
    queryFn: () => fetchPreferences({ context, userId, page, limit, search }),
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useUpdatePushNotificationPlantPreferenceMutation({
  context,
  userId,
}: {
  context: PushNotificationPreferenceContext;
  userId?: string | null;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: UpdateMutationArgs) => updatePreference({ context, userId, ...args }),
    onMutate: async (variables) => {
      const queryPrefix = queryKeys.prefix(context, userId);
      await qc.cancelQueries({ queryKey: queryPrefix });
      const previous = qc.getQueriesData<PushNotificationPlantPreferencesResult>({ queryKey: queryPrefix });

      qc.setQueriesData<PushNotificationPlantPreferencesResult>({ queryKey: queryPrefix }, (current) => {
        const currentResult = current ?? createEmptyResult(1, 50);
        const list = currentResult.preferences ?? [];
        let found = false;
        const preferences = list.map((item) => {
          if (item.plant_id !== variables.plantId) return item;
          found = true;
          return { ...item, push_notifications_enabled: variables.enabled };
        });

        return {
          ...currentResult,
          preferences: found
            ? preferences
            : [
                ...preferences,
                {
                  plant_id: variables.plantId,
                  plant_name: variables.plantId,
                  push_notifications_enabled: variables.enabled,
                },
              ],
        };
      });

      return { previous };
    },
    onError: (error, _variables, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(formatErrorMessage(error));
    },
    onSuccess: (_data, variables) => {
      toast.success(`Push notification ${variables.enabled ? "enabled" : "disabled"} successfully`);
    },
    onSettled: (_data, _error, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.prefix(context, userId) });
      void qc.invalidateQueries({ queryKey: ["plants", "detail", variables.plantId] });
      void qc.invalidateQueries({ queryKey: ["plants", "list"] });
    },
  });
}
