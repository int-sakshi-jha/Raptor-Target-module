/**
 * Audit logs — read-only list (logs service API). Pattern aligned with Permissions.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
  buildRefreshAction,
} from "../components/core/table/CommonToolbar";
import {
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useLogsListQuery,
  type LogsListFilters,
} from "@/services/operations/logsAPI";
import toast from "react-hot-toast";
import { logsApiErrorMessage } from "@/services/operations/logsAPI";
import { useAppSelector } from "@/store/hooks";
import { isTenantOrUserRole, isAdminOrSuperAdminRole } from "@/utils/permissions";
import CommonFilterPanel, {
  type FilterFieldConfig,
  type FilterValues,
} from "../components/core/table/CommonFilterPanel";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import {
  getDateColumn,
  getRendererColumn,
  getDisplayTextColumn,
  getDisplayNumberColumn,
} from "@/components/core/table/ListPageHelpers";
import { fetchUserNames } from "@/services/operations/userAPI";
import type { ICellRendererParams } from "@ag-grid-community/core";
import type { AuditLog } from "@/services/operations/logsAPI";


const BASE_ENTITY_KEY = "audit-log";
const {
  buildNumberFilter,
  buildSelectFilter,
  buildSortFilterFields,
  buildTextFilter,
  createFilterDefaults,
  parseSingleFilter,
} = CommonFilterPanel;

function renderDeviceInfoCell(data: unknown) {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return (
      <span className="text-neutral-400 dark:text-neutral-dark-500">—</span>
    );
  }

  const deviceInfo = data as Record<string, unknown>;
  const browser =
    typeof deviceInfo.browser === "string" ? deviceInfo.browser : null;

  if (!browser) {
    return (
      <span className="text-neutral-400 dark:text-neutral-dark-500">—</span>
    );
  }

  return <span className="block max-w-[200px] truncate">{browser}</span>;
}

function renderErrorCell(errors: unknown) {
  if (errors == null) {
    return (
      <span className="text-neutral-400 dark:text-neutral-dark-500">-</span>
    );
  }

  let cellText = "Error";

  if (typeof errors === "string") {
    cellText = errors;
  } else if (typeof errors === "object" && !Array.isArray(errors)) {
    const errorObject = errors as Record<string, unknown>;
    const name =
      typeof errorObject.name === "string" ? errorObject.name : null;
    const message =
      typeof errorObject.message === "string" ? errorObject.message : null;

    if (name && message) cellText = `${name}: ${message}`;
    else if (message) cellText = message;
    else if (name) cellText = name;
  }

  return <span className="block max-w-[200px] truncate">{cellText}</span>;
}

const LOG_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "user_id",
    "method",
    "route",
    "status_code",
    "target_type",
    "action",
    "start_date",
    "end_date",
  ],
  sortBy: "created_at",
  sortOrder: "desc",
});

const LOG_SORT_OPTIONS = [
  { value: "created_at", label: "Created at" },
  { value: "method", label: "HTTP method" },
  { value: "route", label: "Route" },
  { value: "status_code", label: "Status code" },
  { value: "target_type", label: "Target type" },
  { value: "action", label: "Action" },
];

function toLogsListApiFilters(
  filters: FilterValues,
  showCreatedByFilter: boolean,
): LogsListFilters {
  const userId = parseSingleFilter(filters.user_id);
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const statusRaw = filters.status_code?.trim();
  let status_code: number | undefined;
  if (statusRaw) {
    const n = Number.parseInt(statusRaw, 10);
    if (!Number.isNaN(n)) status_code = n;
  }
  return {
    user_id: showCreatedByFilter ? userId || undefined : undefined,
    method: filters.method?.trim() || undefined,
    route: filters.route?.trim() || undefined,
    status_code,
    target_type: filters.target_type?.trim() || undefined,
    action: filters.action?.trim() || undefined,
    start_date: filters.start_date?.trim() || undefined,
    end_date: filters.end_date?.trim() || undefined,
    sort_by,
    sort_order,
  };
}

const baseFilterFields: FilterFieldConfig[] = [
  buildSelectFilter("method", "HTTP method", [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "DELETE", label: "DELETE" },
    { value: "PATCH", label: "PATCH" },
    { value: "OPTIONS", label: "OPTIONS" },
  ]),
  buildTextFilter("route", "Route (regex)"),
  buildNumberFilter("status_code", "Status code"),
  buildTextFilter("target_type", "Target type"),
  buildTextFilter("action", "Action"),
  {
    key: "created_range",
    label: "Created At",
    type: "daterange",
    startKey: "start_date",
    endKey: "end_date",
  },
];

const defaultColumns: CommonColumnConfig[] = [
  getRendererColumn("route", "Route", (params: ICellRendererParams<AuditLog, string>) => { const id = params.data?.id as string | undefined; const r = params.value as string | undefined; return !id || !r?.trim() ? r?.trim() || "-" : <Link to={`/logs/${id}`} className="text-brand-700 dark:text-brand-400 hover:underline font-medium font-mono text-xs break-all" onClick={(e) => e.stopPropagation()}>{r}</Link>; }, { minWidth: 260, pinned: "left" }),
  getDisplayTextColumn("method", "Method", { minWidth: 90 }),
  getDisplayNumberColumn("status_code", "Status", { minWidth: 90 }),
  getRendererColumn("user", "User", (params: ICellRendererParams<AuditLog, AuditLog["user"]>) => { const u = params.data?.user; if (!u || typeof u !== "object") return "-"; const id = (u as { id?: string }).id; const value = (u as { value?: string }).value; const label = value || id; return !label ? "-" : id ? <Link to={`/users/${id}/profile`} className="text-brand-700 dark:text-brand-400 hover:underline font-medium text-xs" onClick={(e) => e.stopPropagation()}>{value || id}</Link> : label; }, { minWidth: 180 }),
  getRendererColumn("target_type", "Target type", (params: ICellRendererParams) => params.data?.target_id ? <Link to={`/${params.value.toLowerCase()}/${params.data.target_id}`} className="text-brand-700 dark:text-brand-400 hover:underline font-medium text-xs" onClick={(e) => e.stopPropagation()}>{params.value}</Link> : params.value, { minWidth: 140 }),
  getDisplayTextColumn("action", "Action", { minWidth: 200 }),
  getRendererColumn("device_info", "Device info", (params: ICellRendererParams<AuditLog>) => renderDeviceInfoCell(params.data?.device_info), { minWidth: 260 }),
  getRendererColumn("errors", "Errors", (params: ICellRendererParams<AuditLog>) => renderErrorCell(params.data?.errors), { minWidth: 220 }),
  getDateColumn("created_at", "Created At"),
];

const Logs = () => {
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const showCreatedByFilter = !isTenantOrUserRole(userRole);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(LOG_FILTER_DEFAULTS);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const isAdmin = isAdminOrSuperAdminRole(userRole);
  const entityKey = isAdmin ? `${BASE_ENTITY_KEY}-admin` : `${BASE_ENTITY_KEY}-basic`;
  const tableRef = React.useRef<CommonTableHandle>(null);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const filterFields = useMemo(() => {
    const sortFields = buildSortFilterFields({
      sortOptions: LOG_SORT_OPTIONS,
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    if (!showCreatedByFilter) return [...baseFilterFields, ...sortFields];

    return [
      ...baseFilterFields.slice(0, 5),
      {
        key: "user_id",
        label: "Created by",
        type: "async-select",
        apiSearch: true,
        placeholder: "Search users…",
        loadOptions: (search = "") => fetchUserNames(search, 1, 50),
      } satisfies FilterFieldConfig,
      ...baseFilterFields.slice(5),
      ...sortFields,
    ];
  }, [showCreatedByFilter]);

  const apiFilters = useMemo(
    () => toLogsListApiFilters(filters, showCreatedByFilter),
    [filters, showCreatedByFilter],
  );

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useLogsListQuery({
    filters: apiFilters,
    page,
    pageSize,
    routeSearch: search,
  });

  useEffect(() => {
    if (isError) {
      toast.error(logsApiErrorMessage(error), {
        duration: 5000,
        position: "top-right",
      });
    }
  }, [isError, error]);

  const tableData: AuditLog[] = useMemo(() => listResponse?.logs ?? [], [listResponse?.logs]);

  const total = listResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toolbarActions: ToolbarActionConfig[] = [
    buildFiltersAction(),
    buildColumnsAction(),
    buildRefreshAction(() => void refetch(), true),
    buildExportAction({ excel: false }),
  ];

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search logs..."
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) =>
              setSelectedView(key as "table" | "cards")
            }
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <CommonDataView
            key={entityKey}
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Log"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: { id: string }) => row.id}
            columnSelectorTitle="Log columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(LOG_FILTER_DEFAULTS);
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
          />
        </div>
      </main>
    </div>
  );
};

export default Logs;
