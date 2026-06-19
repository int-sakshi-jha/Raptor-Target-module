import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CloudRain,
  CloudSun,
  Gauge,
  GitBranch,
  Grid3x3,
  History,
  IndianRupee,
  LayoutGrid,
  LineChart,
  Network,
  RadioTower,
  Table,
  TrendingDown,
  WifiOff,
  Zap,
} from "lucide-react";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import type { WidgetLibraryType } from "../types/document";
import { widgetShowHeading } from "../core/tagTemplateRuntime";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Gauge,
  LayoutGrid,
  LineChart,
  AreaChart: LineChart,
  BarChart3,
  Table,
  RadioTower,
  IndianRupee,
  Activity,
  WifiOff,
  TrendingDown,
  History,
  CloudSun,
  Bell,
  CloudRain,
  GitBranch,
  Network,
  Grid3x3,
  Zap,
};

interface DashboardWidgetPreviewProps {
  type: WidgetLibraryType;
  title?: string;
  config?: Record<string, unknown>;
}

function configSummary(type: WidgetLibraryType, config?: Record<string, unknown>): string[] {
  if (!config) return [];
  const lines: string[] = [];

  if (type === "plant_stats" && Array.isArray(config.visibleMetrics)) {
    lines.push(`${config.visibleMetrics.length} metrics selected`);
  }
  if (type === "plant_stats" && config.metricAccents && typeof config.metricAccents === "object") {
    const customCount = Object.keys(config.metricAccents).length;
    if (customCount > 0) lines.push(`${customCount} custom colors`);
  }
  if (type === "generation_graph") {
    if (config.chartType) lines.push(`Chart: ${String(config.chartType)}`);
    if (Array.isArray(config.sourceGroups) && config.sourceGroups.length > 0) {
      lines.push(`Sources: ${config.sourceGroups.join(", ")}`);
    }
  }
  if (type === "devices_overview") {
    if (config.defaultComponentType) lines.push(`Tab: ${String(config.defaultComponentType)}`);
    if (config.defaultTimeRange) lines.push(`Range: ${String(config.defaultTimeRange)}`);
  }
  if (config.tagTemplateId) lines.push("Custom tag template");

  return lines;
}

export function DashboardWidgetPreview({ type, title, config }: DashboardWidgetPreviewProps) {
  const def = WIDGET_LIBRARY_BY_TYPE[type];
  const Icon = ICONS[def?.icon ?? ""] ?? Gauge;
  const label = title?.trim() || def?.label || type;
  const showHeading = widgetShowHeading(config);
  const hints = configSummary(type, config);

  if (showHeading) {
    return (
      <div className="dashboard-widget-content pointer-events-none flex h-full min-h-0 flex-col bg-transparent px-2.5 py-2 select-none">
        <div className="mb-1.5 flex shrink-0 items-start gap-2 border-b border-neutral-200/90 pb-1.5 dark:border-neutral-dark-300/65">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-dark-950">{label}</p>
            {def?.description ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-neutral-500 dark:text-neutral-dark-600">
                {def.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 text-center">
          {hints.length > 0 ? (
            <ul className="space-y-0.5 text-[10px] text-brand-700/80 dark:text-brand-400/90">
              {hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-neutral-400 dark:text-neutral-dark-500">Widget preview</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-widget-content pointer-events-none flex h-full min-h-0 flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-50/90 to-white px-2.5 py-2 text-center select-none dark:from-neutral-dark-200/20 dark:to-neutral-dark-100">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 px-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500">
          Heading hidden
        </p>
        {hints.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5 text-[10px] text-brand-700/80 dark:text-brand-400/90">
            {hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        ) : def?.description ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500 dark:text-neutral-dark-600">
            {def.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
