import { startOfDay } from "date-fns";
import type { DateRangeType } from "@/components/common/CommonDataRangeSelector";

export function parseDraftDate(raw: string | null | undefined): Date | null {
    if (!raw || !String(raw).trim()) return null;
    const s = String(raw);
    const d = new Date(s.includes("T") ? s : `${s.split("T")[0]}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Builds a calendar range for CommonDateRangeSelector from optional draft warranty strings. */
export function warrantyRangeFromFields(fields: {
    warranty_start_date?: string | null;
    warranty_end_date?: string | null;
}): DateRangeType {
    const start = parseDraftDate(fields.warranty_start_date);
    const end = parseDraftDate(fields.warranty_end_date);
    if (start && end) {
        return { startDate: startOfDay(start), endDate: startOfDay(end) };
    }
    if (start) {
        return { startDate: startOfDay(start), endDate: startOfDay(start) };
    }
    if (end) {
        return { startDate: startOfDay(end), endDate: startOfDay(end) };
    }
    const today = startOfDay(new Date());
    return { startDate: today, endDate: today };
}
