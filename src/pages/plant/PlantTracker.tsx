import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ICellRendererParams, ValueFormatterParams } from "@ag-grid-community/core";
import {
  BarChart2,
  Box,
  LayoutGrid,
  LayoutDashboard,
  Table as TableIcon,
  Waypoints,
} from "lucide-react";
import type {
  CommonColumnConfig,
  CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  buildColumnsAction,
  buildExportAction,
} from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import type { CommonCustomCardProps } from "@/components/core/table/CommonCardList";
import type { FilterValues } from "@/components/core/table/CommonFilterPanel";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import {
  DetailPageBackground,
  DetailPageShell,
  DetailSectionCard,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";
import { useMediaQuery } from "usehooks-ts";
import { usePlantTracker } from "@/hooks/usePlantTracker";
import {
  getTrackerAbsoluteDeviation,
  getTrackerActualAngle,
  getTrackerDeviationStatus,
  getTrackerProjectedAngle,
  getTrackerSignedDeviation,
  getTrackerTableColumnFields,
  matchesTrackerSearch,
  TRACKER_DEVIATION_OK_DEG,
  TRACKER_DEVIATION_WARN_DEG,
  type TrackerTableRow,
} from "@/lib/plant/trackerLiveData";
import { dateTimeFormatter } from "@/utils/gridFormatters";
import { GraphView } from "./PlantTrackerGraphView";
import { TrackerOverviewPanel } from "./Planttrackeroverview";
import {
  deviationBadgeNode,
  formatTrackerAngle,
  formatTrackerTimestamp,
  TRACKER_H_SCROLL,
  TrackerStatusBadge,
  TrackerStatusBox,
  TrackerWeatherStrip,
} from "./trackerUi";

const ENTITY_KEY = "plantTrackerLive";

type TrackerViewMode = "overview" | "table" | "cards" | "graph";

const VIEW_TABS = [
  { key: "overview", label: "", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "table", label: "", icon: <TableIcon className="h-4 w-4" /> },
  { key: "cards", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "graph", label: "", icon: <BarChart2 className="h-4 w-4" /> },
];

const TRACKER_FILTER_DEFAULTS: FilterValues = {};

function formatFieldLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function isDeviationField(field: string): boolean {
  return field.includes("deviation") || field === "deviation";
}

function rowDeviationStatus(row: TrackerTableRow) {
  return getTrackerDeviationStatus(getTrackerAbsoluteDeviation(row));
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}> = ({ label, value, hint, tone = "default", className = "" }) => {
  const toneClass =
    tone === "success"
      ? "border-success-500/25 bg-success-500/[0.06]"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/[0.06]"
        : tone === "danger"
          ? "border-error-500/25 bg-error-500/[0.06]"
          : "border-neutral-200/90 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100";

  return (
    <div
      className={`rounded-xs border px-2.5 py-2 sm:px-3 ${toneClass} ${className}`.trim()}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-dark-500 sm:text-[10px] sm:tracking-[0.12em]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950 sm:text-lg">
        {value}
      </p>
      {hint ? (
        <p className="text-[10px] text-neutral-500 dark:text-neutral-dark-500 sm:text-[11px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

// ─── Tracker card (table row → card) ─────────────────────────────────────────

const TrackerLiveCard: React.FC<CommonCustomCardProps> = ({ row, columns, onRowClick }) => {
  const data = row as TrackerTableRow;

  const hiddenFields = new Set([
    "id",
    "tracker_index",
    "tracker_name",
    "timestamp",
    "actual_angle",
    "projected_angle",
    "proj_angle",
    "angle_deviation",
    "absolute_angle_deviation",
    "deviation",
    "status",
    "tracking_status",
  ]);
  const otherFields = columns.filter((c) => !hiddenFields.has(c.field)).slice(0, 6);

  const projected = getTrackerProjectedAngle(data);
  const actual = getTrackerActualAngle(data);
  const signedDeviation = getTrackerSignedDeviation(data);
  const status = rowDeviationStatus(data);

  return (
    <button
      type="button"
      onClick={() => onRowClick?.(row)}
      className="flex w-full flex-col gap-2.5 rounded-xs border border-neutral-200/90 bg-neutral-0 p-3 text-left transition-shadow hover:shadow-md dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <TrackerStatusBox status={status} className="mt-0.5" />
          <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
            {String(data.tracker_name ?? "Tracker")}
          </p>
          <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-dark-500">
            {formatTrackerTimestamp(data.timestamp ? String(data.timestamp) : null)}
          </p>
          </div>
        </div>
        <TrackerStatusBadge status={status} />
      </div>

      <div className="grid grid-cols-3 gap-1.5 rounded-[4px] bg-neutral-50 px-2 py-2 dark:bg-neutral-dark-200/40">
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
            Projected
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatTrackerAngle(projected)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
            Actual
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatTrackerAngle(actual)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
            Deviation
          </p>
          <p className="mt-0.5 flex justify-center">{deviationBadgeNode(signedDeviation)}</p>
        </div>
      </div>

      {otherFields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-neutral-200/70 pt-2 dark:border-neutral-dark-200">
          {otherFields.map((col) => (
            <div key={col.field}>
              <dt className="text-[9px] font-medium uppercase tracking-wide text-neutral-400">
                {col.headerName}
              </dt>
              <dd className="text-xs font-medium tabular-nums text-neutral-800 dark:text-neutral-dark-900">
                {formatCellValue(data[col.field])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </button>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const PlantTracker: React.FC = () => {
  const navigate = useNavigate();
  const { id: plantId } = useParams<{ id: string }>();
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters] = useState<FilterValues>(TRACKER_FILTER_DEFAULTS);

  const tableRef = useRef<CommonTableHandle>(null);
  const columnPanelRef = useRef<{ openPanel: () => void }>(null);

  const [userView, setUserView] = useState<TrackerViewMode | null>(null);
  const selectedView = userView ?? "overview";

  const handleViewChange = useCallback((view: TrackerViewMode) => {
    setUserView(view);
  }, []);

  const {
    isLoading,
    hasTrackerComponents,
    hasLiveData,
    zones,
    activeZoneId,
    setActiveZoneId,
    activeZone,
    activeBundle,
  } = usePlantTracker({ plantId });

  const filteredTableRows = useMemo(() => {
    if (!activeBundle) return [];
    return activeBundle.mergedTableRows.filter((row) => matchesTrackerSearch(row, search));
  }, [activeBundle, search]);

  const defaultColumns = useMemo((): CommonColumnConfig[] => {
    const fields = getTrackerTableColumnFields(filteredTableRows).filter(
      (field) => field !== "timestamp",
    );

    return [
      buildTextColumn("tracker_name", "Tracker", { minWidth: 130, pinned: "left" }),
      buildTextColumn("tracking_status", "Status", {
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams) => {
          const row = params.data as TrackerTableRow;
          if (!row) return "—";
          return <TrackerStatusBadge status={rowDeviationStatus(row)} />;
        },
      }),
      ...fields.map((field) =>
        buildTextColumn(field, formatFieldLabel(field), {
          minWidth: field.includes("angle") || field.includes("deviation") ? 120 : 100,
          cellRenderer: isDeviationField(field)
            ? (params: ICellRendererParams) =>
                typeof params.value === "number"
                  ? deviationBadgeNode(
                      params.value,
                      field === "angle_deviation" || field === "deviation",
                    )
                  : formatCellValue(params.value)
            : field === "actual_angle" || field === "projected_angle"
              ? (params: ICellRendererParams) =>
                  typeof params.value === "number"
                    ? formatTrackerAngle(params.value)
                    : formatCellValue(params.value)
              : (params: ICellRendererParams) => formatCellValue(params.value),
        }),
      ),
      buildTextColumn("timestamp", "Updated", {
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? dateTimeFormatter({ value: params.value } as ValueFormatterParams)
            : "—",
      }),
    ];
  }, [filteredTableRows]);

  const activeColumns = localColumns.length > 0 ? localColumns : defaultColumns;
  const totalRows = filteredTableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableRows.slice(start, start + pageSize);
  }, [currentPage, filteredTableRows, pageSize]);

  const tableEntityKey = `${ENTITY_KEY}-${activeZoneId || "none"}`;

  const handleZoneChange = useCallback(
    (zoneId: string) => {
      setActiveZoneId(zoneId);
      setPage(1);
      setLocalColumns([]);
    },
    [setActiveZoneId],
  );

  const handleSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const toolbarActions = useMemo(
    () => [
      buildColumnsAction({ show: selectedView === "table" || selectedView === "cards" }),
      buildExportAction({ show: selectedView === "table" && totalRows > 0 }),
    ],
    [selectedView, totalRows],
  );

  const sidebarItems: DetailSideNavItem[] = useMemo(
    () =>
      zones.map((zone) => ({
        key: zone.parentId,
        label: `${zone.parentName} (${zone.trackerComponents.length})`,
        icon: Box,
      })),
    [zones],
  );

  const summary = activeBundle?.summary;

  if (!isLoading && !hasTrackerComponents) {
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
              items={[]}
              mode="state"
              activeKey=""
              onSelect={() => undefined}
            />
          }
          desktopSidebar={
            <DetailDesktopSidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onBack={() => navigate(-1)}
              headerLabel="Tracker"
              items={[]}
              mode="state"
              activeKey=""
              onSelect={() => undefined}
            />
          }
        >
          <div className="flex flex-1 items-center justify-center p-6">
            <DetailSectionCard className="max-w-md text-center">
              <Waypoints className="mx-auto mb-3 h-9 w-9 text-neutral-400" />
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-dark-950">
                No tracker components
              </h2>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-dark-500">
                Add TRC tracker components under a block parent. Live MQTT data will populate this
                view automatically.
              </p>
            </DetailSectionCard>
          </div>
        </DetailPageShell>
      </DetailPageBackground>
    );
  }

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        header={null}
        mobileNav={
          <DetailMobileNav
            // onBack={() => navigate(-1)}
            // backLabel="Back"
            items={sidebarItems}
            mode="state"
            activeKey={activeZoneId}
            onSelect={handleZoneChange}
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Zones"
            items={sidebarItems}
            mode="state"
            activeKey={activeZoneId}
            onSelect={handleZoneChange}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
          {/* Zone summary */}
          <div
            className={`flex shrink-0 gap-2 ${TRACKER_H_SCROLL} sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5`}
          >
            <StatTile
              className="w-[118px] shrink-0 sm:w-auto sm:shrink"
              label="All trackers"
              value={String(summary?.total ?? 0)}
              hint={activeZone?.parentName}
            />
            <StatTile
              className="w-[118px] shrink-0 sm:w-auto sm:shrink"
              label="On target"
              value={`${summary?.onTargetRate ?? 0}%`}
              hint={`${summary?.onTarget ?? 0} trackers`}
              tone="success"
            />
            <StatTile
              className="w-[118px] shrink-0 sm:w-auto sm:shrink"
              label="Drifting"
              value={String(summary?.drifting ?? 0)}
              hint={`${TRACKER_DEVIATION_OK_DEG}° – ${TRACKER_DEVIATION_WARN_DEG}°`}
              tone="warning"
            />
            <StatTile
              className="w-[118px] shrink-0 sm:w-auto sm:shrink"
              label="Off track"
              value={String(summary?.offTrack ?? 0)}
              hint={
                summary?.avgDeviation != null
                  ? `Avg |Δ| ${summary.avgDeviation}°`
                  : "Beyond ±5°"
              }
              tone="danger"
            />
            <StatTile
              className="w-[118px] shrink-0 sm:w-auto sm:shrink"
              label="Okay trackers"
              value={String(summary?.onTarget ?? 0)}
              hint={`Within ±${TRACKER_DEVIATION_OK_DEG}°`}
              tone="success"
            />
          </div>

          {/* Compact weather */}
          {activeBundle?.weatherSnapshots && activeBundle.weatherSnapshots.length > 0 && (
            <TrackerWeatherStrip snapshots={activeBundle.weatherSnapshots} />
          )}

          <CommonToolbar
            search={search}
            onSearchChange={handleSearchChange}
            entityKey={tableEntityKey}
            actions={toolbarActions}
            placeholder="Search trackers…"
            tabs={VIEW_TABS}
            selectedTab={selectedView}
            onTabChange={(key: string) => handleViewChange(key as TrackerViewMode)}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden">
            {selectedView === "overview" && (
              <TrackerOverviewPanel
                bundle={activeBundle}
                search={search}
                isLoading={isLoading && !hasLiveData}
              />
            )}

            {selectedView === "graph" && <GraphView bundle={activeBundle} search={search} />}

            {(selectedView === "table" || selectedView === "cards") && (
              <CommonDataView
                key={tableEntityKey}
                className="min-h-0 flex-1"
                data={paginatedRows}
                loading={isLoading && !hasLiveData}
                entityKey={tableEntityKey}
                entityLabel="Tracker"
                columns={activeColumns}
                defaultColumns={defaultColumns}
                selectedView={selectedView === "cards" ? "cards" : "table"}
                tableRef={tableRef}
                page={currentPage}
                pageSize={pageSize}
                total={totalRows}
                totalPages={totalPages}
                pageStateConfig={{ setPage, setPageSize }}
                getRowId={(row: TrackerTableRow) => row.id}
                columnSelectorTitle="Tracker columns"
                columnStateConfig={{ setColumns: setLocalColumns }}
                columnPanelRef={columnPanelRef}
                filters={filters}
                onFiltersChange={() => undefined}
                customCardComponent={TrackerLiveCard}
                noRowsOverlayMessage="No live tracker samples for this zone"
                minTableHeight={280}
                containerHeight="100%"
              />
            )}
          </div>
        </div>
      </DetailPageShell>
    </DetailPageBackground>
  );
};

export default PlantTracker;
