import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import type { NavItem } from "@/components/core/navbar/navItems";
import {
  useDeleteNotificationsMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMyNotificationsQuery,
  useNotificationUnreadCountQuery,
  type NotificationRow,
} from "@/services/operations/notificationAPI";
import { getErrorMessage } from "@/services/api";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { sortNotificationsNewestFirst } from "./notificationUi";
import NotificationBellCard from "./NotificationBellCard";

const PREVIEW_LIMIT = 8;

interface NotificationBellProps {
  item: NavItem;
}

interface PanelBodyProps {
  isFetching: boolean;
  isLoading: boolean;
  preview: NotificationRow[];
  unreadCount: number;
  item: NavItem;
  markRead: ReturnType<typeof useMarkNotificationReadMutation>;
  markAll: ReturnType<typeof useMarkAllNotificationsReadMutation>;
  deleteNotifications: ReturnType<typeof useDeleteNotificationsMutation>;
  setPendingDeleteId: (id: string | null) => void;
  setOpen: (open: boolean) => void;
}

function NotificationCardSkeleton() {
  return (
    <div className="rounded-xs border border-neutral-200 bg-white p-3 pl-4 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100 animate-pulse">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-14 rounded-xs bg-neutral-200 dark:bg-neutral-dark-300" />
            <div className="ml-auto h-3 w-16 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200" />
          </div>
          <div className="h-4 w-full rounded-xs bg-neutral-200 dark:bg-neutral-dark-300" />
          <div className="h-3 w-11/12 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200" />
        </div>
        <div className="h-14 w-px bg-neutral-200 dark:bg-neutral-dark-300" />
        <div className="flex flex-col gap-1">
          <div className="h-7 w-7 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200" />
          <div className="h-7 w-7 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200" />
        </div>
      </div>
    </div>
  );
}

function NotificationPanelBody({
  isFetching,
  isLoading,
  preview,
  unreadCount,
  item,
  markRead,
  markAll,
  deleteNotifications,
  setPendingDeleteId,
  setOpen,
}: PanelBodyProps) {
  return (
    <>
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Notifications
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
              {unreadCount > 0 ? `${unreadCount} unread messages` : "You're all caught up"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isFetching && !isLoading ? (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-dark-500">Syncing…</span>
            ) : null}
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex h-7 items-center justify-center rounded-xs bg-brand-500/10 px-2.5 text-[11px] font-semibold text-brand-700
                  hover:bg-brand-500/20 disabled:pointer-events-none disabled:opacity-50 dark:bg-brand-400/15 dark:text-brand-300 dark:hover:bg-brand-400/25 transition-colors whitespace-nowrap"
              >
                Mark all as read
              </button>
            ) : null}
            {unreadCount > 0 ? (
              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-xs bg-brand-500 px-2 py-1 text-xs font-bold text-white tabular-nums">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-[280px] min-w-0 flex-1 overflow-y-auto overscroll-contain bg-neutral-50 p-3 dark:bg-neutral-dark-50 [scrollbar-width:thin] touch-pan-y">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((k) => (
              <NotificationCardSkeleton key={k} />
            ))}
          </div>
        ) : preview.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xs border border-dashed border-neutral-300 bg-white px-6 py-10 text-center dark:border-neutral-dark-400 dark:bg-neutral-dark-100">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xs bg-neutral-100 dark:bg-neutral-dark-200">
              <Bell className="h-5 w-5 text-neutral-400 dark:text-neutral-dark-500" />
            </div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">No notifications</p>
            <p className="mt-1 max-w-[16rem] text-xs text-neutral-500 dark:text-neutral-dark-600">
              Plant alarms and system updates will show up here.
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-2.5 p-0">
            {preview.map((n) => (
              <li key={n.id}>
                <NotificationBellCard
                  n={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                  markReadPending={markRead.isPending && markRead.variables === n.id}
                  onDelete={(id) => setPendingDeleteId(id)}
                  deletePending={
                    deleteNotifications.isPending && deleteNotifications.variables?.includes(n.id)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="shrink-0 border-t border-neutral-200 bg-white px-3 py-3 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
        <Link
          to={item.path}
          onClick={() => setOpen(false)}
          className="flex w-full items-center justify-center rounded-xs bg-brand-600 py-2.5 text-sm font-semibold text-white
            hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors"
        >
          View all notifications
        </Link>
      </footer>
    </>
  );
}

const NotificationBell: React.FC<NotificationBellProps> = ({ item }) => {
  const [open, setOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobileLayout = useMediaQuery("(max-width: 767px)");
  const { data, isLoading, isFetching } = useMyNotificationsQuery(
    { page: 1, limit: PREVIEW_LIMIT },
    { enabled: open },
  );
  const { data: unreadCount = 0 } = useNotificationUnreadCountQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const deleteNotifications = useDeleteNotificationsMutation();

  const list = sortNotificationsNewestFirst(data?.notifications ?? []);
  const preview = list.slice(0, PREVIEW_LIMIT);

  const prevUnreadCount = useRef(unreadCount);
  const [isNewNotify, setIsNewNotify] = useState(false);

  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      const t1 = setTimeout(() => setIsNewNotify(true), 0);
      const t2 = setTimeout(() => setIsNewNotify(false), 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  const panelBodyProps: PanelBodyProps = {
    isFetching,
    isLoading,
    preview,
    unreadCount,
    item,
    markRead,
    markAll,
    deleteNotifications,
    setPendingDeleteId,
    setOpen,
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteNotifications.mutate([pendingDeleteId], {
      onSuccess: () => {
        toast.success("Removed");
        setPendingDeleteId(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const shellClass =
    "flex flex-col overflow-hidden rounded-xs border border-neutral-200 " +
    "bg-white dark:border-neutral-dark-200 dark:bg-neutral-dark-100 " +
    "shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] " +
    "box-border z-[100] isolate";

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Recent notifications"
      className={
        isMobileLayout
          ? `${shellClass} fixed inset-x-2 top-14 mt-2 w-auto min-h-[min(70dvh,32rem)] max-h-[min(85dvh,calc(100dvh_-_3.5rem))]`
          : `${shellClass} absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),28rem)] min-h-[32rem] max-h-[36rem]`
      }
    >
      <NotificationPanelBody {...panelBodyProps} />
    </div>
  );

  return (
    <div className="relative overflow-visible" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative rounded-xs p-2 transition-all duration-200 hover-bell-shake
          ${open ? "bg-brand-500/10 text-brand-600 dark:bg-brand-400/15 dark:text-brand-400" : "text-neutral-600 hover:text-brand-600 dark:text-neutral-dark-700 dark:hover:text-brand-400"}
        `}
        title={item.name}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Notifications"
      >
        <item.icon
          className={`h-[18px] w-[18px] ${item.color} ${
            isNewNotify ? "animate-bell-bounce" : unreadCount > 0 ? "animate-bell-ring" : ""
          }`}
        />
        {unreadCount > 0 ? (
          <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white ring-2 ring-white dark:ring-neutral-dark-100 animate-badge-pulse-premium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && isMobileLayout && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
      {open && !isMobileLayout ? panel : null}

      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete this notification?"
        message="It will be removed from your list."
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteNotifications.isPending}
      />
    </div>
  );
};

export default NotificationBell;
