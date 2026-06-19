/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Activity,
  BarChart3,
  Box,
  Cpu,
  Factory,
  Layers,
  LayoutGrid,
  RefreshCcw,
  Search,
  Share2,
  Table as TableIcon,
  Waypoints,
  Zap,
} from "lucide-react";
import { InverterTypesAssetIcon } from "@/components/core/navbar/navItems";
import type { ICellRendererParams } from "@ag-grid-community/core";
import CommonToolbar, {
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import {
  getDateColumn,
  getDisplayTextColumn,
  getRendererColumn,
} from "@/components/core/table/ListPageHelpers";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import {
  extractLatestValue,
  toTitleCaseLabel,
} from "@/utils/plantLiveFormatters";
import { formatComponentTypeLabel } from "@/utils/componentFormatters";
import {
  DATA_VIEW_OPTIONS,
  HISTORY_SORT_OPTIONS,
} from "@/utils/selectOptions";
import {
  fetchComponentOptions,
  fetchHistoryTagGroupOptions,
  fetchTagGroupCategoryOptions,
  fetchTagMapKeyOptions,
  type HistoryListFilters,
  type HistoryRow,
  useGetPlantHistoryQuery,
} from "@/services/operations/historyAPI";
import { useGetPlantDetailsQuery } from "@/services/operations/plantAPI";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
} from "@/components/core/navbar/DetailSideNav";
import { DetailPageShell } from "@/components/core/detail/DetailPagePrimitives";
import { useMediaQuery } from "usehooks-ts";
import { usePlantComponents } from "@/hooks/usePlantComponents";

const ENTITY_KEY = "plantHistory";

const {
  buildAsyncSelectFilter,
  buildAsyncMultiselectFilter,
  buildDateRangeFilterField,
  buildSortFilterFields,
  createFilterDefaults,
  parseSingleFilter,
  parseMultiFilter,
  setScalarFilterParam,
  setSingleSelectFilterParam,
} = CommonFilterPanel;

const HISTORY_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "device_id",
    "block_id",
    "acdb_id",
    "inverter_id",
    "component_id",
    "tag_group_id",
    "category",
    "json_key",
    "date_start",

    "date_end",
    "created_at_start",
    "created_at_end",
    "last_only",
  ],
  sortBy: "date",
  sortOrder: "desc",
});

const META_FIELDS = new Set([
  "id",
  "plant_id",
  "plant_name",
  "tenant_id",
  "tenant_name",
  "device_id",
  "device_name",
  "component_id",
  "component_name",
  "component_type",
  "tag_group_id",
  "date",
  "timestamp",
  "created_at",
  "updated_at",
  "data",
  "data_json",
  "processed_data",
  "processed_data_json",
  "raw_data",
  "metadata",
]);


function flattenHistoryData(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    
    const latest = extractLatestValue(val);

    if (latest !== null && latest !== undefined && typeof latest === "object" && !Array.isArray(latest)) {
     
      Object.assign(flat, flattenHistoryData(latest as Record<string, unknown>, fullKey));
    } else {
      
      flat[fullKey] = latest;
    }
  }

  return flat;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeHistoryRow(row: HistoryRow): Record<string, unknown> {
  const dataPayload = {
    ...flattenHistoryData(parseJsonObject(row.data)),
    ...flattenHistoryData(parseJsonObject(row.data_json)),
    ...flattenHistoryData(parseJsonObject(row.processed_data)),
    ...flattenHistoryData(parseJsonObject(row.processed_data_json)),
  };

 
  return {
    ...row,
    ...dataPayload,
    timestamp: row.timestamp ?? row.date ?? row.created_at ?? null,
  };
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  // If an array slipped through, show its last real value
  if (Array.isArray(value)) {
    const resolved = extractLatestValue(value);
    return resolved !== null ? formatCellValue(resolved) : "-";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toJsonKeyList(value: string | string[]) {
  if (Array.isArray(value)) return value;
  return (value || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .slice(0, 50);
}

const SIDEBAR_ICON_MAP: Record<string, any> = {
  plant: Factory, P: Factory,
  meter: Activity, M: Activity,
  block: Box, B: Box, SCB: Box, ICB: Box,
  acdb: Zap, AC: Zap,
  inverter: InverterTypesAssetIcon, INV: InverterTypesAssetIcon,
  dc_channel: Share2, DC: Share2, STR: Share2,
  tracker: Waypoints, TRC: Waypoints,
  weather_station: Activity, WS: Activity,
  relay: Cpu, RY: Cpu,
};




const baseColumns: CommonColumnConfig[] = [
  getDateColumn("timestamp", "Data Time", { minWidth: 185, pinned: "left" }),
  getRendererColumn("component_name", "Component", (params: ICellRendererParams) =>
    params.value ?? params.data?.component_id ?? "-", { minWidth: 190 }),
  getRendererColumn("device_name", "Device", (params: ICellRendererParams) =>
    params.value ?? params.data?.device_id ?? "-", { minWidth: 170 }),
  getDisplayTextColumn("component_type", "Type", { minWidth: 120 }),
  getDateColumn("created_at", "Created At", { visible: false, minWidth: 185 }),
];

const PlantHistory: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [componentType, setComponentType] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedView, setSelectedView] = useResponsiveDataView("table");
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[] | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValues>(HISTORY_FILTER_DEFAULTS);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const dynamicEntityKey = `history-${componentType || "all"}`;

  const columnPanelRef = useRef<{ openPanel: () => void }>(null);
  const filterPanelRef = useRef<{ openPanel: () => void }>(null);
  const tableRef = useRef<CommonTableHandle>(null);

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useImperativeHandle(
    filterPanelRef,
    () => ({ openPanel: () => setShowFilterPanel(true) }),
    []
  );

  useGetPlantDetailsQuery(plantId);
  const { availableEquipmentComponentTypes } = usePlantComponents({ plantId });
  const firstAvailableType = availableEquipmentComponentTypes[0] ?? "";
  const effectiveComponentType = componentType || firstAvailableType;

  const sidebarItems = useMemo(() => {
      return availableEquipmentComponentTypes.map((type) => ({
        key: type,
        label: formatComponentTypeLabel(type),
        icon: SIDEBAR_ICON_MAP[type] || SIDEBAR_ICON_MAP[type.toUpperCase()] || Layers,
        active: effectiveComponentType === type,
        onClick: () => setComponentType(type),
      }));
  }, [availableEquipmentComponentTypes, effectiveComponentType]);

  const filterFields = useMemo<FilterFieldConfig[]>(() => {
    const fields: FilterFieldConfig[] = [
      buildAsyncSelectFilter(
        "tag_group_id",
        "Tag Group",
        (input) => fetchHistoryTagGroupOptions(plantId!, input),
        { placeholder: "Select tag group..." }
      ),
      buildAsyncSelectFilter(
        "category",
        "Tag Group Category",
        (input) => fetchTagGroupCategoryOptions(input),
        { placeholder: "Select tag group category..." }
      ),
      buildAsyncSelectFilter(
        "device_id",
        "Device",
        (input) => fetchDeviceNames(input, 1, 100, plantId),
        { placeholder: "All devices", apiSearch: true }
      ),
    ];

    if (["block", "acdb", "inverter", "dc_channel", "tracker"].includes(effectiveComponentType)) {
      fields.push(
        buildAsyncSelectFilter(
          "block_id",
          "Block",
          (input) => fetchComponentOptions(plantId!, "B", undefined, input),
          { placeholder: "All blocks", apiSearch: true }
        )
      );
    }

    if (["acdb", "inverter", "dc_channel"].includes(effectiveComponentType)) {
      fields.push(
        buildAsyncSelectFilter(
          "acdb_id",
          "ACDB",
          (input) => fetchComponentOptions(plantId!, "AC", filters.block_id, input),
          { placeholder: "All ACDBs", apiSearch: true }
        )
      );
    }

    if (["inverter", "dc_channel"].includes(effectiveComponentType)) {
      fields.push(
        buildAsyncSelectFilter(
          "inverter_id",
          "Inverter",
          (input) => fetchComponentOptions(plantId!, "INV", filters.acdb_id, input),
          { placeholder: "All inverters", apiSearch: true }
        )
      );
    }


    // Generic component filter as fallback or for types without specific hierarchy
    if (!["block", "acdb", "inverter"].includes(effectiveComponentType)) {
      fields.push(
        buildAsyncSelectFilter(
          "component_id",
          "Component",
          (input) => {
            const code = effectiveComponentType === "meter" ? "M" : effectiveComponentType;
            return fetchComponentOptions(plantId!, code, filters.device_id, input);
          },
          { placeholder: "All components", apiSearch: true }
        )
      );
    }

    const selectedComponentIds = [
      parseSingleFilter(filters.inverter_id),
      parseSingleFilter(filters.acdb_id),
      parseSingleFilter(filters.block_id),
      parseSingleFilter(filters.component_id),
    ].filter(Boolean) as string[];

    const jsonKeyFieldKey = `json_key__${selectedComponentIds.join("-") || "all"}`;

    fields.push(
      buildAsyncMultiselectFilter(
        jsonKeyFieldKey,
        "Tag Map Keys",
        (input) => fetchTagMapKeyOptions(selectedComponentIds, input),
        { placeholder: "Select tag map keys...", apiSearch: true }
      ),
      buildDateRangeFilterField({
        key: "date",
        label: "Data Date",
        startKey: "date_start",
        endKey: "date_end",
      }),
      buildDateRangeFilterField({
        key: "created_at",
        label: "Created Date",
        startKey: "created_at_start",
        endKey: "created_at_end",
      }),
      {
        key: "last_only",
        label: "Latest Snapshot",
        type: "select",
        options: DATA_VIEW_OPTIONS,
      },
      ...buildSortFilterFields({
        sortOptions: HISTORY_SORT_OPTIONS,
      }),
    );

    return fields;
  }, [plantId, effectiveComponentType, filters.device_id, filters.block_id, filters.acdb_id, filters.inverter_id, filters.component_id]);

  const apiFilters = useMemo<HistoryListFilters>(() => {
    const out: HistoryListFilters = {
      sort_by: filters.sort_by || "date",
      sort_order: (filters.sort_order || "desc").toLowerCase(),
    };

    setSingleSelectFilterParam(out as any, filters, "tag_group_id");
    setSingleSelectFilterParam(out as any, filters, "category");
    setSingleSelectFilterParam(out as any, filters, "device_id");


    // Hierarchical component selection logic: pick the most specific ID, ensuring it's a raw string
    const effectiveCompId =
      parseSingleFilter(filters.inverter_id) ||
      parseSingleFilter(filters.acdb_id) ||
      parseSingleFilter(filters.block_id) ||
      parseSingleFilter(filters.component_id);

    if (effectiveCompId) (out as any).component_id = effectiveCompId;

    if (effectiveComponentType) {
      const typeMap: Record<string, string> = {
        meter: "M",
        block: "B",
        acdb: "AC",
        inverter: "INV",
        dc_channel: "DC",
        weather_station: "WS",
        tracker: "TRC",
        plant: "P",
      };
      (out as any).component_type = typeMap[effectiveComponentType] || effectiveComponentType;
    }


    const keys = parseMultiFilter(
      (Object.entries(filters).find(([k]) => k.startsWith("json_key__"))?.[1] ?? filters.json_key) as string | undefined
    );
    if (keys.length === 1) (out as any).json_key = keys[0];
    else if (keys.length > 1) (out as any).json_key = keys;

    setScalarFilterParam(out as any, filters, "date_start");
    setScalarFilterParam(out as any, filters, "date_end");
    setScalarFilterParam(out as any, filters, "created_at_start");
    setScalarFilterParam(out as any, filters, "created_at_end");

    if (filters.last_only === "true") {
      out.last_only = true;
    } else if (filters.last_only === "false") {
      out.last_only = false;
    }

    return out;
  }, [filters, effectiveComponentType]);

  const {
    data: historyResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetPlantHistoryQuery({
    plantId,
    page,
    limit: pageSize,
    filters: apiFilters as any,
    enabled: !!plantId,
  });

  useEffect(() => {
    if (isError) {
      toast.error(getErrorMessage(error) || "Failed to load history data.");
    }
  }, [error, isError]);

  const rows = useMemo(
    () => (historyResponse?.rows ?? []).map(normalizeHistoryRow),
    [historyResponse],
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) =>
        formatCellValue(value).toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const dataKeys = useMemo(() => {
    const keysFromFilter = toJsonKeyList(filters.json_key || "");
    if (keysFromFilter.length > 0) return keysFromFilter;

    const keys = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        // Exclude internal meta fields and internal tracking fields
        if (
          !META_FIELDS.has(key) &&
          !key.startsWith("_")
        ) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [filters.json_key, rows]);

  const defaultColumns = useMemo<CommonColumnConfig[]>(
    () => [
      ...baseColumns,
      ...dataKeys.map((key) => ({
        field: key,
        headerName: toTitleCaseLabel(key),
        visible: true,
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams) => formatCellValue(params.value),
      })),
    ],
    [dataKeys],
  );

  const activeColumns = useMemo(() => {
    return localColumns && localColumns.length > 0 ? localColumns : defaultColumns;
  }, [localColumns, defaultColumns]);

  const chartKey = useMemo(() => {
    const keysFromFilter = toJsonKeyList(filters.json_key || "");
    if (keysFromFilter.length > 0) return keysFromFilter[0];
    return dataKeys.find((key) => rows.some((row) => toNumber(row[key]) !== null)) ?? "";
  }, [dataKeys, filters.json_key, rows]);

  const dataKeysHash = useMemo(() => dataKeys.join(","), [dataKeys]);

  const chartOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "spline",
        zoomType: "x",
        height: 500,
        backgroundColor: "transparent",
        style: { fontFamily: "inherit" },
      },
      title: { text: "" },
      xAxis: { type: "datetime", crosshair: true },
      yAxis: {
        title: { text: chartKey ? chartKey.replaceAll("_", " ") : "Value" },
        gridLineColor: "rgba(148, 163, 184, 0.18)",
      },
      series: [
        {
          name: chartKey ? chartKey.replaceAll("_", " ") : "Value",
          type: "spline",
          color: "#E97124",
          data: visibleRows
            .map((row) => {
              const time = new Date(String(row.timestamp || "")).getTime();
              const value = toNumber(chartKey ? row[chartKey] : null);
              return Number.isFinite(time) && value !== null ? [time, value] : null;
            })
            .filter((p): p is [number, number] => p !== null)
            .sort((a, b) => a[0] - b[0]),
        },
      ],
      credits: { enabled: false },
      tooltip: {
        shared: true,
        xDateFormat: "%d %b %Y, %H:%M",
        valueDecimals: 2,
      },
    }),
    [chartKey, visibleRows],
  );

  const toolbarActions = useMemo(() => {
    return [
      buildFiltersAction(),
      {
        key: "refresh",
        label: "Refresh",
        icon: <RefreshCcw className="h-4 w-4" />,
        onClick: () => { void refetch(); },
        variant: "outline" as const,
        show: true,
      },
      buildColumnsAction({ show: selectedView === "table" }),
      buildExportAction({ show: selectedView === "table", fileName: `history-${plantId}` }),
    ];
  }, [plantId, selectedView, refetch]);

  const handleClearFilters = () => {
    setFilters(HISTORY_FILTER_DEFAULTS);
    setSearch("");
    setPage(1);
  };

  const handleComponentTypeChange = (key: string) => {
    setComponentType(key);
    setFilters((prev) => ({ ...prev, component_id: "" }));
    setPage(1);
  };

  return (
    <DetailPageShell
      sidebarOpen={sidebarOpen}
      isLargeScreen={isLargeScreen}
      onBack={() => navigate(-1)}
      mobileNav={
        <DetailMobileNav
          items={sidebarItems}
          mode="state"
          activeKey={componentType}
          onSelect={handleComponentTypeChange}
          onBack={() => navigate(-1)}
          backLabel="Back"
        />
      }
      desktopSidebar={
        <DetailDesktopSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onBack={() => navigate(-1)}
          headerLabel="History"
          items={sidebarItems}
          mode="state"
          activeKey={componentType}
          onSelect={handleComponentTypeChange}
        />
      }
      header={null}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2">
        <CommonToolbar
          search={search}
          onSearchChange={setSearch}
          entityKey={dynamicEntityKey}
          actions={toolbarActions}
          placeholder="Search history data…"
          tabs={[
            { key: "table", label: "", icon: <TableIcon className="h-4 w-4" /> },
            { key: "analytics", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
          ]}
          selectedTab={selectedView}
          onTabChange={(key) => setSelectedView(key as any)}
          columnPanelRef={columnPanelRef}
          filterPanelRef={filterPanelRef}
          tableRef={tableRef}
        />

        <div className="relative min-h-0 flex-1">
          {selectedView === "table" ? (
            <CommonDataView
              key={`${dynamicEntityKey}-${dataKeysHash}`}
              data={visibleRows}
              loading={isLoading}
              entityKey={dynamicEntityKey}
              entityLabel="History"
              columns={activeColumns}
              defaultColumns={defaultColumns}
              selectedView="table"
              page={page}
              pageSize={pageSize}
              total={historyResponse?.pagination?.totalCount ?? 0}
              totalPages={historyResponse?.pagination?.totalPages ?? 1}
              pageStateConfig={{ setPage, setPageSize }}
              getRowId={(row: any) =>
                String(
                  row.id ||
                  `${row.component_id || row.device_id || "row"}-${row.timestamp || row.created_at || JSON.stringify(row).slice(0, 50)
                  }`,
                )
              }
              tableRef={tableRef}
              columnStateConfig={{ setColumns: setLocalColumns as any }}
              columnPanelRef={columnPanelRef}
              filters={filters}
              onFiltersChange={setFilters}
              className="min-h-0 flex-1 rounded-xs border border-neutral-200 bg-white dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
            />
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-dark-300 dark:bg-neutral-dark-200 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
                    History Trends
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
                    Visualizing {chartKey.replaceAll("_", " ")} over time
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    {componentType || "All Components"}
                  </span>
                </div>
              </div>
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
                  <RefreshCcw className="h-8 w-8 animate-spin text-brand-600" />
                  <span className="text-sm font-medium">Fetching chart data...</span>
                </div>
              ) : !chartKey || (chartOptions.series?.[0] as any)?.data?.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-neutral-400 dark:text-neutral-dark-600">
                  <div className="rounded-full bg-neutral-50 p-4 dark:bg-neutral-dark-100">
                    <BarChart3 className="h-10 w-10 opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">No numeric data available</p>
                    <p className="text-xs">Try adjusting your filters or selecting a different JSON key</p>
                  </div>
                </div>
              ) : (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              )}
            </div>
          )}
        </div>
      </div>

      <CommonFilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        entityKey={ENTITY_KEY}
        filterFields={filterFields}
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={() => {
          setShowFilterPanel(false);
          setPage(1);
          void refetch();
        }}
        onClearFilters={handleClearFilters}
        defaultFilters={HISTORY_FILTER_DEFAULTS}
      />
    </DetailPageShell>
  );
};

export default PlantHistory;
