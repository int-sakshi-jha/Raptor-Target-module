import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, Gauge, RadioTower, Share2 } from "lucide-react";
import { DetailDashboardChart } from "./DetailDashboardChart";
import type { DetailDashboardMetricConfig } from "./DetailDashboardTypes";
import CommonTable, { type CommonColumnConfig } from "@/components/core/table/CommonTable";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import type { PlantEquipmentLiveRow } from "@/lib/plant/plantLiveRows";
import type { ComponentStatusSelection } from "./ComponentStatusTable";
import { InverterTypesAssetIcon } from "@/components/core/navbar/navItems";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import { toTitleCaseLabel } from "@/utils/plantLiveFormatters";
import { DetailDashboardEquipmentHeatmap } from "./DetailDashboardEquipmentHeatmap";
import type { BadgeVariant } from "@/components/common/ColorBadge";
import ColorBadge from "@/components/common/ColorBadge";

const POWER_METRIC: DetailDashboardMetricConfig = {
  key: "power",
  label: "Power",
  unit: "kW",
  aliases: ["power", "ac_power", "dc_power", "active_power", "act_power"],
};

type StatItem = { label: string; value: string; tone?: "green" | "orange" };

// Static system/metadata keys never shown in stats
const SYSTEM_KEYS = new Set([
  "id", "component_id", "component_code", "component_name", "component_type",
  "component_type_label", "device_id", "device_name", "block_id", "block_name",
  "acdb_id", "acdb_name", "inverter_id", "inverter_name", "timestamp",
  "last_communication_at", "communication_status", "meter_type", "connected",
  "dc_capacity_kw", "ac_capacity_kw", "index", "status", "health",
]);

// Prefix/substring patterns for keys to exclude (alarms, downtime status strings, CDT timestamps)
const EXCLUDED_KEY_PATTERNS = [
  /^alarm/i,
  /downtime/i,
  /downTime/i,
  /^CDT$/i,
];

function isExcludedStatKey(key: string): boolean {
  return EXCLUDED_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

// Fields where sum is more meaningful than average (power, energy, current)
const SUM_FIELD_PATTERNS = ["power", "energy", "generation", "current"];

function isSumField(key: string): boolean {
  const k = key.toLowerCase();
  return SUM_FIELD_PATTERNS.some((p) => k.includes(p));
}

// Only keep keys that represent actual telemetry (numeric or numeric array from processed_data)
function isTelemetryValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    // exclude plain status strings like "normal", "fault", "offline"
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n);
  }
  if (Array.isArray(value)) {
    // must have at least one non-null numeric entry
    return value.some((v) => v != null && v !== "" && Number.isFinite(Number(v)));
  }
  return false;
}

function extractNumber(value: unknown): number {
  if (value == null || value === "") return Number.NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (Array.isArray(value)) {
    const valid = value.filter((v) => v != null && v !== "");
    return valid.length > 0 ? extractNumber(valid[valid.length - 1]) : Number.NaN;
  }
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function dynamicStats(
  rows: Record<string, unknown>[],
  mode: "single" | "aggregate" = "aggregate",
): StatItem[] {
  if (rows.length === 0) return [];

  const isStatKey = (k: string) =>
    !SYSTEM_KEYS.has(k) && !isExcludedStatKey(k);

  if (mode === "single" || rows.length === 1) {
    const row = rows[0];
    return Object.keys(row)
      .filter((k) => isStatKey(k) && isTelemetryValue(row[k]))
      .slice(0, 12)
      .map((key) => {
        const val = extractNumber(row[key]);
        return {
          label: toTitleCaseLabel(key),
          value: Number.isFinite(val) ? val.toFixed(2) : "-",
        };
      });
  }

  // Aggregate mode: collect all telemetry keys across rows
  const allKeys = new Set<string>();
  rows.forEach((r) =>
    Object.keys(r).forEach((k) => {
      if (isStatKey(k) && isTelemetryValue(r[k])) allKeys.add(k);
    }),
  );

  return Array.from(allKeys)
    .slice(0, 12)
    .map((key) => {
      const values = rows.map((r) => extractNumber(r[key])).filter(Number.isFinite);
      if (values.length === 0) return { label: toTitleCaseLabel(key), value: "-" };
      const aggregated = isSumField(key)
        ? values.reduce((a, b) => a + b, 0)
        : values.reduce((a, b) => a + b, 0) / values.length;
      return { label: toTitleCaseLabel(key), value: aggregated.toFixed(2) };
    });
}

const today = () => format(new Date(), "yyyy-MM-dd");

function readNumber(value: unknown): number {
  if (value == null || value === "") return Number.NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}


function formatValue(value: number, unit = "", decimals = 2): string {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

function asDisplay(value: unknown, fallback = "-"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function isSameId(left: unknown, right: unknown): boolean {
  return Boolean(left && right && String(left) === String(right));
}

function isType(component: PlantComponentRow, code: string): boolean {
  return normalizeComponentType(component.component_type) === code;
}

function buildFallbackRow(
  component: PlantComponentRow,
  componentById: ReadonlyMap<string, PlantComponentRow>,
): PlantEquipmentLiveRow {
  const findAncestor = (comp: PlantComponentRow, code: string): PlantComponentRow | null => {
    let current: PlantComponentRow | undefined = comp;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (isType(current, code)) return current;
      current = current.parent_id ? componentById.get(current.parent_id) : undefined;
    }
    return null;
  };
  const block = findAncestor(component, "B");
  const acdb = findAncestor(component, "AC");
  const inverter = findAncestor(component, "INV");
  return {
    id: component.id,
    component_id: component.id,
    component_name: component.component_name,
    component_type: component.component_type,
    block_id: block?.id ?? null,
    block_name: block?.component_name ?? null,
    acdb_id: acdb?.id ?? null,
    acdb_name: acdb?.component_name ?? null,
    inverter_id: inverter?.id ?? null,
    inverter_name: inverter?.component_name ?? null,
    dc_capacity_kw: component.dc_capacity_kw,
    ac_capacity_kw: component.ac_capacity_kw,
    status: component.is_active === false ? "Offline" : component.status ?? "Online",
  };
}

function statusVariant(status: unknown): BadgeVariant {
  const s = String(status ?? "").toLowerCase();
  if (s === "online" || s === "active") return "green";
  if (s === "offline" || s === "inactive" || s === "fault") return "no";
  if (s === "warning" || s === "degraded") return "orange";
  return "gray";
}

const dcChannelColumns: CommonColumnConfig[] = [
  buildTextColumn("component_name", "DC Channel", { minWidth: 180, pinned: "left" }),
  buildTextColumn("time", "Time", { minWidth: 110 }),
  buildTextColumn("dc_voltage", "DC-V (V)", { minWidth: 130 }),
  buildTextColumn("dc_current", "DC-I (A)", { minWidth: 130 }),
  buildTextColumn("dc_power", "DC Power KW", { minWidth: 150 }),
  buildTextColumn("dc_energy", "DC Energy (KWH)", { minWidth: 170 }),
  buildTextColumn("dc_generation_time", "DC Gen. Time (Min)", { minWidth: 190 }),
  buildTextColumn("status", "Status", { minWidth: 120 }),
];

function StatSection({
  icon,
  title,
  description,
  right,
  stats,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  right?: React.ReactNode;
  stats: StatItem[];
}) {
  return (
    <section className="rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200/90 px-4 py-3 dark:border-neutral-dark-300/65">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {title}
            </h3>
            <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              {description}
            </p>
          </div>
        </div>
        {right}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              {stat.label}
            </p>
            <p
              className={`mt-1 truncate text-sm font-semibold ${
                stat.tone === "green"
                  ? "text-emerald-500"
                  : stat.tone === "orange"
                    ? "text-brand-500"
                    : "text-neutral-900 dark:text-neutral-dark-950"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface DetailDashboardRightPanelProps {
  plantId?: string;
  selection: ComponentStatusSelection | null;
  componentType?: EquipmentFilterComponentType;
}

export const DetailDashboardRightPanel: React.FC<DetailDashboardRightPanelProps> = ({
  plantId,
  selection,
  componentType = "inverter",
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });
  const date = today();
  console.log("[RightPanel] live.hasLiveData:", live.hasLiveData);
  console.log("[RightPanel] live.plantLive:", live.plantLive);
  console.log("[RightPanel] live.connectionState:", live.connectionState);


  const selectedBlock = selection?.block ?? null;
  const selectedInverterRow = selection?.inverter ?? null;
  const selectedInverterId = selectedInverterRow
    ? String(selectedInverterRow.component_id ?? selectedInverterRow.id)
    : "";
  const effectiveBlockId = selectedInverterRow
    ? String(selectedInverterRow.block_id ?? selectedBlock?.id ?? "")
    : String(selectedBlock?.id ?? "");

  const allInverterRows = useMemo(() => {
    const liveRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType: "inverter",
      startDate: date,
      endDate: date,
      preserveArrays: true,
    });
    // scalar rows for plant-level stat aggregation

    if (liveRows.length > 0) return liveRows;
    return plantComponents.components
      .filter((c) => isType(c, "INV"))
      .map((c) => buildFallbackRow(c, plantComponents.componentById));
  }, [date, live, plantComponents]);
  console.log("[RightPanel] allInverterRows:", allInverterRows);
  
  
  const blockRows = useMemo(() => {
    const liveRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType: "block",
      startDate: date,
      endDate: date,
      preserveArrays: false,
    });
    if (liveRows.length > 0) return liveRows;
    return plantComponents.components
      .filter((c) => isType(c, "B"))
      .map((c) => buildFallbackRow(c, plantComponents.componentById));
    }, [date, live, plantComponents]);
    
    const selectedScopeRows = useMemo(() => {
    if (selectedInverterId) {
      // Always use the freshest live row for the selected inverter
      const liveRow = allInverterRows.find(
        (r) => isSameId(r.component_id ?? r.id, selectedInverterId),
      );
      if (liveRow) return [liveRow];
      return [selectedInverterRow!];
    }
    const liveRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType,
      blockId: effectiveBlockId,
      startDate: date,
      endDate: date,
      preserveArrays: true,
    });
    if (liveRows.length > 0) return liveRows;
    return plantComponents.components
      .filter((c) => normalizeComponentType(c.component_type) === "INV")
      .map((c) => buildFallbackRow(c, plantComponents.componentById))
      .filter((r) => !effectiveBlockId || r.block_id === effectiveBlockId);
  }, [allInverterRows, componentType, date, effectiveBlockId, live, plantComponents, selectedInverterId, selectedInverterRow]);

  const heatmapRows = useMemo(
    () =>
      live.getHeatmapRows({
        endDate: date,
        blockId: effectiveBlockId,
        inverterId: selectedInverterId,
      }),
    [date, effectiveBlockId, live, selectedInverterId],
  );

  const dcChannelRows = useMemo(() => {
    if (!selectedInverterId) return [];
    const liveRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType: "dc_channel",
      inverterId: selectedInverterId,
      startDate: date,
      endDate: date,
    });
    if (liveRows.length > 0) return liveRows;
    return plantComponents
    .getDescendants(selectedInverterId)
    .filter((c) => isType(c, "DC") || isType(c, "STR"))
    .map((c) => buildFallbackRow(c, plantComponents.componentById));
  }, [date, live, plantComponents, selectedInverterId]);
  console.log("[RightPanel] dcChannelRows:", dcChannelRows);

  const paginatedDcRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return dcChannelRows.slice(start, start + pageSize);
  }, [dcChannelRows, page, pageSize]);

  const allInverterRowsScalar = useMemo(() => {
    const liveRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType: "inverter",
      startDate: date,
      endDate: date,
      preserveArrays: false,
    });
    if (liveRows.length > 0) return liveRows;
    return plantComponents.components
      .filter((c) => isType(c, "INV"))
      .map((c) => buildFallbackRow(c, plantComponents.componentById));
  }, [date, live, plantComponents]);

  const plantStats: StatItem[] = useMemo(
    () => dynamicStats(allInverterRowsScalar, "aggregate"),
    [allInverterRowsScalar],
  );

  const activeBlock = useMemo(
    () => blockRows.find((r) => isSameId(r.component_id ?? r.id, effectiveBlockId)) ?? blockRows[0] ?? null,
    [blockRows, effectiveBlockId],
  );

  const scopeStats: StatItem[] = useMemo(() => {
    if (selectedInverterId) {
      const liveRow = allInverterRows.find(
        (r) => isSameId(r.component_id ?? r.id, selectedInverterId),
      ) ?? selectedInverterRow;
      return liveRow ? dynamicStats([liveRow], "single") : [];
    }
    const blockInverters = allInverterRows.filter(
      (r) => !effectiveBlockId || isSameId(r.block_id, effectiveBlockId),
    );
    return dynamicStats(blockInverters, "aggregate");
  }, [allInverterRows, effectiveBlockId, selectedInverterId, selectedInverterRow]);
  
  const rightMeta = selectedInverterRow ? (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-xs sm:grid-cols-4">
      <span className="text-neutral-500 dark:text-neutral-dark-600">Inverter <b className="text-neutral-900 dark:text-neutral-dark-950">{asDisplay(selectedInverterRow.component_name)}</b></span>
      <span className="text-neutral-500 dark:text-neutral-dark-600">Capacity <b className="text-neutral-900 dark:text-neutral-dark-950">{formatValue(readNumber(selectedInverterRow.dc_capacity_kw), "kW", 0)}</b></span>
      <span className="text-neutral-500 dark:text-neutral-dark-600">Last Update <b className="text-neutral-900 dark:text-neutral-dark-950">{asDisplay(selectedInverterRow.last_communication_at)}</b></span>
      <span className="text-neutral-500 dark:text-neutral-dark-600">Status <ColorBadge variant={statusVariant(selectedInverterRow.status)}>{asDisplay(selectedInverterRow.status, "Unknown")}</ColorBadge></span>
    </div>
  ) : activeBlock ? (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-xs sm:grid-cols-3">
      <span className="text-neutral-500 dark:text-neutral-dark-600">Block <b className="text-neutral-900 dark:text-neutral-dark-950">{asDisplay(activeBlock.component_name)}</b></span>
      <span className="text-neutral-500 dark:text-neutral-dark-600">Last Update <b className="text-neutral-900 dark:text-neutral-dark-950">{asDisplay(activeBlock.last_communication_at)}</b></span>
      <span className="text-neutral-500 dark:text-neutral-dark-600">Status <ColorBadge variant={statusVariant(activeBlock.status)}>{asDisplay(activeBlock.status, "Unknown")}</ColorBadge></span> 
    </div>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <StatSection
        icon={<RadioTower className="h-4 w-4" />}
        title="Live Plant Stats"
        description="Live stats of the current plant."
        stats={plantStats}
      />

      <StatSection
        icon={selectedInverterRow ? <InverterTypesAssetIcon className="h-4 w-4" /> : <Gauge className="h-4 w-4" />}
        title={selectedInverterRow ? "Live Inverter Stats" : "Live Block Stats"}
        description={
          selectedInverterRow
            ? "Live stats of the selected inverter."
            : "Live stats of the selected block (default: first block)."
        }
        stats={scopeStats}
        right={rightMeta}
      />

      <div className="grid sm:min-h-[400px] grid-cols-1 gap-2 xl:grid-cols-2">
        <DetailDashboardChart
          plantId={plantId}
          rows={selectedScopeRows}
          componentType={componentType}
          dateLabel={format(new Date(), "dd MMMM yyyy")}
          config={{
            title: selectedInverterRow ? "Inverter Power" : "Block Power",
            description: selectedInverterRow
              ? "Live power of the selected inverter."
              : "Live power of the selected block.",
            defaultChartType: "line",
            yAxisTitle: "Power (kW)",
            metric: POWER_METRIC,
          }}
        />
        <DetailDashboardEquipmentHeatmap data={heatmapRows} componentType="dc_channel" />
      </div>

      <section className="rounded-xs border border-neutral-200/80 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200/90 px-4 py-3 dark:border-neutral-dark-300/65">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand-500/45 bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Share2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                DC Channel Details
              </h3>
              <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-dark-600">
                Inverter DC channel details.
              </p>
            </div>
          </div>
          <Activity className="h-4 w-4 text-brand-500" />
        </div>
        {!selectedInverterId ? (
          <div className="flex min-h-[250px] items-center justify-center px-4 text-sm text-neutral-500 dark:text-neutral-dark-600">
            Select inverter to view DC channel details.
          </div>
        ) : (
          <CommonTable
            className="p-3"
            entityKey="detail-dashboard-dc-channels"
            columns={dcChannelColumns}
            defaultColumns={dcChannelColumns}
            data={paginatedDcRows}
            rowIdField="id"
            page={page}
            pageSize={pageSize}
            total={dcChannelRows.length}
            totalPages={Math.max(1, Math.ceil(dcChannelRows.length / pageSize))}
            onPageChange={(nextPage: number, nextPageSize: number) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        )}
      </section>
    </div>
  );
};

export default DetailDashboardRightPanel;
