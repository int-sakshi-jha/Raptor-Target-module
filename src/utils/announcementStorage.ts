const READ_ANNOUNCEMENTS_KEY = "solar_read_announcement_ids";

function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function getReadAnnouncementIds(): string[] {
  if (typeof window === "undefined") return [];
  return parseStoredIds(window.localStorage.getItem(READ_ANNOUNCEMENTS_KEY));
}

export function markAnnouncementRead(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const existing = new Set(getReadAnnouncementIds());
  existing.add(id);
  window.localStorage.setItem(READ_ANNOUNCEMENTS_KEY, JSON.stringify([...existing]));
}

/** Drop read IDs that are no longer assigned to this user. */
function syncReadIdsWithAssigned(assignedIds: string[]): void {
  if (typeof window === "undefined") return;
  const assigned = new Set(assignedIds);
  const next = getReadAnnouncementIds().filter((id) => assigned.has(id));
  window.localStorage.setItem(READ_ANNOUNCEMENTS_KEY, JSON.stringify(next));
}

/**
 * IDs from profile `announcement_ids` that the user has not dismissed/read yet.
 * Prunes localStorage so it only keeps read IDs still present in `assignedIds`.
 */
export function getPendingAnnouncementIds(
  assignedIds: string[] | null | undefined,
): string[] {
  if (!assignedIds?.length) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(READ_ANNOUNCEMENTS_KEY, JSON.stringify([]));
    }
    return [];
  }

  const assigned = assignedIds.filter(Boolean);
  syncReadIdsWithAssigned(assigned);

  const read = new Set(getReadAnnouncementIds());
  return assigned.filter((id) => !read.has(id));
}
