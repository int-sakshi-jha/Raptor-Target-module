import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Clock,
  Flame,
  Gauge,
  Leaf,
  TreePine,
  TrendingUp,
  WifiOff,
  Zap,
} from "lucide-react";
import type { PlantStatsMetricId } from "../shared/dashboardTypes";
import type { PlantDashboardAccent } from "../shared/plantDashboardTheme";

export const PLANT_STAT_ACCENT_OPTIONS: {
  value: PlantDashboardAccent;
  label: string;
  swatch: string;
}[] = [
  { value: "brand", label: "Brand", swatch: "bg-brand-500" },
  { value: "blue", label: "Blue", swatch: "bg-sky-500" },
  { value: "emerald", label: "Green", swatch: "bg-emerald-500" },
  { value: "amber", label: "Amber", swatch: "bg-amber-500" },
  { value: "red", label: "Red", swatch: "bg-red-500" },
  { value: "neutral", label: "Neutral", swatch: "bg-neutral-400 dark:bg-neutral-500" },
];

export const PLANT_STAT_GLASS_SHELL =
  "relative overflow-hidden rounded-sm border bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200 hover:shadow-card dark:bg-neutral-dark-100/90 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] dark:hover:shadow-dark-card-md";

export const PLANT_STAT_GLASS_THEME: Record<
  PlantDashboardAccent,
  {
    border: string;
    gradient: string;
    iconBg: string;
    iconFg: string;
    value: string;
    unit: string;
  }
> = {
  brand: {
    border: "border-brand-400/25 dark:border-brand-500/20",
    gradient: "from-brand-500/15 via-transparent to-transparent dark:from-brand-400/10",
    iconBg: "border-brand-400/30 bg-brand-500/10 dark:border-brand-500/25 dark:bg-brand-500/10",
    iconFg: "text-brand-600 dark:text-brand-400",
    value: "text-brand-700 dark:text-brand-300",
    unit: "text-brand-600/80 dark:text-brand-400/70",
  },
  blue: {
    border: "border-sky-400/25 dark:border-sky-500/20",
    gradient: "from-sky-500/15 via-transparent to-transparent dark:from-sky-400/10",
    iconBg: "border-sky-400/30 bg-sky-500/10 dark:border-sky-500/25 dark:bg-sky-500/10",
    iconFg: "text-sky-600 dark:text-sky-400",
    value: "text-sky-700 dark:text-sky-300",
    unit: "text-sky-600/80 dark:text-sky-400/70",
  },
  emerald: {
    border: "border-emerald-400/25 dark:border-emerald-500/20",
    gradient: "from-emerald-500/15 via-transparent to-transparent dark:from-emerald-400/10",
    iconBg: "border-emerald-400/30 bg-emerald-500/10 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
    unit: "text-emerald-600/80 dark:text-emerald-400/70",
  },
  amber: {
    border: "border-amber-400/25 dark:border-amber-500/20",
    gradient: "from-amber-500/15 via-transparent to-transparent dark:from-amber-400/10",
    iconBg: "border-amber-400/30 bg-amber-500/10 dark:border-amber-500/25 dark:bg-amber-500/10",
    iconFg: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
    unit: "text-amber-600/80 dark:text-amber-400/70",
  },
  red: {
    border: "border-red-400/25 dark:border-red-500/20",
    gradient: "from-red-500/15 via-transparent to-transparent dark:from-red-400/10",
    iconBg: "border-red-400/30 bg-red-500/10 dark:border-red-500/25 dark:bg-red-500/10",
    iconFg: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
    unit: "text-red-600/80 dark:text-red-400/70",
  },
  neutral: {
    border: "border-neutral-300/45 dark:border-neutral-dark-300/40",
    gradient: "from-neutral-500/8 via-transparent to-transparent dark:from-neutral-dark-400/8",
    iconBg: "border-neutral-300/50 bg-neutral-100/80 dark:border-neutral-dark-300/40 dark:bg-neutral-dark-200/50",
    iconFg: "text-neutral-500 dark:text-neutral-dark-600",
    value: "text-neutral-900 dark:text-neutral-dark-950",
    unit: "text-neutral-500 dark:text-neutral-dark-500",
  },
};

export const PLANT_STAT_METRIC_META: Record<
  PlantStatsMetricId,
  { accent: PlantDashboardAccent; icon: LucideIcon }
> = {
  dailyYield: { accent: "blue", icon: TrendingUp },
  todayGenerationKwh: { accent: "blue", icon: Zap },
  performanceRatio: { accent: "emerald", icon: Gauge },
  liveAlarms: { accent: "red", icon: Bell },
  highImpactAlarms: { accent: "red", icon: AlertTriangle },
  mostUnavailableComponent: { accent: "amber", icon: WifiOff },
  plantUptime: { accent: "blue", icon: Clock },
  treesPlanted: { accent: "emerald", icon: TreePine },
  coalSavedTon: { accent: "amber", icon: Flame },
  co2SavedTon: { accent: "emerald", icon: Leaf },
};

export function resolvePlantStatAccent(
  metricId: PlantStatsMetricId,
  metricAccents?: Partial<Record<PlantStatsMetricId, PlantDashboardAccent>>,
): PlantDashboardAccent {
  return metricAccents?.[metricId] ?? PLANT_STAT_METRIC_META[metricId].accent;
}
