
import {
    COMPONENT_PHASE_TYPE_OPTIONS,
    COMPONENT_STATUS_OPTIONS,
} from "@/utils/selectOptions";

// ── Lookup maps (derived once from the shared options) ────────────────────────

const TYPE_LABEL_MAP: Record<string, string> = {
    P: "Plant",
    B: "Block",
    INV: "Inverter",
    STR: "String",
    M: "Meter",
    AC: "ACDB",
    DC: "DC Channel",
    WS: "Weather Station",
    T: "Transformer",
    TRC: "Tracker",
    SCB: "SCB",
    ICB: "ICB",
    RY: "Relay",
    NIFPS: "NIFPS",
    O: "Other",
};

const PHASE_LABEL_MAP = Object.fromEntries(
    (COMPONENT_PHASE_TYPE_OPTIONS ?? []).map((o: any) => [o.value, o.label]),
) as Record<string, string>;


const STATUS_LABEL_MAP = Object.fromEntries(
    (COMPONENT_STATUS_OPTIONS ?? []).map((o: any) => [o.value, o.label]),
) as Record<string, string>;

/** Aliases that map legacy / alternate spellings to canonical phase values. */
const PHASE_ALIASES: Record<string, string> = {
    single_phase:  "single",
    "single phase": "single",
    three_phase:   "three",
    "three phase": "three",
};

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatComponentTypeLabel(value?: string | null): string {
    if (!value) return "-";
    const label = TYPE_LABEL_MAP[String(value)] ?? String(value);
    if (!label || label === "-") return "-";
    // Capitalize first letter and handle underscores
    return label.charAt(0).toUpperCase() + label.slice(1).replaceAll("_", " ");
}

export function formatComponentPhaseLabel(value?: string | null): string {
    const normalized = normalizeComponentPhaseValue(value);
    return normalized ? (PHASE_LABEL_MAP[normalized] ?? String(value)) : "-";
}

export function formatComponentStatusLabel(value?: string | null): string {
    const normalized = normalizeComponentStatusValue(value);
    return normalized ? (STATUS_LABEL_MAP[normalized] ?? String(value)) : "-";
}

export function formatComponentStatusVariant(value?: string | null) {
    switch (normalizeComponentStatusValue(value)) {
        case "active":         return "green"  as const;
        case "maintenance":    return "orange" as const;
        case "faulty":         return "no"     as const;
        case "decommissioned": return "blue"   as const;
        default:               return "gray"   as const;
    }
}



// ── Normalizers ───────────────────────────────────────────────────────────────

export function normalizeComponentPhaseValue(value?: string | null): string | null {
    if (!value) return null;
    const key = String(value).trim().toLowerCase().replace(/-/g, "_");
    return PHASE_ALIASES[key] ?? (PHASE_LABEL_MAP[key] ? key : null);
}

export function normalizeComponentStatusValue(value?: string | null): string | null {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (STATUS_LABEL_MAP[normalized]) return normalized;

    const matchedEntry = Object.entries(STATUS_LABEL_MAP).find(([, label]) => {
        return String(label).trim().toLowerCase() === String(value).trim().toLowerCase();
    });

    return matchedEntry?.[0] ?? null;
}
