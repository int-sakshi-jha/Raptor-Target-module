import React from "react";
import { AlertCircle, Building2, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";
import Switch from "@/components/common/Switch";
import CommonPagination from "@/components/core/table/CommonPagination";
import {
  usePushNotificationPlantPreferencesQuery,
  useUpdatePushNotificationPlantPreferenceMutation,
  type PushNotificationPreferenceContext,
} from "@/services/operations/pushNotificationPlantPreferencesAPI";

interface PlantPushNotificationPreferencesProps {
  context: PushNotificationPreferenceContext;
  className?: string;
}

const DEFAULT_PAGE_SIZE = 50;

const PlantPushNotificationPreferences: React.FC<PlantPushNotificationPreferencesProps> = ({
  context,
  className = "",
}) => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const { id: routeUserId } = useParams<{ id: string }>();
  const userId = context === "user" ? routeUserId ?? null : null;

  React.useEffect(() => {
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  }, [context, userId]);

  const {
    data,
    isLoading: isLoadingPreferences,
    isError: isPreferencesError,
    refetch,
    isFetching,
  } = usePushNotificationPlantPreferencesQuery({
    context,
    userId,
    enabled: context === "me" || Boolean(userId),
    page,
    limit: pageSize,
  });

  const patchMutation = useUpdatePushNotificationPlantPreferenceMutation({ context, userId });
  const list = data?.preferences ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.totalCount ?? list.length;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = pagination?.page ?? page;
  const effectivePageSize = pagination?.limit ?? pageSize;

  const handleToggle = (plantId: string, next: boolean) => {
    patchMutation.mutate({ plantId, enabled: next });
  };

  if (isLoadingPreferences) {
    return (
      <div
        className={`rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 p-4 shadow-sm ${className}`.trim()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand-500" />
          <div className="h-4 w-48 rounded bg-neutral-200/80 dark:bg-neutral-dark-200/60 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 dark:border-neutral-dark-200 last:border-0">
              <div className="h-3.5 w-40 max-w-[60%] rounded bg-neutral-200/70 dark:bg-neutral-dark-200/50 animate-pulse" />
              <div className="h-5 w-9 rounded-full bg-neutral-200/80 dark:bg-neutral-dark-200/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isPreferencesError) {
    return (
      <div
        className={`rounded-xs border border-amber-200/90 dark:border-amber-800/40 bg-amber-50/90 dark:bg-amber-500/10 p-4 shadow-sm ${className}`.trim()}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                Could not load plant notifications
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-dark-600 mt-1">
                Check your connection and try again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xs border border-neutral-300 dark:border-neutral-dark-300 bg-white dark:bg-neutral-dark-100 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-dark-950 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 p-4 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-900">Plant delivery</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-dark-600">
              Turn browser push on or off for the plants visible to this account.
            </p>
          </div>
        </div>
        {list.length > 0 ? (
          <span className="shrink-0 rounded-xs bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-dark-200 dark:text-neutral-dark-600">
            {totalCount} plants
          </span>
        ) : null}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xs border border-dashed border-neutral-200 py-5 text-center text-sm text-neutral-600 dark:border-neutral-dark-300 dark:text-neutral-dark-600">
          No plants are available for push preferences right now.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xs border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
            <div className="max-h-[420px] overflow-y-auto">
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-dark-200" role="list">
                {list.map((plant) => {
                  const busy = patchMutation.isPending && patchMutation.variables?.plantId === plant.plant_id;
                  const resolvedPlantName = plant.plant_name ?? plant.plant_id;
                  return (
                    <li
                      key={plant.plant_id}
                      className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"
                    >
                      <div className="flex min-w-0 items-start gap-3 pr-2">
                        <div className="mt-0.5 shrink-0 rounded-xs bg-neutral-100 p-2 dark:bg-neutral-dark-200">
                          <Building2 className="h-4 w-4 text-neutral-500 dark:text-neutral-dark-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-950 truncate">
                            {resolvedPlantName}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                            Plant-specific browser push delivery
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Switch
                          name={`plant-push-${plant.plant_id}`}
                          checked={plant.push_notifications_enabled}
                          disabled={busy}
                          onChange={(e) => handleToggle(plant.plant_id, e.target.checked)}
                          aria-label={`Push notifications for ${resolvedPlantName}`}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500">
                          {plant.push_notifications_enabled ? "On" : "Off"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <CommonPagination
            page={currentPage}
            pageSize={effectivePageSize}
            total={totalCount}
            totalPages={totalPages}
            onPageChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
            pageSizeOptions={[10, 20, 50]}
            showPageSizeSelector
            showPageJump
            className="mt-3 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 !bg-neutral-0 dark:!bg-neutral-dark-100"
          />
        </>
      )}
    </div>
  );
};

export default PlantPushNotificationPreferences;
