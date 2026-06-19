import { INDIAN_STATES_AND_UTS } from "@/utils/indianStates";

// ── Plant ─────────────────────────────────────────────────────────────────────

export const GRID_TYPE_OPTIONS = [
    { value: "on_grid", label: "On Grid" },
    { value: "off_grid", label: "Off Grid" },
    { value: "hybrid", label: "Hybrid" },
] as const;

export type GridType = (typeof GRID_TYPE_OPTIONS)[number]["value"];

export const COMMUNICATION_STATUS_OPTIONS = [
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "partial", label: "Partial" },
] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUS_OPTIONS)[number]["value"];

// ── User / Permission ─────────────────────────────────────────────────────────

export const USER_ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "tenant", label: "Tenant" },
    { value: "user", label: "User" },
] as const;

export type UserRole = (typeof USER_ROLE_OPTIONS)[number]["value"];

export const PERMISSION_ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "tenant", label: "Tenant" },
    { value: "user", label: "User" },
] as const;

export type PermissionRole = (typeof PERMISSION_ROLE_OPTIONS)[number]["value"];

// ── Component ─────────────────────────────────────────────────────────────────

export const COMPONENT_PHASE_TYPE_OPTIONS = [
    { value: "single", label: "Single Phase" },
    { value: "three", label: "Three Phase" },
] as const;

export type ComponentPhaseType = (typeof COMPONENT_PHASE_TYPE_OPTIONS)[number]["value"];

export const COMPONENT_METER_TYPE_OPTIONS = [
    { value: "HT", label: "HT" },
    { value: "LT", label: "LT" },
] as const;

export type ComponentMeterType = (typeof COMPONENT_METER_TYPE_OPTIONS)[number]["value"];

export const COMPONENT_STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "faulty", label: "Faulty" },
    { value: "maintenance", label: "Maintenance" },
    { value: "decommissioned", label: "Decommissioned" },
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUS_OPTIONS)[number]["value"];

// ── Device ────────────────────────────────────────────────────────────────────

// ── Tag Template ──────────────────────────────────────────────────────────────

// ── Component sort / filter ───────────────────────────────────────────────────

export const COMPONENT_SORT_BY_OPTIONS = [
    { value: "tenant_id", label: "Tenant" },
    { value: "component_type", label: "Component type" },
    { value: "component_name", label: "Component name" },
    { value: "component_code", label: "Component code" },
    { value: "is_active", label: "Active" },
    { value: "created_by", label: "Created by" },
    { value: "created_at", label: "Created at" },
    { value: "updated_at", label: "Updated at" },
] as const;

export const COMPONENT_SORT_ORDER_OPTIONS = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
] as const;

// ── Device sort / filter ──────────────────────────────────────────────────────

export const DEVICE_SORT_BY_OPTIONS = [
    { value: "device_type", label: "Device type" },
    { value: "device_name", label: "Device name" },
    { value: "serial_number", label: "Serial number" },
    { value: "mac_address", label: "MAC address" },
    { value: "imei", label: "IMEI" },
    { value: "model_code", label: "Model code" },
    { value: "manufacturer", label: "Manufacturer" },
    { value: "username", label: "Username" },
    { value: "ip_address", label: "IP address" },
    { value: "warranty_start_date", label: "Warranty start" },
    { value: "warranty_end_date", label: "Warranty end" },
    { value: "created_by", label: "Created by" },
    { value: "updated_by", label: "Updated by" },
    { value: "created_at", label: "Created at" },
    { value: "updated_at", label: "Updated at" },
] as const;

export const DEVICE_FILTER_TYPE_OPTIONS = [
    { value: "inverter-stick", label: "inverter-stick" },
    { value: "Raptor", label: "Raptor" },
    { value: "system_bridge", label: "system_bridge" },
    { value: "frontend_client", label: "frontend_client" },
] as const;

// ── Permission ────────────────────────────────────────────────────────────────

export const PERMISSION_ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "tenant", label: "Tenant" },
    { value: "user", label: "User" },
];

export const PERMISSION_SORT_BY_OPTIONS: { value: string; label: string }[] = [
    { value: "name", label: "Name" },
    { value: "display_name", label: "Display Name" },
    { value: "module", label: "Module" },
    { value: "created_at", label: "Created At" },
    { value: "updated_at", label: "Updated At" },
];

// ── Announcement ──────────────────────────────────────────────────────────────

export const AUDIENCE_TYPE_OPTIONS = [
    { value: "all", label: "All users" },
    { value: "role", label: "By role" },
    { value: "tenant", label: "By tenant" },
    { value: "users", label: "Specific users" },
] as const;

export type AudienceType = (typeof AUDIENCE_TYPE_OPTIONS)[number]["value"];

export const ANNOUNCEMENT_AUDIENCE_ROLE_OPTIONS = [
    { value: "super_admin", label: "Super admin" },
    { value: "admin", label: "Admin" },
    { value: "tenant", label: "Tenant" },
    { value: "user", label: "User" },
] as const;

export const ANNOUNCEMENT_SORT_BY_OPTIONS: { value: string; label: string }[] = [
    { value: "title", label: "Title" },
    { value: "type", label: "Type" },
    { value: "audience_type", label: "Audience type" },
    { value: "start_date", label: "Start date" },
    { value: "end_date", label: "End date" },
    { value: "created_at", label: "Created at" },
    { value: "updated_at", label: "Updated at" },
];

// ── Plant filter / sort ───────────────────────────────────────────────────────

export const PLANT_STATE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...INDIAN_STATES_AND_UTS,
];

// Removed hardcoded FILTER_OPTIONS as they are now dynamic.

export const PLANT_LIST_SORT_OPTIONS: { value: string; label: string }[] = [
    { value: "created_at", label: "Created at" },
    { value: "updated_at", label: "Updated at" },
    { value: "plant_name", label: "Plant name" },
    { value: "plant_type", label: "Plant type" },
    { value: "plant_category", label: "Plant category" },
    { value: "meter_number", label: "Meter number" },
    { value: "discom_name", label: "Discom" },
    { value: "location_name", label: "Location name" },
    { value: "city", label: "City" },
    { value: "district", label: "District" },
    { value: "state", label: "State" },
    { value: "country", label: "Country" },
    { value: "grid_type", label: "Grid type" },
    { value: "commissioning_date", label: "Commissioning date" },
    { value: "cod_date", label: "COD date" },
    { value: "ppa_rate", label: "PPA rate" },
    { value: "revenue_type", label: "Revenue type" },
    { value: "communication_status", label: "Communication status" },
];


export const HISTORY_PARAMETER_OPTIONS = [
    { value: "voltage", label: "Voltage" },
    { value: "current", label: "Current" },
    { value: "power", label: "Power" },
    { value: "energy", label: "Energy" },
];

export const HISTORY_INTERVAL_OPTIONS = [
    { value: "1min", label: "1 Min" },
    { value: "5min", label: "5 Min" },
    { value: "15min", label: "15 Min" },
    { value: "1hour", label: "1 Hour" },
    { value: "1day", label: "1 Day" },
];

export type PlantEquipmentComponentType = string;

export const PLANT_EQUIPMENT_VIEW_OPTIONS = [
    { value: "table", label: "Table" },
    { value: "heatmap", label: "Heatmap" },
] as const;

export type PlantEquipmentView =
    (typeof PLANT_EQUIPMENT_VIEW_OPTIONS)[number]["value"];

// ── History sort / filter ────────────────────────────────────────────────────

export const HISTORY_SORT_OPTIONS = [
    { value: "date", label: "Data time" },
    { value: "created_at", label: "Created time" },
    { value: "device_id", label: "Device" },
    { value: "component_id", label: "Component" },
    { value: "component_type", label: "Component type" },
];

export const DATA_VIEW_OPTIONS = [
    { value: "", label: "All records" },
    { value: "true", label: "Latest only" },
];
