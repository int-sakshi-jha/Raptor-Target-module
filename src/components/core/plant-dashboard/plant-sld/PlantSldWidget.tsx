import { Network } from "lucide-react";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface PlantSldWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

export function PlantSldWidget({
  plantId,
  title = "Plant SLD",
  embedded = false,
}: PlantSldWidgetProps) {
  return (
    <PlantDashboardCard
      icon={Network}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-dashed border-brand-500/35 bg-brand-500/5 text-brand-600 dark:text-brand-400">
          <Network className="h-8 w-8" />
        </div>
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
            SLD viewer
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-dark-600">
            The interactive single-line diagram will render here when SLD data is connected for this
            plant. Use the SLD tab in the plant navigation to access the full diagram experience.
          </p>
          {plantId ? (
            <p className="mt-2 text-[10px] text-neutral-400">Plant ID: {plantId}</p>
          ) : null}
        </div>
      </div>
    </PlantDashboardCard>
  );
}
