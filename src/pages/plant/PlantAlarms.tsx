import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import {
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";
import ColorBadge from "@/components/common/ColorBadge";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import {
  getDateColumn,
  getDisplayTextColumn,
  getRendererColumn,
  getActiveStatusColumn,
  getLinkColumn,
} from "@/components/core/table/ListPageHelpers";
import {
  useGetPlantAlarmsQuery,
  ALARM_SEVERITY_OPTIONS,
  ALARM_ACTIVE_FILTER_OPTIONS,
  ALARM_SORT_OPTIONS,
  type AlarmRow,
  type AlarmListFilters,
} from "@/services/operations/alarmAPI";
import type {
  ICellRendererParams,
} from "@ag-grid-community/core";

// ─── Entity key ───────────────────────────────────────────────────────────────

const ALARM_ENTITY_KEY = "plantAlarm";

// ─── Filter helpers ────────────────────────────────────────────────────────────

const {
  buildSelectFilter,
  buildSortFilterFields,
  buildTextFilter,
  buildDateRangeFilterField,
  createFilterDefaults,
  setScalarFilterParam,
} = CommonFilterPanel;

const ALARM_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "severity",
    "is_active",
    "alarm_code",
    "device_id",
    "component_id",
    "occurred_at",
  ],
});

function toAlarmApiFilters(filters: FilterValues): AlarmListFilters {
  const sort_by = filters.sort_by?.trim() || "occurred_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, unknown> = { sort_by, sort_order };

  setScalarFilterParam(base, filters, "severity");
  setScalarFilterParam(base, filters, "is_active");
  setScalarFilterParam(base, filters, "alarm_code");
  setScalarFilterParam(base, filters, "device_id");
  setScalarFilterParam(base, filters, "component_id");
  const occurredFrom = filters.occurred_at_from?.trim();
  const occurredTo = filters.occurred_at_to?.trim();
  if (occurredFrom) base.occurred_at_start = occurredFrom;
  if (occurredTo) base.occurred_at_end = occurredTo;

  return base as AlarmListFilters;
}

// ─── Column definitions  ────────────────────────────

const alarmColumns: CommonColumnConfig[] = [
  getRendererColumn(
    "alarm_code",
    "Alarm Code",
    (params: ICellRendererParams<AlarmRow, string>) =>
      params.value ? (
        <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          {params.value}
        </span>
      ) : (
        "-"
      ),
    { pinned: "left", minWidth: 140 }
  ),
  getDisplayTextColumn("alarm_name", "Alarm Name", { minWidth: 200 }),
  getRendererColumn(
    "severity",
    "Severity",
    (params: ICellRendererParams<AlarmRow, string>) => {
      const severity = params.value;
      if (!severity) return "-";
      let variant: "no" | "orange" | "blue" | "gray" = "gray";
      if (severity === "CRITICAL") variant = "no";
      else if (severity === "HIGH") variant = "orange";
      else if (severity === "MEDIUM") variant = "blue";

      return (
        <ColorBadge variant={variant}>
          {severity === "CRITICAL"
            ? "Critical"
            : severity === "HIGH"
            ? "High"
            : severity === "MEDIUM"
            ? "Medium"
            : "Low"}
        </ColorBadge>
      );
    },
    { minWidth: 130, filter: "agSetColumnFilter" }
  ),
  getActiveStatusColumn("is_active", "Status", {
    minWidth: 110,
    trueLabel: "Active",
    falseLabel: "Cleared",
    falseVariant: "gray",
  }),
  getLinkColumn(
    "plant_id",
    "Plant",
    (params) => (params.data?.plant_id ? `/plants/${params.data.plant_id}` : null),
    {
      minWidth: 180,
      valueGetter: (params) => params.data?.plant_name || params.data?.plant_id || "-",
    }
  ),
  getLinkColumn(
    "device_name",
    "Device",
    (params) => {
      const dId = params.data?.device_id || (params.data as any)?.deviceId;
      return dId ? `/devices/${dId}` : null;
    },
    {
      minWidth: 180,
      valueGetter: (params: ICellRendererParams<AlarmRow, string>) =>
        params.data?.device_name || params.data?.device_id || (params.data as any)?.deviceId || "-",
    }
  ),
  getLinkColumn(
    "component_id",
    "Component",
    (params) => (params.data?.component_id ? `/components/${params.data.component_id}` : null),
    {
      minWidth: 180,
      valueGetter: (params) => params.data?.component_name || params.data?.component_id || "-",
    }
  ),
  getDisplayTextColumn("component_code", "Component Code", { minWidth: 160 }),
  getDisplayTextColumn("device_serial", "Device Serial", { minWidth: 150 }),
  getDisplayTextColumn("tenant_name", "Tenant", {
    visible: false,
    minWidth: 180,
  }),
  getDateColumn("occurred_at", "Occurred At", { minWidth: 200 }),
  getDateColumn("cleared_at", "Cleared At", { minWidth: 200 }),
  getDateColumn("created_at", "Created At", { minWidth: 200 }),
];

// ─── Page component ───────────────────────────────────────────────────────────

const PlantAlarms: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();

  // ── Local state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(ALARM_FILTER_DEFAULTS);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const tableRef = React.useRef<CommonTableHandle>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();

  // ── API filters ───────────────────────────────────────────────────────────
  const apiFilters = useMemo(() => toAlarmApiFilters(filters), [filters]);

  // ── Data query ────────────────────────────────────────────────────────────
  const {
    data: alarmResponse,
    isLoading,
    isError,
    error,
  } = useGetPlantAlarmsQuery({
    plantId,
    search,
    filters: apiFilters,
    page,
    limit: pageSize,
    enabled: !!plantId,
  });

  // ── Error toast ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isError) {
      const msg = error
        ? getErrorMessage(error)
        : "Failed to load alarms. Please try again.";
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
  }, [isError, error]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const tableData = useMemo(
    () => alarmResponse?.rows ?? [],
    [alarmResponse?.rows],
  );

  const pagination = useMemo(
    () => alarmResponse?.pagination,
    [alarmResponse?.pagination],
  );

  // ── Row click (disabled since there's no detail page yet) ──────────────────
  const handleRowClick = () => {};

  // ── Filter fields ─────────────────────────────────────────────────────────
  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortFields = buildSortFilterFields({
      sortOptions: ALARM_SORT_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    return [
      ...sortFields,
      buildSelectFilter("severity", "Severity", ALARM_SEVERITY_OPTIONS),
      buildSelectFilter("is_active", "Status", ALARM_ACTIVE_FILTER_OPTIONS),
      buildTextFilter("alarm_code", "Alarm code"),
      buildDateRangeFilterField({
        key: "occurred_at",
        label: "Occurred",
        startKey: "occurred_at_from",
        endKey: "occurred_at_to",
      }),
    ];
  }, []);

  // ── View tabs ─────────────────────────────────────────────────────────────
  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  // ── Toolbar actions
  const toolbarActions = [
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search alarms..."
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) =>
              setSelectedView(key as "table" | "cards")
            }
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <CommonDataView
              data={tableData}
              loading={isLoading}
              entityKey={ALARM_ENTITY_KEY}
              entityLabel="Alarm"
              columns={localColumns}
              defaultColumns={alarmColumns}
              selectedView={selectedView as "table" | "cards"}
              tableRef={tableRef}
              page={page}
              pageSize={pageSize}
              total={pagination?.totalCount ?? 0}
              totalPages={pagination?.totalPages ?? 1}
              pageStateConfig={{ setPage, setPageSize }}
              getRowId={(row: AlarmRow) => row.id}
              onRowClick={handleRowClick}
              columnSelectorTitle="Alarm Columns"
              columnStateConfig={{
                setColumns: setLocalColumns,
              }}
              columnPanelRef={columnPanelRef}
              filterFields={filterFields}
              filters={filters}
              onFiltersChange={setFilters}
              onApplyFilters={() => setPage(1)}
              onClearFilters={() => {
                setFilters(ALARM_FILTER_DEFAULTS);
                setPage(1);
              }}
              filterPanelRef={filterPanelRef}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlantAlarms;
