import { Building2, Wifi, WifiOff, HelpCircle } from "lucide-react";
import type { KpiAggregateMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { KPI_STATUS_COLORS } from "@/components/core/main-dashboard/constants/statusColors";
import { GlassCard } from "@/components/core/main-dashboard/shared/GlassCard";
import { AnimatedCounter } from "@/components/core/main-dashboard/shared/AnimatedCounter";

interface PlantStatusSummaryCardProps {
  plantStatus: KpiAggregateMetrics["plantStatus"];
  loading?: boolean;
}

const STATUS_ITEMS = [
  { key: "online" as const, label: "Online", icon: Wifi, colors: KPI_STATUS_COLORS.online },
  { key: "offline" as const, label: "Offline", icon: WifiOff, colors: KPI_STATUS_COLORS.offline },
  { key: "unknown" as const, label: "Unknown", icon: HelpCircle, colors: KPI_STATUS_COLORS.unknown },
  { key: "total" as const, label: "Total", icon: Building2, colors: KPI_STATUS_COLORS.total },
];

export function PlantStatusSummaryCard({
  plantStatus,
  loading = false,
}: PlantStatusSummaryCardProps) {
  return (
    <GlassCard accent="neutral" className="min-h-[130px]">
      <div className="flex h-full flex-col p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-600">
          Plant Status
        </p>

        <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
          {STATUS_ITEMS.map(({ key, label, icon: Icon, colors }) => (
            <div
              key={key}
              className={[
                "flex flex-col justify-between rounded-sm border p-2",
                colors.bg,
                colors.border,
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-dark-600">
                  {label}
                </span>
                <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
              </div>
              <div className={`mt-1.5 text-lg font-bold leading-none sm:text-xl ${colors.text}`}>
                {loading ? (
                  <span className="inline-block h-6 w-8 animate-pulse rounded bg-neutral-200/80 dark:bg-neutral-dark-300/80" />
                ) : (
                  <AnimatedCounter value={plantStatus[key]} decimals={0} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
