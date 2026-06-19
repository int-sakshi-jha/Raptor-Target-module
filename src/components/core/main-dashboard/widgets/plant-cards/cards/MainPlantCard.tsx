import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { PLANT_CARD_THEME } from "@/components/core/main-dashboard/constants/statusColors";
import { useMainDashboardBreakpoints } from "@/components/core/main-dashboard/hooks/useMainDashboardBreakpoints";
import {
  formatCapacityKw,
  formatEnergyDisplay,
  formatLastUpdateRelative,
  formatPlantMetricValue,
  formatPowerDisplay,
  getPlantUtilizationPercent,
} from "@/components/core/main-dashboard/utils/plantMetricUtils";
import { PlantCardBadges } from "@/components/core/main-dashboard/widgets/plant-cards/shared/PlantCardBadges";

interface MainPlantCardProps {
  plant: PlantDashboardMetrics;
  onClick?: () => void;
}

export function MainPlantCard({ plant, onClick }: MainPlantCardProps) {
  const theme = PLANT_CARD_THEME[plant.status];
  const { plantCardStacked, isMobile } = useMainDashboardBreakpoints();
  const utilization = getPlantUtilizationPercent(plant.currentPowerKw, plant.dcCapacityKw);
  const hasLive = plant.hasLiveData && utilization > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: isMobile ? 1 : 1.005 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={[
        "group relative cursor-pointer overflow-hidden rounded-sm border",
        theme.shell,
        theme.shadow,
        "transition-shadow duration-200 hover:shadow-lg dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55)]",
        theme.border,
      ].join(" ")}
    >
      <div className={`pointer-events-none absolute inset-0 ${theme.linearFade}`} />
      <div className={`pointer-events-none absolute inset-0 ${theme.radialGlow}`} />
      <div className={`pointer-events-none absolute inset-0 ${theme.bottomFade}`} />

      <div
        className={[
          "relative flex flex-col",
          isMobile ? "gap-2.5 p-2.5" : "gap-3 p-3",
        ].join(" ")}
      >
        <div
          className={[
            "flex gap-2",
            plantCardStacked ? "flex-col" : "items-start justify-between",
          ].join(" ")}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3
                className={[
                  "truncate font-bold tracking-tight",
                  isMobile ? "text-[13px]" : "text-sm",
                  theme.title,
                ].join(" ")}
              >
                {plant.plantName}
              </h3>
              {plant.hasLiveData ? (
                <motion.span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] dark:bg-emerald-400 dark:shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  title="Live data"
                />
              ) : null}
            </div>
            <p className={`mt-0.5 text-[10px] ${theme.muted}`}>
              Last update: {formatLastUpdateRelative(plant.lastUpdated)}
            </p>
          </div>
          <PlantCardBadges plant={plant} />
        </div>

        <div
          className={[
            "grid gap-3",
            plantCardStacked ? "grid-cols-1" : "grid-cols-2",
          ].join(" ")}
        >
          <div className="min-w-0">
            <p className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${theme.label}`}>
              Power
            </p>
            <p
              className={[
                "mt-0.5 truncate font-bold tabular-nums leading-none",
                isMobile ? "text-lg" : "text-xl",
                theme.value,
              ].join(" ")}
            >
              {formatPowerDisplay(plant.currentPowerKw)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-1 min-w-0 flex-1 overflow-hidden rounded-full ${theme.track}`}>
                <motion.div
                  className={`h-full rounded-full ${theme.liveBar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${hasLive ? utilization : 0}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span
                className={`shrink-0 text-[9px] font-semibold tabular-nums ${theme.liveText}`}
              >
                Live: {hasLive ? `${utilization.toFixed(0)}%` : "—"}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${theme.label}`}>
              Flow
            </p>
            <div
              className={[
                "mt-1.5 flex",
                plantCardStacked ? "gap-6" : "gap-4",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className={`flex items-center gap-0.5 ${theme.export}`}>
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-[8px] font-semibold uppercase">Export</span>
                </div>
                <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${theme.value}`}>
                  {formatPowerDisplay(plant.exportPowerKw)}
                </p>
              </div>
              <div className="min-w-0">
                <div className={`flex items-center gap-0.5 ${theme.import}`}>
                  <ArrowDown className="h-3 w-3" />
                  <span className="text-[8px] font-semibold uppercase">Import</span>
                </div>
                <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${theme.value}`}>
                  {formatPowerDisplay(plant.importPowerKw)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            "grid gap-2 border-t pt-2.5",
            theme.divider,
            isMobile ? "grid-cols-3 gap-1" : "grid-cols-3",
          ].join(" ")}
        >
          <div className="min-w-0">
            <p className={`text-[8px] font-semibold uppercase tracking-[0.1em] ${theme.label}`}>
              Generation
            </p>
            <p
              className={[
                "mt-0.5 truncate font-bold tabular-nums",
                isMobile ? "text-xs" : "text-sm",
                theme.generation,
              ].join(" ")}
            >
              {formatEnergyDisplay(plant.todayGenerationKwh ?? plant.totalGenerationKwh)}
            </p>
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-semibold uppercase tracking-[0.1em] ${theme.label}`}>
              Revenue
            </p>
            <p
              className={[
                "mt-0.5 truncate font-bold tabular-nums",
                isMobile ? "text-xs" : "text-sm",
                theme.revenue,
              ].join(" ")}
            >
              {formatPlantMetricValue("revenue", plant.revenue)}
            </p>
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-semibold uppercase tracking-[0.1em] ${theme.label}`}>
              Capacity
            </p>
            <p
              className={[
                "mt-0.5 truncate font-semibold tabular-nums",
                isMobile ? "text-[9px]" : "text-[10px]",
                theme.capacity,
              ].join(" ")}
            >
              AC {formatCapacityKw(plant.acCapacityKw)}
            </p>
            <p
              className={[
                "truncate font-semibold tabular-nums",
                isMobile ? "text-[9px]" : "text-[10px]",
                theme.capacityMuted,
              ].join(" ")}
            >
              DC {formatCapacityKw(plant.dcCapacityKw)}
            </p>
          </div>
        </div>

        <Link
          to={`/plants/${plant.plantId}`}
          onClick={(e) => e.stopPropagation()}
          className={[
            "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-sm border backdrop-blur-sm transition",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            theme.linkBtn,
          ].join(" ")}
          aria-label={`Open ${plant.plantName}`}
        >
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.article>
  );
}
