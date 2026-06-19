import { Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/core/main-dashboard/shared/GlassCard";
import { AnimatedCounter } from "@/components/core/main-dashboard/shared/AnimatedCounter";
import { MetricValue } from "@/components/core/main-dashboard/shared/MetricValue";
import { SolarPowerIllustration } from "../illustrations/SolarPowerIllustration";

interface CurrentPowerCardProps {
  currentPowerMw: number;
  installedCapacityMw: number;
  isLive?: boolean;
  loading?: boolean;
}

export function CurrentPowerCard({
  currentPowerMw,
  installedCapacityMw,
  isLive = false,
  loading = false,
}: CurrentPowerCardProps) {
  const utilization =
    installedCapacityMw > 0
      ? Math.min(100, (currentPowerMw / installedCapacityMw) * 100)
      : 0;

  return (
    <GlassCard accent="emerald" className="min-h-[130px]">
      <div className="flex h-full flex-col justify-between p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-600">
              Live Generation
            </p>
            {isLive ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            ) : null}
          </div>
          <SolarPowerIllustration />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <MetricValue
            label="Current Power"
            value={
              loading ? (
                <span className="inline-block h-6 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-dark-300" />
              ) : (
                <AnimatedCounter
                  value={currentPowerMw}
                  decimals={2}
                  suffix=" MW"
                  className="text-lg font-bold text-emerald-600 dark:text-emerald-400 sm:text-xl"
                />
              )
            }
          />
          <MetricValue
            label="Installed Capacity"
            value={
              loading ? (
                <span className="inline-block h-6 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-dark-300" />
              ) : (
                <AnimatedCounter
                  value={installedCapacityMw}
                  decimals={2}
                  suffix=" MW"
                  className="text-lg font-bold text-neutral-800 dark:text-neutral-dark-900 sm:text-xl"
                />
              )
            }
          />
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-neutral-500 dark:text-neutral-dark-600">
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Utilization
            </span>
            <span>{utilization.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-dark-300/60">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${utilization}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
