import type { ReactNode } from "react";
import type { ICellRendererParams, ValueFormatterParams } from "@ag-grid-community/core";
import { BarChart3, CalendarDays, Layers } from "lucide-react";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import ColorBadge from "@/components/common/ColorBadge";
import CommonTable, { type CommonColumnConfig } from "@/components/core/table/CommonTable";
import { usePlantLiveData, type PlantEquipmentLiveRow } from "@/hooks/usePlantLiveData";
import { dateTimeFormatter } from "@/utils/gridFormatters";
import {
  buildEquipmentColumnsFromRows,
  formatCellValue,
  normalizeStatus,
  resolveCommunicationMode,
  type EquipmentColumnKind,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardEmptyState } from "../shared/PlantDashboardEmptyState";
import { PlantDashboardSegmentedControl } from "../shared/PlantDashboardSegmentedControl";
import { PlantDashboardTableFrame } from "../shared/PlantDashboardTableFrame";
import { PLANT_DASHBOARD_SECTION_LABEL } from "../shared/plantDashboardTheme";
import {
  DEVICES_OVERVIEW_TYPES,
  DEVICES_TIME_RANGES,
  enrichEquipmentRowsWithPlantDetails,
  filterRowsByTimeRange,
  orderDevicesOverviewFields,
  resolveDevicesOverviewDateRange,
  type DevicesOverviewDeviceType,
  type DevicesOverviewTimeRange,
} from "./devicesOverview";
import type { DevicesOverviewWidgetConfig } from "../shared/dashboardTypes";

interface DevicesOverviewWidgetProps {
  plantId?: string;
  title?: string;
  config?: DevicesOverviewWidgetConfig;
  embedded?: boolean;
}

function statusVariant(status: string): "green" | "orange" | "no" | "gray" {
  const normalized = status.toLowerCase();
  if (["online", "live", "connected", "healthy", "active"].includes(normalized)) {
    return "green";
  }
  if (["offline", "disconnected", "fault", "error"].includes(normalized)) {
    return "no";
  }
  if (["warning", "delayed", "stale", "partial"].includes(normalized)) {
    return "orange";
  }
  return "gray";
}

function renderDevicesCell(
  kind: EquipmentColumnKind,
  params: ICellRendererParams<unknown, unknown>,
): ReactNode {
  if (kind === "datetime") {
    return params.value
      ? dateTimeFormatter({ value: params.value } as ValueFormatterParams)
      : "-";
  }

  if (kind === "status") {
    const value = String(params.value ?? "Unknown");
    const normalized = normalizeStatus(value);
    return (
      <ColorBadge variant={statusVariant(normalized)}>
        {normalized === "online" ? "Online" : normalized === "offline" ? "Offline" : value}
      </ColorBadge>
    );
  }

  const field = String(params.colDef?.field ?? "");
  return formatCellValue(params.data, field);
}

function buildColumnsForDeviceType(
  rows: PlantEquipmentLiveRow[],
  componentType: EquipmentFilterComponentType,
  visibleColumns?: string[],
): CommonColumnConfig[] {
  if (rows.length === 0) return [];

  const communicationMode = resolveCommunicationMode(componentType, false);
  const columns = buildEquipmentColumnsFromRows({
    rows,
    componentType,
    communicationMode,
    renderCell: renderDevicesCell,
  });

  const orderedFields = orderDevicesOverviewFields(
    columns.map((column) => String(column.field ?? "")),
    componentType,
  );

  const fields = visibleColumns?.length
    ? orderedFields.filter((field) => visibleColumns.includes(field))
    : orderedFields;

  return fields
    .map((field) => columns.find((column) => column.field === field))
    .filter((column): column is CommonColumnConfig => column != null);
}

export function DevicesOverviewWidget({
  plantId,
  title = "Devices Overview",
  config,
  embedded = false,
}: DevicesOverviewWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const enabledComponentTypes = config?.enabledComponentTypes;
  const enabledTimeRangeIds = config?.enabledTimeRanges;
  const visibleColumns = config?.visibleColumns;
  const enabledDeviceTypes = useMemo(() => {
    if (!enabledComponentTypes?.length) return DEVICES_OVERVIEW_TYPES;
    const allowed = new Set(enabledComponentTypes);
    return DEVICES_OVERVIEW_TYPES.filter((type) => allowed.has(type.id));
  }, [enabledComponentTypes]);
  const enabledTimeRanges = useMemo(() => {
    if (!enabledTimeRangeIds?.length) return DEVICES_TIME_RANGES;
    const allowed = new Set(enabledTimeRangeIds);
    return DEVICES_TIME_RANGES.filter((range) => allowed.has(range.id));
  }, [enabledTimeRangeIds]);

  const [deviceTypeSelection, setDeviceTypeSelection] = useState<DevicesOverviewDeviceType["id"]>(
    config?.defaultComponentType ?? "inverter",
  );
  const [timeRangeSelection, setTimeRangeSelection] = useState<DevicesOverviewTimeRange>(
    config?.defaultTimeRange ?? "live",
  );
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const deviceType = useMemo(() => {
    if (enabledDeviceTypes.some((type) => type.id === deviceTypeSelection)) {
      return deviceTypeSelection;
    }
    return enabledDeviceTypes[0]?.id ?? deviceTypeSelection;
  }, [deviceTypeSelection, enabledDeviceTypes]);

  const timeRange = useMemo(() => {
    if (enabledTimeRanges.some((range) => range.id === timeRangeSelection)) {
      return timeRangeSelection;
    }
    return enabledTimeRanges[0]?.id ?? timeRangeSelection;
  }, [enabledTimeRanges, timeRangeSelection]);

  const dateRange = useMemo(
    () => resolveDevicesOverviewDateRange({ timeRange, customDate }),
    [timeRange, customDate],
  );

  const equipmentRows = useMemo(() => {
    const rows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType: deviceType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      interval: dateRange.interval,
      search: "",
      preserveArrays: false,
    }) as PlantEquipmentLiveRow[];

    const enriched = enrichEquipmentRowsWithPlantDetails(rows, live.componentById);
    return filterRowsByTimeRange(enriched, timeRange, customDate);
  }, [live, deviceType, dateRange, timeRange, customDate]);

  const tableColumns = useMemo(
    () => buildColumnsForDeviceType(equipmentRows, deviceType, visibleColumns),
    [deviceType, equipmentRows, visibleColumns],
  );

  const handleDeviceTypeChange = useCallback((type: DevicesOverviewDeviceType["id"]) => {
    setDeviceTypeSelection(type);
  }, []);

  const loading = live.isComponentsLoading && !live.hasLiveData;
  const showComponentTabs = config?.showComponentTypeTabs !== false && enabledDeviceTypes.length > 1;

  return (
    <PlantDashboardCard
      icon={BarChart3}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        {config?.showTimeRangeTabs === false ? <span /> : (
          <PlantDashboardSegmentedControl
            options={enabledTimeRanges.map((range) => ({ id: range.id, label: range.label }))}
            value={timeRange}
            onChange={setTimeRangeSelection}
          />
        )}

        <div className="flex items-center gap-2">
          {timeRange === "custom" ? (
            <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
              <CalendarDays className="h-3.5 w-3.5" />
              <input
                type="date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                className="rounded-xs border border-neutral-200/80 bg-white px-1.5 py-1 text-[10px] text-neutral-900 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100 dark:text-neutral-dark-950"
              />
            </label>
          ) : (
            <span className="text-[10px] tabular-nums text-neutral-500 dark:text-neutral-dark-600">
              {dateRange.label}
            </span>
          )}
        </div>
      </div>

      {showComponentTabs ? (
        <div className="mb-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-neutral-400 dark:text-neutral-dark-500" strokeWidth={1.75} />
            <span className={PLANT_DASHBOARD_SECTION_LABEL}>Available Components</span>
          </div>
          <PlantDashboardSegmentedControl
            options={enabledDeviceTypes.map((type) => ({ id: type.id, label: type.label }))}
            value={deviceType}
            onChange={handleDeviceTypeChange}
            size="md"
          />
        </div>
      ) : null}

      <PlantDashboardTableFrame>
        <CommonTable
          entityKey={`plant-dashboard-devices-${plantId ?? "plant"}-${deviceType}`}
          columns={tableColumns}
          defaultColumns={tableColumns}
          data={equipmentRows}
          loading={loading}
          columnSelectorTitle="Devices Overview"
          pageSize={config?.pageSize ?? 10}
          tableHeight={config?.tableHeight ?? 360}
          rowIdField="component_id"
        />
      </PlantDashboardTableFrame>

      {!loading && equipmentRows.length === 0 ? (
        <PlantDashboardEmptyState
          message="No device data found"
          description="No live data for the selected component type and time range."
          className="mt-2"
        />
      ) : null}
    </PlantDashboardCard>
  );
}
