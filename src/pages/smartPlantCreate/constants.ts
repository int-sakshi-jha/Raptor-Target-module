export const COMPONENT_TYPE = {
    PLANT: "P",
    BLOCK: "B",
    INVERTER: "INV",
    STRING: "STR",
    METER: "M",
    ACDB: "AC",
    DCDB: "DC",
    WEATHER_STATION: "WS",
    TRANSFORMER: "T",
    SCB: "SCB",
    ICB: "ICB",
    OTHERS: "O",
} as const;
export type COMPONENT_TYPE = (typeof COMPONENT_TYPE)[keyof typeof COMPONENT_TYPE];

export const PHASE_TYPE = {
    SINGLE_PHASE: "single",
    THREE_PHASE: "three",
} as const;
export type PHASE_TYPE = (typeof PHASE_TYPE)[keyof typeof PHASE_TYPE];

export const STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    FAULTY: "faulty",
    MAINTENANCE: "maintenance",
    DECOMMISSIONED: "decommissioned",
} as const;
export type STATUS = (typeof STATUS)[keyof typeof STATUS];

/** UI slugs (forms) → API `component_type` codes (platform enums). */
export const SLUG_TO_API_TYPE: Record<string, COMPONENT_TYPE> = {
    plant: COMPONENT_TYPE.PLANT,
    block: COMPONENT_TYPE.BLOCK,
    inverter: COMPONENT_TYPE.INVERTER,
    string: COMPONENT_TYPE.STRING,
    meter: COMPONENT_TYPE.METER,
    acdb: COMPONENT_TYPE.ACDB,
    dcdb: COMPONENT_TYPE.DCDB,
    weather_station: COMPONENT_TYPE.WEATHER_STATION,
    transformer: COMPONENT_TYPE.TRANSFORMER,
    scb: COMPONENT_TYPE.SCB,
    icb: COMPONENT_TYPE.ICB,
    others: COMPONENT_TYPE.OTHERS,
};

export const API_TYPE_LABEL: Record<string, string> = {
    P: "Plant",
    B: "Block",
    INV: "Inverter",
    STR: "String",
    M: "Meter",
    AC: "ACDB",
    DC: "DCDB",
    WS: "Weather",
    T: "Transformer",
    SCB: "SCB",
    ICB: "ICB",
    O: "Others",
};

export const COMPONENT_KIND_OPTIONS = [
    { value: "plant", label: "Plant" },
    { value: "block", label: "Block" },
    { value: "inverter", label: "Inverter" },
    { value: "string", label: "String" },
    { value: "meter", label: "Meter" },
    { value: "acdb", label: "ACDB" },
    { value: "dcdb", label: "DCDB" },
    { value: "weather_station", label: "Weather station" },
    { value: "transformer", label: "Transformer" },
    { value: "scb", label: "SCB" },
    { value: "icb", label: "ICB" },
    { value: "others", label: "Others" },
] as const;

export type ComponentKindSlug = (typeof COMPONENT_KIND_OPTIONS)[number]["value"];

export function slugToApiType(slug: string): string {
    return SLUG_TO_API_TYPE[slug] ?? slug.slice(0, 3).toUpperCase();
}

const API_TO_SLUG_ENTRIES = Object.entries(SLUG_TO_API_TYPE) as [ComponentKindSlug, string][];
export function apiTypeToSlug(api: string): ComponentKindSlug {
    const hit = API_TO_SLUG_ENTRIES.find(([, v]) => v === api);
    return hit?.[0] ?? "others";
}

/** Accepts API codes (`INV`), UI slugs (`inverter`), or mixed case. */
export function coerceComponentKind(raw: string): ComponentKindSlug {
    const t = raw.trim();
    if (!t) return "others";
    const low = t.toLowerCase();
    if (low in SLUG_TO_API_TYPE) return low as ComponentKindSlug;
    const up = t.toUpperCase();
    for (const [slug, code] of Object.entries(SLUG_TO_API_TYPE)) {
        if (code === up) return slug as ComponentKindSlug;
    }
    return "others";
}

export function coercePhaseType(raw: string | null | undefined): PHASE_TYPE | undefined {
    if (!raw) return undefined;
    const normalized = raw.trim().toLowerCase();
    if (normalized === PHASE_TYPE.SINGLE_PHASE) return PHASE_TYPE.SINGLE_PHASE;
    if (normalized === PHASE_TYPE.THREE_PHASE) return PHASE_TYPE.THREE_PHASE;
    return undefined;
}
