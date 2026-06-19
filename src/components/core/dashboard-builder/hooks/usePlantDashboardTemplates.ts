import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DashboardDocument, DashboardStatus, DashboardSummary } from "../types/document";
import {
  fetchPlantDashboardById,
  isClientGeneratedDashboardId,
  plantDashboardQueryKeys,
  useCreatePlantDashboardMutation,
  useDeletePlantDashboardMutation,
  useDuplicatePlantDashboardMutation,
  useGetActivePlantDashboardQuery,
  useGetPlantDashboardsQuery,
  useSetActivePlantDashboardMutation,
  useUpdatePlantDashboardMutation,
} from "@/services/operations/plantDashboardAPI";

export function usePlantDashboardTemplates(plantId: string | undefined) {
  const queryClient = useQueryClient();

  const listQuery = useGetPlantDashboardsQuery(plantId);
  const activeQuery = useGetActivePlantDashboardQuery(plantId);

  const createMutation = useCreatePlantDashboardMutation();
  const updateMutation = useUpdatePlantDashboardMutation();
  const setActiveMutation = useSetActivePlantDashboardMutation();
  const duplicateMutation = useDuplicatePlantDashboardMutation();
  const deleteMutation = useDeletePlantDashboardMutation();

  const templates = listQuery.data ?? [];
  const activeDocument = activeQuery.data ?? null;

  const activeTemplateId = useMemo(
    () => templates.find((template) => template.isActive)?.id ?? null,
    [templates],
  );

  const isLoading = listQuery.isLoading || activeQuery.isLoading;

  const refresh = useCallback(async () => {
    if (!plantId) return;
    await queryClient.invalidateQueries({ queryKey: plantDashboardQueryKeys.plant(plantId) });
  }, [plantId, queryClient]);

  const getTemplate = useCallback(
    async (dashboardId: string): Promise<DashboardDocument | null> => {
      if (!plantId) return null;

      if (activeDocument?.id === dashboardId) {
        return activeDocument;
      }

      const cached = queryClient.getQueryData<DashboardDocument>(
        plantDashboardQueryKeys.detail(plantId, dashboardId),
      );
      if (cached) return cached;

      const document = await fetchPlantDashboardById(plantId, dashboardId);
      if (document) {
        queryClient.setQueryData(
          plantDashboardQueryKeys.detail(plantId, dashboardId),
          document,
        );
      }
      return document;
    },
    [activeDocument, plantId, queryClient],
  );

  const setActive = useCallback(
    async (dashboardId: string | null) => {
      if (!plantId) return;
      await setActiveMutation.mutateAsync({ plantId, dashboardId });
    },
    [plantId, setActiveMutation],
  );

  const applyTemplate = useCallback(
    async (template: DashboardSummary) => {
      if (!plantId) return;

      if (template.status === "draft") {
        await updateMutation.mutateAsync({
          plantId,
          dashboardId: template.id,
          status: "published",
          setActive: true,
        });
      } else {
        await setActiveMutation.mutateAsync({ plantId, dashboardId: template.id });
      }
    },
    [plantId, setActiveMutation, updateMutation],
  );

  const saveTemplate = useCallback(
    async (
      document: DashboardDocument,
      options?: { setActive?: boolean; status?: DashboardStatus },
    ) => {
      if (!plantId) throw new Error("Plant id is required");

      const status = options?.status ?? document.meta.status ?? "draft";
      const isNew = isClientGeneratedDashboardId(document.id);

      if (isNew) {
        return createMutation.mutateAsync({
          plantId,
          name: document.name,
          status,
          widgets: document.widgets,
          setActive: options?.setActive,
        });
      }

      return updateMutation.mutateAsync({
        plantId,
        dashboardId: document.id,
        name: document.name,
        status,
        version: document.meta.version,
        widgets: document.widgets,
        setActive: options?.setActive,
      });
    },
    [createMutation, plantId, updateMutation],
  );

  const duplicateTemplate = useCallback(
    async (dashboardId: string, newName: string, status: DashboardStatus = "draft") => {
      if (!plantId) throw new Error("Plant id is required");

      return duplicateMutation.mutateAsync({
        plantId,
        dashboardId,
        name: newName,
        status,
      });
    },
    [duplicateMutation, plantId],
  );

  const removeTemplate = useCallback(
    async (dashboardId: string) => {
      if (!plantId) return;
      await deleteMutation.mutateAsync({ plantId, dashboardId });
    },
    [deleteMutation, plantId],
  );

  return {
    templates: templates as DashboardSummary[],
    activeDocument,
    activeTemplateId,
    isLoading,
    refresh,
    getTemplate,
    setActive,
    applyTemplate,
    saveTemplate,
    duplicateTemplate,
    removeTemplate,
  };
}
