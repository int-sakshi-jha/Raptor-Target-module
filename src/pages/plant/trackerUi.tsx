/**
 * Shared tracker UI primitives used across overview, table, cards, and graph views.
 */

import React from "react";

/** Horizontal scroll without a visible scrollbar. */
export const TRACKER_H_SCROLL =
  "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
import type { ValueFormatterParams } from "@ag-grid-community/core";
import { CloudSun, Droplets, Gauge, Thermometer, Wind } from "lucide-react";
import ColorBadge, { type BadgeVariant } from "@/components/common/ColorBadge";
import {
  getTrackerDeviationStatus,
  TRACKER_DEVIATION_OK_DEG,
  TRACKER_DEVIATION_WARN_DEG,
  type TrackerDeviationStatus,
  type TrackerSnapshot,
  type WeatherLastSnapshot,
} from "@/lib/plant/trackerLiveData";
import { dateTimeFormatter } from "@/utils/gridFormatters";

export const TRACKER_STATUS_STYLES: Record<
  TrackerDeviationStatus,
  { fill: string; label: string; badgeVariant: BadgeVariant }
> = {
  ok: { fill: "#22c55e", label: "On target", badgeVariant: "green" },
  warning: { fill: "#f59e0b", label: "Drifting", badgeVariant: "orange" },
  critical: { fill: "#ef4444", label: "Off track", badgeVariant: "no" },
  unknown: { fill: "#e5e7eb", label: "No data", badgeVariant: "gray" },
};

export function trackerStatusBadgeVariant(status: TrackerDeviationStatus): BadgeVariant {
  return TRACKER_STATUS_STYLES[status].badgeVariant;
}

export function formatTrackerAngle(value: number | null | undefined): string {
  return value != null ? `${value.toFixed(1)}°` : "—";
}

export function formatSignedDeviation(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}°`;
}

export function formatTrackerTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormatter({ value } as ValueFormatterParams);
}

function formatFieldLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWeatherValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

// ─── Status badge (ColorBadge) ───────────────────────────────────────────────

export const TrackerStatusBadge: React.FC<{ status: TrackerDeviationStatus }> = ({ status }) => (
  <ColorBadge variant={trackerStatusBadgeVariant(status)}>
    {TRACKER_STATUS_STYLES[status].label}
  </ColorBadge>
);

/** Small filled box for card status — works in light and dark mode. */
export const TrackerStatusBox: React.FC<{
  status: TrackerDeviationStatus;
  className?: string;
}> = ({ status, className = "" }) => (
  <span
    className={`inline-block h-3 w-3 shrink-0 rounded-[3px] ${className}`}
    style={{ backgroundColor: TRACKER_STATUS_STYLES[status].fill }}
    aria-hidden
  />
);

export function deviationBadgeNode(
  diff: number | null | undefined,
  signed = true,
): React.ReactNode {
  if (diff == null) return <span className="text-neutral-400">—</span>;
  const status = getTrackerDeviationStatus(Math.abs(diff));
  const sign = signed && diff > 0 ? "+" : "";
  return (
    <ColorBadge variant={trackerStatusBadgeVariant(status)} className="tabular-nums">
      {sign}
      {diff.toFixed(1)}°
    </ColorBadge>
  );
}

// ─── Summary table ───────────────────────────────────────────────────────────

export const TrackerSummaryTable: React.FC<{ snapshots: TrackerSnapshot[] }> = ({ snapshots }) => {
  if (snapshots.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-400">No tracker data available</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xs border border-neutral-200/80 dark:border-neutral-dark-200">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-neutral-50/80 dark:bg-neutral-dark-200/40">
          <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-dark-500">
            <th className="px-3 py-2.5">Tracker</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Projected</th>
            <th className="px-3 py-2.5">Actual</th>
            <th className="px-3 py-2.5">Deviation</th>
            <th className="px-3 py-2.5">|Δ|</th>
            <th className="px-3 py-2.5">Updated</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((tracker) => (
            <tr
              key={tracker.id}
              className="border-t border-neutral-100/80 dark:border-neutral-dark-200/60"
            >
              <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-dark-950">
                {tracker.name}
              </td>
              <td className="px-3 py-2">
                <TrackerStatusBadge status={tracker.status} />
              </td>
              <td className="px-3 py-2 tabular-nums text-neutral-800 dark:text-neutral-dark-900">
                {formatTrackerAngle(tracker.projectedAngle)}
              </td>
              <td className="px-3 py-2 tabular-nums text-neutral-800 dark:text-neutral-dark-900">
                {formatTrackerAngle(tracker.actualAngle)}
              </td>
              <td className="px-3 py-2">{deviationBadgeNode(tracker.signedDeviation)}</td>
              <td className="px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-dark-500">
                {formatTrackerAngle(tracker.absoluteDeviation)}
              </td>
              <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-dark-500">
                {formatTrackerTimestamp(tracker.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Section card ────────────────────────────────────────────────────────────

export const TrackerSectionCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}> = ({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
  noPadding = false,
}) => (
  <div
    className={`rounded-xs border border-neutral-200/90 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100 ${className}`}
  >
    <div className="border-b border-neutral-200/70 px-3 py-2 dark:border-neutral-dark-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-dark-500">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-dark-500">{subtitle}</p>
      ) : null}
    </div>
    <div className={noPadding ? bodyClassName : `p-3 ${bodyClassName}`}>{children}</div>
  </div>
);

// ─── Compact weather strip ───────────────────────────────────────────────────

export const TrackerWeatherStrip: React.FC<{ snapshots: WeatherLastSnapshot[] }> = ({
  snapshots,
}) => {
  if (snapshots.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {snapshots.map((snapshot) => {
        const displayFields = snapshot.priorityFields
          .filter((f) => !["timestamp", "status"].includes(f))
          .slice(0, 8);

        return (
          <div
            key={snapshot.componentId}
            className="rounded-xs border border-neutral-200/90 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-200/70 px-3 py-2 dark:border-neutral-dark-200">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-dark-900">
                <CloudSun className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                {snapshot.componentName}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-dark-500">
                {formatTrackerTimestamp(snapshot.timestamp)}
              </span>
            </div>
            <div className={`flex gap-2 px-3 py-2 ${TRACKER_H_SCROLL}`}>
              {displayFields.map((field) => {
                const meta = WEATHER_FIELD_META[field] ?? {
                  label: formatFieldLabel(field),
                  icon: <Gauge className="h-3.5 w-3.5" />,
                };
                const raw = formatWeatherValue(snapshot.fields[field]);
                return (
                  <div
                    key={`${snapshot.componentId}-${field}`}
                    className="flex min-w-[108px] shrink-0 flex-col rounded-[4px] border border-neutral-200/70 bg-neutral-50/60 px-2.5 py-1.5 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/30"
                  >
                    <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500">
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-dark-950">
                      {raw}
                      {meta.unit && raw !== "—" ? (
                        <span className="ml-0.5 text-[10px] font-normal text-neutral-400">
                          {meta.unit}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const WEATHER_FIELD_META: Record<string, { label: string; unit?: string; icon?: React.ReactNode }> =
  {
    irradiance: { label: "Irradiance", unit: "W/m²", icon: <Gauge className="h-3.5 w-3.5" /> },
    ghi: { label: "GHI", unit: "W/m²", icon: <Gauge className="h-3.5 w-3.5" /> },
    gti: { label: "GTI", unit: "W/m²", icon: <Gauge className="h-3.5 w-3.5" /> },
    gti_1: { label: "GTI", unit: "W/m²", icon: <Gauge className="h-3.5 w-3.5" /> },
    poa: { label: "POA", unit: "W/m²", icon: <Gauge className="h-3.5 w-3.5" /> },
    module_temp: {
      label: "Module temp",
      unit: "°C",
      icon: <Thermometer className="h-3.5 w-3.5" />,
    },
    ambient_temp: {
      label: "Ambient",
      unit: "°C",
      icon: <Thermometer className="h-3.5 w-3.5" />,
    },
    wind_speed: { label: "Wind", unit: "m/s", icon: <Wind className="h-3.5 w-3.5" /> },
    wind_direction: { label: "Wind dir", unit: "°", icon: <Wind className="h-3.5 w-3.5" /> },
    humidity: { label: "Humidity", unit: "%", icon: <Droplets className="h-3.5 w-3.5" /> },
    rainfall: { label: "Rain", unit: "mm", icon: <Droplets className="h-3.5 w-3.5" /> },
  };

export const TRACKER_THRESHOLD_HINT = `±${TRACKER_DEVIATION_OK_DEG}° on target · ±${TRACKER_DEVIATION_WARN_DEG}° drifting`;
