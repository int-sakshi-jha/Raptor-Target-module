import { PlantMap } from "../map/PlantMap";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";

interface MapViewProps {
  plants: PlantDashboardMetrics[];
}

export function MapView({ plants }: MapViewProps) {
  const mapFullscreen = useMainDashboardStore((s) => s.mapFullscreen);
  const setMapFullscreen = useMainDashboardStore((s) => s.setMapFullscreen);

  return (
    <div className="h-full min-h-0 p-2">
      <PlantMap
        plants={plants}
        fullscreen={mapFullscreen}
        onToggleFullscreen={() => setMapFullscreen(!mapFullscreen)}
      />
    </div>
  );
}
