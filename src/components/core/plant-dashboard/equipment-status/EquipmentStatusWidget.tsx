import { Cpu } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import ColorBadge from "@/components/common/ColorBadge";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { normalizeStatus } from "@/utils/plantLiveFormatters";
import type { EquipmentFilterComponentType } from "@/utils/plantLiveFormatters";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface EquipmentStatusWidgetProps {
  plantId?: string;
  title?: string;
  config?: { componentType?: EquipmentFilterComponentType };
  embedded?: boolean;
}

const TABS: { id: EquipmentFilterComponentType; label: string }[] = [
  { id: "inverter", label: "Inverters" },
  { id: "dc_channel", label: "DC Channels" },
  { id: "meter", label: "Meters" },
  { id: "weather_station", label: "Weather" },
];

function statusVariant(status: string): "green" | "orange" | "no" | "gray" {
  const normalized = status.toLowerCase();
  if (["online", "live", "connected", "healthy", "active"].includes(normalized)) return "green";
  if (["offline", "disconnected", "fault", "error"].includes(normalized)) return "no";
  if (["warning", "delayed", "stale", "partial"].includes(normalized)) return "orange";
  return "gray";
}

export function EquipmentStatusWidget({
  plantId,
  title = "Equipment Status",
  config,
  embedded = false,
}: EquipmentStatusWidgetProps) {
  const [tab, setTab] = useState<EquipmentFilterComponentType>(
    config?.componentType ?? "inverter",
  );
  const live = usePlantLiveData({ plantId });
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = useMemo(
    () =>
      live.getEquipmentRows({
        analysisMode: "live",
        componentType: tab,
        startDate: today,
        endDate: today,
      }),
    [live, tab, today],
  );

  const summary = useMemo(() => {
    let online = 0;
    let offline = 0;
    rows.forEach((row) => {
      const status = normalizeStatus(String(row.status ?? row.communication_status ?? ""));
      if (status === "online") online += 1;
      else offline += 1;
    });
    return { online, offline, total: rows.length };
  }, [rows]);

  return (
    <PlantDashboardCard
      icon={Cpu}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xs px-2 py-0.5 text-[10px] font-medium transition-colors ${
                tab === item.id
                  ? "bg-brand-500/15 text-brand-700 dark:text-brand-400"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-dark-200/60 dark:text-neutral-dark-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total", value: summary.total, tone: "default" as const },
            { label: "Online", value: summary.online, tone: "success" as const },
            { label: "Offline", value: summary.offline, tone: "danger" as const },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xs border border-neutral-200/80 bg-neutral-50/80 px-2 py-1.5 text-center dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30"
            >
              <p className="text-[9px] uppercase text-neutral-500">{item.label}</p>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  item.tone === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : item.tone === "danger"
                      ? "text-red-600 dark:text-red-400"
                      : "text-neutral-900 dark:text-neutral-dark-950"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-neutral-500">No equipment data available.</p>
          ) : (
            rows.slice(0, 50).map((row) => {
              const status = normalizeStatus(String(row.status ?? row.communication_status ?? "unknown"));
              return (
                <div
                  key={String(row.component_id ?? row.id)}
                  className="flex items-center justify-between gap-2 rounded-xs border border-neutral-200/70 px-2 py-1.5 dark:border-neutral-dark-300/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-neutral-900 dark:text-neutral-dark-950">
                      {String(row.component_name ?? row.component_code ?? "-")}
                    </p>
                    <p className="truncate text-[9px] text-neutral-500">{String(row.block_name ?? "")}</p>
                  </div>
                  <ColorBadge variant={statusVariant(status)}>
                    {status === "online" ? "Online" : status === "offline" ? "Offline" : status}
                  </ColorBadge>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PlantDashboardCard>
  );
}
