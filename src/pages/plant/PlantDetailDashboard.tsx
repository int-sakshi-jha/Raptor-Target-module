import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ComponentStatusTable, type ComponentStatusSelection } from "@/components/core/detail-dashboard";
import DetailDashboardRightPanel from "@/components/core/detail-dashboard/DetailDashboardRightPanel";
import {
  DetailMain,
  DetailPageBackground,
} from "@/components/core/detail/DetailPagePrimitives";

const PlantDetailDashboard: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();
  const [selection, setSelection] = useState<ComponentStatusSelection | null>(null);

  const selectedBlockId = selection?.block?.id ?? null;
  const selectedInverterId = selection?.inverter
    ? String(selection.inverter.component_id ?? selection.inverter.id)
    : null;

  return (
    <DetailPageBackground className="h-full min-h-0 overflow-hidden">
      <DetailMain className="h-full min-h-0 overflow-hidden">
        <div className="grid h-[calc(100dvh-64px)] min-h-0 w-full grid-cols-[400px_minmax(0,1fr)] gap-2">
          <ComponentStatusTable
            plantId={plantId}
            className="h-full"
            selectedBlockId={selectedBlockId}
            selectedInverterId={selectedInverterId}
            onSelectionChange={setSelection}
          />
          <DetailDashboardRightPanel
            plantId={plantId}
            selection={selection}
          />
        </div>
      </DetailMain>
    </DetailPageBackground>
  );
};

export default PlantDetailDashboard;
