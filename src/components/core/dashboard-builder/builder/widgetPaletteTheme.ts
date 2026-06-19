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
import type { WidgetCategory } from "../registry/widgetLibrary";

export const WIDGET_LIBRARY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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
  Cpu: Activity,
  CloudRain,
  GitBranch,
  Network,
  Grid3x3,
  Zap,
};

export interface WidgetCategoryTheme {
  label: string;
  gradient: string;
  border: string;
  dot: string;
  iconBg: string;
  iconText: string;
  cardHover: string;
  cardRing: string;
  chip: string;
}

export const WIDGET_CATEGORY_THEME: Record<WidgetCategory, WidgetCategoryTheme> = {
  kpi: {
    label: "KPI",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/25",
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-500/12 ring-1 ring-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    cardHover: "hover:border-emerald-500/35 hover:bg-emerald-500/[0.04]",
    cardRing: "focus-visible:ring-emerald-500/40",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  charts: {
    label: "Charts",
    gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
    border: "border-blue-500/25",
    dot: "bg-blue-500",
    iconBg: "bg-blue-500/12 ring-1 ring-blue-500/20",
    iconText: "text-blue-600 dark:text-blue-400",
    cardHover: "hover:border-blue-500/35 hover:bg-blue-500/[0.04]",
    cardRing: "focus-visible:ring-blue-500/40",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  tables: {
    label: "Tables",
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    border: "border-violet-500/25",
    dot: "bg-violet-500",
    iconBg: "bg-violet-500/12 ring-1 ring-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
    cardHover: "hover:border-violet-500/35 hover:bg-violet-500/[0.04]",
    cardRing: "focus-visible:ring-violet-500/40",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  solar: {
    label: "Solar",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    border: "border-amber-500/25",
    dot: "bg-amber-500",
    iconBg: "bg-amber-500/12 ring-1 ring-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    cardHover: "hover:border-amber-500/35 hover:bg-amber-500/[0.04]",
    cardRing: "focus-visible:ring-amber-500/40",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  equipment: {
    label: "Equipment",
    gradient: "from-indigo-500/15 via-indigo-500/5 to-transparent",
    border: "border-indigo-500/25",
    dot: "bg-indigo-500",
    iconBg: "bg-indigo-500/12 ring-1 ring-indigo-500/20",
    iconText: "text-indigo-600 dark:text-indigo-400",
    cardHover: "hover:border-indigo-500/35 hover:bg-indigo-500/[0.04]",
    cardRing: "focus-visible:ring-indigo-500/40",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  analytics: {
    label: "Analytics",
    gradient: "from-cyan-500/15 via-cyan-500/5 to-transparent",
    border: "border-cyan-500/25",
    dot: "bg-cyan-500",
    iconBg: "bg-cyan-500/12 ring-1 ring-cyan-500/20",
    iconText: "text-cyan-600 dark:text-cyan-400",
    cardHover: "hover:border-cyan-500/35 hover:bg-cyan-500/[0.04]",
    cardRing: "focus-visible:ring-cyan-500/40",
    chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  alarms: {
    label: "Alarms",
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    border: "border-rose-500/25",
    dot: "bg-rose-500",
    iconBg: "bg-rose-500/12 ring-1 ring-rose-500/20",
    iconText: "text-rose-600 dark:text-rose-400",
    cardHover: "hover:border-rose-500/35 hover:bg-rose-500/[0.04]",
    cardRing: "focus-visible:ring-rose-500/40",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  weather: {
    label: "Weather",
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    border: "border-sky-500/25",
    dot: "bg-sky-500",
    iconBg: "bg-sky-500/12 ring-1 ring-sky-500/20",
    iconText: "text-sky-600 dark:text-sky-400",
    cardHover: "hover:border-sky-500/35 hover:bg-sky-500/[0.04]",
    cardRing: "focus-visible:ring-sky-500/40",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};
