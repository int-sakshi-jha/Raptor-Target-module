import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { plantFeatureEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";

/** API may serialize `numeric` as a string (e.g. `"123.00"`). */
export type PlantFeaturePrice = number | string | null;

/** Matches GET list/detail payload from the platform. */
export interface PlantFeature {
  id: string;
  name: string;
  display_name: string;
  module?: string | null;
  /** Present on list/detail; Postgres numeric often arrives as a string in JSON. */
  price?: PlantFeaturePrice;
  parent_feature_id?: string | null;
  plant_category: string[];
  is_active: boolean;
  is_default: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreatePlantFeatureInput {
  name: string;
  display_name: string;
  module?: string | null;
  price?: number | null;
  parent_feature_id?: string | null;
  plant_category?: string[] | null;
  is_active?: boolean;
  is_default?: boolean;
}

export type UpdatePlantFeatureInput = Partial<CreatePlantFeatureInput> & {
  id: string;
};

export interface GetAllPlantFeaturesResponse {
  success: boolean;
  code: number;
  data: {
    /** Platform list payload key */
    plant_features?: PlantFeature[];
    /** Legacy client naming */
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    message?: string;
  };
}

export interface GetPlantFeatureDetailsResponse {
  success: boolean;
  code: number;
  data: PlantFeature;
}

export interface MutationMessageResponse {
  success: boolean;
  code: number;
  data?: { data?: PlantFeature; message?: string };
  message?: string;
}

export interface DeletePlantFeatureResponse {
  success: boolean;
  code: number;
  data?: { message?: string };
  message?: string;
}

export interface TogglePlantFeatureStatusResponse {
  success: boolean;
  code: number;
  data?: { message?: string };
  message?: string;
}

export type PlantFeatureListFilters = Record<string, string>;

function toPlantFeatureMutationBody(
  input: Partial<CreatePlantFeatureInput>,
  mode: "create" | "update",
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (mode === "create" || Object.hasOwn(input, "name")) {
    body.name = input.name;
  }
  if (mode === "create" || Object.hasOwn(input, "display_name")) {
    body.display_name = input.display_name;
  }
  if (mode === "create" || Object.hasOwn(input, "is_active")) {
    body.is_active = input.is_active ?? true;
  }
  if (mode === "create" || Object.hasOwn(input, "is_default")) {
    body.is_default = input.is_default ?? false;
  }

  if (Object.hasOwn(input, "module")) {
    const moduleValue = input.module;
    body.module =
      moduleValue != null && String(moduleValue).trim() !== ""
        ? moduleValue
        : null;
  }

  if (Object.hasOwn(input, "parent_feature_id")) {
    const parentId = input.parent_feature_id;
    body.parent_feature_id =
      parentId != null && String(parentId).trim() !== ""
        ? parentId
        : null;
  }

  if (Object.hasOwn(input, "price")) {
    body.price = input.price;
  }

  if (Array.isArray(input.plant_category) && input.plant_category.length > 0) {
    body.plant_category = input.plant_category;
  }

  return body;
}


function extractPlantFeatureList(
  raw: GetAllPlantFeaturesResponse | undefined,
): {
  rows: PlantFeature[];
  pagination: GetAllPlantFeaturesResponse["data"]["pagination"] | undefined;
} {
  return {
    rows: raw?.data?.plant_features ?? [],
    pagination: raw?.data?.pagination,
  };
}
/** Detail GET may return the row on `data` or under `data.plant_feature_permission`. */
export function pickPlantFeatureDetail(
  payload: GetPlantFeatureDetailsResponse | undefined,
): PlantFeature | null {
  return payload?.data ?? null;
}

export const useGetPlantFeaturesListQuery = ({
  page = 1,
  limit = 50,
  search = "",
  filters = {},
  enabled = true,
}: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: PlantFeatureListFilters;
  enabled?: boolean;
}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v != null && String(v).trim() !== "",
    ),
  );
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["plantFeature", "list", page, limit, search, filterKey],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const params = {
        page,
        limit,
        search: search || undefined,
        ...cleanFilters,
      };
      const { data } = await api.get<GetAllPlantFeaturesResponse>(
        plantFeatureEndpoints.GET_ALL_PLANT_FEATURES,
        { params },
      );
      return data;
    },
  });
};

export const useGetPlantFeatureDetailsQuery = (
  id: string | null | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
  },
) =>
  useQuery({
    queryKey: ["plantFeature", "details", id],
    enabled: options?.enabled ?? !!id,
    staleTime: options?.staleTime ?? 60_000,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
    queryFn: async () => {
      if (!id) throw new Error("Plant feature id is required");
      const { data } = await api.get<GetPlantFeatureDetailsResponse>(
        plantFeatureEndpoints.GET_PLANT_FEATURE_BY_ID(id),
      );
      return data;
    },
  });

export const useCreatePlantFeatureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlantFeatureInput) => {
      const body = toPlantFeatureMutationBody(input, "create");
      const { data } = await api.post<MutationMessageResponse>(
        plantFeatureEndpoints.CREATE_PLANT_FEATURE,
        body,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.data?.message ??
          data?.message ??
          "Plant feature created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["plantFeature", "list"] });
    },
    onError: toastError,
  });
};

export const useUpdatePlantFeatureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePlantFeatureInput) => {
      const body = toPlantFeatureMutationBody(input, "update");
      const { data } = await api.put<MutationMessageResponse>(
        plantFeatureEndpoints.UPDATE_PLANT_FEATURE(id),
        body,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        data?.data?.message ??
          data?.message ??
          "Plant feature updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["plantFeature", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["plantFeature", "details", variables.id],
      });
    },
    onError: toastError,
  });
};

export const useDeletePlantFeatureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.put<DeletePlantFeatureResponse>(
        plantFeatureEndpoints.REMOVE_PLANT_FEATURE,
        { plant_feature_ids: ids },
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.data?.message ??
          data?.message ??
          "Plant feature deleted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["plantFeature", "list"] });
    },
    onError: toastError,
  });
};

export const useTogglePlantFeatureStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { data } = await api.put<TogglePlantFeatureStatusResponse>(
        plantFeatureEndpoints.TOGGLE_PLANT_FEATURE_STATUS(id),
        { is_active },
      );
      return data;
    },
    onSuccess: (data, { id, is_active }) => {
      toast.success(
        data?.data?.message ??
          data?.message ??
          `Plant feature ${is_active ? "activated" : "deactivated"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["plantFeature", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["plantFeature", "details", id],
      });
    },
    onError: toastError,
  });
};

/** Options for parent-feature select (async filters, forms). */
export const fetchPlantFeatureOptions = async (
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", String(page));
  params.append("limit", String(limit));
  const { data } = await api.get<GetAllPlantFeaturesResponse>(
    plantFeatureEndpoints.GET_ALL_PLANT_FEATURES,
    { params },
  );
  const { rows } = extractPlantFeatureList(data);
  return rows.map((r) => ({
    value: r.id,
    label: `${r.display_name} (${r.name})`,
  }));
};

