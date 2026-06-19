import { useRef } from "react";
import type { KpiAggregateMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardBreakpoints } from "@/components/core/main-dashboard/hooks/useMainDashboardBreakpoints";
import { CurrentPowerCard } from "./cards/CurrentPowerCard";
import { EarningsCarouselCard } from "./cards/EarningsCarouselCard";
import { PlantStatusSummaryCard } from "./cards/PlantStatusSummaryCard";
import { AlertSummaryCard } from "./cards/AlertSummaryCard";

interface KpiCardsWidgetProps {
  kpis: KpiAggregateMetrics;
  loading?: boolean;
  isLive?: boolean;
}

function KpiCardsGrid({
  kpis,
  loading,
  isLive,
}: KpiCardsWidgetProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <CurrentPowerCard
        currentPowerMw={kpis.currentPowerMw}
        installedCapacityMw={kpis.installedCapacityMw}
        isLive={isLive}
        loading={loading}
      />
      <EarningsCarouselCard earnings={kpis.earnings} loading={loading} />
      <PlantStatusSummaryCard plantStatus={kpis.plantStatus} loading={loading} />
      <AlertSummaryCard alerts={kpis.alerts} loading={loading} />
    </div>
  );
}

function KpiCardsSlider({
  kpis,
  loading,
  isLive,
}: KpiCardsWidgetProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const cards = [
    <CurrentPowerCard
      key="power"
      currentPowerMw={kpis.currentPowerMw}
      installedCapacityMw={kpis.installedCapacityMw}
      isLive={isLive}
      loading={loading}
    />,
    <EarningsCarouselCard key="earnings" earnings={kpis.earnings} loading={loading} />,
    <PlantStatusSummaryCard key="status" plantStatus={kpis.plantStatus} loading={loading} />,
    <AlertSummaryCard key="alerts" alerts={kpis.alerts} loading={loading} />,
  ];

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="w-[min(84vw,300px)] shrink-0 snap-center sm:w-[min(68vw,320px)]"
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiCardsWidget({ kpis, loading, isLive }: KpiCardsWidgetProps) {
  const { useKpiSlider } = useMainDashboardBreakpoints();

  return (
    <section aria-label="Key performance indicators" className="w-full">
      {useKpiSlider ? (
        <KpiCardsSlider kpis={kpis} loading={loading} isLive={isLive} />
      ) : (
        <KpiCardsGrid kpis={kpis} loading={loading} isLive={isLive} />
      )}
    </section>
  );
}
