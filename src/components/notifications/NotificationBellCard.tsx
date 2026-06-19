import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import type { NotificationRow } from "@/services/operations/notificationAPI";
import { notificationTone } from "./notificationUi";

export interface NotificationBellCardProps {
  n: NotificationRow;
  onMarkRead?: (id: string) => void;
  markReadPending?: boolean;
  onDelete?: (id: string) => void;
  deletePending?: boolean;
}

function toneAccent(tone: ReturnType<typeof notificationTone>): string {
  switch (tone) {
    case "danger":
      return "bg-error-500 dark:bg-error-dark-500";
    case "warning":
      return "bg-amber-500 dark:bg-amber-400";
    case "info":
      return "bg-brand-500 dark:bg-brand-400";
    default:
      return "bg-neutral-400 dark:bg-neutral-dark-500";
  }
}

function toneBadge(tone: ReturnType<typeof notificationTone>): string {
  switch (tone) {
    case "danger":
      return "bg-error-50 text-error-700 dark:bg-error-dark-500/15 dark:text-error-dark-300";
    case "warning":
      return "bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300";
    case "info":
      return "bg-brand-50 text-brand-800 dark:bg-brand-400/15 dark:text-brand-300";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-dark-200 dark:text-neutral-dark-700";
  }
}

const NotificationBellCard: React.FC<NotificationBellCardProps> = ({
  n,
  onMarkRead,
  markReadPending,
  onDelete,
  deletePending,
}) => {
  const unread = !n.is_read;
  const tone = notificationTone(n.type);
  const relative = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
  const showPriority =
    n.priority && (n.priority.toLowerCase() === "high" || n.priority.toLowerCase() === "critical");

  return (
    <article
      className={`relative overflow-hidden rounded-xs border shadow-sm
        ${
          unread
            ? "border-neutral-200 bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
            : "border-neutral-200/80 bg-neutral-50 dark:border-neutral-dark-200/80 dark:bg-neutral-dark-200/60"
        }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${toneAccent(tone)}`}
        aria-hidden
      />

      <div className="flex gap-2 p-3 pl-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-xs px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneBadge(tone)}`}
            >
              {n.type}
            </span>
            {showPriority ? (
              <span className="rounded-xs bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-600 dark:bg-neutral-dark-300 dark:text-neutral-dark-700">
                {n.priority}
              </span>
            ) : null}
            {unread ? (
              <span className="rounded-xs bg-brand-500 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                New
              </span>
            ) : null}
            <time
              dateTime={n.created_at}
              className="ml-auto text-[11px] tabular-nums text-neutral-400 dark:text-neutral-dark-500"
            >
              {relative}
            </time>
          </div>

          <h3
            className={`text-sm font-semibold leading-snug line-clamp-2 ${
              unread
                ? "text-neutral-900 dark:text-neutral-dark-950"
                : "text-neutral-700 dark:text-neutral-dark-800"
            }`}
          >
            {n.title}
          </h3>

          {n.body ? (
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-dark-700 line-clamp-3">
              {n.body}
            </p>
          ) : null}
        </div>

        {(unread && onMarkRead) || onDelete ? (
          <div className="flex shrink-0 flex-col gap-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-dark-300">
            {unread && onMarkRead ? (
              <button
                type="button"
                onClick={() => onMarkRead(n.id)}
                disabled={markReadPending}
                title="Mark as read"
                className="inline-flex h-7 w-7 items-center justify-center rounded-xs text-neutral-500
                  hover:bg-neutral-100 hover:text-brand-600
                  dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-300 dark:hover:text-brand-400
                  disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                disabled={deletePending}
                title="Delete"
                aria-label="Delete notification"
                className="inline-flex h-7 w-7 items-center justify-center rounded-xs text-neutral-500
                  hover:bg-error-50 hover:text-error-600
                  dark:text-neutral-dark-600 dark:hover:bg-error-dark-500/15 dark:hover:text-error-dark-400
                  disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default NotificationBellCard;
