/**
 * Builds a query params object that adds a fields/selected_fields parameter
 * for list APIs that support field selection.
 * @param queryKey - The query parameter name (e.g. 'selected_fields', 'fields')
 * @param fields - Array of field names to request
 * @returns Object to merge into request params, or empty object if fields is empty
 */
export function buildFieldsQuery(
  queryKey: string,
  fields: string[],
): Record<string, string> {
  if (!fields?.length) return {};
  return { [queryKey]: fields.join(",") };
}

export function cleanQueryFilters(
  filters: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  ) as Record<string, unknown>;
}

export function cleanEmptyStrings(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string" && input.trim() === "") return null;
  if (Array.isArray(input)) return input.map(cleanEmptyStrings);
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = cleanEmptyStrings(obj[key]);
    }
    return cleaned;
  }
  return input;
}

export function toURLSearchParams(
  params: Record<string, unknown>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.append(key, String(value));
  }

  return searchParams;
}
