/** DB-ready dashboard document schema (versioned). */

export type DashboardBreakpoint = "xxl" | "xl" | "lg" | "md" | "sm" | "xs";

export interface GridLayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export type WidgetLibraryType =
  | "kpi_card"
  | "multi_kpi_card"
  | "data_table"
  | "line_chart"
  | "area_chart"
  | "bar_chart"
  | "gauge"
  | "heatmap"
  | "alarm_panel"
  | "equipment_status"
  | "weather_panel"
  | "energy_flow"
  | "plant_sld"
  | "dc_channel_heatmap"
  | "inverter_overview"
  | "meter_analytics"
  | "generation_analytics"
  | "plant_stats"
  | "power_meter"
  | "generation_graph"
  | "earnings_breakdown"
  | "performance_indicator"
  | "non_availability"
  | "low_performing_components"
  | "devices_overview"
  | "all_time_stats"
  | "weather_forecast";

export interface DashboardWidgetInstance {
  id: string;
  type: WidgetLibraryType;
  title?: string;
  config: Record<string, unknown>;
  layouts: Partial<Record<DashboardBreakpoint, GridLayoutItem>>;
}

export type DashboardStatus = "draft" | "published";

export type DashboardKind = "custom" | "system";

export interface DashboardDocumentMeta {
  /** @deprecated Prefer per-user active preference via persistence adapter */
  isDefault?: boolean;
  isShared?: boolean;
  status?: DashboardStatus;
  kind?: DashboardKind;
  /** Optimistic-lock version for future DB sync */
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  tags?: string[];
}

export interface DashboardDocument {
  schemaVersion: 1;
  id: string;
  plantId: string;
  name: string;
  meta: DashboardDocumentMeta;
  widgets: Record<string, DashboardWidgetInstance>;
}

export type DashboardDocumentInput = Omit<DashboardDocument, "schemaVersion"> & {
  schemaVersion?: 1;
};

export interface DashboardSummary {
  id: string;
  plantId: string;
  name: string;
  /** @deprecated Use isActive from user preference */
  isDefault?: boolean;
  status?: DashboardStatus;
  kind?: DashboardKind;
  isActive?: boolean;
  updatedAt?: string;
  createdAt?: string;
}
