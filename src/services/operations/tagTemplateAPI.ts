/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { tagTemplateCategoryEndpoints, tagTemplateEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams } from "@/utils/requestQuery";

export type TagTemplateCategory = string;
export type TagTemplatePlantCategory = string;

// ─── Types ─────────────────────────────────────────────────────────────────────

export function normalizeTagTemplateCategory(raw: unknown): TagTemplateCategory {
    if (typeof raw !== "string" || !raw.trim()) return "health";
    return raw.trim().toLowerCase().replace(/[-\s]+/g, "_") as TagTemplateCategory;
}

export function getTagTemplateCategoryLabel(value: string): string {
    const slug = normalizeTagTemplateCategory(value);
    return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");
}

export function normalizeTagTemplatePlantCategory(raw: unknown): TagTemplatePlantCategory {
    if (typeof raw !== "string" || !raw.trim()) return "rooftop";
    return raw.trim().toLowerCase().replace(/[-\s]+/g, "_") as TagTemplatePlantCategory;
}


export function getTagTemplatePlantCategoryLabel(value: string): string {
    const slug = normalizeTagTemplatePlantCategory(value);
    return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");
}

export interface TagTemplateRow {
    id: string;
    name: string;
    category: TagTemplateCategory;
    plant_category: TagTemplatePlantCategory;
    tag_map: Record<string, unknown>;
    description?: string | null;
    version?: number | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    created_by_name?: string | null;
    updated_by_name?: string | null;
}

export interface GetTagTemplatesResponse {
    templates: TagTemplateRow[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
}

export interface CreateTagTemplateInput {
    name: string;
    category: TagTemplateCategory;
    plant_category: TagTemplatePlantCategory;
    tag_map?: Record<string, unknown>;
    description?: string | null;
    version?: number | null;
    is_active?: boolean;
    is_create_new?: boolean;
}

export interface UpdateTagTemplateInput extends Partial<CreateTagTemplateInput> {
    id: string;
}

export type CreateBulkTagTemplateInput = CreateTagTemplateInput[];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Ensures tag_map matches backend JSON-object semantics (parse string payloads, clone objects). */
export function normalizeTagMap(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === "string") {
        const t = raw.trim();
        if (!t) return {};
        try {
            const parsed = JSON.parse(t) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return { ...(parsed as Record<string, unknown>) };
            }
        } catch {
            return {};
        }
        return {};
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return { ...(raw as Record<string, unknown>) };
    }
    return {};
}

function isLikelyTagTemplatePayload(o: Record<string, unknown>): boolean {
    return (
        typeof o.id === "string" &&
        o.id.length > 0 &&
        ("name" in o || "category" in o || "tag_map" in o)
    );
}

/** Unwraps standard `{ success, code, data }` API body to the tag template row (handles nested `data` wrappers). */
function extractTagTemplateFromEnvelope(envelope: unknown): Record<string, unknown> | null {
    let cur: unknown = envelope;
    for (let depth = 0; depth < 6; depth++) {
        if (!cur || typeof cur !== "object") return null;
        const o = cur as Record<string, unknown>;
        if (isLikelyTagTemplatePayload(o)) return o;
        if ("data" in o && o.data != null && typeof o.data === "object") {
            cur = o.data;
            continue;
        }
        return null;
    }
    return null;
}

const TAG_MAP_WRAPPER_KEYS = new Set([
    "tag_map",
    "mappings",
    "map",
    "data",
    "tags",
    "fields",
]);


export function coerceTagTemplateTagMap(raw: unknown): Record<string, unknown> {
    let m = normalizeTagMap(raw);
    for (let i = 0; i < 4; i++) {
        const keys = Object.keys(m);
        if (
            keys.length === 1 &&
            TAG_MAP_WRAPPER_KEYS.has(keys[0]!) &&
            m[keys[0]!] != null &&
            typeof m[keys[0]!] === "object" &&
            !Array.isArray(m[keys[0]!])
        ) {
            m = normalizeTagMap(m[keys[0]!]);
            continue;
        }
        break;
    }
    return m;
}

export type TagTemplateOption = {
    value: string;
    label: string;
};

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

export type TagTemplateCategoryOption = {
    value: TagTemplateCategory;
    label: string;
};

export function mapTagTemplateTagMapToOptions(raw: unknown): TagTemplateOption[] {
    const tagMap = coerceTagTemplateTagMap(raw);
    return Object.entries(tagMap).map(([key, value]) => ({
        value: key,
        label:
            typeof value === "string" && value.trim()
                ? `${String(value)} (${key})`
                : key,
    }));
}

export async function fetchTagTemplateOptionsById(
    id: string,
): Promise<TagTemplateOption[]> {
    const { data } = await api.get<any>(tagTemplateEndpoints.GET_BY_ID(id));
    const payload = data?.data;
    const template = extractTagTemplateFromEnvelope(payload) ?? extractTagTemplateFromEnvelope(data);
    const tagMapSource =
        template?.tag_map ??
        payload?.template?.tag_map ??
        payload?.tag_map;

    return mapTagTemplateTagMapToOptions(tagMapSource);
}

/** Remove empty-string keys before persisting (UI placeholders). */
export function stripEmptyStringKeysFromRecord(
    map: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map)) {
        if (v === "") continue;
        out[k] = v;
    }
    return out;
}


export function finalizeTagTemplateWritePayload(
    input: Partial<CreateTagTemplateInput> & { is_create_new?: boolean },
): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (input.name !== undefined) {
        body.name = input.name;
    }
    if (input.category !== undefined) {
        body.category = normalizeTagTemplateCategory(input.category);
    }
    if (input.plant_category !== undefined) {
        body.plant_category = normalizeTagTemplatePlantCategory(input.plant_category);
    }
    if (input.tag_map !== undefined) {
        let tag_map = coerceTagTemplateTagMap(input.tag_map);
        tag_map = stripEmptyStringKeysFromRecord(tag_map);
        tag_map = normalizeTagMap(tag_map);
        body.tag_map = tag_map;
    }
    if (input.description !== undefined) {
        body.description =
            input.description === null
                ? null
                : String(input.description).trim() || null;
    }
    if (input.version !== undefined) {
        let version = input.version;
        if (version == null || Number.isNaN(Number(version))) {
            version = 1;
        } else {
            version = Math.floor(Number(version));
            if (version < 0) {
                version = 1;
            }
        }
        body.version = version;
    }
    if (input.is_active !== undefined) {
        body.is_active = input.is_active;
    }

    if (input.is_create_new !== undefined) {
        body.is_create_new = Boolean(input.is_create_new);
    }

    return body;
}

export function finalizeTagTemplateBulkWritePayload(
    input: CreateBulkTagTemplateInput,
): Record<string, unknown>[] {
    return input.map((item) => finalizeTagTemplateWritePayload(item));
}

function normalizeTagTemplateRow(row: Record<string, unknown>): TagTemplateRow {
    const base = row as unknown as TagTemplateRow;
    return {
        ...base,
        category: normalizeTagTemplateCategory(row.category ?? base.category),
        plant_category: normalizeTagTemplatePlantCategory(row.plant_category ?? base.plant_category),
        tag_map: coerceTagTemplateTagMap(row.tag_map),
    };
}

/** Use for list/grid rows so category + tag_map match detail API normalization. */
export function normalizeTagTemplateClientRow(
    row: Record<string, unknown>,
): TagTemplateRow {
    return normalizeTagTemplateRow(row);
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export const useGetAllTagTemplatesQuery = ({
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
    const clean = cleanQueryFilters(filters);
    return useQuery({
        queryKey: ["tagTemplates", "list", search, JSON.stringify(clean), page, limit],
        enabled,
        staleTime: 30_000,
        queryFn: async () => {
            const params = toURLSearchParams({
                ...(search ? { search } : {}),
                page: String(page),
                limit: String(limit),
                ...clean,
            });
            const { data } = await api.get<any>(tagTemplateEndpoints.GET_ALL, { params });
            return data as any;
        },
    });
};

export const useGetTagTemplateDetailsQuery = (
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
        queryKey: ["tagTemplates", "detail", id],
        enabled: options?.enabled ?? !!id,
        staleTime: options?.staleTime ?? 60_000,
        refetchOnMount: options?.refetchOnMount,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        refetchOnReconnect: options?.refetchOnReconnect,
        queryFn: async () => {
            if (!id) throw new Error("id required");
            const { data } = await api.get<any>(tagTemplateEndpoints.GET_BY_ID(id));
            const row = extractTagTemplateFromEnvelope(data);
            if (!row) {
                throw new Error("Invalid tag template response");
            }
            return normalizeTagTemplateRow(row);
        },
    });

export const useGetTagTemplateNamesQuery = ({ enabled = true }: { enabled?: boolean } = {}) =>
    useQuery({
        queryKey: ["tagTemplates", "names"],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
            const { data } = await api.get<any>(tagTemplateEndpoints.GET_NAMES);
            return data as any;
        },
    });

/** Fetch lightweight name list for filter dropdowns */
export const fetchTagTemplateNames = async (
    search = "",
    page = 1,
    limit = 50,
    category?: string,
): Promise<{ value: string; label: string }[]> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    params.append("page", String(page));
    params.append("limit", String(limit));
    const { data } = await api.get<any>(tagTemplateEndpoints.GET_NAMES, { params });
    const raw: any[] = data?.data?.data ?? data?.data?.templates ?? data?.data ?? [];
    return raw.map((t: any) => ({ value: String(t.id), label: String(t.name || t.id) }));
};

/** Fetch health category templates only */
export const fetchHealthTagTemplateNames = async (
    search = "",
    page = 1,
    limit = 50,
): Promise<{ value: string; label: string }[]> => {
    return fetchTagTemplateNames(search, page, limit, "health");
};

export const fetchTagTemplateCategoryOptions = async (
    search = "",
): Promise<TagTemplateCategoryOption[]> => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());

    const { data } = await api.get<GetSelectOptionsResponse>(
        tagTemplateCategoryEndpoints.GET_ALL,
        { params },
    );

    const rows = Array.isArray(data.data) ? data.data : [];
    return rows.map((row) => ({
        value: row.value as TagTemplateCategory,
        label: row.label,
    }));
};

export const useGetTagTemplateCategoryOptionsQuery = ({
    enabled = true,
}: {
    enabled?: boolean;
} = {}) =>
    useQuery({
        queryKey: ["selectOptions", "tag_template_category"],
        enabled,
        staleTime: 60_000,
        queryFn: async () => fetchTagTemplateCategoryOptions(),
    });

export const fetchTagTemplateNamesByIds = async (
    ids:     string[],
): Promise<Record<string, string>> => {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return {};

    const responses = await Promise.allSettled(
        uniqueIds.map(async (id) => {
            const { data } = await api.get<any>(tagTemplateEndpoints.GET_BY_ID(id));
            const row = data?.data?.template ?? data?.data ?? {};
            return {
                id,
                name: String(row?.name ?? id),
            };
        }),
    );

    return responses.reduce<Record<string, string>>((acc, result) => {
        if (result.status === "fulfilled") {
            acc[result.value.id] = result.value.name;
        }
        return acc;
    }, {});
};

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateTagTemplateMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateTagTemplateInput) => {
            const body = finalizeTagTemplateWritePayload(input);
            const { data } = await api.post(tagTemplateEndpoints.CREATE, body);
            return data as any;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Tag template created");
            qc.invalidateQueries({ queryKey: ["tagTemplates"] });
        },
        onError: toastError,
    });
};

export const useCreateBulkTagTemplateMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateBulkTagTemplateInput) => {
            const body = finalizeTagTemplateBulkWritePayload(input);
            const { data } = await api.post(tagTemplateEndpoints.BULK_CREATE, body);
            return data as any;
        },
        onSuccess: (data, vars) => {
            toast.success(
                (data as any)?.message ||
                    (data as any)?.data?.message ||
                    `${vars.length} tag template(s) created`,
            );
            qc.invalidateQueries({ queryKey: ["tagTemplates"] });
        },
        onError: toastError,
    });
};

export const useUpdateTagTemplateMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: UpdateTagTemplateInput) => {
            const { id, ...rest } = input;
            const body = finalizeTagTemplateWritePayload(
                rest as CreateTagTemplateInput & { is_create_new?: boolean },
            );
            const { data } = await api.put(tagTemplateEndpoints.UPDATE(id), body);
            return data as any;
        },
        onSuccess: (data, vars) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Tag template updated");
            qc.invalidateQueries({ queryKey: ["tagTemplates", "list"] });
            qc.invalidateQueries({ queryKey: ["tagTemplates", "detail", vars.id] });
            qc.invalidateQueries({ queryKey: ["tagTemplates", "names"] });
        },
        onError: toastError,
    });
};

export const useToggleTagTemplateStatusMutation = () => {
    const qc = useQueryClient();
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
            const tagTemplateIds =
                ids?.map((value) => String(value).trim()).filter(Boolean) ??
                (id ? [String(id).trim()] : []);
            if (tagTemplateIds.length === 0) {
                throw new Error("At least one tag template id is required");
            }
            const { data } = await api.put(tagTemplateEndpoints.TOGGLE_STATUS, {
                tag_template_ids: tagTemplateIds,
                is_active,
            });
            return data as any;
        },
        onSuccess: (data, vars) => {
            toast.success(
                (data as any)?.message || (data as any)?.data?.message || "Status updated",
            );
            qc.invalidateQueries({ queryKey: ["tagTemplates", "list"] });
            if (vars.id) {
                qc.invalidateQueries({ queryKey: ["tagTemplates", "detail", vars.id] });
            }
            vars.ids?.forEach((tagTemplateId) => {
                qc.invalidateQueries({ queryKey: ["tagTemplates", "detail", tagTemplateId] });
            });
        },
        onError: toastError,
    });
};

export const useDeleteTagTemplateMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { data } = await api.put(tagTemplateEndpoints.DELETE, { tag_template_ids: ids });
            return data as any;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Tag template(s) deleted");
            qc.invalidateQueries({ queryKey: ["tagTemplates"] });
        },
        onError: toastError,
    });
};