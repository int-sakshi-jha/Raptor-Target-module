import { useMemo } from "react";
import { Gauge } from "lucide-react";
import GaugeChart from "@/components/core/charts/GaugeChart";
import { buildPlantPerformanceSummary } from "@/components/core/plant-dashboard/shared/plantPerformanceMetrics";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import { buildTagGroupGaugeValue } from "../core/tagGroupRuntime";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { useTagTemplateWidgetData } from "../hooks/useTagTemplateWidgetData";
import { DashboardWidgetShell } from "./shared/DashboardWidgetShell";

export function ConfigurableGaugeWidget({ plantId, title, config, editMode }: WidgetRenderProps) {
  const showHeading = widgetShowHeading(config);
  const { live, tagConfig, resolvedTagKeys, hasTagTemplate, isTagTemplateLoading } =
    useTagTemplateWidgetData({
      plantId,
      tagTemplateId: config.tagTemplateId,
      tagKeys: config.tagKey,
    });
  const plantComponents = usePlantComponents({ plantId });

  const gauge = useMemo(() => {
    const label = String(config.label ?? title ?? "Gauge");
    const min = typeof config.min === "number" ? config.min : 0;
    const max = typeof config.max === "number" ? config.max : 100;
    const suffix = String(config.unit ?? "%");

    if (hasTagTemplate && tagConfig.length > 0) {
      const tagKey = String(
        config.tagKey ?? resolvedTagKeys[0] ?? tagConfig[0]?.tag_ids?.[0] ?? "",
      );
      const value = buildTagGroupGaugeValue({
        tagConfig,
        tagKey,
        processedByComponentId: live.processedByComponentId,
      });
      return { label, min, max, suffix, value };
    }

    const summary = buildPlantPerformanceSummary({
      plant: plantComponents.plant,
      plantLive: live.plantLive,
      processedByComponentId: live.processedByComponentId,
      componentById: live.componentById,
    });

    return {
      label,
      min: 0,
      max: 100,
      suffix: "%",
      value: summary.performanceRatio,
    };
  }, [
    config.label,
    config.max,
    config.min,
    config.tagKey,
    config.unit,
    hasTagTemplate,
    live.componentById,
    live.plantLive,
    live.processedByComponentId,
    plantComponents.plant,
    resolvedTagKeys,
    tagConfig,
    title,
  ]);

  return (
    <DashboardWidgetShell
      icon={Gauge}
      title={gauge.label}
      showHeading={showHeading}
      description={
        hasTagTemplate ? "Average live value from tag template." : "Plant performance ratio."
      }
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      {isTagTemplateLoading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-500">
          Loading…
        </div>
      ) : gauge.value == null ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-500">
          No gauge data available.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <GaugeChart
            min={gauge.min}
            max={gauge.max}
            series={[
              {
                name: gauge.label,
                value: gauge.value,
                valueSuffix: gauge.suffix,
              },
            ]}
            height="100%"
            arcStyle="half"
          />
        </div>
      )}
    </DashboardWidgetShell>
  );
}
