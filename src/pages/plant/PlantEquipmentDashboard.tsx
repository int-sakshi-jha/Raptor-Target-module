import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  CommonColumnConfig,
  CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import ColorBadge from "@/components/common/ColorBadge";
import { dateTimeFormatter } from "@/utils/gridFormatters";
import type {
  ICellRendererParams,
  ValueFormatterParams,
} from "@ag-grid-community/core";
import {
  Activity,
  Box,
  Cpu,
  Factory,
  Layers,
  LayoutGrid,
  RefreshCcw,
  Server,
  Share2,
  Table2,
  Waypoints,
  Zap,
} from "lucide-react";
import { InverterTypesAssetIcon } from "@/components/core/navbar/navItems";
import { format, subDays } from "date-fns";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import {
  COMPONENT_METER_TYPE_OPTIONS,
  HISTORY_INTERVAL_OPTIONS,
} from "@/utils/selectOptions";

import {
  type CommunicationMode,
  type EquipmentColumnKind,
  type EquipmentFilterComponentType,
  buildEquipmentColumnsFromRows,
  DEVICE_ANALYSIS_KEY,
  resolveCommunicationMode,
  resolveEquipmentViewFromCode,
  toTitleCaseLabel,
} from "@/utils/plantLiveFormatters";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { buildTrackerEquipmentRows, buildTrackerZones } from "@/lib/plant/trackerLiveData";
import PlantEquipmentHeatmapPanel from "@/components/plant/PlantEquipmentHeatmapPanel";
import {
  DetailPageBackground,
  DetailPageShell,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";
import { useMediaQuery } from "usehooks-ts";
const { buildSelectFilter, parseSingleFilter } = CommonFilterPanel;

const EQUIPMENT_ENTITY_KEY = "plantEquipmentDashboard";
const LAYOUT_DATA_KEY = "__layout_data__";
const LAYOUT_HEATMAP_KEY = "__layout_heatmap__";

type EquipmentPageLayout = "data" | "heatmap";

interface EquipmentSelectorState extends FilterValues {
  analysisMode: "equipment" | typeof DEVICE_ANALYSIS_KEY;
  componentType: EquipmentFilterComponentType;
  meterType: string;
  blockId: string;
  acdbId: string;
  inverterId: string;
  deviceId: string;
  startDate: string;
  endDate: string;
  interval: string;
}

function buildInitialSelectorState(): EquipmentSelectorState {
  return {
    analysisMode: "equipment",
    componentType: "",
    meterType: "",
    blockId: "",
    acdbId: "",
    inverterId: "",
    deviceId: "",
    startDate: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    interval: "",
  };
}

const STATUS_GREEN = new Set(["live", "online", "connected", "healthy", "active"]);
const STATUS_ORANGE = new Set([
  "warning", "partial", "unstable", "connecting", "reconnecting", "delayed", "stale",
]);
const STATUS_RED = new Set(["disconnected", "offline", "fault", "error"]);

function getStatusVariant(value: unknown): "green" | "orange" | "no" | "gray" {
  const status = String(value ?? "").trim().toLowerCase();
  if (STATUS_GREEN.has(status)) return "green";
  if (STATUS_ORANGE.has(status)) return "orange";
  if (STATUS_RED.has(status)) return "no";
  return "gray";
}

function extractFilterId(raw: string): string {
  if (!raw || raw === "all") return raw;
  return parseSingleFilter(raw) ?? raw;
}

async function loadEquipmentDeviceOptions(search: string, plantId?: string) {
  const options = await fetchDeviceNames(search, 1, 50, plantId);
  return [{ value: "all", label: "All Devices" }, ...options];
}

function getLastValid(values: unknown[]): unknown {
  const valid = values.filter((v) => v != null && v !== "");
  return valid.length > 0 ? valid[valid.length - 1] : null;
}

function renderEquipmentCell(
  kind: EquipmentColumnKind,
  params: ICellRendererParams<unknown, unknown>,
): React.ReactNode {
  if (kind === "datetime") {
    return params.value
      ? dateTimeFormatter({ value: params.value } as ValueFormatterParams)
      : "-";
  }

  if (kind === "status") {
    let displayValue = params.value;
    if (Array.isArray(displayValue)) {
      displayValue = getLastValid(displayValue);
    } else if (displayValue && typeof displayValue === "object") {
      displayValue = getLastValid(Object.values(displayValue as Record<string, unknown>));
    }
    if (displayValue === 0 || displayValue === "0") displayValue = "Healthy";
    return displayValue != null ? (
      <ColorBadge variant={getStatusVariant(displayValue)}>
        {String(displayValue)}
      </ColorBadge>
    ) : "-";
  }

  if (params.value == null || params.value === "") return "-";

  if (Array.isArray(params.value)) {
    const last = getLastValid(params.value);
    return last != null ? String(last) : "-";
  }

  if (typeof params.value === "object") return JSON.stringify(params.value);

  return String(params.value);
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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




const DATA_VIEW_TABS = [
  { key: "table", label: "", icon: <Table2 className="h-4 w-4" /> },
  { key: "cards", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
];

const METER_TYPE_OPTIONS = [...COMPONENT_METER_TYPE_OPTIONS];
const INTERVAL_OPTIONS = [...HISTORY_INTERVAL_OPTIONS];

const PlantEquipmentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id: plantId } = useParams<{ id: string }>();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<EquipmentSelectorState>(buildInitialSelectorState);
  const [pageLayout, setPageLayout] = useState<EquipmentPageLayout>("data");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const filterPanelRef = useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = useRef<{ openPanel: () => void }>(null);
  const tableRef = useRef<CommonTableHandle>(null);

  const [selectedView, setSelectedView] = useResponsiveDataView("table", "cards");

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    availableEquipmentComponentTypes,
    getComponentOptions,
    components,
    componentById,
  } = usePlantComponents({ plantId });
  const {
    hasLiveData,
    isComponentsLoading,
    getEquipmentRows,
    processedByComponentId,
    plantLive,
  } = usePlantLiveData({ plantId });

  const trackerZones = useMemo(
    () => buildTrackerZones({ components, componentById }),
    [componentById, components],
  );

  const liveEquipmentTypes = useMemo(() => {
    if (!hasLiveData || !plantLive) return [];

    const types = new Set<EquipmentFilterComponentType>();
    for (const deviceLive of Object.values(plantLive.devices ?? {})) {
      for (const componentId of Object.keys(deviceLive.components ?? {})) {
        const meta = componentById.get(componentId);
        if (!meta) continue;

        const processed = deviceLive.components?.[componentId]?.processed_data;
        const hasPayload =
          (processed &&
            typeof processed === "object" &&
            Object.keys(processed as Record<string, unknown>).length > 0) ||
          Boolean(deviceLive.components?.[componentId]?.last_data_at);

        if (!hasPayload) continue;

        const equipmentType = resolveEquipmentViewFromCode(String(meta.component_type ?? ""));
        if (equipmentType) types.add(equipmentType);
      }
    }

    return availableEquipmentComponentTypes.filter((type) => types.has(type));
  }, [availableEquipmentComponentTypes, componentById, hasLiveData, plantLive]);

  const firstAvailableType = liveEquipmentTypes[0] ?? "";
  const effectiveComponentType: EquipmentFilterComponentType = (() => {
    if (filters.analysisMode === DEVICE_ANALYSIS_KEY) return "";
    if (
      filters.componentType &&
      liveEquipmentTypes.includes(filters.componentType as EquipmentFilterComponentType)
    ) {
      return filters.componentType;
    }
    return firstAvailableType;
  })();



  const showDeviceAnalysis = filters.analysisMode === DEVICE_ANALYSIS_KEY;
  const isTrackerMode = !showDeviceAnalysis && effectiveComponentType === "tracker";
  const communicationMode: CommunicationMode = resolveCommunicationMode(effectiveComponentType, showDeviceAnalysis);

  // ── Rows ───────────────────────────────────────────────────────────────────
  const liveRows = useMemo(() => {
    if (isTrackerMode) {
      return buildTrackerEquipmentRows({
        zones: trackerZones,
        processedCache: processedByComponentId,
        search,
      });
    }

    return getEquipmentRows({
      analysisMode: filters.analysisMode,
      componentType: effectiveComponentType,
      meterType: filters.meterType,
      blockId: extractFilterId(filters.blockId),
      acdbId: extractFilterId(filters.acdbId),
      inverterId: extractFilterId(filters.inverterId),
      deviceId: extractFilterId(filters.deviceId),
      startDate: filters.startDate,
      endDate: filters.endDate,
      interval: filters.interval,
      search,
    });
  }, [
    isTrackerMode,
    trackerZones,
    processedByComponentId,
    search,
    filters.acdbId,
    filters.analysisMode,
    filters.blockId,
    filters.deviceId,
    filters.endDate,
    filters.interval,
    filters.inverterId,
    filters.meterType,
    filters.startDate,
    effectiveComponentType,
    getEquipmentRows,
  ]);

  const totalRows = liveRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return liveRows.slice(start, start + pageSize);
  }, [currentPage, liveRows, pageSize]);

  const defaultColumns = useMemo(() => {
    if (liveRows.length === 0) return [];
    return buildEquipmentColumnsFromRows({
      rows: liveRows,
      componentType: effectiveComponentType,
      communicationMode,
      renderCell: renderEquipmentCell,
    });
  }, [communicationMode, effectiveComponentType, liveRows]);

  const activeColumns = localColumns.length > 0 ? localColumns : defaultColumns;

  // Show loading only while components have never loaded yet.
  // Once MQTT data starts arriving (hasLiveData=true) we always show rows.
  const isLoading = isComponentsLoading && !hasLiveData;

  // ── Filter fields ──────────────────────────────────────────────────────────
  // Destructure primitives so React Compiler tracks deps individually.
  const { blockId, acdbId } = filters;

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const fields: FilterFieldConfig[] = [];

    if (showDeviceAnalysis) {
      fields.push({
        key: "deviceId",
        label: "Device",
        type: "async-select",
        apiSearch: true,
        placeholder: "All devices",
        loadOptions: (s?: string) => loadEquipmentDeviceOptions(s ?? "", plantId),
      });
    }

    if (!showDeviceAnalysis && ["block", "acdb", "inverter", "dc_channel", "tracker"].includes(effectiveComponentType)) {
      fields.push({
        key: "blockId",
        label: "Block",
        type: "async-select",
        apiSearch: true,
        placeholder: "All blocks",
        loadOptions: (s?: string) =>
          Promise.resolve(getComponentOptions({ componentType: "B", search: s ?? "" })),
      });
    }
    if (!showDeviceAnalysis && ["acdb", "inverter", "dc_channel"].includes(effectiveComponentType)) {
      fields.push({
        key: "acdbId",
        label: "ACDB",
        type: "async-select",
        apiSearch: true,
        placeholder: "All ACDBs",
        loadOptions: (s?: string) =>
          Promise.resolve(getComponentOptions({ componentType: "AC", parentId: blockId || undefined, search: s ?? "" })),
      });
    }
    if (!showDeviceAnalysis && ["inverter", "dc_channel"].includes(effectiveComponentType)) {
      fields.push({
        key: "inverterId",
        label: "Inverter",
        type: "async-select",
        apiSearch: true,
        placeholder: "All inverters",
        loadOptions: (s?: string) =>
          Promise.resolve(getComponentOptions({ componentType: "INV", parentId: acdbId || undefined, search: s ?? "" })),
      });
    }

    if (!showDeviceAnalysis && effectiveComponentType === "meter") {
      fields.push(buildSelectFilter("meterType", "Meter Type", METER_TYPE_OPTIONS));
    }

    fields.push(buildSelectFilter("interval", "Interval", INTERVAL_OPTIONS));
    fields.push({ key: "dateFilter", label: "Date Range", type: "daterange", startKey: "startDate", endKey: "endDate" });

    return fields;
  }, [acdbId, blockId, effectiveComponentType, getComponentOptions, plantId, showDeviceAnalysis]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    setPage(1);
    setLocalColumns([]);
  }, []);

  const handleCategoryChange = useCallback((type: string) => {
    if (type === LAYOUT_DATA_KEY) {
      setPageLayout("data");
      return;
    }
    if (type === LAYOUT_HEATMAP_KEY) {
      setPageLayout("heatmap");
      return;
    }

    setFilters((current) => {
      const next = buildInitialSelectorState();
      if (type === DEVICE_ANALYSIS_KEY) {
        next.analysisMode = DEVICE_ANALYSIS_KEY;
        next.componentType = "";
        next.deviceId = current.deviceId || "all";
      } else {
        next.analysisMode = "equipment";
        next.componentType = type as EquipmentFilterComponentType;
      }
      next.startDate = current.startDate;
      next.endDate = current.endDate;
      next.interval = current.interval;
      return next;
    });
    applyFilters();
  }, [applyFilters]);

  const handleSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbarActions = useMemo(() => [
    buildFiltersAction(),
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw className="h-4 w-4" />,
      onClick: applyFilters,
      variant: "outline" as const,
      show: true,
    },
    buildColumnsAction({ show: pageLayout === "data" && selectedView === "table" }),
    buildExportAction({ show: pageLayout === "data" && selectedView === "table" && totalRows > 0 }),
  ], [applyFilters, pageLayout, selectedView, totalRows]);

  const tableEntityKey = `${EQUIPMENT_ENTITY_KEY}-${effectiveComponentType || "all"}-${showDeviceAnalysis ? DEVICE_ANALYSIS_KEY : "component"}`;

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarItems: DetailSideNavItem[] = useMemo(() => [
    { key: LAYOUT_DATA_KEY, label: "Data", icon: Table2 },
    { key: LAYOUT_HEATMAP_KEY, label: "Heatmap", icon: LayoutGrid },
    ...liveEquipmentTypes.map((type) => ({
      key: type,
      label: toTitleCaseLabel(type),
      icon: CATEGORY_ICON_MAP[type] || CATEGORY_ICON_MAP[type.toUpperCase()] || Layers,
    })),
    ...(hasLiveData && Object.keys(plantLive?.devices ?? {}).length > 0
      ? [{ key: DEVICE_ANALYSIS_KEY, label: "Device", icon: Server }]
      : []),
  ], [hasLiveData, liveEquipmentTypes, plantLive?.devices]);

  const activeCategory = showDeviceAnalysis ? DEVICE_ANALYSIS_KEY : effectiveComponentType;
  const isHeatmapLayout = pageLayout === "heatmap";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        header={null}
        mobileNav={
          <DetailMobileNav
            onBack={() => navigate(-1)}
            backLabel="Back"
            items={sidebarItems}
            mode="state"
            activeKey={activeCategory}
            onSelect={handleCategoryChange}
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Equipment"
            items={sidebarItems}
            mode="state"
            activeKey={activeCategory}
            onSelect={handleCategoryChange}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2">
          <CommonToolbar
            search={search}
            onSearchChange={handleSearchChange}
            entityKey={tableEntityKey}
            actions={toolbarActions}
            placeholder="Search devices & components…"
            tabs={isHeatmapLayout ? undefined : DATA_VIEW_TABS}
            selectedTab={selectedView === "cards" ? "cards" : "table"}
            onTabChange={(key: string) => setSelectedView(key as "table" | "cards")}
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <div className="relative min-h-0 flex-1">
            {isHeatmapLayout ? (
              <PlantEquipmentHeatmapPanel
                rows={liveRows}
                componentType={effectiveComponentType}
                componentById={componentById}
                loading={isLoading}
                search={search}
              />
            ) : (
              <CommonDataView
                key={tableEntityKey}
                data={paginatedRows}
                loading={isLoading}
                entityKey={tableEntityKey}
                entityLabel="Equipment"
                columns={activeColumns}
                defaultColumns={defaultColumns}
                selectedView={selectedView === "cards" ? "cards" : "table"}
                tableRef={tableRef}
                page={currentPage}
                pageSize={pageSize}
                total={totalRows}
                totalPages={totalPages}
                pageStateConfig={{ setPage, setPageSize }}
                getRowId={(row: Record<string, unknown>) =>
                  (row.component_id ?? row.device_id ?? row.id) as string
                }
                columnSelectorTitle="Columns"
                columnStateConfig={{ setColumns: setLocalColumns }}
                columnPanelRef={columnPanelRef}
                filterFields={filterFields}
                filters={{ ...filters, componentType: effectiveComponentType }}
                onFiltersChange={(next) => {
                  const nextFilters = next as EquipmentSelectorState;
                  setFilters((prev) => ({
                    ...nextFilters,
                    analysisMode: prev.analysisMode,
                    componentType: nextFilters.componentType || effectiveComponentType,
                  }));
                }}
                onApplyFilters={applyFilters}
                onClearFilters={() => {
                  const next = buildInitialSelectorState();
                  next.componentType = firstAvailableType || effectiveComponentType;
                  setFilters(next);
                  applyFilters();
                }}
                filterPanelRef={filterPanelRef}
              />
            )}
          </div>
        </div>
      </DetailPageShell>
    </DetailPageBackground>
  );
};

export default PlantEquipmentDashboard;
