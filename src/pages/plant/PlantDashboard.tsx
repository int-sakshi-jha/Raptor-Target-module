import type React from "react";
import { useParams } from "react-router-dom";
import { PlantDashboardView } from "@/components/core/plant-dashboard";
import { PLANT_DASHBOARD_PAGE_BG } from "@/components/core/plant-dashboard/shared/plantDashboardTheme";

const PlantDashboard: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();

  return (
    <div className={`${PLANT_DASHBOARD_PAGE_BG} p-2.5 text-neutral-900 dark:text-neutral-dark-950`}>
      <div className="mx-auto w-full max-w-[1920px]">
        <PlantDashboardView plantId={plantId} />
      </div>
    </div>
  );
};

export default PlantDashboard;
