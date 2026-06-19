/**
 * Builds an N-ary tree from a flat list using parent-id references.
 * Generic over item shape — useful for menus, BOMs, plant components, org charts, etc.
 */

export type WithChildren<T extends object> = T & { children: WithChildren<T>[] };

export interface FlatToTreeOptions<T extends object> {
  /** Field that holds the unique row id (e.g. `"id"`). */
  idKey: keyof T;
  /** Field that references the parent row id / null for roots (e.g. `"parent_id"`). */
  parentKey: keyof T;
  /**
   * When true, rows whose parent id does not appear in the list are treated as roots
   * instead of being dropped (default true).
   */
  orphanRoots?: boolean;
  /** Optional comparator applied at every level after children are collected. */
  sortChildren?: (a: WithChildren<T>, b: WithChildren<T>) => number;
}

function defaultIsRoot(parentValue: unknown, knownIds: Set<string>, orphanRoots: boolean): boolean {
  if (parentValue === null || parentValue === undefined || parentValue === "") {
    return true;
  }
  const pid = String(parentValue);
  if (!knownIds.has(pid)) {
    return orphanRoots;
  }
  return false;
}

/**
 * Converts a flat list into a forest (array of roots). Each node is the original row plus `children`.
 * Does not mutate the input rows.
 */
export function flatListToTree<T extends object>(
  items: readonly T[],
  options: FlatToTreeOptions<T>,
): WithChildren<T>[] {
  const { idKey, parentKey, sortChildren, orphanRoots = true } = options;
  const knownIds = new Set(items.map((row) => String(row[idKey])));

  const idToNode = new Map<string, WithChildren<T>>();
  for (const row of items) {
    idToNode.set(String(row[idKey]), { ...row, children: [] });
  }

  const roots: WithChildren<T>[] = [];

  for (const row of items) {
    const node = idToNode.get(String(row[idKey]));
    if (!node) continue;

    const parentVal = row[parentKey];
    const isRoot = defaultIsRoot(parentVal, knownIds, orphanRoots);

    if (isRoot) {
      roots.push(node);
      continue;
    }

    const parentId = String(parentVal);
    const parentNode = idToNode.get(parentId);
    if (parentNode) {
      parentNode.children.push(node);
    } else if (orphanRoots) {
      roots.push(node);
    }
  }

  if (sortChildren) {
    const walk = (nodes: WithChildren<T>[]) => {
      nodes.sort(sortChildren);
      for (const n of nodes) {
        if (n.children.length) walk(n.children);
      }
    };
    walk(roots);
  }

  return roots;
}
