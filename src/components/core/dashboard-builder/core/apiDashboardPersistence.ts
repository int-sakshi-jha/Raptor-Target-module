
import type { DashboardPersistenceAdapter } from "./persistence";
import {
  createPlantDashboard,
  deletePlantDashboard,
  duplicatePlantDashboard,
  fetchActivePlantDashboard,
  fetchPlantDashboardById,
  fetchPlantDashboardList,
  isClientGeneratedDashboardId,
  setActivePlantDashboard,
  updatePlantDashboard,
} from "@/services/operations/plantDashboardAPI";

export function createApiDashboardPersistence(): DashboardPersistenceAdapter {
  return {
    list: async (plantId) => fetchPlantDashboardList(plantId),

    get: async (plantId, dashboardId) => fetchPlantDashboardById(plantId, dashboardId),

    getActive: async (plantId) => fetchActivePlantDashboard(plantId),

    setActive: async (plantId, dashboardId) => {
      await setActivePlantDashboard({ plantId, dashboardId });
    },

    save: async (document, options) => {
      const status = document.meta.status ?? "draft";
      const isNew = isClientGeneratedDashboardId(document.id);

      if (isNew) {
        return createPlantDashboard({
          plantId: document.plantId,
          name: document.name,
          status,
          widgets: document.widgets,
          setActive: options?.setActive,
        });
      }

      return updatePlantDashboard({
        plantId: document.plantId,
        dashboardId: document.id,
        name: document.name,
        status,
        version: document.meta.version,
        widgets: document.widgets,
        setActive: options?.setActive,
      });
    },

    duplicate: async ({ source, newName, status = "draft" }) => {
      return duplicatePlantDashboard({
        plantId: source.plantId,
        dashboardId: source.id,
        name: newName,
        status,
      });
    },

    remove: async (plantId, dashboardId) => {
      await deletePlantDashboard({ plantId, dashboardId });
    },
  };
}
