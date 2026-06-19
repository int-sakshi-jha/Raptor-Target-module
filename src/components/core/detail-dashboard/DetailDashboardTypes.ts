import type { ChartType } from "@/components/core/charts/ChartCard";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";

export type DetailDashboardRow = Record<string, unknown> & {
  id?: string;
  component_id?: string;
  component_code?: string | null;
  component_name?: string | null;
  component_type?: string | null;
  component_type_label?: string | null;
  parent_id?: string | null;
  block_name?: string | null;
  acdb_name?: string | null;
  inverter_name?: string | null;
  status?: string | null;
};

export type DetailDashboardMetricConfig = {
  key: string;
  label: string;
  unit?: string;
  aliases: string[];
};

export type DetailDashboardChartConfig = {
  title?: string;
  description?: string;
  metric?: DetailDashboardMetricConfig;
  allowedChartTypes?: ChartType[];
  defaultChartType?: ChartType;
  xAxisTitle?: string;
  yAxisTitle?: string;
};

export type DetailDashboardHeatmapConfig = {
  title?: string;
  description?: string;
  metric?: DetailDashboardMetricConfig;
  groupBy?: keyof DetailDashboardRow | string;
  secondaryGroupBy?: keyof DetailDashboardRow | string;
};

export type DetailDashboardComponentType = EquipmentFilterComponentType;
