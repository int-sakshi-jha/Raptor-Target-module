import { format, parseISO } from "date-fns";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import type { AlarmRow } from "@/services/operations/alarmAPI";
import type { PlantLiveData } from "@/types/plantLive";

export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlarmPanelTab = "live" | "history" | "all";

export interface AlarmPanelRow {
  id: string;
  componentId: string;
  componentName: string;
  timeIso: string;
  timeDisplay: string;
  severity: AlarmSeverity;
  effectPercent: number;
  isActive: boolean;
  alarmCode?: string;
  alarmName?: string;
  source: "live" | "api";
}

function normalizeSeverity(value: unknown): AlarmSeverity {
  const raw = String(value ?? "").toUpperCase();
  if (raw === "CRITICAL" || raw === "HIGH" || raw === "MEDIUM" || raw === "LOW") {
    return raw;
  }
  return "MEDIUM";
}

export function resolveAlarmEffectPercent(severity: AlarmSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 100;
    case "HIGH":
      return 82;
    case "MEDIUM":
      return 58;
    case "LOW":
      return 32;
    default:
      return 50;
  }
}

export function resolveAlarmEffectTone(
  severity: AlarmSeverity,
): "danger" | "warning" | "neutral" {
  if (severity === "CRITICAL" || severity === "HIGH") return "danger";
  if (severity === "MEDIUM") return "warning";
  return "neutral";
}

function formatAlarmTime(value: string | null | undefined): { iso: string; display: string } {
  if (!value) {
    const now = new Date();
    return { iso: now.toISOString(), display: format(now, "HH:mm:ss") };
  }

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    const date = new Date(parsed);
    return { iso: date.toISOString(), display: format(date, "HH:mm:ss") };
  }

  return { iso: value, display: value.length > 8 ? value.slice(11, 19) || value : value };
}

function inferSeverityFromLiveAlarm(alarm: Record<string, unknown>): AlarmSeverity {
  const explicit = normalizeSeverity(alarm.severity ?? alarm.priority ?? alarm.level);
  if (explicit !== "MEDIUM" || alarm.severity || alarm.priority || alarm.level) {
    return explicit;
  }

  if (alarm.type === "fault") return "HIGH";
  if (alarm.type === "alarm") return "MEDIUM";

  const code = Number(alarm.code ?? alarm.value ?? 0);
  if (Number.isFinite(code) && code >= 1000) return "CRITICAL";
  if (Number.isFinite(code) && code >= 100) return "HIGH";
  return "MEDIUM";
}

function buildLiveAlarmRow(args: {
  componentId: string;
  componentName: string;
  alarm: Record<string, unknown>;
  fallbackTime?: string;
  index: number;
}): AlarmPanelRow {
  const severity = inferSeverityFromLiveAlarm(args.alarm);
  const timeRaw = String(
    args.alarm.occurred_at ??
      args.alarm.timestamp ??
      args.alarm.time ??
      args.fallbackTime ??
      "",
  );
  const { iso, display } = formatAlarmTime(timeRaw);
  const code = args.alarm.code ?? args.alarm.alarm_code;
  const message = String(args.alarm.message ?? args.alarm.alarm_name ?? args.alarm.name ?? "");

  return {
    id: `live:${args.componentId}:${String(code ?? args.index)}:${iso}`,
    componentId: args.componentId,
    componentName: args.componentName,
    timeIso: iso,
    timeDisplay: display,
    severity,
    effectPercent: resolveAlarmEffectPercent(severity),
    isActive: true,
    alarmCode: code != null ? String(code) : undefined,
    alarmName: message || undefined,
    source: "live",
  };
}

export function buildLiveAlarmRows(args: {
  plantLive: PlantLiveData | null;
  componentById: ReadonlyMap<string, PlantComponentRow>;
}): AlarmPanelRow[] {
  const { plantLive, componentById } = args;
  const rows: AlarmPanelRow[] = [];

  Object.values(plantLive?.devices ?? {}).forEach((device) => {
    Object.entries(device.components ?? {}).forEach(([componentId, componentLive]) => {
      const alarms = Array.isArray(componentLive.alarms) ? componentLive.alarms : [];
      if (alarms.length === 0) return;

      const component = componentById.get(componentId);
      const componentName =
        component?.component_name ??
        component?.component_code ??
        `Component ${componentId.slice(0, 6)}`;

      alarms.forEach((alarm, index) => {
        if (!alarm || typeof alarm !== "object") return;
        rows.push(
          buildLiveAlarmRow({
            componentId,
            componentName,
            alarm,
            fallbackTime: componentLive.last_data_at,
            index,
          }),
        );
      });
    });
  });

  return rows.sort((a, b) => Date.parse(b.timeIso) - Date.parse(a.timeIso));
}

function mapApiAlarmRow(row: AlarmRow): AlarmPanelRow {
  const { iso, display } = formatAlarmTime(row.occurred_at);
  const severity = normalizeSeverity(row.severity);

  return {
    id: `api:${row.id}`,
    componentId: row.component_id,
    componentName: row.component_name ?? row.component_id,
    timeIso: iso,
    timeDisplay: display,
    severity,
    effectPercent: resolveAlarmEffectPercent(severity),
    isActive: row.is_active,
    alarmCode: row.alarm_code,
    alarmName: row.alarm_name ?? row.alarm_description ?? undefined,
    source: "api",
  };
}

function dedupeAlarmRows(rows: AlarmPanelRow[]): AlarmPanelRow[] {
  const seen = new Set<string>();
  const out: AlarmPanelRow[] = [];

  for (const row of rows) {
    const key = `${row.componentId}:${row.alarmCode ?? row.alarmName ?? row.timeDisplay}:${row.isActive ? "1" : "0"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

export function mergeAlarmPanelRows(args: {
  tab: AlarmPanelTab;
  liveRows: AlarmPanelRow[];
  apiRows: AlarmPanelRow[];
}): AlarmPanelRow[] {
  const { tab, liveRows, apiRows } = args;

  if (tab === "live") {
    if (liveRows.length > 0) return liveRows;
    return apiRows.filter((row) => row.isActive);
  }

  if (tab === "history") {
    return apiRows.filter((row) => !row.isActive);
  }

  return dedupeAlarmRows([...liveRows, ...apiRows]).sort(
    (a, b) => Date.parse(b.timeIso) - Date.parse(a.timeIso),
  );
}

export function mapApiAlarmRows(rows: AlarmRow[]): AlarmPanelRow[] {
  return rows.map(mapApiAlarmRow);
}

export function safeParseAlarmTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAlarmListTimestamp(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return format(parseISO(value), "HH:mm:ss");
  } catch {
    return formatAlarmTime(value).display;
  }
}
