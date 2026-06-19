import { useMemo, type RefObject } from "react";
import { Link } from "react-router-dom";
import CommonTable, { type CommonColumnConfig, type CommonTableHandle } from "@/components/core/table/CommonTable";
import {
  buildTextColumn,
  getDateColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";
import type { PlantDashboardMetrics, PlantOperationalStatus } from "@/components/core/main-dashboard/types/dashboard.types";
import {
  formatPlantMetricValue,
  formatPowerKw,
  formatEnergyKwh,
  formatCapacityKw,
} from "@/components/core/main-dashboard/utils/plantMetricUtils";
import ColorBadge from "@/components/common/ColorBadge";
import {
  PLANT_STATUS_COLORS,
  getPlantStatusColorBadgeVariant,
} from "@/components/core/main-dashboard/constants/statusColors";

interface ListViewProps {
  plants: PlantDashboardMetrics[];
  loading?: boolean;
  tableRef: RefObject<CommonTableHandle | null>;
}

const ENTITY_KEY = "main-dashboard-plants";

function statusCellRenderer(params: { value: PlantOperationalStatus }) {
  const status = params.value ?? "unknown";
  return (
    <ColorBadge variant={getPlantStatusColorBadgeVariant(status)}>
      {PLANT_STATUS_COLORS[status].label}
    </ColorBadge>
  );
}

function actionsRenderer(params: { data?: PlantDashboardMetrics }) {
  if (!params.data) return null;
  return (
    <Link
      to={`/plants/${params.data.plantId}`}
      className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
    >
      View
    </Link>
  );
}

const DEFAULT_COLUMNS: CommonColumnConfig[] = [
  buildTextColumn("plantName", "Plant Name", { minWidth: 160, pinned: "left" }),
  {
    field: "status",
    headerName: "Status",
    minWidth: 110,
    visible: true,
    cellRenderer: statusCellRenderer,
  },
  {
    field: "currentPowerKw",
    headerName: "Power",
    minWidth: 100,
    visible: true,
    valueFormatter: (p) => formatPowerKw(p.value),
  },
  {
    field: "yield",
    headerName: "Yield",
    minWidth: 90,
    visible: true,
    valueFormatter: (p) => formatPlantMetricValue("yield", p.value),
  },
  {
    field: "todayGenerationKwh",
    headerName: "Generation",
    minWidth: 110,
    visible: true,
    valueFormatter: (p) => formatEnergyKwh(p.value),
  },
  {
    field: "revenue",
    headerName: "Revenue",
    minWidth: 100,
    visible: true,
    valueFormatter: (p) => formatPlantMetricValue("revenue", p.value),
  },
  {
    field: "exportPowerKw",
    headerName: "Export",
    minWidth: 90,
    visible: true,
    valueFormatter: (p) => formatPowerKw(p.value),
  },
  {
    field: "importPowerKw",
    headerName: "Import",
    minWidth: 90,
    visible: true,
    valueFormatter: (p) => formatPowerKw(p.value),
  },
  {
    field: "acCapacityKw",
    headerName: "AC Capacity",
    minWidth: 110,
    visible: true,
    valueFormatter: (p) => formatCapacityKw(p.value),
  },
  {
    field: "dcCapacityKw",
    headerName: "DC Capacity",
    minWidth: 110,
    visible: true,
    valueFormatter: (p) => formatCapacityKw(p.value),
  },
  {
    field: "alertsCount",
    headerName: "Alerts",
    minWidth: 80,
    visible: true,
  },
  getDateColumn("lastUpdated", "Last Updated", { minWidth: 170 }),
  getActionsColumn(actionsRenderer as any),
];

export function ListView({ plants, loading, tableRef }: ListViewProps) {
  const rows = useMemo(
    () =>
      plants.map((p) => ({
        ...p,
        id: p.plantId,
      })),
    [plants],
  );

  return (
    <div className="h-full min-h-0 overflow-hidden p-2">
      <CommonTable
        ref={tableRef}
        entityKey={ENTITY_KEY}
        columns={DEFAULT_COLUMNS}
        defaultColumns={DEFAULT_COLUMNS}
        data={rows}
        loading={loading}
        rowIdField="plantId"
        tableHeight="100%"
        gridMinHeight={320}
        className="h-full rounded-sm"
      />
    </div>
  );
}
