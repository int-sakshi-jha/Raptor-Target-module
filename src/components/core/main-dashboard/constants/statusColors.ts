import type { PlantOperationalStatus } from "../types/dashboard.types";
import type { BadgeVariant } from "@/components/common/ColorBadge";

export const PLANT_STATUS_COLORS: Record<
  PlantOperationalStatus,
  {
    label: string;
    bg: string;
    border: string;
    glow: string;
    text: string;
    dot: string;
    marker: string;
  }
> = {
  active: {
    label: "Active",
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    border: "border-emerald-400/40 dark:border-emerald-500/35",
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.25)]",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    marker: "#10b981",
  },
  inactive: {
    label: "Inactive",
    bg: "bg-red-500/10 dark:bg-red-400/10",
    border: "border-red-400/40 dark:border-red-500/35",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    marker: "#ef4444",
  },
  partial: {
    label: "Partial",
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    border: "border-amber-400/40 dark:border-amber-500/35",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    marker: "#f59e0b",
  },
  unknown: {
    label: "Unknown",
    bg: "bg-neutral-500/10 dark:bg-neutral-400/10",
    border: "border-neutral-300/50 dark:border-neutral-dark-400/50",
    glow: "shadow-[0_0_16px_rgba(107,114,128,0.15)]",
    text: "text-neutral-500 dark:text-neutral-dark-600",
    dot: "bg-neutral-400",
    marker: "#9ca3af",
  },
};

export function getPlantStatusColorBadgeVariant(
  status: PlantOperationalStatus,
): BadgeVariant {
  switch (status) {
    case "active":
      return "green";
    case "inactive":
      return "no";
    case "partial":
      return "orange";
    default:
      return "gray";
  }
}

/** SCADA-style card shell + status gradient — light & dark variants. */
export const PLANT_CARD_THEME: Record<
  PlantOperationalStatus,
  {
    border: string;
    shell: string;
    shadow: string;
    radialGlow: string;
    linearFade: string;
    bottomFade: string;
    liveBar: string;
    liveText: string;
    title: string;
    muted: string;
    value: string;
    label: string;
    divider: string;
    track: string;
    generation: string;
    revenue: string;
    capacity: string;
    capacityMuted: string;
    linkBtn: string;
    export: string;
    import: string;
  }
> = {
  active: {
    border: "border-emerald-400/40 dark:border-emerald-500/25",
    shell: "bg-white/70 backdrop-blur-xl dark:bg-[#0b0e14]/95",
    shadow:
      "shadow-[0_4px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
    radialGlow:
      "bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(34,197,94,0.16),transparent_65%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(34,197,94,0.28),transparent_65%)]",
    linearFade:
      "bg-gradient-to-br from-emerald-50/90 via-white/50 to-slate-100/70 dark:from-emerald-950/40 dark:via-[#0b0e14] dark:to-[#06080c]",
    bottomFade:
      "bg-gradient-to-t from-neutral-200/25 via-transparent to-transparent dark:from-black/50",
    liveBar: "bg-emerald-500",
    liveText: "text-emerald-600 dark:text-emerald-400",
    title: "text-neutral-900 dark:text-white",
    muted: "text-neutral-500 dark:text-neutral-400",
    value: "text-neutral-900 dark:text-white",
    label: "text-neutral-500 dark:text-neutral-500",
    divider: "border-neutral-200/70 dark:border-white/[0.08]",
    track: "bg-neutral-200/90 dark:bg-neutral-800/90",
    generation: "text-sky-600 dark:text-sky-400",
    revenue: "text-emerald-600 dark:text-emerald-400",
    capacity: "text-neutral-800 dark:text-white/90",
    capacityMuted: "text-neutral-600 dark:text-white/70",
    linkBtn:
      "border-neutral-200/80 bg-white/60 text-neutral-500 hover:border-brand-400/50 hover:text-brand-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-400 dark:hover:text-brand-400",
    export: "text-emerald-600 dark:text-emerald-400",
    import: "text-red-600 dark:text-red-400",
  },
  inactive: {
    border: "border-red-400/40 dark:border-red-500/30",
    shell: "bg-white/70 backdrop-blur-xl dark:bg-[#0b0e14]/95",
    shadow:
      "shadow-[0_4px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
    radialGlow:
      "bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(239,68,68,0.14),transparent_65%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(239,68,68,0.32),transparent_65%)]",
    linearFade:
      "bg-gradient-to-br from-red-50/80 via-white/50 to-slate-100/70 dark:from-red-950/45 dark:via-[#0b0e14] dark:to-[#06080c]",
    bottomFade:
      "bg-gradient-to-t from-neutral-200/25 via-transparent to-transparent dark:from-black/50",
    liveBar: "bg-red-500",
    liveText: "text-red-600 dark:text-red-400",
    title: "text-neutral-900 dark:text-white",
    muted: "text-neutral-500 dark:text-neutral-400",
    value: "text-neutral-900 dark:text-white",
    label: "text-neutral-500 dark:text-neutral-500",
    divider: "border-neutral-200/70 dark:border-white/[0.08]",
    track: "bg-neutral-200/90 dark:bg-neutral-800/90",
    generation: "text-sky-600 dark:text-sky-400",
    revenue: "text-emerald-600 dark:text-emerald-400",
    capacity: "text-neutral-800 dark:text-white/90",
    capacityMuted: "text-neutral-600 dark:text-white/70",
    linkBtn:
      "border-neutral-200/80 bg-white/60 text-neutral-500 hover:border-brand-400/50 hover:text-brand-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-400 dark:hover:text-brand-400",
    export: "text-emerald-600 dark:text-emerald-400",
    import: "text-red-600 dark:text-red-400",
  },
  partial: {
    border: "border-amber-400/40 dark:border-amber-500/28",
    shell: "bg-white/70 backdrop-blur-xl dark:bg-[#0b0e14]/95",
    shadow:
      "shadow-[0_4px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
    radialGlow:
      "bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(245,158,11,0.14),transparent_65%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(245,158,11,0.28),transparent_65%)]",
    linearFade:
      "bg-gradient-to-br from-amber-50/80 via-white/50 to-slate-100/70 dark:from-amber-950/40 dark:via-[#0b0e14] dark:to-[#06080c]",
    bottomFade:
      "bg-gradient-to-t from-neutral-200/25 via-transparent to-transparent dark:from-black/50",
    liveBar: "bg-amber-500",
    liveText: "text-amber-600 dark:text-amber-400",
    title: "text-neutral-900 dark:text-white",
    muted: "text-neutral-500 dark:text-neutral-400",
    value: "text-neutral-900 dark:text-white",
    label: "text-neutral-500 dark:text-neutral-500",
    divider: "border-neutral-200/70 dark:border-white/[0.08]",
    track: "bg-neutral-200/90 dark:bg-neutral-800/90",
    generation: "text-sky-600 dark:text-sky-400",
    revenue: "text-emerald-600 dark:text-emerald-400",
    capacity: "text-neutral-800 dark:text-white/90",
    capacityMuted: "text-neutral-600 dark:text-white/70",
    linkBtn:
      "border-neutral-200/80 bg-white/60 text-neutral-500 hover:border-brand-400/50 hover:text-brand-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-400 dark:hover:text-brand-400",
    export: "text-emerald-600 dark:text-emerald-400",
    import: "text-red-600 dark:text-red-400",
  },
  unknown: {
    border: "border-neutral-300/70 dark:border-neutral-600/30",
    shell: "bg-white/70 backdrop-blur-xl dark:bg-[#0b0e14]/95",
    shadow:
      "shadow-[0_4px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
    radialGlow:
      "bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(148,163,184,0.12),transparent_65%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(148,163,184,0.15),transparent_65%)]",
    linearFade:
      "bg-gradient-to-br from-neutral-100/90 via-white/50 to-slate-100/70 dark:from-neutral-900/50 dark:via-[#0b0e14] dark:to-[#06080c]",
    bottomFade:
      "bg-gradient-to-t from-neutral-200/25 via-transparent to-transparent dark:from-black/50",
    liveBar: "bg-neutral-500",
    liveText: "text-neutral-600 dark:text-neutral-400",
    title: "text-neutral-900 dark:text-white",
    muted: "text-neutral-500 dark:text-neutral-400",
    value: "text-neutral-900 dark:text-white",
    label: "text-neutral-500 dark:text-neutral-500",
    divider: "border-neutral-200/70 dark:border-white/[0.08]",
    track: "bg-neutral-200/90 dark:bg-neutral-800/90",
    generation: "text-sky-600 dark:text-sky-400",
    revenue: "text-emerald-600 dark:text-emerald-400",
    capacity: "text-neutral-800 dark:text-white/90",
    capacityMuted: "text-neutral-600 dark:text-white/70",
    linkBtn:
      "border-neutral-200/80 bg-white/60 text-neutral-500 hover:border-brand-400/50 hover:text-brand-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-400 dark:hover:text-brand-400",
    export: "text-emerald-600 dark:text-emerald-400",
    import: "text-red-600 dark:text-red-400",
  },
};

export const KPI_STATUS_COLORS = {
  online: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-400/30",
  },
  offline: {
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-400/30",
  },
  unknown: {
    bg: "bg-neutral-500/15",
    text: "text-neutral-600 dark:text-neutral-dark-600",
    border: "border-neutral-300/40 dark:border-neutral-dark-400/40",
  },
  total: {
    bg: "bg-brand-500/15",
    text: "text-brand-600 dark:text-brand-400",
    border: "border-brand-400/30",
  },
  alert: {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-400/30",
  },
  alarm: {
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-400/30",
  },
} as const;
