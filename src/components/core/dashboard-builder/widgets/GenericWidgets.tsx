import { Gauge, LayoutGrid } from "lucide-react";
import { useMemo } from "react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPlantStatsSummary } from "@/components/core/plant-dashboard/plant-stats/plantStats";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import {
  formatWidgetValue,
  resolveLiveTagValue,
} from "../core/tagGroupRuntime";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { useTagTemplateWidgetData } from "../hooks/useTagTemplateWidgetData";
import { PLANT_METRIC_OPTIONS } from "../builder/widgetConfigFields";
import { DashboardWidgetShell } from "./shared/DashboardWidgetShell";

function formatKpiValue(raw: number | null | string | undefined): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(raw);
  }
  return String(raw ?? "-");
}

const PLANT_METRIC_ALIASES: Record<string, keyof ReturnType<typeof buildPlantStatsSummary>> = {
  dailyYield: "dailyYield",
  todayGenerationKwh: "todayGenerationKwh",
  performanceRatio: "performanceRatio",
  liveAlarms: "liveAlarms",
  highImpactAlarms: "highImpactAlarms",
  mostUnavailableComponent: "mostUnavailableComponent",
  plantUptime: "plantUptime",
  treesPlanted: "treesPlanted",
  coalSavedTon: "coalSavedTon",
  co2SavedTon: "co2SavedTon",
};

function usePlantKpiValueMap(plantId?: string) {
  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });

  return useMemo(() => {
    const stats = buildPlantStatsSummary({
      plant: plantComponents.plant,
      plantLive: live.plantLive,
      processedByComponentId: live.processedByComponentId,
      componentById: live.componentById,
    });

    return stats;
  }, [
    live.componentById,
    live.plantLive,
    live.processedByComponentId,
    plantComponents.plant,
  ]);
}

function resolvePlantMetricValue(
  stats: ReturnType<typeof buildPlantStatsSummary>,
  metricKey: string,
): number | null | string {
  const normalized = PLANT_METRIC_ALIASES[metricKey] ?? metricKey;
  const value = stats[normalized as keyof typeof stats];
  if (typeof value === "number" || typeof value === "string" || value == null) {
    return value;
  }
  return String(value);
}

function metricLabel(metricKey: string): string {
  const match = PLANT_METRIC_OPTIONS.find((option) => option.value === metricKey);
  return match?.label ?? metricKey.replace(/_/g, " ");
}

export function GenericKpiWidget({ plantId, title, config, editMode }: WidgetRenderProps) {
  const showHeading = widgetShowHeading(config);
  const stats = usePlantKpiValueMap(plantId);
  const { live, tagConfig, hasTagTemplate, resolvedTagKeys } = useTagTemplateWidgetData({
    plantId,
    tagTemplateId: config.tagTemplateId,
    tagKeys: config.metricKey,
  });

  const metricKey = String(config.metricKey ?? "todayGenerationKwh");
  const label = String(config.label ?? title ?? metricLabel(metricKey));
  const unit = String(config.unit ?? "");

  const display = useMemo(() => {
    if (hasTagTemplate && tagConfig.length > 0) {
      const tagKey = String(config.metricKey ?? resolvedTagKeys[0] ?? "");
      const processed = live.processedByComponentId.get(tagConfig[0]!.component_id);
      return formatWidgetValue(resolveLiveTagValue(processed, tagKey));
    }
    return formatKpiValue(resolvePlantMetricValue(stats, metricKey));
  }, [
    config.metricKey,
    hasTagTemplate,
    live.processedByComponentId,
    metricKey,
    resolvedTagKeys,
    stats,
    tagConfig,
  ]);

  return (
    <DashboardWidgetShell
      icon={Gauge}
      title={label}
      showHeading={showHeading}
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      <div className="flex flex-1 items-center justify-center text-center">
        <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {display}
          {unit ? <span className="ml-1 text-sm text-neutral-500">{unit}</span> : null}
        </p>
      </div>
    </DashboardWidgetShell>
  );
}

export function GenericMultiKpiWidget({ plantId, title, config, editMode }: WidgetRenderProps) {
  const showHeading = widgetShowHeading(config);
  const metrics = useMemo(
    () => (Array.isArray(config.metrics) ? (config.metrics as string[]) : []),
    [config.metrics],
  );
  const stats = usePlantKpiValueMap(plantId);
  const { live, tagConfig, hasTagTemplate } = useTagTemplateWidgetData({
    plantId,
    tagTemplateId: config.tagTemplateId,
    tagKeys: config.metrics,
  });

  const tiles = useMemo(() => {
    return metrics.map((metricKey) => {
      if (hasTagTemplate && tagConfig.length > 0) {
        const values = tagConfig
          .map((entry) => {
            const processed = live.processedByComponentId.get(entry.component_id);
            return resolveLiveTagValue(processed, metricKey);
          })
          .filter((value) => value != null);

        const numeric = values
          .map((value) =>
            typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, "")),
          )
          .filter((value) => Number.isFinite(value));

        const aggregated =
          numeric.length > 0
            ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
            : null;

        return {
          key: metricKey,
          label: metricKey.replace(/_/g, " "),
          value: formatWidgetValue(aggregated),
        };
      }

      return {
        key: metricKey,
        label: metricLabel(metricKey),
        value: formatKpiValue(resolvePlantMetricValue(stats, metricKey)),
      };
    });
  }, [hasTagTemplate, live.processedByComponentId, metrics, stats, tagConfig]);

  return (
    <DashboardWidgetShell
      icon={LayoutGrid}
      title={title ?? "Multi KPI"}
      showHeading={showHeading}
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      {tiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-500">
          Select metrics or tag keys in widget settings.
        </div>
      ) : (
        <div className="grid h-full w-full grid-cols-2 content-center gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className="rounded-xs border border-neutral-200/80 bg-neutral-50/80 px-2 py-2 text-center dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30"
            >
              <p className="text-[9px] uppercase text-neutral-500">{tile.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
