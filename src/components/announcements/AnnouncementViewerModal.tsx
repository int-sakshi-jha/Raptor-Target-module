import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import type { Announcement } from "@/services/operations/announcementAPI";
import { Megaphone } from "lucide-react";

type AnnouncementViewerModalProps = {
  open: boolean;
  loading?: boolean;
  fetchError?: string | null;
  announcement: Announcement | null;
  queueIndex: number;
  queueTotal: number;
  hasNext: boolean;
  onNext: () => void;
  onDismiss: () => void;
};

const AnnouncementViewerModal: React.FC<AnnouncementViewerModalProps> = ({
  open,
  loading = false,
  fetchError = null,
  announcement,
  queueIndex,
  queueTotal,
  hasNext,
  onNext,
  onDismiss,
}) => {
  const title = loading ? "Loading announcement…" : announcement?.title ?? "Announcement";
  const dismissLabel = announcement?.dismissible ? "Dismiss" : "Got it";

  const typeLabel = announcement?.type
    ? announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)
    : "";

  const subtitle = loading
    ? undefined
    : typeLabel
      ? queueTotal > 1
        ? `${typeLabel} · Announcement ${queueIndex} of ${queueTotal}`
        : typeLabel
      : queueTotal > 1
        ? `Announcement ${queueIndex} of ${queueTotal}`
        : undefined;

  const canProceed = Boolean(announcement) || Boolean(fetchError);

  return (
    <Modal
      open={open}
      onClose={onDismiss}
      title={title}
      subtitle={subtitle}
      icon={Megaphone}
      maxWidth="max-w-2xl"
      centerModal
      backdropClassName="z-[1100]"
      containerClassName="z-[1101]"
    >
      <div className="space-y-4 p-1">
        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
            Please wait…
          </p>
        ) : fetchError ? (
          <p className="text-sm text-error-600 dark:text-error-400">{fetchError}</p>
        ) : announcement ? (
          <div
            className="announcement-html max-h-[50vh] overflow-y-auto text-sm leading-relaxed text-neutral-800 dark:text-neutral-dark-800"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        ) : null}

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-dark-200">
          {hasNext && canProceed ? (
            <Button type="button" variant="primary" onClick={onNext}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={onDismiss}
              disabled={loading}
            >
              {fetchError ? "Dismiss" : dismissLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementViewerModal;
