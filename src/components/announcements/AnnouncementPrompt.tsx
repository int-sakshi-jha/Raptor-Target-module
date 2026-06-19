import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  fetchAnnouncementById,
  type Announcement,
} from "@/services/operations/announcementAPI";
import {
  getPendingAnnouncementIds,
  markAnnouncementRead,
} from "@/utils/announcementStorage";
import AnnouncementViewerModal from "./AnnouncementViewerModal";

type AnnouncementPromptProps = {
  assignedIds?: string[] | null;
  enabled?: boolean;
};

/** Dedupe concurrent fetches for the same id (e.g. React Strict Mode). */
const inflightById = new Map<string, Promise<Announcement>>();

function loadAnnouncementById(id: string): Promise<Announcement> {
  const existing = inflightById.get(id);
  if (existing) return existing;

  const request = fetchAnnouncementById(id).finally(() => {
    inflightById.delete(id);
  });
  inflightById.set(id, request);
  return request;
}

/** Assigned users should see active announcements in the modal (dates are informational only). */
function shouldShowInModal(announcement: Announcement): boolean {
  return announcement.is_active;
}

const AnnouncementPrompt: React.FC<AnnouncementPromptProps> = ({
  assignedIds,
  enabled = true,
}) => {
  const assignedKey = JSON.stringify(assignedIds ?? []);

  const pendingIds = useMemo(() => {
    if (!enabled) return [];
    return getPendingAnnouncementIds(assignedIds);
  }, [assignedKey, enabled]);

  const pendingKey = pendingIds.join(",");

  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const currentId = pendingIds[index] ?? null;
  const hasNext = index < pendingIds.length - 1;
  const isOpen = index < pendingIds.length;

  const prevPendingKeyRef = useRef("");

  useEffect(() => {
    if (prevPendingKeyRef.current === pendingKey) return;
    prevPendingKeyRef.current = pendingKey;
    setIndex(0);
    setAnnouncement(null);
    setLoading(false);
    setFetchError(null);
  }, [pendingKey]);

  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    if (!currentId) {
      setAnnouncement(null);
      setLoading(false);
      setFetchError(null);
      return;
    }

    const generation = ++fetchGenerationRef.current;
    setFetchError(null);
    setLoading(true);
    setAnnouncement((prev) => (prev?.id === currentId ? prev : null));

    void (async () => {
      try {
        const item = await loadAnnouncementById(currentId);
        if (generation !== fetchGenerationRef.current) return;

        if (!shouldShowInModal(item)) {
          markAnnouncementRead(currentId);
          setIndex((i) => i + 1);
          return;
        }

        setAnnouncement(item);
      } catch (err: unknown) {
        if (generation !== fetchGenerationRef.current) return;

        const isNotFound = isAxiosError(err) && err.response?.status === 404;
        if (isNotFound) {
          markAnnouncementRead(currentId);
          setIndex((i) => i + 1);
          return;
        }

        setFetchError("Could not load this announcement. You can dismiss and continue.");
        setAnnouncement(null);
      } finally {
        if (generation === fetchGenerationRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [currentId]);

  const goToNext = useCallback(() => {
    if (!currentId) return;
    markAnnouncementRead(currentId);
    setAnnouncement(null);
    setFetchError(null);
    setIndex((i) => i + 1);
  }, [currentId]);

  const finishCurrent = useCallback(() => {
    if (currentId) markAnnouncementRead(currentId);
    setAnnouncement(null);
    setFetchError(null);
    setIndex(pendingIds.length);
  }, [currentId, pendingIds.length]);

  return (
    <AnnouncementViewerModal
      open={isOpen}
      loading={loading}
      fetchError={fetchError}
      announcement={announcement}
      queueIndex={pendingIds.length ? index + 1 : 0}
      queueTotal={pendingIds.length}
      hasNext={hasNext}
      onNext={goToNext}
      onDismiss={finishCurrent}
    />
  );
};

export default AnnouncementPrompt;
