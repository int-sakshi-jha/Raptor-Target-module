/* eslint-disable @typescript-eslint/no-explicit-any */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { plantEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams, cleanEmptyStrings } from "@/utils/requestQuery";

export type PlantType = string;
export type PlantCategory = string;

// -----------------------------
// Types
// -----------------------------


export interface PlantRow {
    id: string;
    tenant_id?: string | null;
    organization_id?: string | null;
    plant_name?: string | null;
    plant_type?: string | null;
    plant_category?: string | null;
    owner?: Record<string, any> | null;
    is_forecast?: boolean | null;
    features?: string[] | null;
    contact_person_name?: string | null;
    contact_person_email?: string | null;
    contact_person_phone?: string | null;
    contact_person_designation?: string | null;
    dc_capacity_kw?: number | null;
    ac_capacity_kw?: number | null;
    sanctioned_load_kw?: number | null;
    connected_load_kw?: number | null;
    grid_voltage_kv?: number | null;
    connection_point?: string | null;
    transformer_capacity_kva?: number | null;
    meter_number?: string | null;
    consumer_number?: string | null;
    feeder_name?: string | null;
    substation_name?: string | null;
    discom_name?: string | null;
    location_name?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
    taluka?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    elevation_m?: number | null;
    timezone?: string | null;
    grid_type?: string | null;
    net_metering?: boolean | null;
    commissioning_date?: string | null;
    cod_date?: string | null;
    ppa_rate?: number | null;
    ppa_escalation_percent?: number | null;
    ppa_duration_years?: number | null;
    revenue_type?: number | null;
    tariff_type?: string | null;
    expected_annual_generation_kwh?: number | null;
    expected_cuf_percent?: number | null;
    expected_pr_percent?: number | null;
    expected_yield_kwh_kwp?: number | null;
    module_json?: Record<string, unknown>[] | null;
    bot_layer_components?: Array<{
        component_type: string;
        component_id: string;
        child_components: string[];
    }> | null;
    tilt_angle_degrees?: number | null;
    azimuth_angle_degrees?: number | null;
    orientation?: string | null;
    notify_users?: string[] | null;
    is_active?: boolean | null;
    is_commissioned?: boolean | null;
    communication_status?: string | null;
    plant_image?: string | null;
    metadata?: Record<string, any> | null;
    tags?: string[] | null;
    created_by?: string | null;
    updated_by?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    // enriched fields
    tenant_name?: string | null;
    organization_name?: string | null;
    created_by_name?: string | null;
    updated_by_name?: string | null;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

/** Max page size allowed by the plants list API. */
export const PLANTS_LIST_MAX_LIMIT = 100;

export interface GetPlantsResponse {
    plants: PlantRow[];
    pagination: PaginationInfo;
}

/** Normalize list API envelopes (`data.plants`, `data.data`, etc.) into plant rows. */
export function extractPlantsFromListResponse(response: unknown): PlantRow[] {
    const root = response as
        | {
              data?: { plants?: PlantRow[]; data?: PlantRow[] | { plants?: PlantRow[] } };
              plants?: PlantRow[];
          }
        | null
        | undefined;
    if (!root) return [];
    if (Array.isArray(root.plants)) return root.plants;
    const inner = root.data;
    if (!inner) return [];
    if (Array.isArray(inner.plants)) return inner.plants;
    if (Array.isArray(inner.data)) return inner.data;
    const nested = inner.data as { plants?: PlantRow[] } | undefined;
    if (Array.isArray(nested?.plants)) return nested.plants;
    return [];
}

export function extractPlantsPaginationFromListResponse(
    response: unknown,
): PaginationInfo | null {
    const root = response as
        | { data?: { pagination?: PaginationInfo }; pagination?: PaginationInfo }
        | null
        | undefined;
    return root?.data?.pagination ?? root?.pagination ?? null;
}

async function fetchPlantsListAllPages(endpoint: string): Promise<PlantRow[]> {
    const all: PlantRow[] = [];
    let page = 1;
    let totalPages = 1;
    const maxPages = 50;

    while (page <= totalPages && page <= maxPages) {
        const params = toURLSearchParams({
            page: String(page),
            limit: String(PLANTS_LIST_MAX_LIMIT),
        });
        const { data } = await api.get<{ data: GetPlantsResponse }>(endpoint, { params });
        const rows = extractPlantsFromListResponse(data);
        all.push(...rows);

        const pagination = extractPlantsPaginationFromListResponse(data);
        if (pagination?.totalPages) {
            totalPages = pagination.totalPages;
        } else if (rows.length < PLANTS_LIST_MAX_LIMIT) {
            break;
        } else {
            totalPages = page + 1;
        }

        if (!rows.length) break;
        page += 1;
    }

    return all;
}

export interface CreatePlantInput {
    tenant_id?: string | null;
    organization_id?: string | null;
    /** Existing user ID — when set, skip new-user fields. */
    existing_user_id?: string | null;
    /** Owner user when creating a new plant (required by POST /v1/plant). */
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    username?: string | null;
    phone?: string | null;
    password?: string | null;
    is_password_login_enable?: boolean | null;
    plant_name?: string | null;
    plant_type?: string | null;
    plant_category?: string | null;
    is_forecast?: boolean | null;
    contact_person_name?: string | null;
    contact_person_email?: string | null;
    contact_person_phone?: string | null;
    contact_person_designation?: string | null;
    dc_capacity_kw?: number | null;
    ac_capacity_kw?: number | null;
    sanctioned_load_kw?: number | null;
    connected_load_kw?: number | null;
    grid_voltage_kv?: number | null;
    connection_point?: string | null;
    transformer_capacity_kva?: number | null;
    meter_number?: string | null;
    consumer_number?: string | null;
    feeder_name?: string | null;
    substation_name?: string | null;
    discom_name?: string | null;
    location_name?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
    taluka?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    elevation_m?: number | null;
    timezone?: string | null;
    grid_type?: string | null;
    net_metering?: boolean | null;
    commissioning_date?: string | null;
    ppa_rate?: number | null;
    ppa_escalation_percent?: number | null;
    ppa_duration_years?: number | null;
    revenue_type?: number | null;
    tariff_type?: string | null;
    expected_annual_generation_kwh?: number | null;
    expected_cuf_percent?: number | null;
    expected_pr_percent?: number | null;
    expected_yield_kwh_kwp?: number | null;
    module_json?: Record<string, unknown>[] | null;
    bot_layer_components?: Array<{
        component_type: string;
        component_id: string;
        child_components: string[];
    }> | null;
    tilt_angle_degrees?: number | null;
    azimuth_angle_degrees?: number | null;
    orientation?: string | null;
    notify_user?: boolean | null;
    /** Owner user permissions when creating a plant; use null when none selected. */
    permissions?: string[] | null;
    is_active?: boolean | null;
    is_commissioned?: boolean | null;
    communication_status?: string | null;
    plant_image?: string | null;
    metadata?: Record<string, any> | null;
    tags?: string[] | null;
}

export interface UpdatePlantInput extends Partial<CreatePlantInput> {
    id: string;
    /** Commercial operation date — updates only; not accepted on create. */
    cod_date?: string | null;
}

export interface CommissionPlantInput {
    id: string;
    commissioning_date: string;
}

export interface DecommissionPlantInput {
    id: string;
}

export interface PlantOption {
    id: string;
    name?: string;
    display_name?: string;
    plant_name?: string;
    tenant_id?: string | null;
}

export interface PlantNamesPageResult {
    plants: PlantOption[];
    pagination: PaginationInfo;
}

interface GetPlantNamesResponse {
    success: boolean;
    code: number;
    data: PlantNamesPageResult;
    message?: string;
}

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

export type PlantSelectOption<T extends string> = {
    value: T;
    label: string;
};

const fetchPlantSelectOptions = async <T extends string>(
    endpoint: string,
    supportedValues: readonly T[],
    search = "",
): Promise<PlantSelectOption<T>[]> => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<GetSelectOptionsResponse>(endpoint, { params });

    const allowed = new Set<string>(supportedValues);
    const rows = Array.isArray(data.data) ? data.data : [];
    if (allowed.size === 0) {
        return rows.map((row) => ({
            value: row.value as T,
            label: row.label,
        }));
    }

    return rows
        .filter((row): row is SelectOptionItem =>
            !!row &&
            typeof row.value === "string" &&
            typeof row.label === "string" &&
            allowed.has(row.value),
        )
        .map((row) => ({
            value: row.value as T,
            label: row.label,
        }));
};

/** Solar / wind / hybrid / storage / other — `plants.plant_type`. */
export const fetchPlantTypeOptions = async (search = "") =>
    fetchPlantSelectOptions(plantEndpoints.GET_PLANT_TYPES, [] as string[], search);

/** Rooftop / captive / pm_kusum — `plants.plant_category`, feature/tag `plant_category`. */
export const fetchPlantCategoryOptions = async (search = "") =>
    fetchPlantSelectOptions(plantEndpoints.GET_PLANT_CATEGORIES, [] as string[], search);

export const useGetPlantTypeOptionsQuery = ({ enabled = true }: { enabled?: boolean } = {}) =>
    useQuery({
        queryKey: ["selectOptions", "plant_type"],
        enabled,
        staleTime: 60_000,
        queryFn: async () => fetchPlantTypeOptions(),
    });

export const useGetPlantCategoryOptionsQuery = ({ enabled = true }: { enabled?: boolean } = {}) =>
    useQuery({
        queryKey: ["selectOptions", "plant_category"],
        enabled,
        staleTime: 60_000,
        queryFn: async () => fetchPlantCategoryOptions(),
    });

export const fetchRevenueOptions = async (search = ""): Promise<{ value: string; label: string }[]> => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<GetSelectOptionsResponse>(plantEndpoints.GET_REVENUES, { params });
    const rows = Array.isArray(data.data) ? data.data : [];

    return rows.map((row) => ({
        value: String(row.value),
        label: row.label,
    }));
};

/** Row shape from GET /plant-components/:plantId (minimal list). */
export interface PlantComponentSummaryRow {
    id: string;
    component_name: string;
    parent_id?: string | null;
    ac_capacity_kw?: string | number | null;
    dc_capacity_kw?: string | number | null;
    component_type: string;
    display_order?: number | null;
}

export interface PlantComponentRow extends PlantComponentSummaryRow {
    plant_id?: string;
    tenant_id?: string;
    component_code?: string | null;
    serial_number?: string | null;
    device_id?: string | null;
    inverter_type_id?: string | null;
    tag_template_id?: string | null;
    vd_number?: number | null;
    brand?: string | null;
    model?: string | null;
    mppt_count?: number | null;
    strings_per_mppt?: number | null;
    phase_type?: string | null;
    module_count?: number | null;
    string_length?: number | null;
    ct_ratio?: number | null;
    rating_a?: number | null;
    channels?: number | null;
    identifier?: number | null;
    area_sqm?: number | null;
    warranty_start_date?: string | null;
    warranty_end_date?: string | null;
    status?: string | null;
    meter_type?: string | null;
    is_active?: boolean | null;
    plant_name?: string | null;
    tenant_name?: string | null;
    device_name?: string | null;
    parent_component_name?: string | null;
    parent_component_code?: string | null;
    inverter_type_name?: string | null;
    inverter_type_code?: string | null;
    tag_template_name?: string | null;
    created_by_name?: string | null;
    updated_by_name?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface GetPlantComponentsResponse {
    success: boolean;
    code: number;
    data: {
        data: PlantComponentRow[];
    };
    message?: string;
}

// -----------------------------
// Helpers
// -----------------------------

export type PlantsListFilters = Record<string, string | string[] | boolean | undefined | null>;


// -----------------------------
// Queries
// -----------------------------

export const useGetAllPlantsQuery = ({
    search = "",
    filters = {},
    page = 1,
    limit = 50,
    enabled = true,
}: {
    search?: string;
    filters?: PlantsListFilters;
    page?: number;
    limit?: number;
    enabled?: boolean;
}) => {
    const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
    const filterKey = JSON.stringify(cleanFilters);

    return useQuery({
        queryKey: ["plants", "list", "all", search, filterKey, page, limit],
        enabled,
        staleTime: 0,
        queryFn: async () => {
            const rawParams: Record<string, unknown> = {
                ...(search ? { search } : {}),
                page: page.toString(),
                limit: limit.toString(),
                ...cleanFilters,
            };
            const params = toURLSearchParams(rawParams);
            const { data } = await api.get<{ data: GetPlantsResponse }>(
                plantEndpoints.GET_ALL_PLANTS,
                { params },
            );
            return data as any;
        },
    });
};

export const useGetMyPlantsQuery = ({
    search = "",
    filters = {},
    page = 1,
    limit = 50,
    enabled = true,
}: {
    search?: string;
    filters?: PlantsListFilters;
    page?: number;
    limit?: number;
    enabled?: boolean;
}) => {
    const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
    const filterKey = JSON.stringify(cleanFilters);

    return useQuery({
        queryKey: ["plants", "list", "my", search, filterKey, page, limit],
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
            const { data } = await api.get<{ data: GetPlantsResponse }>(
                plantEndpoints.GET_MY_PLANTS,
                { params },
            );
            return data as any;
        },
    });
};

/** Fetches all plants for dashboard widgets (paginates with API max limit of 100). */
export const useGetDashboardPlantsQuery = ({
    scope,
    enabled = true,
}: {
    scope: "all" | "my";
    enabled?: boolean;
}) => {
    const endpoint =
        scope === "all" ? plantEndpoints.GET_ALL_PLANTS : plantEndpoints.GET_MY_PLANTS;

    return useQuery({
        queryKey: ["plants", "dashboard", scope],
        enabled,
        staleTime: 30_000,
        queryFn: () => fetchPlantsListAllPages(endpoint),
    });
};

export const useGetPlantDetailsQuery = (id: string | null | undefined) =>
    useQuery({
        queryKey: ["plants", "detail", id],
        enabled: !!id,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
        queryFn: async () => {
            if (!id) throw new Error("Plant id is required");
            const { data } = await api.get<any>(plantEndpoints.GET_PLANT_BY_ID(id));
            return data as any;
        },
    });

export const useGetPlantComponentsQuery = (
    plantId: string | null | undefined,
    options?: { fullDetails?: boolean; enabled?: boolean },
) =>
    useQuery({
        queryKey: ["plants", "components", plantId, options?.fullDetails ?? false],
        enabled: options?.enabled !== false && !!plantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<PlantComponentRow[]> => {
            if (!plantId) throw new Error("Plant id is required");
            const params =
                options?.fullDetails === true ? { full_details: "true" } : undefined;
            try {
                const { data } = await api.get<GetPlantComponentsResponse>(
                    plantEndpoints.GET_PLANT_COMPONENTS(plantId),
                    { params },
                );
                const rows = data?.data?.data;
                return Array.isArray(rows) ? rows : [];
            } catch (error: unknown) {
                const status = (error as { response?: { status?: number } })?.response
                    ?.status;
                if (status === 204 || status === 404) {
                    return [];
                }
                throw error;
            }
        },
    });

export const useGetPlantNamesQuery = ({
    enabled = true,
    tenant_id,
    user_id,
    search = "",
}: {
    enabled?: boolean;
    tenant_id?: string | null;
    user_id?: string | null;
    search?: string;
} = {}) =>
    useQuery({
        queryKey: ["plants", "names", tenant_id ?? "all", user_id ?? "all", search],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (tenant_id) params.tenant_id = tenant_id;
            if (user_id) params.user_id = user_id;
            if (search.trim()) params.search = search.trim();
            const { data } = await api.get<any>(plantEndpoints.GET_PLANT_NAMES, { params });
            return data as any;
        },
    });

export const useGetPlantNamesPaginatedQuery = ({
    enabled = true,
    tenant_id,
    user_id,
    search = "",
    page = 1,
    limit = 20,
}: {
    enabled?: boolean;
    tenant_id?: string | null;
    user_id?: string | null;
    search?: string;
    page?: number;
    limit?: number;
} = {}) =>
    useQuery({
        queryKey: ["plants", "names", "paginated", tenant_id ?? "all", user_id ?? "all", search, page, limit],
        enabled,
        staleTime: 30_000,
        queryFn: async (): Promise<PlantNamesPageResult> => {
            const params: Record<string, string> = {
                page: String(page),
                limit: String(limit),
            };
            if (tenant_id) params.tenant_id = tenant_id;
            if (user_id) params.user_id = user_id;
            if (search.trim()) params.search = search.trim();

            try {
                const { data } = await api.get<GetPlantNamesResponse>(plantEndpoints.GET_PLANT_NAMES, { params });
                return data.data;
            } catch (error: unknown) {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 204 || status === 404) {
                    return {
                        plants: [],
                        pagination: {
                            page,
                            limit,
                            totalCount: 0,
                            totalPages: 1,
                        },
                    };
                }
                throw error;
            }
        },
    });

/**
 * Lightweight plant names for filter dropdowns (id + plant_name).
 */
export const fetchPlantNames = async (
    search = "",
    page = 1,
    limit = 50,
    tenant_id?: string | null,
): Promise<{ value: string; label: string }[]> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (tenant_id) params.append("tenant_id", tenant_id);
    const { data } = await api.get<GetPlantNamesResponse>(plantEndpoints.GET_PLANT_NAMES, { params });
    const plants = data?.data?.plants ?? [];
    return plants.map((p) => ({
        value: String(p.id),
        label: String(p.plant_name ?? p.name ?? p.display_name ?? p.id),
    }));
};

// -----------------------------
// Mutations
// -----------------------------

export const useCreatePlantMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePlantInput) => {
            const cleaned = cleanEmptyStrings(input) as CreatePlantInput;
            const { data } = await api.post(plantEndpoints.CREATE_PLANT, cleaned);
            return data as any;
        },
        onSuccess: (data) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Plant created successfully",
            );
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "names"] });
        },
        onError: toastError,
    });
};

export const useUpdatePlantMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...input }: UpdatePlantInput) => {
            const cleaned = cleanEmptyStrings(input) as Partial<UpdatePlantInput>;
            const { data } = await api.put(plantEndpoints.UPDATE_PLANT(id), cleaned);
            return data as any;
        },
        onSuccess: (data, variables) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Plant updated successfully");
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "detail", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["plants", "names"] });
        },
        onError: toastError,
    });
};

export const useTogglePlantStatusMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: { id: string; }) => {
            const { data } = await api.put(plantEndpoints.TOGGLE_PLANT_STATUS(id));
            return data as any;
        },
        onSuccess: (data, variables) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Plant status updated successfully",
            );
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "detail", variables.id] });
        },
        onError: toastError,
    });
};

export const useCommissionPlantMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, commissioning_date }: CommissionPlantInput) => {
            const { data } = await api.put(plantEndpoints.COMMISSION_PLANT(id), {
                commissioning_date,
            });
            return data as any;
        },
        onSuccess: (data, variables) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Plant commissioned successfully",
            );
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "detail", variables.id] });
        },
        onError: toastError,
    });
};

export const useDecommissionPlantMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: DecommissionPlantInput) => {
            const { data } = await api.put(plantEndpoints.DECOMMISSION_PLANT(id));
            return data as any;
        },
        onSuccess: (data, variables) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Plant decommissioned successfully",
            );
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "detail", variables.id] });
        },
        onError: toastError,
    });
};

export const useDeletePlantMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (plantIds: string[]) => {
            if (!plantIds || plantIds.length === 0) throw new Error("No plants selected for deletion");
            await Promise.all(
                plantIds.map((id) => api.delete(plantEndpoints.DELETE_PLANT(id)))
            );
            return { message: "Plant deleted successfully" };
        },
        onSuccess: (data) => {
            const msg = (data as any)?.data?.message || (data as any)?.message || "Plant(s) deleted successfully";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["plants", "list"] });
            queryClient.invalidateQueries({ queryKey: ["plants", "names"] });
        },
        onError: toastError,
    });
};
