import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Radio,
  Server,
} from "lucide-react";
import { usePlantLiveMqtt } from "@/hooks/usePlantLiveMqtt";
import { flattenPlantLiveRows } from "@/types/plantLive";
import {
  DetailField,
  DetailFieldGrid,
  DetailMain,
  DetailPageBackground,
  DetailSectionCard,
  DetailSectionHeader,
} from "@/components/core/detail/DetailPagePrimitives";

function connectionBadgeClass(state: string): string {
  switch (state) {
    case "connected":
      return "bg-success-500/15 text-success-800 dark:text-success-300 ring-1 ring-success-500/30";
    case "connecting":
    case "reconnecting":
      return "bg-brand-500/15 text-brand-800 dark:text-brand-300 ring-1 ring-brand-500/30";
    case "error":
      return "bg-error-500/15 text-error-800 dark:text-error-300 ring-1 ring-error-500/30";
    case "disconnected":
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-dark-300 dark:text-neutral-dark-800 ring-1 ring-neutral-300 dark:ring-neutral-dark-400";
    default:
      return "bg-neutral-100 text-neutral-600 dark:bg-neutral-dark-200 dark:text-neutral-400";
  }
}

const PlantLiveDashboard: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();
  const {
    connectionState,
    errorMessage,
    plantLive,
    lastMessageAt,
    brokerUrl,
    subscribedTopic,
    configWarning,
  } = usePlantLiveMqtt(plantId);

  const rows = useMemo(
    () => (plantLive ? flattenPlantLiveRows(plantLive) : []),
    [plantLive],
  );

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailMain className="min-h-0 overflow-y-auto">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-neutral-500 dark:text-neutral-dark-600">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Live
              </span>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Plant dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              MQTT stream from the broker (retained plant snapshot and updates).
              One table row per device + component from today&apos;s live payload.
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 self-start rounded-xs px-3 py-1.5 text-xs font-semibold ${connectionBadgeClass(connectionState)}`}
          >
            <Radio className="h-3.5 w-3.5" />
            {connectionState}
          </div>
        </div>

        {configWarning && (
          <div className="mb-4 rounded-xs border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100">
            {configWarning}
          </div>
        )}

        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Activity}
            title="Broker & subscription"
            description="WebSocket endpoint and topic derived from this plant id"
          />
          <DetailFieldGrid variant="dense">
            <DetailField label="WebSocket URL" value={brokerUrl} fullRow />
            <DetailField label="Topic" value={subscribedTopic} fullRow />
            <DetailField
              label="Plant id (route)"
              value={plantId}
            />
            <DetailField
              label="Payload plant_id"
              value={plantLive?.plant_id ?? "—"}
            />
            <DetailField
              label="Payload timestamp"
              value={
                plantLive?.timestamp
                  ? String(plantLive.timestamp)
                  : "—"
              }
            />
            <DetailField
              label="Last message received"
              value={
                lastMessageAt ? lastMessageAt.toLocaleString() : "—"
              }
            />
          </DetailFieldGrid>
          {errorMessage && (
            <p className="mt-3 rounded-xs border border-error-500/40 bg-error-500/10 px-3 py-2 text-xs text-error-800 dark:text-error-200">
              {errorMessage}
            </p>
          )}
        </DetailSectionCard>

        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Server}
            title="Device / component rows"
            description="Flattened from MQTT JSON: devices → components (matches processor DB rows)"
          />
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {connectionState === "connected"
                ? "No component rows in the latest payload yet. If the plant has no data for today, the processor may not publish until rows exist."
                : "Waiting for MQTT data…"}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xs border border-neutral-200 dark:border-neutral-dark-300">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-dark-300 dark:bg-neutral-dark-200">
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Device
                    </th>
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Component
                    </th>
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Device status
                    </th>
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Component status
                    </th>
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Last data at
                    </th>
                    <th className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Alarms
                    </th>
                    <th className="min-w-[200px] px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">
                      Processed data (JSON)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.device_id}-${r.component_id}`}
                      className="border-b border-neutral-100 odd:bg-neutral-0 even:bg-neutral-50/80 dark:border-neutral-dark-300 dark:odd:bg-neutral-dark-100 dark:even:bg-neutral-dark-200/40"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                        {r.device_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                        {r.component_id}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {r.device_status}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {r.component_status}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-600 dark:text-neutral-400">
                        {r.last_data_at
                          ? new Date(r.last_data_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-neutral-700 dark:text-neutral-300">
                        {r.alarms_count}
                      </td>
                      <td className="max-w-xl px-3 py-2 font-mono text-[10px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                        <span className="line-clamp-4 break-all">
                          {r.processed_data_json}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSectionCard>
      </DetailMain>
    </DetailPageBackground>
  );
};

export default PlantLiveDashboard;
