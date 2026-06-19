/** Last scalar from MQTT array fields (skips trailing nulls). */
export function getLastFieldValue(value: unknown): unknown {
  if (value == null || value === "") return null;

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i -= 1) {
      const item = value[i];
      if (item != null && item !== "") return item;
    }
    return null;
  }

  if (typeof value === "string" && value.includes(",")) {
    const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }

  return value;
}

export function getLastNumericValue(value: unknown): number | null {
  const last = getLastFieldValue(value);
  if (last == null || last === "") return null;
  const n = parseFloat(String(last));
  return Number.isNaN(n) ? null : n;
}

/** Collapses array telemetry to one value per key (for tables / KPI cards). */
export function extractLastDataMap(
  processedData: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(processedData)) {
    result[key] = getLastFieldValue(value);
  }
  return result;
}

export function toValueArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((part) => part.trim());
  }
  return [value];
}

export function toNumericArray(value: unknown): (number | null)[] {
  return toValueArray(value).map((item) => {
    if (item == null || item === "") return null;
    const n = parseFloat(String(item));
    return Number.isNaN(n) ? null : n;
  });
}
