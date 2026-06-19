import React, { useState } from "react";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  DetailPageBackground,
  DetailMain,
} from "@/components/core/detail/DetailPagePrimitives";
import CommonPagination from "@/components/core/table/CommonPagination";
import {
  useDeleteNotificationsMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMyNotificationsQuery,
  useNotificationUnreadCountQuery,
} from "@/services/operations/notificationAPI";
import { sortNotificationsNewestFirst } from "@/components/notifications/notificationUi";
import NotificationListItem from "@/components/notifications/NotificationListItem";
import { getErrorMessage } from "@/services/api";
import WebPushSetupPanel from "@/components/notifications/WebPushSetupPanel";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

type Filter = "all" | "unread";

const DEFAULT_PAGE_SIZE = 10;

const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useMyNotificationsQuery({
    page,
    limit: pageSize,
    unread_only: filter === "unread",
  });
  const { data: unreadCount = 0 } = useNotificationUnreadCountQuery();
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const deleteNotifications = useDeleteNotificationsMutation();

  const rows = sortNotificationsNewestFirst(data?.notifications ?? []);
  const pagination = data?.pagination;
  const totalCount = pagination?.totalCount ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = pagination?.page ?? page;
  const effectivePageSize = pagination?.limit ?? pageSize;

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteNotifications.mutate([pendingDeleteId], {
      onSuccess: () => {
        toast.success("Notification removed");
        setPendingDeleteId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  };

  return (
    <DetailPageBackground className="h-[calc(100vh-46px)] overflow-hidden">
      <DetailMain className="p-0 h-full flex flex-col gap-0 space-y-0">
        {/* Top static section: Setup and Filters */}
        <div className="shrink-0 p-3 pb-2 space-y-3 bg-neutral-100/50 dark:bg-neutral-dark-50/50">
          <WebPushSetupPanel />

          {/* Tabs + actions row */}
          <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-1.5 sm:gap-4">
            <div
              className="inline-flex min-w-0 shrink rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-100/80 p-0.5 dark:bg-neutral-dark-200/40"
              role="tablist"
              aria-label="Notification filter"
            >
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => {
                    setFilter(key);
                    setPage(1);
                  }}
                  className={`rounded-xs px-2.5 py-1.5 text-xs font-medium transition-colors min-h-8 inline-flex items-center justify-center sm:min-h-9 sm:px-4 sm:py-2 sm:text-sm ${
                    filter === key
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-dark-100 dark:text-neutral-dark-950"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-dark-600 dark:hover:text-neutral-dark-950"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh"
                className="inline-flex h-8 min-h-8 items-center gap-1 rounded-xs border border-neutral-200 px-2 text-xs font-medium
                  text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 sm:h-9 sm:min-h-9 sm:gap-1.5 sm:px-3 sm:text-sm dark:border-neutral-dark-200 dark:text-neutral-dark-800 dark:hover:bg-neutral-dark-200/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={unreadCount === 0 || markAll.isPending}
                title="Mark all as read"
                className="inline-flex h-8 min-h-8 max-w-[min(100%,11rem)] items-center gap-1 truncate rounded-xs px-2 text-xs font-medium
                  bg-brand-500/15 text-brand-800 transition-colors hover:bg-brand-500/25 disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:min-h-9 sm:max-w-none sm:gap-1.5 sm:px-3 sm:text-sm dark:bg-brand-400/20 dark:text-brand-200 dark:hover:bg-brand-400/30"
              >
                <BellOff className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="min-w-0 truncate sm:whitespace-normal">
                  <span className="sm:hidden">Mark read</span>
                  <span className="hidden sm:inline">Mark all as read</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Middle scrollable section: List items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isError ? (
            <div className="rounded-xs border border-error-200 dark:border-error-dark-700 bg-error-50 dark:bg-error-dark-500/10 px-4 py-3 text-sm text-error-800 dark:text-error-dark-200">
              {getErrorMessage(error)}
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((k) => (
                <div
                  key={k}
                  className="h-24 rounded-xs bg-neutral-200/60 dark:bg-neutral-dark-200/50 animate-pulse"
                />
              ))}
            </div>
          ) : !isError && rows.length === 0 ? (
            <div className="rounded-xs border border-dashed border-neutral-200 dark:border-neutral-dark-300 bg-white/60 dark:bg-neutral-dark-100/60 px-6 py-16 text-center">
              <Bell className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-dark-400 mb-3" />
              <p className="text-base font-medium text-neutral-700 dark:text-neutral-dark-800">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-dark-600 mt-1 max-w-sm mx-auto">
                When the notification API is available, new items will appear here automatically.
              </p>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0 m-0">
              {rows.map((n) => (
                <li key={n.id}>
                  <NotificationListItem
                    n={n}
                    variant="comfortable"
                    onMarkRead={(id) => markOne.mutate(id)}
                    markReadPending={markOne.isPending && markOne.variables === n.id}
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

        {/* Bottom static section: Pagination */}
        <div className="shrink-0 p-3 border-t border-neutral-200/80 bg-white dark:border-neutral-dark-300/50 dark:bg-neutral-dark-100">
          <CommonPagination
            page={currentPage}
            pageSize={effectivePageSize}
            total={totalCount}
            totalPages={totalPages}
            onPageChange={(p, ps) => {
              setPage(p);
              setPageSize(ps);
            }}
            pageSizeOptions={[10, 20, 50]}
            showPageSizeSelector
            showPageJump
            className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 !bg-neutral-0 dark:!bg-neutral-dark-100"
          />
        </div>

        <ConfirmationDialog
          open={pendingDeleteId !== null}
          onClose={() => setPendingDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete this notification?"
          message="It will be removed from your list. This cannot be undone."
          type="danger"
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={deleteNotifications.isPending}
        />
      </DetailMain>
    </DetailPageBackground>
  );
};

export default Notifications;
