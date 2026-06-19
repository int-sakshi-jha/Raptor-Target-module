/** Shared surface + typography tokens for plant dashboard grid and widgets. */

/* ── Spacing scale (4px base) ── */
export const PLANT_DASHBOARD_GAP_SECTION = "gap-2.5";
export const PLANT_DASHBOARD_GAP_WIDGET = "gap-2";
export const PLANT_DASHBOARD_PADDING_CARD = "p-3";
export const PLANT_DASHBOARD_PADDING_COMPACT = "p-2.5";

/* ── Surface hierarchy ── */
/** Page canvas behind all widgets. */
export const PLANT_DASHBOARD_PAGE_BG =
  "bg-neutral-100/90 dark:bg-neutral-dark-50";

/** Primary widget card shell. */
export const PLANT_DASHBOARD_GRID_CELL =
  "rounded-sm border border-neutral-200/60 bg-gradient-to-br from-white/98 via-white/92 to-neutral-50/80 shadow-card backdrop-blur-sm transition-shadow duration-200 dark:border-neutral-dark-300/50 dark:from-neutral-dark-100 dark:via-neutral-dark-100 dark:to-neutral-dark-50 dark:shadow-dark-card";

/** Elevated inner panel (metric groups, forecast blocks). */
export const PLANT_DASHBOARD_INSET_PANEL =
  "rounded-sm border border-neutral-200/50 bg-neutral-50/60 dark:border-neutral-dark-300/40 dark:bg-neutral-dark-200/35";

/** Data panel that wraps tables — matches ag-grid dark bg (neutral-dark-100). */
export const PLANT_DASHBOARD_TABLE_FRAME =
  "overflow-hidden rounded-sm border border-neutral-200/70 bg-neutral-0 dark:border-neutral-dark-300/45 dark:bg-neutral-dark-100";

/** Toolbar / segmented-control track. */
export const PLANT_DASHBOARD_CONTROL_TRACK =
  "rounded-sm border border-neutral-200/70 bg-neutral-50/90 p-0.5 dark:border-neutral-dark-300/50 dark:bg-neutral-dark-200/50";

/* ── Typography ── */
export const PLANT_DASHBOARD_FIELD_LABEL =
  "text-[10px] font-medium leading-tight tracking-wide text-neutral-500 dark:text-neutral-dark-600";

export const PLANT_DASHBOARD_FIELD_VALUE =
  "text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950";

export const PLANT_DASHBOARD_FIELD_VALUE_PROMINENT =
  "text-sm font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-dark-950";

export const PLANT_DASHBOARD_FIELD_UNIT =
  "text-[9px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500";

export const PLANT_DASHBOARD_SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-600";

export const PLANT_DASHBOARD_SECTION_DIVIDER =
  "border-t border-neutral-200/70 dark:border-neutral-dark-300/45";

export const PLANT_DASHBOARD_EMPTY_STATE =
  "text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-dark-600";

export type PlantDashboardAccent = "brand" | "blue" | "amber" | "red" | "emerald" | "neutral";

export const PLANT_DASHBOARD_ACCENT_BAR: Record<PlantDashboardAccent, string> = {
  brand: "bg-brand-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  emerald: "bg-emerald-500",
  neutral: "bg-neutral-400 dark:bg-neutral-dark-400",
};

/** Individual KPI / stat mini-card inside a widget cell. */
export const PLANT_DASHBOARD_KPI_TILE =
  "group relative overflow-hidden rounded-sm border border-neutral-200/60 bg-gradient-to-br from-white via-white to-neutral-50/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:border-neutral-300/70 hover:shadow-card dark:border-neutral-dark-300/50 dark:from-neutral-dark-100 dark:via-neutral-dark-100 dark:to-neutral-dark-50 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] dark:hover:border-neutral-dark-300/70 dark:hover:shadow-dark-card-md";

export const PLANT_DASHBOARD_TILE_SHELL = PLANT_DASHBOARD_KPI_TILE;

export const PLANT_DASHBOARD_TILE_SHINE =
  "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 to-transparent dark:from-white/[0.05] dark:to-transparent";

/** Active segment in segmented controls. */
export const PLANT_DASHBOARD_SEGMENT_ACTIVE =
  "bg-white text-brand-600 shadow-sm dark:bg-neutral-dark-100 dark:text-brand-400 dark:shadow-[0_1px_4px_rgba(0,0,0,0.35)]";

/** Inactive segment in segmented controls. */
export const PLANT_DASHBOARD_SEGMENT_INACTIVE =
  "text-neutral-500 hover:text-neutral-700 dark:text-neutral-dark-600 dark:hover:text-neutral-dark-800";
