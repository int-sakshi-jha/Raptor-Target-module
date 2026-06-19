import { useCallback, useMemo } from "react";
import {
  useGetPlantComponentsQuery,
  useGetPlantDetailsQuery,
  type PlantComponentRow,
  type PlantRow,
} from "@/services/operations/plantAPI";
import type { Option } from "@/components/common/AsyncSelect";
import type { WithChildren } from "@/utils/flatToTree";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";
import {
  buildPlantComponentIndex,
  findPlantComponents,
  getPlantComponentChildren,
  getPlantComponentDescendants,
  plantComponentsToOptions,
  type PlantComponentFilter,
  type PlantComponentIndex,
} from "@/lib/plant/plantComponentIndex";

export type { PlantComponentFilter, PlantComponentIndex };
export { findPlantComponentAncestor } from "@/lib/plant/plantComponentIndex";

export interface UsePlantComponentsParams {
  plantId: string | null | undefined;
  enabled?: boolean;
  fullDetails?: boolean;
  /** When true, components load only after plant details succeed (slower; prefer false). */
  waitForPlantDetails?: boolean;
}

export interface UsePlantComponentsResult {
  plantId: string | null;
  plant: PlantRow | null;
  isPlantLoading: boolean;
  isComponentsLoading: boolean;
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
  error: unknown;
  components: PlantComponentRow[];
  componentById: ReadonlyMap<string, PlantComponentRow>;
  componentsByType: ReadonlyMap<string, readonly PlantComponentRow[]>;
  childrenByParentId: ReadonlyMap<string, readonly PlantComponentRow[]>;
  componentTypes: readonly string[];
  availableEquipmentComponentTypes: readonly EquipmentFilterComponentType[];
  rootComponents: readonly PlantComponentRow[];
  componentTree: readonly WithChildren<PlantComponentRow>[];
  index: PlantComponentIndex;
  getById: (componentId: string) => PlantComponentRow | undefined;
  getByType: (componentType: string) => readonly PlantComponentRow[];
  getChildren: (parentId: string) => readonly PlantComponentRow[];
  getDescendants: (parentId: string) => PlantComponentRow[];
  findComponents: (filter?: PlantComponentFilter) => PlantComponentRow[];
  getComponentOptions: (filter?: PlantComponentFilter) => Option[];
}

export function usePlantComponents(
  params: UsePlantComponentsParams,
): UsePlantComponentsResult {
  const {
    plantId,
    enabled = true,
    fullDetails = true,
    waitForPlantDetails = false,
  } = params;

  const resolvedPlantId = plantId ?? null;
  const queryEnabled = enabled && Boolean(resolvedPlantId);

  const plantDetailsQuery = useGetPlantDetailsQuery(resolvedPlantId ?? undefined);
  const plantRecord = (plantDetailsQuery.data?.data ?? null) as PlantRow | null;

  const componentsEnabled =
    queryEnabled &&
    (!waitForPlantDetails || plantDetailsQuery.isSuccess);

  const componentsQuery = useGetPlantComponentsQuery(resolvedPlantId, {
    enabled: componentsEnabled,
    fullDetails,
  });

  const index = useMemo(
    () => buildPlantComponentIndex(componentsQuery.data ?? []),
    [componentsQuery.data],
  );

  const getById = useCallback(
    (componentId: string) => index.componentById.get(componentId),
    [index],
  );

  const getByType = useCallback(
    (componentType: string) =>
      index.componentsByType.get(normalizeComponentType(componentType)) ?? [],
    [index],
  );

  const getChildren = useCallback(
    (parentId: string) => getPlantComponentChildren(index, parentId),
    [index],
  );

  const getDescendants = useCallback(
    (parentId: string) => getPlantComponentDescendants(index, parentId),
    [index],
  );

  const findComponents = useCallback(
    (filter: PlantComponentFilter = {}) => findPlantComponents(index, filter),
    [index],
  );

  const getComponentOptions = useCallback(
    (filter: PlantComponentFilter = {}) =>
      plantComponentsToOptions(findPlantComponents(index, filter)),
    [index],
  );

  const isPlantLoading = queryEnabled && plantDetailsQuery.isLoading;
  const isComponentsLoading = componentsEnabled && componentsQuery.isLoading;
  const isLoading = isPlantLoading || isComponentsLoading;
  const isReady =
    queryEnabled &&
    plantDetailsQuery.isSuccess &&
    componentsQuery.isSuccess;
  const isError = plantDetailsQuery.isError || componentsQuery.isError;
  const error = plantDetailsQuery.error ?? componentsQuery.error ?? null;

  return {
    plantId: resolvedPlantId,
    plant: plantRecord,
    isPlantLoading,
    isComponentsLoading,
    isLoading,
    isReady,
    isError,
    error,
    components: index.components,
    componentById: index.componentById,
    componentsByType: index.componentsByType,
    childrenByParentId: index.childrenByParentId,
    componentTypes: index.componentTypes,
    availableEquipmentComponentTypes: index.availableEquipmentComponentTypes,
    rootComponents: index.rootComponents,
    componentTree: index.componentTree,
    index,
    getById,
    getByType,
    getChildren,
    getDescendants,
    findComponents,
    getComponentOptions,
  };
}
