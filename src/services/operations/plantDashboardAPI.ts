import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { plantDashboardEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import type {
  DashboardDocument,
  DashboardStatus,
  DashboardSummary,
  DashboardWidgetInstance,
} from "@/components/core/dashboard-builder/types/document";

type ApiEnvelope<T> = {
  success: boolean;
  code: number;
  data?: T;
  message?: string;
};

type ApiDocument = {
  schemaVersion: 1;
  id: string;
  plantId: string;
  name: string;
  meta: {
    status: DashboardStatus;
    kind: "custom" | "system";
    isShared: boolean;
    version: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdBy?: string | null;
  };
  widgets: Record<string, DashboardWidgetInstance>;
};

type ApiSummary = {
  id: string;
  plantId: string;
  name: string;
  status: DashboardStatus;
  kind: "custom" | "system";
  isActive: boolean;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type GetPlantDashboardsResponse = ApiEnvelope<{ data?: ApiSummary[] }>;
type GetPlantDashboardResponse = ApiEnvelope<ApiDocument | null>;
type PlantDashboardWriteResponse = ApiEnvelope<ApiDocument>;

export interface CreatePlantDashboardInput {
  plantId: string;
  name: string;
  status: DashboardStatus;
  widgets: Record<string, DashboardWidgetInstance>;
  setActive?: boolean;
}

export interface UpdatePlantDashboardInput {
  plantId: string;
  dashboardId: string;
  name?: string;
  status?: DashboardStatus;
  version?: number;
  widgets?: Record<string, DashboardWidgetInstance>;
  setActive?: boolean;
}

export interface DuplicatePlantDashboardInput {
  plantId: string;
  dashboardId: string;
  name: string;
  status?: DashboardStatus;
}

export interface SetActivePlantDashboardInput {
  plantId: string;
  dashboardId: string | null;
}

export interface DeletePlantDashboardInput {
  plantId: string;
  dashboardId: string;
}

export const plantDashboardQueryKeys = {
  all: ["plantDashboard"] as const,
  plant: (plantId: string) => [...plantDashboardQueryKeys.all, plantId] as const,
  list: (plantId: string) => [...plantDashboardQueryKeys.plant(plantId), "list"] as const,
  active: (plantId: string) => [...plantDashboardQueryKeys.plant(plantId), "active"] as const,
  detail: (plantId: string, dashboardId: string) =>
    [...plantDashboardQueryKeys.plant(plantId), "detail", dashboardId] as const,
};

export function isClientGeneratedDashboardId(id: string): boolean {
  return id.startsWith("dashboard-");
}

function normalizeDocument(raw: ApiDocument): DashboardDocument {
  return {
    schemaVersion: 1,
    id: raw.id,
    plantId: raw.plantId,
    name: raw.name,
    meta: {
      status: raw.meta.status,
      kind: raw.meta.kind,
      isShared: raw.meta.isShared,
      version: raw.meta.version,
      createdAt: raw.meta.createdAt ?? undefined,
      updatedAt: raw.meta.updatedAt ?? undefined,
      createdBy: raw.meta.createdBy ?? undefined,
    },
    widgets: raw.widgets ?? {},
  };
}

function normalizeSummary(raw: ApiSummary): DashboardSummary {
  return {
    id: raw.id,
    plantId: raw.plantId,
    name: raw.name,
    status: raw.status,
    kind: raw.kind,
    isActive: raw.isActive,
    updatedAt: raw.updatedAt ?? undefined,
    createdAt: raw.createdAt ?? undefined,
  };
}

function invalidatePlantDashboardQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  plantId: string,
  dashboardId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: plantDashboardQueryKeys.plant(plantId) });
  if (dashboardId) {
    void queryClient.invalidateQueries({
      queryKey: plantDashboardQueryKeys.detail(plantId, dashboardId),
    });
  }
}

export async function fetchPlantDashboardList(plantId: string): Promise<DashboardSummary[]> {
  const { data } = await api.get<GetPlantDashboardsResponse>(
    plantDashboardEndpoints.GET_ALL(plantId),
  );
  const rows = data?.data?.data ?? [];
  return rows.map(normalizeSummary);
}

export async function fetchActivePlantDashboard(
  plantId: string,
): Promise<DashboardDocument | null> {
  const response = await api.get<GetPlantDashboardResponse>(
    plantDashboardEndpoints.GET_ACTIVE(plantId),
  );
  if (response.status === 204 || !response.data?.data) return null;
  return normalizeDocument(response.data.data);
}

export async function fetchPlantDashboardById(
  plantId: string,
  dashboardId: string,
): Promise<DashboardDocument | null> {
  const { data } = await api.get<GetPlantDashboardResponse>(
    plantDashboardEndpoints.GET_BY_ID(plantId, dashboardId),
  );
  if (!data?.data) return null;
  return normalizeDocument(data.data);
}

export async function createPlantDashboard(
  input: CreatePlantDashboardInput,
): Promise<DashboardDocument> {
  const { data } = await api.post<PlantDashboardWriteResponse>(
    plantDashboardEndpoints.CREATE(input.plantId),
    {
      name: input.name,
      status: input.status,
      setActive: input.setActive ?? false,
      document: { widgets: input.widgets },
    },
  );
  if (!data?.data) throw new Error("Invalid create dashboard response");
  return normalizeDocument(data.data);
}

export async function updatePlantDashboard(
  input: UpdatePlantDashboardInput,
): Promise<DashboardDocument> {
  const { data } = await api.put<PlantDashboardWriteResponse>(
    plantDashboardEndpoints.UPDATE(input.plantId, input.dashboardId),
    {
      name: input.name,
      status: input.status,
      version: input.version,
      setActive: input.setActive,
      document: input.widgets ? { widgets: input.widgets } : undefined,
    },
  );
  if (!data?.data) throw new Error("Invalid update dashboard response");
  return normalizeDocument(data.data);
}

export async function setActivePlantDashboard(
  input: SetActivePlantDashboardInput,
): Promise<void> {
  await api.put(plantDashboardEndpoints.SET_ACTIVE(input.plantId), {
    dashboardId: input.dashboardId,
  });
}

export async function duplicatePlantDashboard(
  input: DuplicatePlantDashboardInput,
): Promise<DashboardDocument> {
  const { data } = await api.post<PlantDashboardWriteResponse>(
    plantDashboardEndpoints.DUPLICATE(input.plantId, input.dashboardId),
    {
      name: input.name,
      status: input.status ?? "draft",
    },
  );
  if (!data?.data) throw new Error("Invalid duplicate dashboard response");
  return normalizeDocument(data.data);
}

export async function deletePlantDashboard(input: DeletePlantDashboardInput): Promise<void> {
  await api.delete(plantDashboardEndpoints.DELETE(input.plantId, input.dashboardId));
}

export const useGetPlantDashboardsQuery = (
  plantId: string | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: plantDashboardQueryKeys.list(plantId ?? ""),
    enabled: (options?.enabled ?? true) && Boolean(plantId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!plantId) throw new Error("Plant id is required");
      return fetchPlantDashboardList(plantId);
    },
  });

export const useGetActivePlantDashboardQuery = (
  plantId: string | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: plantDashboardQueryKeys.active(plantId ?? ""),
    enabled: (options?.enabled ?? true) && Boolean(plantId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!plantId) throw new Error("Plant id is required");
      return fetchActivePlantDashboard(plantId);
    },
  });

export const useGetPlantDashboardByIdQuery = (
  plantId: string | null | undefined,
  dashboardId: string | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: plantDashboardQueryKeys.detail(plantId ?? "", dashboardId ?? ""),
    enabled: (options?.enabled ?? true) && Boolean(plantId && dashboardId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!plantId || !dashboardId) throw new Error("Plant id and dashboard id are required");
      const document = await fetchPlantDashboardById(plantId, dashboardId);
      if (!document) throw new Error("Dashboard template not found");
      return document;
    },
  });

export const useCreatePlantDashboardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlantDashboard,
    onSuccess: (_data, variables) => {
      invalidatePlantDashboardQueries(queryClient, variables.plantId);
    },
    onError: toastError,
  });
};

export const useUpdatePlantDashboardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlantDashboard,
    onSuccess: (_data, variables) => {
      invalidatePlantDashboardQueries(queryClient, variables.plantId, variables.dashboardId);
    },
    onError: toastError,
  });
};

export const useSetActivePlantDashboardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setActivePlantDashboard,
    onSuccess: (_data, variables) => {
      invalidatePlantDashboardQueries(queryClient, variables.plantId);
    },
    onError: toastError,
  });
};

export const useDuplicatePlantDashboardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicatePlantDashboard,
    onSuccess: (_data, variables) => {
      invalidatePlantDashboardQueries(queryClient, variables.plantId);
    },
    onError: toastError,
  });
};

export const useDeletePlantDashboardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlantDashboard,
    onSuccess: (_data, variables) => {
      invalidatePlantDashboardQueries(queryClient, variables.plantId, variables.dashboardId);
    },
    onError: toastError,
  });
};
