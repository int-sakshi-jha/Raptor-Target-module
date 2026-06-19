import type { GridLayoutItem } from "../types/document";
import { GRID_COLS } from "../core/constants";
import type { WidgetDefinition } from "../registry/widgetLibrary";

export type WidgetSizePreset = "compact" | "standard" | "wide" | "full_width" | "tall";

export const WIDGET_SIZE_PRESET_OPTIONS: {
  value: WidgetSizePreset;
  label: string;
  hint: string;
}[] = [
  { value: "compact", label: "Compact", hint: "~½ width" },
  { value: "standard", label: "Standard", hint: "Default" },
  { value: "wide", label: "Wide", hint: "~⅓ wider" },
  { value: "full_width", label: "Full width", hint: "24 cols" },
  { value: "tall", label: "Tall", hint: "~45% taller" },
];

const COLS = GRID_COLS.lg;

export function applyWidgetSizePreset(
  current: GridLayoutItem,
  preset: WidgetSizePreset,
  def?: WidgetDefinition,
): GridLayoutItem {
  const base = def?.defaultSize ?? current;
  const minW = def?.defaultSize.minW ?? 2;
  const minH = def?.defaultSize.minH ?? 2;

  switch (preset) {
    case "compact":
      return {
        ...current,
        w: Math.max(minW, Math.min(COLS, Math.round(base.w * 0.55))),
        h: Math.max(minH, Math.round(base.h * 0.7)),
      };
    case "wide":
      return {
        ...current,
        w: Math.max(minW, Math.min(COLS, Math.round(base.w * 1.35))),
        h: Math.max(minH, current.h),
      };
    case "full_width":
      return { ...current, w: COLS, h: Math.max(minH, current.h) };
    case "tall":
      return {
        ...current,
        w: Math.max(minW, current.w),
        h: Math.max(minH, Math.round(base.h * 1.45)),
      };
    case "standard":
    default:
      return {
        ...current,
        w: Math.max(minW, Math.min(COLS, base.w)),
        h: Math.max(minH, base.h),
      };
  }
}

export function inferWidgetSizePreset(
  current: GridLayoutItem,
  def?: WidgetDefinition,
): WidgetSizePreset {
  const base = def?.defaultSize;
  if (!base) return "standard";
  if (current.w >= COLS - 1) return "full_width";
  if (current.h >= Math.round(base.h * 1.3)) return "tall";
  if (current.w >= Math.round(base.w * 1.2)) return "wide";
  if (current.w <= Math.round(base.w * 0.65) && current.h <= Math.round(base.h * 0.8)) {
    return "compact";
  }
  return "standard";
}

export function clampGridLayoutItem(
  item: GridLayoutItem,
  def?: WidgetDefinition,
): GridLayoutItem {
  const minW = def?.defaultSize.minW ?? item.minW ?? 2;
  const minH = def?.defaultSize.minH ?? item.minH ?? 2;
  const maxW = def?.maxSize?.maxW ?? item.maxW ?? COLS;
  const maxH = def?.maxSize?.maxH ?? item.maxH ?? 24;

  const w = Math.max(minW, Math.min(maxW, Math.round(item.w)));
  const h = Math.max(minH, Math.min(maxH, Math.round(item.h)));
  const x = Math.max(0, Math.min(COLS - w, Math.round(item.x)));
  const y = Math.max(0, Math.round(item.y));

  return { ...item, x, y, w, h, minW, minH, maxW: maxW <= COLS ? maxW : COLS, maxH };
}
