import { Grid3x3 } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";
import { EquipmentHeatmap } from "@/components/common/EquipmentHeatmap";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface DcChannelHeatmapWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

export function DcChannelHeatmapWidget({
  plantId,
  title = "DC Channel Heatmap",
  embedded = false,
}: DcChannelHeatmapWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = useMemo(
    () =>
      live.getHeatmapRows({
        endDate: today,
        blockId: "",
        acdbId: "",
        inverterId: "",
      }),
    [live, today],
  );

  const dcRows = useMemo(
    () =>
      rows.filter((row) => {
        const type = String(row.component_type ?? "").toLowerCase();
        return type === "dc_channel" || type === "dc" || type.includes("channel");
      }),
    [rows],
  );

  return (
    <PlantDashboardCard
      icon={Grid3x3}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      {dcRows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center text-[11px] text-neutral-500">
          No DC channel heatmap data available.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <EquipmentHeatmap data={dcRows} componentType="dc_channel" />
        </div>
      )}
    </PlantDashboardCard>
  );
}
