import { RadioTower } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { buildPlantStatsSummary, type PlantStatsSummary } from "./plantStats";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import type { PlantStatsMetricId, PlantStatsWidgetConfig } from "../shared/dashboardTypes";
import { PlantStatCard } from "./PlantStatCard";
import {
  PLANT_STAT_METRIC_META,
  resolvePlantStatAccent,
} from "./plantStatCardTheme";

interface PlantStatsWidgetProps {
  plantId?: string;
  title?: string;
  config?: PlantStatsWidgetConfig;
  embedded?: boolean;
}

interface StatItem {
  id: PlantStatsMetricId;
  label: string;
  value: string;
  unit?: string;
}

function formatCompactNumber(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(digits, 2),
  }).format(value);
}

function formatInteger(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function formatEnergyStat(value: number | null): { value: string; unit: string } {
  if (value == null || !Number.isFinite(value)) return { value: "-", unit: "kWh" };
  if (Math.abs(value) >= 1000) {
    return { value: formatCompactNumber(value / 1000), unit: "MWh" };
  }
  return { value: formatCompactNumber(value), unit: "kWh" };
}

function buildStatItems(stats: PlantStatsSummary): StatItem[] {
  const generation = formatEnergyStat(stats.todayGenerationKwh);

  return [
    {
      id: "dailyYield",
      label: "Daily Yield",
      value: formatCompactNumber(stats.dailyYield),
      unit: "kWh/kWp",
    },
    {
      id: "todayGenerationKwh",
      label: "Today Generation",
      value: generation.value,
      unit: generation.unit,
    },
    {
      id: "performanceRatio",
      label: "Performance Ratio",
      value: formatCompactNumber(stats.performanceRatio),
      unit: "%",
    },
    {
      id: "liveAlarms",
      label: "Live Alarms",
      value: formatInteger(stats.liveAlarms),
      unit: "Nos",
    },
    {
      id: "highImpactAlarms",
      label: "High Impact Alarms",
      value: formatInteger(stats.highImpactAlarms),
      unit: "Nos",
    },
    {
      id: "mostUnavailableComponent",
      label: "Most Unavailable",
      value: stats.mostUnavailableComponent,
    },
    {
      id: "plantUptime",
      label: "Plant Up-Time",
      value: stats.plantUptime.value,
      unit: stats.plantUptime.unit,
    },
    {
      id: "treesPlanted",
      label: "Trees Planted",
      value: formatInteger(stats.treesPlanted),
      unit: "Nos",
    },
    {
      id: "coalSavedTon",
      label: "Coal Saved",
      value: formatCompactNumber(stats.coalSavedTon),
      unit: "Ton",
    },
    {
      id: "co2SavedTon",
      label: "CO₂ Saved",
      value: formatCompactNumber(stats.co2SavedTon),
      unit: "Ton",
    },
  ];
}

function selectStatItems(
  stats: PlantStatsSummary,
  visibleMetrics?: PlantStatsMetricId[],
): StatItem[] {
  const allItems = buildStatItems(stats);
  if (!visibleMetrics?.length) return allItems;

  const byId = new Map(allItems.map((item) => [item.id, item]));
  return visibleMetrics
    .map((metricId) => byId.get(metricId))
    .filter((item): item is StatItem => item != null);
}

function PlantStatsGrid({
  items,
  compact,
  useHorizontalStrip,
  metricAccents,
}: {
  items: StatItem[];
  compact: boolean;
  useHorizontalStrip: boolean;
  metricAccents?: PlantStatsWidgetConfig["metricAccents"];
}) {
  const cards = items.map((item) => {
    const meta = PLANT_STAT_METRIC_META[item.id];
    return (
      <PlantStatCard
        key={item.id}
        label={item.label}
        value={item.value}
        unit={item.unit}
        accent={resolvePlantStatAccent(item.id, metricAccents)}
        icon={meta.icon}
        compact={compact}
      />
    );
  });

  if (useHorizontalStrip) {
    return (
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full gap-2 pb-0.5">{cards}</div>
      </div>
    );
  }

  return (
    <div
      className={[
        "grid gap-2",
        compact
          ? "grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]",
      ].join(" ")}
    >
      {cards}
    </div>
  );
}

export function PlantStatsWidget({
  plantId,
  title = "Plant Stats",
  config,
  embedded = false,
}: PlantStatsWidgetProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");
  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });

  const stats = buildPlantStatsSummary({
    plant: plantComponents.plant,
    plantLive: live.plantLive,
    processedByComponentId: live.processedByComponentId,
    componentById: live.componentById,
  });

  const items = selectStatItems(stats, config?.visibleMetrics);
  const useHorizontalStrip = isMobile || isTablet;

  return (
    <PlantDashboardCard
      icon={RadioTower}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <PlantStatsGrid
        items={items}
        compact={isMobile}
        useHorizontalStrip={useHorizontalStrip}
        metricAccents={config?.metricAccents}
      />
    </PlantDashboardCard>
  );
}
