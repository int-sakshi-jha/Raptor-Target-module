import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import type { ICellRendererParams } from "@ag-grid-community/core";
import CommonTable, { type CommonColumnConfig } from "@/components/core/table/CommonTable";
import {
  getDisplayTextColumn,
  getRendererColumn,
} from "@/components/core/table/ListPageHelpers";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { useGetPlantAlarmsQuery } from "@/services/operations/alarmAPI";
import type { AlarmPanelWidgetConfig } from "../shared/dashboardTypes";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardSegmentedControl } from "../shared/PlantDashboardSegmentedControl";
import { PlantDashboardTableFrame } from "../shared/PlantDashboardTableFrame";
import {
  buildLiveAlarmRows,
  mapApiAlarmRows,
  mergeAlarmPanelRows,
  resolveAlarmEffectTone,
  type AlarmPanelRow,
  type AlarmPanelTab,
} from "./liveAlarms";

interface AlarmPanelWidgetProps {
  plantId?: string;
  title?: string;
  config?: AlarmPanelWidgetConfig;
  embedded?: boolean;
}

interface AlarmTableRow {
  id: string;
  component_name: string;
  alarm_name?: string;
  time_display: string;
  effect_percent: number;
  severity: AlarmPanelRow["severity"];
}

const TAB_OPTIONS: Array<{ id: AlarmPanelTab; label: string }> = [
  { id: "live", label: "Live" },
  { id: "history", label: "History" },
  { id: "all", label: "All Alarms" },
];

function EffectBarCell({ percent, tone }: { percent: number; tone: ReturnType<typeof resolveAlarmEffectTone> }) {
  const toneClass =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-yellow-400";

  return (
    <div className="flex h-full items-center justify-end py-1">
      <div className="h-1.5 w-full max-w-[88px] overflow-hidden rounded-full bg-neutral-200/90 dark:bg-neutral-dark-300/50">
        <div
          className={`h-full rounded-full ${toneClass}`}
          style={{ width: `${Math.max(8, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function buildAlarmColumns(): CommonColumnConfig[] {
  return [
    getDisplayTextColumn("component_name", "Component", { minWidth: 120, flex: 1.2 }),
    getDisplayTextColumn("time_display", "Time", { minWidth: 72, flex: 0.6 }),
    getRendererColumn(
      "effect_percent",
      "Rate of Effect",
      (params: ICellRendererParams<AlarmTableRow, number>) => {
        const row = params.data;
        if (!row) return "-";
        return (
          <EffectBarCell
            percent={row.effect_percent}
            tone={resolveAlarmEffectTone(row.severity)}
          />
        );
      },
      { minWidth: 110, flex: 0.8, sortable: false, filter: false },
    ),
  ];
}

const alarmColumns = buildAlarmColumns();

function toTableRows(rows: AlarmPanelRow[]): AlarmTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    component_name: row.componentName,
    alarm_name: row.alarmName,
    time_display: row.timeDisplay,
    effect_percent: row.effectPercent,
    severity: row.severity,
  }));
}

export function AlarmPanelWidget({
  plantId,
  title = "Alarms",
  config,
  embedded = false,
}: AlarmPanelWidgetProps) {
  const pageSize = config?.pageSize ?? 10;
  const tableHeight = config?.tableHeight ?? 360;
  const showTabs = config?.showTabs !== false;

  const [activeTab, setActiveTab] = useState<AlarmPanelTab>("live");
  const live = usePlantLiveData({ plantId });

  const liveRows = useMemo(
    () =>
      buildLiveAlarmRows({
        plantLive: live.plantLive,
        componentById: live.componentById,
      }),
    [live.componentById, live.plantLive],
  );

  const apiFilters = useMemo(() => {
    if (activeTab === "live") {
      return { is_active: "true", sort_by: "occurred_at", sort_order: "desc" };
    }
    if (activeTab === "history") {
      return { is_active: "false", sort_by: "occurred_at", sort_order: "desc" };
    }
    return { sort_by: "occurred_at", sort_order: "desc" };
  }, [activeTab]);

  const { data, isLoading } = useGetPlantAlarmsQuery({
    plantId,
    page: 1,
    limit: pageSize,
    filters: config?.activeOnly === false && activeTab === "all" ? {} : apiFilters,
    enabled: Boolean(plantId),
  });

  const apiRows = useMemo(() => mapApiAlarmRows(data?.rows ?? []), [data?.rows]);

  const rows = useMemo(
    () =>
      toTableRows(
        mergeAlarmPanelRows({
          tab: activeTab,
          liveRows,
          apiRows,
        }).slice(0, pageSize),
      ),
    [activeTab, apiRows, liveRows, pageSize],
  );

  const liveCount = liveRows.length > 0 ? liveRows.length : apiRows.filter((row) => row.isActive).length;

  return (
    <PlantDashboardCard
      icon={Bell}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
      badge={
        <span className="rounded-xs border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Live
        </span>
      }
    >
      {showTabs ? (
        <div className="mb-2.5">
          <PlantDashboardSegmentedControl
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={setActiveTab}
            className="w-full [&_button]:flex-1"
          />
        </div>
      ) : null}

      <PlantDashboardTableFrame>
        <CommonTable
          entityKey={`plant-dashboard-alarms-${plantId ?? "plant"}-${activeTab}`}
          columns={alarmColumns}
          defaultColumns={alarmColumns}
          data={rows}
          loading={isLoading && rows.length === 0}
          columnSelectorTitle="Alarms"
          pageSize={pageSize}
          tableHeight={tableHeight}
          rowIdField="id"
          gridOptions={{
            suppressRowClickSelection: true,
            rowSelection: undefined,
          }}
        />
      </PlantDashboardTableFrame>

      {activeTab === "live" ? (
        <p className="mt-2 text-center text-[9px] text-neutral-400 dark:text-neutral-dark-500">
          {liveCount} active alarm{liveCount === 1 ? "" : "s"}
          {live.hasLiveData ? " from live MQTT" : ""}
        </p>
      ) : null}
    </PlantDashboardCard>
  );
}
