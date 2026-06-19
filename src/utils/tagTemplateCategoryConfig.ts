import type { TagMapStaticRow } from "@/components/common/JsonFields";
import type { TagTemplateCategory } from "@/services/operations/tagTemplateAPI";

export const HEALTH_ROWS: TagMapStaticRow[] = [
    { key: "imei", defaultValue: "IMEI", description: "Device IMEI identifier" },
    { key: "vd", defaultValue: "VD", description: "Virtual Device identifier" },
    { key: "online", defaultValue: "ONLINE", description: "Online/offline status" },
    { key: "wifi_rssi", defaultValue: "WIFIRSSI", description: "Wi-Fi signal strength" },
    { key: "rssi", defaultValue: "RSSI", description: "Signal strength (general)" },
    { key: "battery_voltage", defaultValue: "VBATT", description: "Battery voltage" },
    { key: "uptime", defaultValue: "UPTIME", description: "Device uptime" },
    { key: "firmware", defaultValue: "FIRMWARE", description: "Firmware version" },
    { key: "last_error", defaultValue: "LASTSTERR", description: "Last seen error" },
    { key: "timestamp", defaultValue: "TIMESTAMP", description: "Packet timestamp" },
    { key: "send_interval", defaultValue: "STINTERVAL", description: "Data send interval" },
];

export const INVERTER_ROWS: TagMapStaticRow[] = [
    { key: "alarm_1", defaultValue: "I1-AL1" },
    { key: "alarm_2", defaultValue: "I1-AL2" },
    { key: "alarm_3", defaultValue: "I1-AL3" },
    { key: "ac_current_b", defaultValue: "I1-IB" },
    { key: "ac_current_r", defaultValue: "I1-IR" },
    { key: "ac_current_y", defaultValue: "I1-IY" },
    { key: "ac_voltage_b", defaultValue: "I1-VB" },
    { key: "ac_voltage_r", defaultValue: "I1-VR" },
    { key: "ac_voltage_y", defaultValue: "I1-VY" },
    { key: "mppt1_voltage", defaultValue: "I1-V1" },
    { key: "mppt2_voltage", defaultValue: "I1-V2" },
    { key: "mppt3_voltage", defaultValue: "I1-V3" },
    { key: "mppt4_voltage", defaultValue: "I1-V4" },
    { key: "mppt5_voltage", defaultValue: "I1-V5" },
    { key: "mppt6_voltage", defaultValue: "I1-V6" },
    { key: "mppt7_voltage", defaultValue: "I1-V7" },
    { key: "mppt8_voltage", defaultValue: "I1-V8" },
    { key: "mppt9_voltage", defaultValue: "I1-V9" },
    { key: "mppt10_voltage", defaultValue: "I1-V10" },
    { key: "mppt11_voltage", defaultValue: "I1-V11" },
    { key: "mppt12_voltage", defaultValue: "I1-V12" },
    { key: "string1_current", defaultValue: "I1-C1" },
    { key: "string2_current", defaultValue: "I1-C2" },
    { key: "string3_current", defaultValue: "I1-C3" },
    { key: "string4_current", defaultValue: "I1-C4" },
    { key: "string5_current", defaultValue: "I1-C5" },
    { key: "string6_current", defaultValue: "I1-C6" },
    { key: "today_energy_kwh", defaultValue: "I1-FKWH" },
    { key: "total_dc_voltage", defaultValue: "I1-DCV" },
    { key: "total_energy_kwh", defaultValue: "I1-KWH" },
    { key: "total_dc_power_kw", defaultValue: "I1-DCKW" },
    { key: "ac_active_power_kw", defaultValue: "I1-PW" },
    { key: "heat_sink_temperature", defaultValue: "I1-TMP2" },
    { key: "ac_reactive_power_kvar", defaultValue: "I1-RPW" },
    { key: "insulation_resistance_mohm", defaultValue: "I1-OHM" },
    { key: "inverter_efficiency_percent", defaultValue: "I1-EF" },
    { key: "ac_frequency_hz", defaultValue: "I1-FR" },
    { key: "ac_power_factor", defaultValue: "I1-PF" },
    { key: "inverter_status", defaultValue: "I1-ST" },
];

export const ALARM_ROWS: TagMapStaticRow[] = [
    { key: "alarm_key_1", defaultValue: "alarm_key_1", description: "Primary alarm code" },
    { key: "alarm_key_2", defaultValue: "alarm_key_2", description: "Secondary alarm code" },
    { key: "alarm_key_3", defaultValue: "alarm_key_3", description: "Tertiary alarm code" },
    { key: "fault_key_1", defaultValue: "fault_key_1", description: "Fault code 1" },
    { key: "fault_key_2", defaultValue: "fault_key_2", description: "Fault code 2" },
    { key: "warning_key_1", defaultValue: "warning_key_1", description: "Warning code 1" },
    { key: "warning_key_2", defaultValue: "warning_key_2", description: "Warning code 2" },
];

export const DYNAMIC_ROWS: TagMapStaticRow[] = [];
export const PLANT_ROWS: TagMapStaticRow[] = [];
export const BLOCK_ROWS: TagMapStaticRow[] = [];
export const STRING_ROWS: TagMapStaticRow[] = [];
export const METER_ROWS: TagMapStaticRow[] = [];
export const ACDB_ROWS: TagMapStaticRow[] = [];
export const DCDB_ROWS: TagMapStaticRow[] = [];
export const WEATHER_STATION_ROWS: TagMapStaticRow[] = [];
export const TRANSFORMER_ROWS: TagMapStaticRow[] = [];
export const TRACKER_ROWS: TagMapStaticRow[]= [];
export const SCB_ROWS: TagMapStaticRow[] = [];
export const ICB_ROWS: TagMapStaticRow[] = [];
export const NUMERICAL_RELAY_ROWS: TagMapStaticRow[] = [];
export const NIFPS_ROWS: TagMapStaticRow[] = [];
export const OTHERS_ROWS: TagMapStaticRow[] = [];
export const PLANT_BOT_ROWS: TagMapStaticRow[] = [];
export const BLOCK_BOT_ROWS: TagMapStaticRow[] = [];
export const ACDB_BLOCK_ROWS: TagMapStaticRow[] = [];


export type TagTemplateCategoryFormConfig = {
    rows: TagMapStaticRow[];
    keyLabel: string;
    valueLabel: string;
    previewLabel: string;
    hint: string;
};

const NORM_DEVICE_LABELS = {
    keyLabel: "Normalized Key",
    valueLabel: "Device Key",
} as const;

const telemetryHint = (scope: string) =>
    `Maps normalized field names to device payload keys for ${scope}.`;

const genericTelemetry = (
    category: TagTemplateCategory,
    rows: TagMapStaticRow[],
    scope: string,
): TagTemplateCategoryFormConfig => ({
    rows,
    ...NORM_DEVICE_LABELS,
    previewLabel: `${category} tag_map`,
    hint: telemetryHint(scope),
});

export const TAG_TEMPLATE_CATEGORY_CONFIG: Record<TagTemplateCategory, TagTemplateCategoryFormConfig> = {
    health: {
        rows: HEALTH_ROWS,
        ...NORM_DEVICE_LABELS,
        previewLabel: "health tag_map",
        hint: 'Maps normalized field names to device payload keys, e.g. { "imei": "IMEI", "rssi": "RSSI" }',
    },
    inverter: {
        rows: INVERTER_ROWS,
        ...NORM_DEVICE_LABELS,
        previewLabel: "inverter tag_map",
        hint: 'Maps inverter data fields to device payload keys, e.g. { "power_kw": "IKW", "today_energy_kwh": "ITKWH" }',
    },
    alarm: {
        rows: ALARM_ROWS,
        keyLabel: "Alarm Code",
        valueLabel: "Description",
        previewLabel: "alarm tag_map",
        hint: 'Maps alarm codes to human-readable descriptions, e.g. { "101": "Grid Over Voltage" }',
    },
    dynamic: {
        rows: DYNAMIC_ROWS,
        keyLabel: "Dynamic Field",
        valueLabel: "Value",
        previewLabel: "dynamic tag_map",
        hint: "Builds VD + parameter definitions for dynamic tag expansion.",
    },
    plant: genericTelemetry("plant", PLANT_ROWS, "plant-level telemetry"),
    block: genericTelemetry("block", BLOCK_ROWS, "block-level telemetry"),
    string: genericTelemetry("string", STRING_ROWS, "string-level telemetry"),
    meter: genericTelemetry("meter", METER_ROWS, "meter telemetry"),
    acdb: genericTelemetry("acdb", ACDB_ROWS, "ACDB telemetry"),
    dcdb: genericTelemetry("dcdb", DCDB_ROWS, "DCDB telemetry"),
    weather_station: genericTelemetry(
        "weather_station",
        WEATHER_STATION_ROWS,
        "weather station telemetry",
    ),
    transformer: genericTelemetry("transformer", TRANSFORMER_ROWS, "transformer telemetry"),
    tracker: genericTelemetry("tracker",TRACKER_ROWS,  "tracker telemetry"),
    scb: genericTelemetry("scb", SCB_ROWS, "SCB telemetry"),
    icb: genericTelemetry("icb", ICB_ROWS, "ICB telemetry"),
    numerical_relay: genericTelemetry("numerical_relay", NUMERICAL_RELAY_ROWS, "numerical relay telemetry"),
    nifps: genericTelemetry("nifps", NIFPS_ROWS, "NIFPS telemetry"),
    others: genericTelemetry("others", OTHERS_ROWS, "other component types"),
    plant_bot: {
        rows: PLANT_BOT_ROWS,
        keyLabel: "Normalized Key",
        valueLabel: "Aggregation Expression",
        previewLabel: "plant_bot tag_map",
        hint: "Bot-layer plant template aggregating child meter telemetry (meter to meter).",
    },
    block_bot: {
        rows: BLOCK_BOT_ROWS,
        keyLabel: "Normalized Key",
        valueLabel: "Aggregation Expression",
        previewLabel: "block_bot tag_map",
        hint: "Bot-layer block template. Choose meter-to-meter or meter-to-inverter aggregation.",
    },
    acdb_block: {
        rows: ACDB_BLOCK_ROWS,
        keyLabel: "Normalized Key",
        valueLabel: "Aggregation Expression",
        previewLabel: "acdb_block tag_map",
        hint: "Bot-layer ACDB template aggregating child inverter telemetry (meter to inverter).",
    },
};
