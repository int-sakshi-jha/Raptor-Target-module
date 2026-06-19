import type { ComponentRow } from "@/services/operations/componentAPI";
import type { ComponentKindSlug } from "./constants";
import { coerceComponentKind } from "./constants";
import type { NodeDraftFields } from "./types";

export type KindDefaultsMap = Partial<Record<ComponentKindSlug, Partial<NodeDraftFields>>>;

function rowToPartialDraft(row: ComponentRow): Partial<NodeDraftFields> {
    const wStart = row.warranty_start_date?.includes("T")
        ? row.warranty_start_date.split("T")[0]
        : row.warranty_start_date ?? undefined;
    const wEnd = row.warranty_end_date?.includes("T")
        ? row.warranty_end_date.split("T")[0]
        : row.warranty_end_date ?? undefined;

    return {
        device_id: row.device_id,
        tag_template_id: row.tag_template_id,
        inverter_type_id: row.inverter_type_id,
        inverter_type_name: row.inverter_type_name ?? undefined,
        vd_number: row.vd_number,
        ac_capacity_kw: row.ac_capacity_kw,
        dc_capacity_kw: row.dc_capacity_kw,
        brand: row.brand ?? undefined,
        model: row.model ?? undefined,
        mppt_count: row.mppt_count,
        strings_per_mppt: row.strings_per_mppt,
        phase_type: row.phase_type ?? undefined,
        module_count: row.module_count,
        string_length: row.string_length,
        ct_ratio: row.ct_ratio,
        rating_a: row.rating_a,
        channels: row.channels,
        area_sqm: row.area_sqm,
        warranty_start_date: wStart ?? null,
        warranty_end_date: wEnd ?? null,
        status: row.status ?? undefined,
        serial_number: row.serial_number ?? undefined,
        display_order: row.display_order,
        is_active: row.is_active !== false,
    };
}

/** First component of each kind becomes default field values for generated nodes of that kind. */
export function buildKindDefaultsFromSampleRows(rows: ComponentRow[]): KindDefaultsMap {
    const map: KindDefaultsMap = {};
    for (const row of rows) {
        const slug = coerceComponentKind(row.component_type);
        if (map[slug]) continue;
        map[slug] = rowToPartialDraft(row);
    }
    return map;
}
