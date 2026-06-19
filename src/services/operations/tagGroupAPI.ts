import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { tagGroupEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";

export interface TagGroupConfigItem {
  component_id: string;
  component_name?: string | null;
  tag_ids: string[];
}

export interface TagGroupRow {
  id: string;
  plant_id: string;
  plant_name?: string | null;
  name: string;
  category?: string | null;
  tag_config: TagGroupConfigItem[];
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateTagGroupInput {
  plant_id: string;
  name: string;
  category: string;
  tag_config: TagGroupConfigItem[];
  is_active?: boolean;
}

export type UpdateTagGroupInput = CreateTagGroupInput & { id: string };

export interface GetAllTagGroupsResponse {
  success: boolean;
  code: number;
  data?: {
    data?: TagGroupRow[];
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

export interface GetTagGroupDetailsResponse {
  success: boolean;
  code: number;
  data?: TagGroupRow;
  message?: string;
}

export type TagGroupListFilters = Record<string, string | string[]>;

export const TAG_GROUP_ACTIVE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export const TAG_GROUP_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
  { value: "created_at", label: "Created time" },
  { value: "updated_at", label: "Updated time" },
];

type PaginationShape = NonNullable<GetAllTagGroupsResponse["data"]>["pagination"];
type TagGroupListResult = {
  rows: TagGroupRow[];
  pagination?: PaginationShape;
};

type TagGroupApiConfigItem = {
  component_id?: string | null;
  component_name?: string | null;
  tag_ids?: string[] | null;
  tags?: string[] | null;
};

type TagGroupApiRow = {
  id?: string | null;
  plant_id?: string | null;
  plant_name?: string | null;
  name?: string | null;
  category?: string | null;
  tag_config?: TagGroupApiConfigItem[] | string | null;
  is_active?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TagGroupWriteResponse = {
  data?: { message?: string };
  message?: string;
};


export function normalizeTagGroupConfig(raw: unknown): TagGroupConfigItem[] {
  let source = raw;

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) return [];

  return source
    .map<TagGroupConfigItem | null>((item) => {
      const record =
        item && typeof item === "object" ? (item as TagGroupApiConfigItem) : null;
      if (!record) return null;

      const componentId = String(record.component_id ?? "").trim();
      const componentName =
        record.component_name == null || record.component_name === ""
          ? null
          : String(record.component_name);
      const rawTags = record.tag_ids ?? record.tags;
      const tagIds = Array.isArray(rawTags)
        ? [...new Set(rawTags.map((tag) => String(tag ?? "").trim()).filter(Boolean))]
        : [];

      if (!componentId) return null;

      const configItem: TagGroupConfigItem = {
        component_id: componentId,
        tag_ids: tagIds,
      };

      if (componentName) {
        configItem.component_name = componentName;
      }

      return configItem;
    })
    .filter((item): item is TagGroupConfigItem => item != null);
}

function normalizeTagGroupRow(row: TagGroupApiRow): TagGroupRow {
  return {
    id: String(row.id ?? ""),
    plant_id: String(row.plant_id ?? ""),
    plant_name:
      row.plant_name == null || row.plant_name === ""
        ? null
        : String(row.plant_name),
    name: String(row.name ?? ""),
    category: row.category == null || row.category === "" ? null : String(row.category),
    tag_config: normalizeTagGroupConfig(row.tag_config),
    is_active: Boolean(row.is_active),
    created_by: row.created_by == null || row.created_by === "" ? null : String(row.created_by),
    updated_by: row.updated_by == null || row.updated_by === "" ? null : String(row.updated_by),
    created_by_name:
      row.created_by_name == null || row.created_by_name === ""
        ? null
        : String(row.created_by_name),
    updated_by_name:
      row.updated_by_name == null || row.updated_by_name === ""
        ? null
        : String(row.updated_by_name),
    created_at: row.created_at == null || row.created_at === "" ? null : String(row.created_at),
    updated_at: row.updated_at == null || row.updated_at === "" ? null : String(row.updated_at),
  };
}

export const useGetTagGroupsListQuery = ({
  page = 1,
  limit = 50,
  search = "",
  filters = {},
  enabled = true,
}: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: TagGroupListFilters;
  enabled?: boolean;
}) => {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );

  return useQuery({
    queryKey: ["tagGroup", "list", search, JSON.stringify(clean), page, limit],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("page", String(page));
      params.append("limit", String(limit));
      for (const [key, value] of Object.entries(clean)) {
        if (Array.isArray(value)) {
          for (const item of value) params.append(key, String(item));
          continue;
        }
        params.append(key, String(value));
      }
      const { data } = await api.get<GetAllTagGroupsResponse>(tagGroupEndpoints.GET_ALL, {
        params,
      });
      const root = data?.data;
      return {
        rows: Array.isArray(root?.data)
          ? root.data.map((row) => normalizeTagGroupRow(row as TagGroupApiRow))
          : [],
        pagination: root?.pagination,
      } satisfies TagGroupListResult;
    },
  });
};

export const useGetTagGroupDetailsQuery = (
  id: string | null | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    retry?: boolean | number;
  },
) =>
  useQuery({
    queryKey: ["tagGroup", "details", id],
    enabled: options?.enabled ?? !!id,
    staleTime: options?.staleTime ?? 60_000,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
    retry: options?.retry,
    queryFn: async () => {
      if (!id) throw new Error("Tag group id is required");
      const { data } = await api.get<GetTagGroupDetailsResponse>(tagGroupEndpoints.GET_BY_ID(id));
      if (!data?.data) {
        throw new Error("Invalid tag group response");
      }
      return normalizeTagGroupRow(data.data as TagGroupApiRow);
    },
  });

export const useCreateTagGroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTagGroupInput) => {
      const body: CreateTagGroupInput = {
        plant_id: input.plant_id.trim(),
        name: input.name.trim(),
        category: input.category.trim(),
        tag_config: normalizeTagGroupConfig(input.tag_config),
        is_active: input.is_active ?? true,
      };
      const { data } = await api.post(tagGroupEndpoints.CREATE, body);
      return data as TagGroupWriteResponse;
    },
    onSuccess: (data) => {
      toast.success(
        data?.data?.message ?? data?.message ?? "Tag group created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "list"] });
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "names"] });
    },
    onError: toastError,
  });
};

export const useUpdateTagGroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTagGroupInput) => {
      const body: CreateTagGroupInput = {
        plant_id: input.plant_id.trim(),
        name: input.name.trim(),
        category: input.category.trim(),
        tag_config: normalizeTagGroupConfig(input.tag_config),
        is_active: input.is_active ?? true,
      };
      const { data } = await api.put(tagGroupEndpoints.UPDATE(id), body);
      return data as TagGroupWriteResponse;
    },
    onSuccess: (data, variables) => {
      toast.success(
        data?.data?.message ?? data?.message ?? "Tag group updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["tagGroup", "details", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "names"] });
    },
    onError: toastError,
  });
};

export const useDeleteTagGroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.put(
        tagGroupEndpoints.DELETE,
        { tag_group_ids: ids },
      );
      return data as TagGroupWriteResponse;
    },
    onSuccess: (data) => {
      toast.success(
        data?.data?.message ?? data?.message ?? "Tag group deleted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "list"] });
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "names"] });
    },
    onError: toastError,
  });
};

export const useToggleTagGroupStatusMutation = () => {
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
      const tagGroupIds =
        ids?.map((value) => String(value).trim()).filter(Boolean) ??
        (id ? [String(id).trim()] : []);
      if (tagGroupIds.length === 0) {
        throw new Error("At least one tag group id is required");
      }
      const { data } = await api.put(
        tagGroupEndpoints.TOGGLE_STATUS,
        {
          tag_group_ids: tagGroupIds,
          is_active,
        },
      );
      return data as TagGroupWriteResponse;
    },
    onSuccess: (data, { id, is_active }) => {
      toast.success(
        data?.data?.message ??
          data?.message ??
          `Tag group ${is_active ? "activated" : "deactivated"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["tagGroup", "list"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["tagGroup", "details", id] });
      }
    },
    onError: toastError,
  });
};

export const fetchTagGroupOptions = async (
  search = "",
  page = 1,
  limit = 50,
  plant_id?: string,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (plant_id) params.append("plant_id", plant_id);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const { data } = await api.get<GetAllTagGroupsResponse>(tagGroupEndpoints.GET_NAMES, { params });
  const root = data?.data;
  const rows = Array.isArray(root?.data)
    ? root.data.map((row) => normalizeTagGroupRow(row as TagGroupApiRow))
    : [];
  return rows.map((row) => ({
    value: row.id,
    label: row.name || row.id,
  }));
};
