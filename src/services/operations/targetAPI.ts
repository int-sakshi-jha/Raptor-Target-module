import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
//import { api } from "../api";
import axios from "axios";
import { targetEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams, cleanEmptyStrings } from "@/utils/requestQuery";


export interface TargetListFilters {
  tenant?: string;
  plant?: string;
  component?: string;
  parameter?: string;

  status?: string;
  period?: string;

  start_date_from?: string;
  start_date_to?: string;

  end_date_from?: string;
  end_date_to?: string;

  created_at_from?: string;
  created_at_to?: string;

  updated_at_from?: string;
  updated_at_to?: string;

  sort_by?: string;
  sort_order?: string;
}

export interface TargetParameterPayload {
  value: number;
}

export interface TargetParameterResponse extends TargetParameterPayload {
  history?: Record<string, unknown>;
}

export type TargetParametersPayload = Record<string, TargetParameterPayload>;
export type TargetParametersResponse = Record<string, TargetParameterResponse>;

export interface TargetRow {
  id: string;
  tenant_id: string;
  plant_id: string;

  target_name: string;
  component_id: string;
  component_name?: string | null;
  target_period: string;
  parameters: TargetParametersResponse;

  status: string;

  start_date: string;
  end_date: string;

  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  tenant_name?: string | null;
  plant_name?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

export type Option = {
  value: string;
  label: string;
};

export interface CreateTargetInput {
  tenant_id: string;
  plant_id: string;
  target_name: string;
  component_id: string;
  parameters: TargetParametersPayload;
  status: string;
  target_period: string;
  start_date: string;
  end_date: string;
}

export interface UpdateTargetInput extends Partial<CreateTargetInput> {
  id: string;
}


export const TARGET_SORT_OPTIONS: Option[] = [
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
  { value: "name", label: "Target Name" },
  { value: "start_date", label: "Start Date" },
  { value: "end_date", label: "End Date" },
];

export const TARGET_STATUS_OPTIONS: Option[] = [
  { value:"draft", label:"Draft"},
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
];

export const TARGET_PERIOD_OPTIONS: Option[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];


const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDE5ZTVlZWQtMmM0My03ZTczLTg0OWYtZjU1MWU5OWZmOGMxIiwic2Vzc2lvbl9pZCI6IjAxOWVlMzY4LTNmZGItNzQwOS1iNDU5LTUwM2M0ODJhODEyZCIsImlhdCI6MTc4MTkzMTcyMCwiZXhwIjoyNjQ1OTMxNzIwfQ.Uhf_8c5dYDsCCfHtC0HFZY4nsk97hLTeRqP7ZesWlKk";

const api = axios.create({
  baseURL: "http://192.168.2.67:5000/api/v1",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
});


// ── Queries ───────────────────────────────────────────────────────────────────

export const useGetAllTargetsQuery = ({
    search = "",
    filters = {},
    page = 1,
    limit = 50,
    enabled = true,
}: {
    search?: string;
    filters?: TargetListFilters;
    page?: number;
    limit?: number;
    enabled?: boolean;
}) => {
    const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
    const filterKey = JSON.stringify(cleanFilters);

    return useQuery({
        queryKey: ["targets", "list", "all", search, filterKey, page, limit],
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

            const { data } = await api.get(
                targetEndpoints.GET_ALL_TARGETS,
                { params }
            );

            return data;
        },
    });
};

export const useGetTargetDetailsQuery = (
    id: string | null | undefined,
    enabled = true,
) => {
    return useQuery({
        queryKey: ["targets", "list", "all", id],
        enabled: enabled && !!id,
        staleTime: 60_000,

        queryFn: async () => {
            if (!id) {
                throw new Error("Target id is required");
            }

            const { data } = await api.get(
                targetEndpoints.GET_TARGET_BY_ID(id)
            );

            return data;
        },
    });
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateTargetMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateTargetInput) => {
            const cleaned = cleanEmptyStrings(input) as CreateTargetInput;
            const { data } = await api.post(targetEndpoints.CREATE_TARGET, cleaned);
            return data as any;
        },
        onSuccess: (data) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Target created successfully",
            );
            queryClient.invalidateQueries({ queryKey: ["targets", "list", "all"] });
        },
        onError: toastError,
    });
};

export const useUpdateTargetMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...input }: UpdateTargetInput) => {
            const cleaned = cleanEmptyStrings(input) as Partial<UpdateTargetInput>;
            const { data } = await api.put(targetEndpoints.UPDATE_TARGET(id), cleaned);
            return data as any;
        },
        onSuccess: (data, variables) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Target updated successfully");
            queryClient.invalidateQueries({ queryKey: ["targets", "list", "all"] });
            queryClient.invalidateQueries({ queryKey: ["targets", "list", "all", variables.id] });
        },
        onError: toastError,
    });
};

export const useDeleteTargetMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetIds: string[]) => {
            console.log("deleteTarget called with:", targetIds);
            if (!targetIds?.length) {
                throw new Error("No target selected for deletion");
            }

            const { data } = await api.delete(
                targetEndpoints.DELETE_TARGET,
                {
                    data: {
                        ids: targetIds,
                    },
                }
            );

            return data;
        },
        onSuccess: (data) => {
            const msg = (data as any)?.data?.message || (data as any)?.message || "Target(s) deleted successfully";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["targets", "list", "all"] });
        },
        onError: toastError,
    });
};
