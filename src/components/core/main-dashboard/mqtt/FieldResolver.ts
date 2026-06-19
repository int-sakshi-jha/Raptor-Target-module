import type { PlantRow } from "@/services/operations/plantAPI";
import { extractLastDataMap } from "@/lib/plant/componentLiveData";
import type { PlantLiveData } from "@/types/plantLive";
import { TopicResolver } from "./TopicResolver";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function readFromObject(source: Record<string, unknown>, key: string): unknown {
  if (key in source) return source[key];
  const normalized = normalizeKey(key);
  const match = Object.keys(source).find((k) => normalizeKey(k) === normalized);
  if (match) return source[match];

  const aliases: Record<string, string[]> = {
    current_power: ["active_power", "power", "ac_power", "plant_power", "generation_power"],
    export_power: ["export_kw", "grid_export_power"],
    import_power: ["import_kw", "grid_import_power"],
    today_generation: ["today_generation_kwh", "daily_generation", "generation_today", "day_generation"],
    total_generation: ["total_generation_kwh", "lifetime_generation", "cumulative_generation"],
    export_energy: ["export_kwh", "today_export", "daily_export"],
    import_energy: ["import_kwh", "today_import", "daily_import"],
    plant_status: ["status", "communication_status", "comm_status"],
    active_alerts: ["alerts", "alerts_count", "alarm_count"],
    active_alarms: ["alarms", "live_alarms"],
    inactive_components: ["inactive_count", "offline_components"],
    performance_ratio: ["pr", "performance_ratio_percent"],
    cuf: ["capacity_utilization_factor", "cuf_percent"],
  };

  for (const alias of aliases[key] ?? []) {
    const aliasNorm = normalizeKey(alias);
    const aliasMatch = Object.keys(source).find((k) => normalizeKey(k) === aliasNorm);
    if (aliasMatch) return source[aliasMatch];
  }

  return undefined;
}

function flattenPlantLive(live: PlantLiveData): Record<string, unknown> {
  const flat: Record<string, unknown> = { plant_id: live.plant_id, timestamp: live.timestamp };

  for (const device of Object.values(live.devices ?? {})) {
    if (device.aggregates) {
      Object.assign(flat, extractLastDataMap(device.aggregates));
    }
    for (const component of Object.values(device.components ?? {})) {
      const fields = extractLastDataMap(component.processed_data ?? {});
      for (const [tagKey, value] of Object.entries(fields)) {
        if (!(tagKey in flat)) flat[tagKey] = value;
      }
      if (!("plant_status" in flat) && component.status) {
        flat.plant_status = component.status;
      }
    }
    if (!("plant_status" in flat) && device.status) {
      flat.plant_status = device.status;
    }
  }

  return flat;
}

export class FieldResolver {
  private readonly topics: TopicResolver;

  constructor(topics: TopicResolver) {
    this.topics = topics;
  }

  resolve(
    key: string,
    sources: {
      mqtt?: PlantLiveData | null;
      plant?: PlantRow | null;
      computed?: Record<string, unknown>;
    },
  ): unknown {
    const config = this.topics.get(key);
    if (!config) return null;

    if (config.source === "computed" && sources.computed) {
      return readFromObject(sources.computed, key);
    }

    if (config.source === "plant" && sources.plant) {
      return readFromObject(sources.plant as unknown as Record<string, unknown>, key);
    }

    if (sources.mqtt) {
      const flat = flattenPlantLive(sources.mqtt);
      return readFromObject(flat, key);
    }

    return null;
  }

  resolveNumber(
    key: string,
    sources: Parameters<FieldResolver["resolve"]>[1],
  ): number | null {
    const raw = this.resolve(key, sources);
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  resolveString(
    key: string,
    sources: Parameters<FieldResolver["resolve"]>[1],
  ): string | null {
    const raw = this.resolve(key, sources);
    if (raw == null) return null;
    return String(raw);
  }
}
