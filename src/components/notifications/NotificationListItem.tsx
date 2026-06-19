import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Check, Trash2 } from "lucide-react";
import type { NotificationRow } from "@/services/operations/notificationAPI";
import { notificationTone, toneClasses } from "./notificationUi";

export interface NotificationListItemProps {
  n: NotificationRow;
  variant: "compact" | "comfortable";
  onMarkRead?: (id: string) => void;
  markReadPending?: boolean;
  /** Calls `POST /delete-notification` with `{ ids: [id] }` when provided. */
  onDelete?: (id: string) => void;
  deletePending?: boolean;
}

const NotificationListItem: React.FC<NotificationListItemProps> = ({
  n,
  variant,
  onMarkRead,
  markReadPending,
  onDelete,
  deletePending,
}) => {
  const tone = notificationTone(n.type);
  const { ring, label } = toneClasses(tone);
  const unread = !n.is_read;
  const relative = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  const body = (
    <div
      className={`w-full min-w-0 flex flex-col gap-2 text-left rounded-xs border transition-colors sm:flex-row sm:gap-3
        ${
          unread
            ? "border-brand-200/80 dark:border-brand-800/50 bg-brand-500/[0.04] dark:bg-brand-400/[0.06]"
            : "border-neutral-200/90 dark:border-neutral-dark-200 bg-white/80 dark:bg-neutral-dark-100/80"
        }
        ${variant === "compact" ? "p-3" : "p-4"}
      `}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="flex flex-col items-center pt-0.5 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${ring}`} title={n.type} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950 leading-snug break-words">
                {n.title}
              </p>
              <p className={`text-[11px] uppercase tracking-wide font-medium ${label}`}>{n.type}</p>
            </div>
            <time
              dateTime={n.created_at}
              className="text-[11px] shrink-0 text-neutral-400 dark:text-neutral-dark-500 tabular-nums sm:pt-0.5"
            >
              {relative}
            </time>
          </div>
          {n.body ? (
            <p
              className={`text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed ${
                variant === "compact" ? "line-clamp-2" : "line-clamp-4"
              }`}
            >
              {n.body}
            </p>
          ) : null}
          {variant === "comfortable" && n.action_url ? (
            <div className="pt-1">
              <Link
                to={n.action_url}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                Open related view
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      {(unread && onMarkRead) || onDelete ? (
        <div className="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-neutral-200/60 pt-2 sm:ml-0 sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:self-start sm:border-0 sm:pt-0 sm:pl-0">
          {unread && onMarkRead ? (
            <button
              type="button"
              onClick={() => onMarkRead(n.id)}
              disabled={markReadPending}
              className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-[11px] font-medium
            text-neutral-600 dark:text-neutral-dark-600
            hover:bg-neutral-100 dark:hover:bg-neutral-dark-200
            disabled:opacity-50"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Read</span>
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(n.id)}
              disabled={deletePending}
              className={`inline-flex items-center justify-center rounded-xs text-neutral-500 dark:text-neutral-dark-500
              hover:bg-error-500/10 dark:hover:bg-error-dark-500/15 hover:text-error-600 dark:hover:text-error-dark-400
              disabled:opacity-50 ${variant === "compact" ? "p-1" : "p-1.5"}`}
              title="Delete notification"
              aria-label="Delete notification"
            >
              <Trash2 className={variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (variant === "compact" && n.action_url) {
    return (
      <div className="w-full min-w-0">
        {body}
        <Link
          to={n.action_url}
          className="mt-1.5 block w-full pl-4 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline sm:pl-[1.375rem]"
        >
          Open related view
        </Link>
      </div>
    );
  }

  return <div className="w-full min-w-0">{body}</div>;
};

export default NotificationListItem;
