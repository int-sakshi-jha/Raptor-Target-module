import { motion } from "framer-motion";
import { AlertTriangle, Siren } from "lucide-react";
import type { KpiAggregateMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { KPI_STATUS_COLORS } from "@/components/core/main-dashboard/constants/statusColors";
import { GlassCard } from "@/components/core/main-dashboard/shared/GlassCard";
import { AnimatedCounter } from "@/components/core/main-dashboard/shared/AnimatedCounter";
import { AlertIllustration } from "../illustrations/AlertIllustration";

interface AlertSummaryCardProps {
  alerts: KpiAggregateMetrics["alerts"];
  loading?: boolean;
}

export function AlertSummaryCard({ alerts, loading = false }: AlertSummaryCardProps) {
  const hasCritical = alerts.activeAlarms > 0;

  return (
    <GlassCard
      accent="amber"
      glowClassName={hasCritical ? "shadow-[0_0_16px_rgba(239,68,68,0.15)]" : ""}
      className="min-h-[130px]"
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-600">
              Alert Summary
            </p>
            {hasCritical ? (
              <motion.span
                className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-600 dark:text-red-400"
                animate={{ opacity: [1, 0.55, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                Critical
              </motion.span>
            ) : null}
          </div>
          <AlertIllustration />
        </div>

        <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
          <div
            className={[
              "rounded-sm border p-2",
              KPI_STATUS_COLORS.alert.bg,
              KPI_STATUS_COLORS.alert.border,
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                Alerts
              </span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-amber-700 dark:text-amber-300 sm:text-xl">
              {loading ? (
                <span className="inline-block h-6 w-8 animate-pulse rounded bg-amber-200/50 dark:bg-amber-900/30" />
              ) : (
                <AnimatedCounter value={alerts.activeAlerts} decimals={0} />
              )}
            </div>
          </div>

          <div
            className={[
              "relative rounded-sm border p-2",
              KPI_STATUS_COLORS.alarm.bg,
              KPI_STATUS_COLORS.alarm.border,
            ].join(" ")}
          >
            {hasCritical ? (
              <motion.span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-red-700 dark:text-red-300">
                Alarms
              </span>
              <Siren className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-red-700 dark:text-red-300 sm:text-xl">
              {loading ? (
                <span className="inline-block h-6 w-8 animate-pulse rounded bg-red-200/50 dark:bg-red-900/30" />
              ) : (
                <AnimatedCounter value={alerts.activeAlarms} decimals={0} />
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
