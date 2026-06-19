import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  ListTree,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { usePlantLiveData, type PlantEquipmentLiveRow } from "@/hooks/usePlantLiveData";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  resolveEquipmentViewFromCode,
  normalizeStatus,
  formatNumber,
  matchesStatusFilter,
  matchesSearch,
  countStatuses,
  getBlockMetrics,
  getPowerValue,
  formatCellValue,
  type ComponentStatus,
} from "@/utils/plantLiveFormatters";
import CommonTable, {
  type CommonColumnConfig,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import { DetailDashboardCard } from "./DetailDashboardCard";

type ComponentStatusFilter = "all" | ComponentStatus;
type ComponentSelectionScope = "plant" | "block" | "inverter";

export interface ComponentStatusSelection {
  plantId?: string;
  plantName: string;
  block: PlantComponentRow | null;
  inverter: PlantEquipmentLiveRow | null;
}

export interface ComponentStatusTableProps {
  plantId?: string;
  plantName?: string;
  className?: string;
  defaultExpandedBlockId?: string;
  selectedBlockId?: string | null;
  selectedInverterId?: string | null;
  onBlockSelect?: (block: PlantComponentRow, selection: ComponentStatusSelection) => void;
  onInverterSelect?: (
    inverter: PlantEquipmentLiveRow,
    selection: ComponentStatusSelection,
  ) => void;
  onSelectionChange?: (selection: ComponentStatusSelection) => void;
}

interface InverterColumnDef {
  key: string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
}

const INVERTER_COLUMNS: InverterColumnDef[] = [
  { key: "component_name", label: "Inverter", minWidth: 30, maxWidth: 130 },
  { key: "time", label: "Time", minWidth: 80 },
  { key: "act_power", label: "Active Power", minWidth: 40 },
  { key: "act_energy_exp", label: "Act. Energy (KWH)", minWidth: 40 },
];

function getRowStatus(row: PlantEquipmentLiveRow): ComponentStatus {
  return normalizeStatus(row.communication_status ?? row.status);
}

function statusClass(status: ComponentStatus): string {
  if (status === "online") return "text-emerald-500";
  if (status === "offline") return "text-rose-500";
  return "text-neutral-400 dark:text-neutral-dark-500";
}

function buildColumnDefs(): InverterColumnDef[] {
  return INVERTER_COLUMNS;
}

function buildCommonColumns(args: {
  selectedInverterId: string | null | undefined;
}): CommonColumnConfig[] {
  const { selectedInverterId } = args;
  return buildColumnDefs().map((column) =>
    buildTextColumn(column.key, column.label, {
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      flex: undefined,
      pinned: column.key === "component_name" ? "left" : undefined,
      valueGetter:
        column.key === "timestamp"
          ? (params: { data?: PlantEquipmentLiveRow }) =>
              params.data?.timestamp ?? params.data?.last_communication_at
          : undefined,
      cellRenderer: (params: { data?: PlantEquipmentLiveRow; value?: unknown }) => {
        const row = params.data;
        if (!row) return "-";
        const rowId = String(row.component_id ?? row.id);
        const selected = selectedInverterId === rowId;

        if (column.key === "component_name") {
          return (
            <span
              className={`font-medium ${
                selected
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-brand-700 dark:text-brand-400"
              }`}
            >
              {formatCellValue(row, column.key)}
            </span>
          );
        }

        if (column.key === "act_power") {
          return <ActivePowerBar row={row} />;
        }

        return (
          <span className="text-neutral-800 dark:text-neutral-dark-900">
            {formatCellValue(row, column.key)}
          </span>
        );
      },
    }),
  );
}

function getComponentPlantName(args: {
  plantName?: string;
  plant?: { plant_name?: string | null } | null;
  plantId?: string;
  rootComponents: readonly PlantComponentRow[];
}) {
  const explicit = args.plantName?.trim();
  if (explicit) return explicit;
  const plantRecordName = args.plant?.plant_name?.trim();
  if (plantRecordName) return plantRecordName;
  const rootPlant = args.rootComponents.find(
    (component) =>
      resolveEquipmentViewFromCode(component.component_type) === "plant",
  );
  return rootPlant?.component_name ?? args.plantId ?? "Plant";
}
  

function ActivePowerBar({ row }: { row: PlantEquipmentLiveRow }) {
  const value = getPowerValue(row);
  const width = value == null ? 0 : Math.max(3, Math.min(100, (value / 350) * 100));
  const status = getRowStatus(row);
  const barClass =
    status === "offline"
      ? "bg-rose-500"
      : status === "online"
        ? "bg-emerald-400"
        : "bg-neutral-400";

  return (
    <div className="flex min-w-[112px] items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-dark-200">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`w-10 text-right text-[10px] tabular-nums ${statusClass(status)}`}>
        {value == null ? "0" : formatNumber(value, 0)}
        <span className="ml-0.5 text-[9px] text-neutral-500 dark:text-neutral-dark-500">
          kW
        </span>
      </span>
    </div>
  );
}

function StatusCounts({
  counts,
  compact = false,
}: {
  counts: Record<ComponentStatus, number>;
  compact?: boolean;
}) {
  const items = [
    { key: "total", label: "Total", value: counts.online + counts.offline + counts.unknown, tone: "" },
    { key: "online", label: "Online", value: counts.online, tone: "emerald" },
    { key: "unknown", label: "Unknown", value: counts.unknown, tone: "neutral" },
    { key: "offline", label: "Offline", value: counts.offline, tone: "rose" },
  ];

  return (
    <div
      className={`grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] ${
        compact ? "min-w-[120px]" : "min-w-[150px]"
      }`}
    >
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1 truncate text-neutral-500 dark:text-neutral-dark-500">
            <Circle
              className={`h-2 w-2 shrink-0 ${
                item.tone === "emerald"
                  ? "fill-emerald-500 text-emerald-500"
                  : item.tone === "rose"
                    ? "fill-rose-500 text-rose-500"
                    : "text-neutral-400"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-dark-950">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetricPairGrid({
  metrics,
  total,
}: {
  metrics: ReturnType<typeof getBlockMetrics>;
  total: number;
}) {
  const items = [
    {
      label: "Total Act. Power",
      value: formatNumber(metrics.totalActivePower),
      unit: "kW",
    },
    {
      label: "Energy Export",
      value: formatNumber(metrics.totalEnergyExport),
      unit: "kWh",
    },
    {
      label: "Avg. PF",
      value: metrics.avgPf == null ? "-" : formatNumber(metrics.avgPf, 3),
      unit: "",
    },
    {
      label: "Inverters",
      value: String(total),
      unit: "",
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-tight">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="truncate text-neutral-500 dark:text-neutral-dark-500">
            {item.label}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950">
            {item.value}
            {item.unit ? (
              <span className="ml-1 text-[10px] font-normal text-neutral-500 dark:text-neutral-dark-500">
                {item.unit}
              </span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ComponentStatusTable({
  plantId,
  plantName,
  className,
  defaultExpandedBlockId,
  selectedBlockId,
  selectedInverterId,
  onBlockSelect,
  onInverterSelect,
  onSelectionChange,
}: ComponentStatusTableProps) {
  const [search, setSearch] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ComponentStatusFilter>("all");
  const [plantExpanded, setPlantExpanded] = useState(true);
  const [selectionScope, setSelectionScope] =
    useState<ComponentSelectionScope>("plant");
  const [internalExpandedBlockId, setInternalExpandedBlockId] = useState<
    string | null | undefined
  >(
    defaultExpandedBlockId,
  );
  const [internalBlockId, setInternalBlockId] = useState<string | null>(null);
  const [internalInverterId, setInternalInverterId] = useState<string | null>(null);
  const filterPanelRef = useRef<{ openPanel: () => void } | null>({
    openPanel: () => setShowFilterPanel(true),
  });

  const componentsState = usePlantComponents({ plantId });
  const {
    hasLiveData,
    isComponentsLoading,
    getEquipmentRows,
  } = usePlantLiveData({ plantId });

  const blocks = useMemo(
    () =>
      componentsState.components.filter(
        (component) => resolveEquipmentViewFromCode(component.component_type) === "block",
      ),
    [componentsState.components],
  );

  const effectivePlantName = useMemo(
    () =>
      getComponentPlantName({
        plantName,
        plant: componentsState.plant,
        plantId,
        rootComponents: componentsState.rootComponents,
      }),
    [componentsState.plant, componentsState.rootComponents, plantId, plantName],
  );

  const blockRows = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return blocks
      .map((block) => {
        const rows = getEquipmentRows({
          analysisMode: "equipment",
          componentType: "inverter",
          blockId: block.id,
          startDate: today,
          endDate: today,
          interval: "",
          search: "",
        }).filter((row) => matchesStatusFilter(row, statusFilter));
        return {
          block,
          inverters: rows,
          counts: countStatuses(rows),
          columns: buildCommonColumns({
            rows,
            selectedInverterId: selectedInverterId ?? internalInverterId,
          }),
          metrics: getBlockMetrics(rows),
        };
      })
      .filter((row) => statusFilter === "all" || row.inverters.length > 0)
      .filter((row) => matchesSearch(row.block, row.inverters, search));
  }, [
    blocks,
    getEquipmentRows,
    internalInverterId,
    search,
    selectedInverterId,
    statusFilter,
  ]);

  const plantCounts = useMemo(
    () => countStatuses(blockRows.flatMap((blockRow) => blockRow.inverters)),
    [blockRows],
  );

  const expandedBlockId =
    selectedBlockId ??
    internalExpandedBlockId ??
    (internalExpandedBlockId === undefined ? blockRows[0]?.block.id : null) ??
    null;
  const activeBlockId = selectedBlockId ?? internalBlockId;
  const activeInverterId = selectedInverterId ?? internalInverterId;

  const emitSelection = useCallback(
    (selection: ComponentStatusSelection) => {
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  const handleBlockSelect = useCallback(
    (block: PlantComponentRow) => {
      setSelectionScope("block");
      if (selectedBlockId === undefined) setInternalBlockId(block.id);
      if (selectedBlockId === undefined) {
        setInternalExpandedBlockId((current) =>
          current === block.id ? null : block.id,
        );
      }
      if (selectedInverterId === undefined) setInternalInverterId(null);
      const selection = {
        plantId,
        plantName: effectivePlantName,
        block,
        inverter: null,
      };
      onBlockSelect?.(block, selection);
      emitSelection(selection);
    },
    [
      effectivePlantName,
      emitSelection,
      onBlockSelect,
      plantId,
      selectedBlockId,
      selectedInverterId,
    ],
  );

  const handleInverterSelect = useCallback(
    (block: PlantComponentRow, inverter: PlantEquipmentLiveRow) => {
      setSelectionScope("inverter");
      if (selectedBlockId === undefined) setInternalExpandedBlockId(block.id);
      if (selectedInverterId === undefined) {
        setInternalInverterId(String(inverter.component_id ?? inverter.id));
      }
      const selection = {
        plantId,
        plantName: effectivePlantName,
        block,
        inverter,
      };
      onInverterSelect?.(inverter, selection);
      emitSelection(selection);
    },
    [
      effectivePlantName,
      emitSelection,
      onInverterSelect,
      plantId,
      selectedBlockId,
      selectedInverterId,
    ],
  );

  const handlePlantToggle = useCallback(() => {
    setSelectionScope("plant");
    if (selectedBlockId === undefined) setInternalBlockId(null);
    if (selectedInverterId === undefined) setInternalInverterId(null);
    setPlantExpanded((current) => !current);
    const selection = {
      plantId,
      plantName: effectivePlantName,
      block: null,
      inverter: null,
    };
    emitSelection(selection);
  }, [effectivePlantName, emitSelection, plantId, selectedBlockId, selectedInverterId]);

  const loading = isComponentsLoading && !hasLiveData;
  const plantSelected = selectionScope === "plant";

  return (
    <DetailDashboardCard
      className={`flex min-h-0 flex-col ${className ?? ""}`}
      icon={ListTree}
      title="Components Status Table"
      description="All the components status and details listed in a table."
      bodyClassName="flex min-h-0 flex-1 flex-col space-y-3"
    >
      <CommonToolbar
        className="detail-dashboard-toolbar border-b-0 py-0"
        search={search}
        onSearchChange={setSearch}
        entityKey="detailDashboardComponentStatus"
        placeholder="Search"
        actions={[buildFiltersAction()]}
        filterPanelRef={filterPanelRef}
      />

      {showFilterPanel ? (
        <div className="rounded-sm border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-dark-200 dark:bg-neutral-dark-50">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-dark-900">
              Filter status
            </p>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-dark-500 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-dark-950"
              onClick={() => setShowFilterPanel(false)}
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["all", "online", "unknown", "offline"] as ComponentStatusFilter[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={`min-h-8 rounded-sm border px-2 text-xs font-medium capitalize transition ${
                    statusFilter === value
                      ? "border-brand-600 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-brand-500/60 hover:text-brand-700 dark:border-neutral-dark-200 dark:bg-neutral-dark-100 dark:text-neutral-dark-700 dark:hover:text-brand-300"
                  }`}
                  onClick={() => setStatusFilter(value)}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          {statusFilter !== "all" ? (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400"
              onClick={() => setStatusFilter("all")}
            >
              Clear filter
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-dashed border-brand-600/35 bg-neutral-50 p-3 dark:bg-neutral-dark-50/70">
        <section
          className={`overflow-hidden rounded-sm  bg-white transition dark:bg-neutral-dark-100 ${
            plantSelected
              ? " bg-brand-500/[0.04] ring-1 ring-brand-500/25 dark:bg-brand-500/[0.06]"
              : plantExpanded
                ? "border-brand-600/60"
              : "border-neutral-200 dark:border-neutral-dark-200"
          }`}
        >
          <button
            type="button"
            className="grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_150px_16px] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-500/[0.04] active:bg-brand-500/[0.08]"
            onClick={handlePlantToggle}
            aria-expanded={plantExpanded}
          >
            <span className="min-w-0 truncate text-xs font-medium text-brand-700 dark:text-brand-400">
              {effectivePlantName}
            </span>
            <StatusCounts counts={plantCounts} />
            {plantExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-brand-600" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-brand-600" />
            )}
          </button>

          {loading ? (
            <div className="border-t border-neutral-200 px-4 py-8 text-center text-xs text-neutral-500 dark:border-neutral-dark-200 dark:text-neutral-dark-500">
              Loading component hierarchy...
            </div>
          ) : !plantExpanded ? null : blockRows.length === 0 ? (
            <div className="border-t border-neutral-200 px-4 py-8 text-center text-xs text-neutral-500 dark:border-neutral-dark-200 dark:text-neutral-dark-500">
              No block or inverter live data found.
            </div>
          ) : (
            <div className="border-t border-brand-600/20 bg-brand-500/[0.02] px-3 pb-3 pt-3">
              <div className="space-y-2">
                {blockRows.map(({ block, inverters, counts, columns, metrics }) => {
                  const expanded = expandedBlockId === block.id;
                  const blockSelected =
                    selectionScope === "block" && activeBlockId === block.id;
                  return (
                    <article
                      key={block.id}
                      className={`overflow-hidden rounded-sm border transition ${
                        blockSelected
                          ? "border-brand-600 bg-brand-500/[0.05] ring-1 ring-brand-500/25 dark:bg-brand-500/[0.07]"
                          : expanded
                            ? "border-brand-600 bg-white dark:bg-neutral-dark-100"
                          : "border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
                      }`}
                    >
                      <button
                        type="button"
                        className="grid w-full grid-cols-[minmax(82px,104px)_minmax(0,1fr)_120px_16px] items-center gap-2 px-3 py-2 text-left transition hover:bg-brand-500/[0.04] active:bg-brand-500/[0.08]"
                        onClick={() => handleBlockSelect(block)}
                        aria-expanded={expanded}
                      >
                        <span className="min-w-0 truncate text-xs font-medium text-brand-700 dark:text-brand-400">
                          {block.component_name}
                        </span>
                        <div className="min-w-0 px-2">
                          <MetricPairGrid
                            metrics={metrics}
                            total={counts.online + counts.offline + counts.unknown}
                          />
                        </div>
                        <StatusCounts counts={counts} compact />
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-brand-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-brand-600" />
                        )}
                      </button>

                      {expanded ? (
                        <div className="border-t border-brand-600/20 bg-neutral-50 px-2 pb-2 pt-2 dark:bg-neutral-dark-50">
                          <div className="pl-2">
                            <CommonTable
                              className="detail-dashboard-inverter-table overflow-hidden border-0 shadow-none"
                              columns={columns}
                              defaultColumns={columns}
                              data={inverters}
                              entityKey={`detailDashboardInverters-${block.id}`}
                              tableHeight={Math.max(
                                154,
                                Math.min(400, 48 + inverters.length * 34),
                              )}
                              gridMinHeight={140}
                              onRowClick={(row: PlantEquipmentLiveRow) =>
                                handleInverterSelect(block, row)
                              }
                              selectedIds={activeInverterId ? [activeInverterId] : []}
                              getRowId={(params: { data?: PlantEquipmentLiveRow }) =>
                                String(params.data?.component_id ?? params.data?.id)
                              }
                              gridOptions={{
                                headerHeight: 30,
                                rowHeight: 30,
                                suppressCellFocus: true,
                                rowClassRules: {
                                  "detail-dashboard-inverter-row-selected": (params: {
                                    data?: PlantEquipmentLiveRow;
                                  }) =>
                                    String(params.data?.component_id ?? params.data?.id) ===
                                    activeInverterId,
                                },
                              }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </DetailDashboardCard>
  );
}

export default ComponentStatusTable;
