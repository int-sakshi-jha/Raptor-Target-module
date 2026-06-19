import { createElement, type ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/common/Breadcrumb";
import type { NavItem } from "@/components/core/navbar/navItems";

export type BreadcrumbExtension = {
  /** Replaces auto-built trail (plant layout, user layout, etc.). */
  override?: BreadcrumbItem[] | null;
  /** Entity title on detail routes (tenant name, device name, …). */
  detailLabel?: string | null;
  /** Optional tab/section label (Overview, Settings, …). */
  segmentLabel?: string | null;
};

const navIcon = (Icon: NavItem["icon"]): ReactNode =>
  createElement(Icon, { className: "w-4 h-4" });

/** Longest nav path that matches the current pathname (list or nested detail). */
export function findNavParent(pathname: string, navItems: NavItem[]): NavItem | null {
  let best: NavItem | null = null;

  for (const item of navItems) {
    if (!item.path) continue;
    const onList = pathname === item.path;
    const onNested = pathname.startsWith(`${item.path}/`);
    if (!onList && !onNested) continue;
    if (!best || item.path.length > best.path.length) {
      best = item;
    }
  }

  return best;
}

function defaultNavTrail(pathname: string, allItems: NavItem[]): BreadcrumbItem[] {
  for (const item of allItems) {
    if (!item.path || !pathname.startsWith(item.path)) continue;

    if (item.children) {
      const child = item.children.find((c) => pathname.startsWith(c.path));
      if (child) {
        return [
          { label: item.name },
          { label: child.name, icon: navIcon(child.icon) },
        ];
      }
    }

    return [{ label: item.name, icon: navIcon(item.icon) }];
  }

  const segment = pathname.split("/").filter(Boolean).pop() || "Dashboard";
  return [
    {
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
    },
  ];
}

export function buildBreadcrumbs(
  pathname: string,
  navItems: NavItem[],
  extension: BreadcrumbExtension = {},
): BreadcrumbItem[] {
  if (extension.override && extension.override.length > 0) {
    return extension.override;
  }

  const allItems = navItems;
  const parent = findNavParent(pathname, allItems);
  const onDetailRoute = parent?.path && pathname !== parent.path;

  if (onDetailRoute && parent) {
    const items: BreadcrumbItem[] = [
      {
        label: parent.name,
        path: parent.path,
        icon: navIcon(parent.icon),
      },
    ];

    if (extension.detailLabel) {
      items.push({ label: extension.detailLabel });
    }

    if (extension.segmentLabel) {
      items.push({ label: extension.segmentLabel });
    }

    return items;
  }

  return defaultNavTrail(pathname, allItems);
}
