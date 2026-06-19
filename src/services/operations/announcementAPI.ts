import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { announcementEndpoints } from "../endpoints";
import toast from "react-hot-toast";
import { toastError } from "@/utils/errorFormatter";

export interface AnnouncementAudience {
  roles?: string[];
  tenant_ids?: string[];
  user_ids?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  audience_type: string;
  audience: AnnouncementAudience | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  dismissible: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  type?: string;
  audience_type?: string;
  audience?: AnnouncementAudience | null;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  dismissible?: boolean;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput> & {
  id: string;
};

export interface GetAllAnnouncementsResponse {
  success: boolean;
  code: number;
  data: {
    announcements: Announcement[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

export interface GetAnnouncementDetailsResponse {
  success: boolean;
  code: number;
  data: Announcement;
}

export interface MutationMessageResponse {
  success: boolean;
  code: number;
  data?: { message?: string };
  message?: string;
}

export interface DeleteAnnouncementsResponse {
  success: boolean;
  code: number;
  data?: {
    announcements?: {
      notFoundAnnouncementIds?: string[];
      totalDeleted?: number;
      totalRequested?: number;
    };
    message?: string;
  };
  message?: string;
}

export interface ChangeAnnouncementStatusResponse {
  success: boolean;
  code: number;
  data?: {
    announcements?: {
      notUpdatedIds?: string[];
      totalUpdated?: number;
      totalRequested?: number;
    };
    message?: string;
  };
  message?: string;
}

export type AnnouncementListFilters = Record<
  string,
  string | string[] | boolean | undefined | null
>;

const SUPPORTED_ANNOUNCEMENT_FILTER_KEYS = new Set([
  "type",
  "audience_type",
  "is_active",
  "dismissible",
  "created_by",
  "updated_by",
  "start_date_start",
  "start_date_end",
  "end_date_start",
  "end_date_end",
  "created_at_start",
  "created_at_end",
  "updated_at_start",
  "updated_at_end",
  "sort_by",
  "sort_order",
]);

type SelectOptionItem = { value: string; label: string };

type GetSelectOptionsResponse = {
  success: boolean;
  code: number;
  data: SelectOptionItem[];
};

export async function fetchAnnouncementTypeOptions(
  search = "",
): Promise<{ value: string; label: string }[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.append("search", search.trim());

  const { data } = await api.get<GetSelectOptionsResponse>(
    announcementEndpoints.GET_ANNOUNCEMENT_TYPES,
    { params },
  );

  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.map((row) => ({
    value: row.value,
    label: row.label,
  }));
}

export function isAnnouncementCurrentlyVisible(announcement: Announcement): boolean {
  if (!announcement.is_active) return false;
  const now = Date.now();
  const start = new Date(announcement.start_date).getTime();
  const end = new Date(announcement.end_date).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return now >= start && now <= end;
}

/** GET /v1/announcement/:id — get-specific-announcement (one record, not the list API). */
export async function fetchAnnouncementById(id: string): Promise<Announcement> {
  const { data } = await api.get<GetAnnouncementDetailsResponse>(
    announcementEndpoints.GET_ANNOUNCEMENT_BY_ID(id),
  );
  return data.data;
}

export const useGetAnnouncementListQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  search?: string;
  filters?: AnnouncementListFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
} = {}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([key, v]) =>
        SUPPORTED_ANNOUNCEMENT_FILTER_KEYS.has(key) &&
        v !== undefined &&
        v !== null &&
        (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ""),
    ),
  ) as AnnouncementListFilters;
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["announcement", "list", search, filterKey, page, limit],
    queryFn: async () => {
      const params: Record<string, string | string[] | boolean> = {
        ...(search ? { search } : {}),
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
      };
      const { data } = await api.get<GetAllAnnouncementsResponse>(
        announcementEndpoints.GET_ANNOUNCEMENT_LIST,
        { params },
      );
      return data;
    },
    staleTime: 30_000,
    enabled,
  });
};

export const useGetAnnouncementDetailsQuery = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ["announcement", "details", id],
    queryFn: async () => {
      if (!id) throw new Error("Announcement ID is required");
      const announcement = await fetchAnnouncementById(id);
      return { success: true, code: 200, data: announcement } satisfies GetAnnouncementDetailsResponse;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
};

export const useCreateAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const body: Record<string, unknown> = {
        ...input,
        audience:
          input.audience_type === "all" || !input.audience_type
            ? undefined
            : input.audience,
      };
      const { data } = await api.post<MutationMessageResponse>(
        announcementEndpoints.CREATE_ANNOUNCEMENT,
        body,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || data.message || "Announcement created successfully");
      queryClient.invalidateQueries({ queryKey: ["announcement", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdateAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAnnouncementInput) => {
      const body: Record<string, unknown> = { ...input };
      if (input.audience_type === "all") {
        body.audience = null;
      }
      const { data } = await api.put<MutationMessageResponse>(
        announcementEndpoints.UPDATE_ANNOUNCEMENT(id),
        body,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.data?.message || data.message || "Announcement updated successfully");
      queryClient.invalidateQueries({ queryKey: ["announcement", "list"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", "details", variables.id] });
    },
    onError: toastError,
  });
};

export const useDeleteAnnouncementsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementIds: string[]) => {
      const { data } = await api.put<DeleteAnnouncementsResponse>(
        announcementEndpoints.DELETE_ANNOUNCEMENTS,
        { announcement_ids: announcementIds },
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.data?.message || data.message || "Announcement(s) deleted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["announcement", "list"] });
    },
    onError: toastError,
  });
};

export const useToggleAnnouncementStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      const { data } = await api.put<ChangeAnnouncementStatusResponse>(
        announcementEndpoints.CHANGE_STATUS,
        { announcement_ids: ids, is_active },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        data.data?.message || data.message || "Announcement status updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["announcement", "list"] });
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ["announcement", "details", id] });
      });
    },
    onError: toastError,
  });
};

/** Toggle active status for a single row (matches permission/plant-feature list UX). */
export const useToggleSingleAnnouncementStatusMutation = () => {
  const toggleMutation = useToggleAnnouncementStatusMutation();

  return {
    ...toggleMutation,
    mutate: (announcement: Announcement) => {
      toggleMutation.mutate({
        ids: [announcement.id],
        is_active: !announcement.is_active,
      });
    },
    mutateAsync: async (announcement: Announcement) =>
      toggleMutation.mutateAsync({
        ids: [announcement.id],
        is_active: !announcement.is_active,
      }),
  };
};
