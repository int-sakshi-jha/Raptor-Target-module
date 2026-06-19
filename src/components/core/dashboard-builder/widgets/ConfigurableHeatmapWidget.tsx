import { useMemo } from "react";
import { format } from "date-fns";
import { Grid3x3 } from "lucide-react";
import { EquipmentHeatmap } from "@/components/common/EquipmentHeatmap";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { useTagTemplateWidgetData } from "../hooks/useTagTemplateWidgetData";
import { DashboardWidgetShell } from "./shared/DashboardWidgetShell";

export function ConfigurableHeatmapWidget({ plantId, title, config, editMode }: WidgetRenderProps) {
  const componentType = (config.componentType as EquipmentFilterComponentType | undefined) ?? "dc_channel";
  const showHeading = widgetShowHeading(config);
  const { live } = useTagTemplateWidgetData({
    plantId,
    tagTemplateId: config.tagTemplateId,
    tagKeys: config.tagKeys,
    componentType,
  });

  const heatmapRows = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return live.getHeatmapRows({
      endDate: today,
      blockId: "",
      acdbId: "",
      inverterId: "",
    });
  }, [live]);

  const filteredRows = useMemo(() => {
    if (!componentType || componentType === "all") return heatmapRows;
    return heatmapRows.filter(
      (row) => String(row.component_type ?? "").toLowerCase() === componentType,
    );
  }, [componentType, heatmapRows]);

  return (
    <DashboardWidgetShell
      icon={Grid3x3}
      title={title ?? "Equipment Heatmap"}
      showHeading={showHeading}
      description="Performance matrix by component."
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      {filteredRows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center text-xs text-neutral-500 dark:text-neutral-dark-600">
          No heatmap data available for the selected equipment type.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <EquipmentHeatmap data={filteredRows} componentType={componentType} />
        </div>
      )}
    </DashboardWidgetShell>
  );
}
