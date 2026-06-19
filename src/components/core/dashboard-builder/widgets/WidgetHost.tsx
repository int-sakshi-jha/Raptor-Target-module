import type { WidgetLibraryType } from "../types/document";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import { DashboardWidgetPreview } from "./DashboardWidgetPreview";
import { PlantWidgetBridge } from "./PlantWidgetBridge";
import { ConfigurableChartWidget } from "./ConfigurableChartWidget";
import { ConfigurableDataTableWidget } from "./ConfigurableDataTableWidget";
import { ConfigurableGaugeWidget } from "./ConfigurableGaugeWidget";
import { ConfigurableHeatmapWidget } from "./ConfigurableHeatmapWidget";
import { GenericKpiWidget, GenericMultiKpiWidget } from "./GenericWidgets";

const PLANT_WIDGET_TYPES = new Set<WidgetLibraryType>([
  "plant_stats",
  "power_meter",
  "generation_graph",
  "earnings_breakdown",
  "performance_indicator",
  "non_availability",
  "low_performing_components",
  "devices_overview",
  "all_time_stats",
  "weather_forecast",
  "alarm_panel",
  "equipment_status",
  "weather_panel",
  "energy_flow",
  "plant_sld",
  "dc_channel_heatmap",
  "inverter_overview",
  "meter_analytics",
  "generation_analytics",
]);

/** Non-plant heavy widgets use a static preview in edit mode (avoids table remount issues). */
const EDIT_PREVIEW_TYPES = new Set<WidgetLibraryType>(["data_table", "heatmap"]);

interface WidgetHostProps extends WidgetRenderProps {
  type: WidgetLibraryType;
}

function renderWidget(props: WidgetHostProps) {
  const { type, plantId, title, config, editMode } = props;

  if (PLANT_WIDGET_TYPES.has(type)) {
    return (
      <PlantWidgetBridge
        type={type}
        plantId={plantId}
        title={title}
        config={config}
        editMode={editMode}
      />
    );
  }

  if (type === "line_chart" || type === "area_chart" || type === "bar_chart") {
    return (
      <ConfigurableChartWidget
        chartType={type}
        plantId={plantId}
        title={title}
        config={config}
        editMode={editMode}
      />
    );
  }

  if (type === "gauge") {
    return (
      <ConfigurableGaugeWidget
        plantId={plantId}
        title={title}
        config={config}
        editMode={editMode}
      />
    );
  }

  if (type === "heatmap") {
    return (
      <ConfigurableHeatmapWidget
        plantId={plantId}
        title={title}
        config={config}
        editMode={editMode}
      />
    );
  }

  if (type === "data_table") {
    return (
      <ConfigurableDataTableWidget
        plantId={plantId}
        title={title}
        config={config}
        editMode={editMode}
      />
    );
  }

  if (type === "kpi_card") {
    return <GenericKpiWidget plantId={plantId} title={title} config={config} editMode={editMode} />;
  }

  if (type === "multi_kpi_card") {
    return (
      <GenericMultiKpiWidget plantId={plantId} title={title} config={config} editMode={editMode} />
    );
  }

  return null;
}

export function WidgetHost(props: WidgetHostProps) {
  const { type, plantId, title, config, editMode } = props;

  if (editMode && EDIT_PREVIEW_TYPES.has(type)) {
    return <DashboardWidgetPreview type={type} title={title} config={config} />;
  }

  if (editMode && PLANT_WIDGET_TYPES.has(type)) {
    return (
      <div className="dashboard-widget-content pointer-events-none relative h-full overflow-hidden select-none">
        {renderWidget(props)}
      </div>
    );
  }

  return renderWidget({ type, plantId, title, config, editMode });
}
