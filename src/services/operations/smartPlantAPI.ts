/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "../api";
import { smartPlantEndpoints } from "../endpoints";

export type SmartPlantCreatePayload = {
  data: Record<string, unknown>[];
};

export async function submitSmartPlantCreate(
  plantId: string,
  payload: SmartPlantCreatePayload,
): Promise<{ created_count: number; root_component_id?: string }> {
  const { data } = await api.post(smartPlantEndpoints.CREATE(plantId), payload);
  const res = data as {
    data?: {
      created_count?: number;
      root_component?: { id?: string };
    };
  };

  return {
    created_count: res?.data?.created_count ?? 0,
    root_component_id: res?.data?.root_component?.id,
  };
}
