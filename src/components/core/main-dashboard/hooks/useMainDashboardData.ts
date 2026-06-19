import { useMemo } from "react";
import {
  useGetDashboardPlantsQuery,
  type PlantRow,
} from "@/services/operations/plantAPI";
import { useMainDashboardConfigQuery } from "@/services/operations/mainDashboardAPI";
import { canGetAllPlants, canGetMyPlants } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";
import { DashboardDataTransformer } from "../mqtt/DashboardDataTransformer";
import type { KpiAggregateMetrics, PlantDashboardMetrics } from "../types/dashboard.types";
import { useMainDashboardMqtt } from "./useMainDashboardMqtt";

export interface MainDashboardDataResult {
  plants: PlantRow[];
  plantMetrics: PlantDashboardMetrics[];
  kpis: KpiAggregateMetrics;
  isLoading: boolean;
  isError: boolean;
  isLive: boolean;
  connectionState: string;
}

export function useMainDashboardData(): MainDashboardDataResult {
  const permissions = useAppSelector((state) => state.auth.permissions);
  const canAll = canGetAllPlants(permissions);
  const canMy = canGetMyPlants(permissions);

  const configQuery = useMainDashboardConfigQuery(true);
  const plantsQuery = useGetDashboardPlantsQuery({
    scope: canAll ? "all" : "my",
    enabled: canAll || canMy,
  });

  const plants: PlantRow[] = plantsQuery.data ?? [];
  const plantIds = useMemo(() => plants.map((p: PlantRow) => p.id), [plants]);

  const mqtt = useMainDashboardMqtt(plantIds);

  const transformer = useMemo(
    () => new DashboardDataTransformer(configQuery.data?.topicConfig ?? []),
    [configQuery.data?.topicConfig],
  );

  const plantMetrics = useMemo(
    () =>
      plants.map((plant: PlantRow) =>
        transformer.transformPlant(plant, mqtt.mqttByPlant.get(plant.id) ?? null),
      ),
    [plants, transformer, mqtt.mqttByPlant],
  );

  const kpis = useMemo(
    () => transformer.aggregateKpis(plantMetrics, mqtt.mqttByPlant, plants),
    [transformer, plantMetrics, mqtt.mqttByPlant, plants],
  );

  return {
    plants,
    plantMetrics,
    kpis,
    isLoading: plantsQuery.isLoading,
    isError: plantsQuery.isError,
    isLive: mqtt.isConnected && mqtt.mqttByPlant.size > 0,
    connectionState: mqtt.connectionState,
  };
}
