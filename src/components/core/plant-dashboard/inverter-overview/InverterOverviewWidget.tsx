import { Zap } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";
import CommonTable, { type CommonColumnConfig } from "@/components/core/table/CommonTable";
import { buildTextColumn } from "@/components/core/table/ListPageHelpers";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { formatCellValue } from "@/utils/plantLiveFormatters";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface InverterOverviewWidgetProps {
  plantId?: string;
  title?: string;
  config?: { pageSize?: number; tableHeight?: number };
  embedded?: boolean;
}

function formatNumber(value: unknown): string {
  if (value == null || value === "") return "-";
  const num = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num);
}

const columns: CommonColumnConfig[] = [
  buildTextColumn("component_name", "Inverter", { pinned: "left", minWidth: 140 }),
  buildTextColumn("block_name", "Block", { minWidth: 100 }),
  buildTextColumn("status", "Status", { minWidth: 90 }),
  buildTextColumn("active_power", "Power (kW)", {
    minWidth: 110,
    valueFormatter: (params) => formatNumber(params.value),
  }),
  buildTextColumn("today_generation_kwh", "Today (kWh)", {
    minWidth: 110,
    valueFormatter: (params) =>
      formatNumber(
        params.value ??
          formatCellValue(params.data as Record<string, unknown>, "today_generation_kwh"),
      ),
  }),
];

export function InverterOverviewWidget({
  plantId,
  title = "Inverter Overview",
  config,
  embedded = false,
}: InverterOverviewWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const today = format(new Date(), "yyyy-MM-dd");
  const pageSize = config?.pageSize ?? 8;
  const tableHeight = config?.tableHeight ?? 280;

  const rows = useMemo(
    () =>
      live.getEquipmentRows({
        analysisMode: "live",
        componentType: "inverter",
        startDate: today,
        endDate: today,
      }),
    [live, today],
  );

  const summary = useMemo(() => {
    let online = 0;
    let totalPower = 0;
    rows.forEach((row) => {
      if (String(row.status ?? "").toLowerCase().includes("online")) online += 1;
      const power = Number(row.active_power ?? row.power ?? row.dc_power ?? 0);
      if (Number.isFinite(power)) totalPower += power;
    });
    return { total: rows.length, online, totalPower };
  }, [rows]);

  return (
    <PlantDashboardCard
      icon={Zap}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Inverters", value: summary.total },
            { label: "Online", value: summary.online },
            { label: "Live Power", value: `${formatNumber(summary.totalPower)} kW` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xs border border-neutral-200/80 bg-neutral-50/80 px-2 py-1.5 text-center dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30"
            >
              <p className="text-[9px] uppercase text-neutral-500">{item.label}</p>
              <p className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xs border border-neutral-200/80 dark:border-neutral-dark-300/60">
          <CommonTable
            entityKey={`plant-dashboard-inverter-overview-${plantId ?? "plant"}`}
            columns={columns}
            defaultColumns={columns}
            data={rows}
            loading={!live.hasLiveData && rows.length === 0}
            pageSize={pageSize}
            tableHeight={tableHeight}
            rowIdField="component_id"
          />
        </div>
      </div>
    </PlantDashboardCard>
  );
}
