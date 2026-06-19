/** Keys in hierarchy payloads that must be finite numbers when present (not arbitrary text). */
export const PAYLOAD_NUMERIC_FIELD_KEYS = new Set([
    "vd_number",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "module_count",
    "area_sqm",
    "rating_a",
    "mppt_count",
    "strings_per_mppt",
    "ct_ratio",
    "channels",
    "string_length",
]);

/** Parse a text field into a finite number or null (empty). Returns undefined if input is non-empty but not a finite number — caller should ignore the change. */
export function parseOptionalFiniteNumber(raw: string): number | null | undefined {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return n;
}

/** Coerce unknown export values to finite numbers only (for validation). */
export function isFiniteNumberLike(value: unknown): boolean {
    if (value === undefined || value === null || value === "") return true;
    const n = Number(value);
    return Number.isFinite(n);
}
