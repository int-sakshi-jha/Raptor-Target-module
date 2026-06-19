import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { Option } from "@/components/common/AsyncSelect";
import {
  normalizeComponentHierarchy,
  normalizeComponentType,
} from "@/pages/plant/plant-components/shared";
import { flatListToTree, type WithChildren } from "@/utils/flatToTree";
import {
  resolveEquipmentViewFromCode,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";

const EMPTY_COMPONENTS: readonly PlantComponentRow[] = [];

export interface PlantComponentFilter {
  componentType?: string;
  parentId?: string;
  search?: string;
}

export interface PlantComponentIndex {
  components: PlantComponentRow[];
  componentById: ReadonlyMap<string, PlantComponentRow>;
  componentsByType: ReadonlyMap<string, readonly PlantComponentRow[]>;
  childrenByParentId: ReadonlyMap<string, readonly PlantComponentRow[]>;
  componentTypes: readonly string[];
  rootComponents: readonly PlantComponentRow[];
  componentTree: readonly WithChildren<PlantComponentRow>[];
  availableEquipmentComponentTypes: readonly EquipmentFilterComponentType[];
}

function compareComponents(a: PlantComponentRow, b: PlantComponentRow): number {
  const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;

  const typeA = normalizeComponentType(a.component_type);
  const typeB = normalizeComponentType(b.component_type);
  if (typeA !== typeB) return typeA.localeCompare(typeB);

  return String(a.component_name ?? "").localeCompare(String(b.component_name ?? ""));
}

function matchesComponentFilter(args: {
  component: PlantComponentRow;
  componentType?: string;
  parentId?: string;
  search?: string;
}): boolean {
  const { component, componentType, parentId, search } = args;
  const normalizedType = normalizeComponentType(componentType);
  const normalizedComponentType = normalizeComponentType(component.component_type);
  const query = search?.trim().toLowerCase() ?? "";

  const targetCategory = resolveEquipmentViewFromCode(normalizedType);
  const componentCategory = resolveEquipmentViewFromCode(normalizedComponentType);

  if (targetCategory || componentCategory) {
    if (targetCategory !== componentCategory) {
      return false;
    }
  } else if (normalizedType && normalizedComponentType !== normalizedType) {
    return false;
  }

  if (parentId && component.parent_id !== parentId) {
    return false;
  }

  if (!query) {
    return true;
  }

  const haystack = [
    component.component_name,
    component.component_code,
    component.serial_number,
    component.device_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

/** Single-pass indexes for O(1) lookups; safe for 1k+ components. */
export function buildPlantComponentIndex(
  rawRows: readonly PlantComponentRow[],
): PlantComponentIndex {
  const components =
    rawRows.length === 0 ? [] : normalizeComponentHierarchy([...rawRows]);

  if (components.length === 0) {
    return {
      components: [],
      componentById: new Map(),
      componentsByType: new Map(),
      childrenByParentId: new Map(),
      componentTypes: [],
      rootComponents: EMPTY_COMPONENTS,
      componentTree: [],
      availableEquipmentComponentTypes: [],
    };
  }

  const componentById = new Map<string, PlantComponentRow>();
  const componentsByType = new Map<string, PlantComponentRow[]>();
  const childrenByParentId = new Map<string, PlantComponentRow[]>();
  const equipmentTypes = new Set<EquipmentFilterComponentType>();
  const roots: PlantComponentRow[] = [];

  for (const component of components) {
    componentById.set(component.id, component);

    const type = normalizeComponentType(component.component_type);
    if (type) {
      const bucket = componentsByType.get(type);
      if (bucket) bucket.push(component);
      else componentsByType.set(type, [component]);

      const equipmentType = resolveEquipmentViewFromCode(type);
      if (equipmentType) equipmentTypes.add(equipmentType);
    }

    const parentId = component.parent_id;
    if (!parentId) {
      roots.push(component);
      continue;
    }

    const siblings = childrenByParentId.get(parentId);
    if (siblings) siblings.push(component);
    else childrenByParentId.set(parentId, [component]);
  }

  for (const bucket of componentsByType.values()) {
    bucket.sort(compareComponents);
  }
  for (const bucket of childrenByParentId.values()) {
    bucket.sort(compareComponents);
  }
  roots.sort(compareComponents);

  const componentTree = flatListToTree(components, {
    idKey: "id",
    parentKey: "parent_id",
    orphanRoots: true,
    sortChildren: compareComponents,
  });

  return {
    components,
    componentById,
    componentsByType,
    childrenByParentId,
    componentTypes: Array.from(componentsByType.keys()).sort(),
    rootComponents: roots,
    componentTree,
    availableEquipmentComponentTypes: Array.from(equipmentTypes),
  };
}

export function findPlantComponents(
  index: PlantComponentIndex,
  filter: PlantComponentFilter = {},
): PlantComponentRow[] {
  const { componentType, parentId, search } = filter;
  const normalizedType = normalizeComponentType(componentType);
  const equipmentCategory = resolveEquipmentViewFromCode(normalizedType);
  const hasSearch = Boolean(search?.trim());

  if (!hasSearch && parentId) {
    const children = index.childrenByParentId.get(parentId);
    if (!children?.length) return [];

    if (!componentType) {
      return [...children];
    }

    return children.filter((component) =>
      matchesComponentFilter({ component, componentType, search }),
    );
  }

  if (!hasSearch && !parentId && normalizedType && !equipmentCategory) {
    const typed = index.componentsByType.get(normalizedType);
    return typed ? [...typed] : [];
  }

  if (!hasSearch && !parentId && equipmentCategory) {
    const matches: PlantComponentRow[] = [];
    for (const component of index.components) {
      if (
        resolveEquipmentViewFromCode(
          normalizeComponentType(component.component_type),
        ) === equipmentCategory
      ) {
        matches.push(component);
      }
    }
    return matches;
  }

  return index.components.filter((component) =>
    matchesComponentFilter({ component, componentType, parentId, search }),
  );
}

export function plantComponentsToOptions(components: readonly PlantComponentRow[]): Option[] {
  return components.map((component) => ({
    value: component.id,
    label: component.component_name,
  }));
}

export function getPlantComponentChildren(
  index: PlantComponentIndex,
  parentId: string,
): readonly PlantComponentRow[] {
  return index.childrenByParentId.get(parentId) ?? EMPTY_COMPONENTS;
}

export function getPlantComponentDescendants(
  index: PlantComponentIndex,
  parentId: string,
): PlantComponentRow[] {
  const result: PlantComponentRow[] = [];
  const queue = [...getPlantComponentChildren(index, parentId)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    result.push(current);
    const children = index.childrenByParentId.get(current.id);
    if (children?.length) queue.push(...children);
  }

  return result;
}

export function findPlantComponentAncestor(args: {
  component: PlantComponentRow;
  componentById: ReadonlyMap<string, PlantComponentRow>;
  targetType: string;
}): PlantComponentRow | null {
  const { component, componentById, targetType } = args;
  let current: PlantComponentRow | undefined = component;
  const visited = new Set<string>();
  const normalizedTargetType = normalizeComponentType(targetType);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (normalizeComponentType(current.component_type) === normalizedTargetType) {
      return current;
    }
    current = current.parent_id ? componentById.get(current.parent_id) : undefined;
  }

  return null;
}
