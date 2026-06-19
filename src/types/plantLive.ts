/**
 * Shapes published by the IoT processor to EMQX (`PlantLiveData` in infra/emqx/processor/main.go).
 */

export interface ComponentLivePayload {
  component_id: string;
  last_data_at: string;
  processed_data: Record<string, unknown>;
  status: string;
  alarms: Array<Record<string, unknown>>;
}

export interface DeviceLiveData {
  device_id: string;
  timestamp: string;
  status: string;
  components: Record<string, ComponentLivePayload>;
  aggregates?: Record<string, unknown>;
}

export interface PlantLiveData {
  plant_id: string;
  devices: Record<string, DeviceLiveData>;
  timestamp: string;
}

export interface PlantLiveFlatRow {
  device_id: string;
  device_status: string;
  device_timestamp: string;
  component_id: string;
  last_data_at: string;
  component_status: string;
  processed_data_json: string;
  alarms_count: number;
}

export function flattenPlantLiveRows(data: PlantLiveData): PlantLiveFlatRow[] {
  const rows: PlantLiveFlatRow[] = [];
  for (const [devId, dev] of Object.entries(data.devices ?? {})) {
    const components = dev.components ?? {};
    for (const [compId, comp] of Object.entries(components)) {
      rows.push({
        device_id: devId,
        device_status: dev.status ?? "",
        device_timestamp:
          typeof dev.timestamp === "string" ? dev.timestamp : String(dev.timestamp ?? ""),
        component_id: compId,
        last_data_at:
          typeof comp.last_data_at === "string"
            ? comp.last_data_at
            : String(comp.last_data_at ?? ""),
        component_status: comp.status ?? "",
        processed_data_json: JSON.stringify(comp.processed_data ?? {}),
        alarms_count: Array.isArray(comp.alarms) ? comp.alarms.length : 0,
      });
    }
  }
  return rows;
}
