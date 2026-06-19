/**
 * Announcements module — list / CRUD (CommonToolbar + CommonDataView).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
} from "../components/core/table/CommonToolbar";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import {
  useGetAnnouncementListQuery,
  useDeleteAnnouncementsMutation,
  useToggleSingleAnnouncementStatusMutation,
  useUpdateAnnouncementMutation,
  fetchAnnouncementTypeOptions,
  type AnnouncementListFilters,
  type Announcement,
} from "@/services/operations/announcementAPI";
import { ANNOUNCEMENT_SORT_BY_OPTIONS, AUDIENCE_TYPE_OPTIONS } from "@/utils/selectOptions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import { Table as TableIcon, LayoutGrid } from "lucide-react";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import AnnouncementForm from "@/components/core/form/AnnouncementForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import FormModal from "@/components/common/Modal";
import type { ICellRendererParams } from "@ag-grid-community/core";
import {
  getActionsColumn,
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getLinkColumn,
  getRendererColumn,
  getTextColumn,
} from "@/components/core/table/ListPageHelpers";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import {
  buildAddAction,
  buildColumnsAction,
  buildDeleteAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";

const entityKey = "announcement";
const {
  buildAsyncSelectFilter,
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setBooleanFilterParam,
  setMultiSelectFilterParam,
  setScalarFilterParam,
} = CommonFilterPanel;

const ANNOUNCEMENT_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "type",
    "audience_type",
    "is_active",
    "dismissible",
    "created_by",
    "updated_by",
    "start_date_start",
    "start_date_end",
    "end_date_start",
    "end_date_end",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ],
});

function toAnnouncementListApiFilters(filters: FilterValues): AnnouncementListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, string | string[] | boolean> = { sort_by, sort_order };

  setMultiSelectFilterParam(base, filters, "type");
  setMultiSelectFilterParam(base, filters, "audience_type");
  setMultiSelectFilterParam(base, filters, "created_by");
  setMultiSelectFilterParam(base, filters, "updated_by");
  setScalarFilterParam(base, filters, "start_date_start");
  setScalarFilterParam(base, filters, "start_date_end");
  setScalarFilterParam(base, filters, "end_date_start");
  setScalarFilterParam(base, filters, "end_date_end");
  setScalarFilterParam(base, filters, "created_at_start");
  setScalarFilterParam(base, filters, "created_at_end");
  setScalarFilterParam(base, filters, "updated_at_start");
  setScalarFilterParam(base, filters, "updated_at_end");
  setBooleanFilterParam(base, filters, "is_active");
  setBooleanFilterParam(base, filters, "dismissible");

  return base;
}

const filterFields: FilterFieldConfig[] = [
  buildAsyncSelectFilter("type", "Type", fetchAnnouncementTypeOptions, { apiSearch: true }),
  buildSelectFilter(
    "audience_type",
    "Audience type",
    AUDIENCE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  ),
  buildBoolSelectFilter("is_active", "Active"),
  buildBoolSelectFilter("dismissible", "Dismissible"),
  ...buildAuditFilterFields({
    CreatedBy: false,
    UpdatedBy: false,
    CreatedAt: true,
    UpdatedAt: true,
    dateMode: "daterange",
  }),
  ...buildSortFilterFields({
    sortOptions: ANNOUNCEMENT_SORT_BY_OPTIONS,
  }),
];

const audienceLabel = (row: Announcement) => {
  const type = row.audience_type;
  const audience = row.audience;
  if (type === "all") return "All users";
  if (type === "role" && audience?.roles?.length) {
    return `Roles: ${audience.roles.join(", ")}`;
  }
  if (type === "tenant" && audience?.tenant_ids?.length) {
    return `${audience.tenant_ids.length} tenant(s)`;
  }
  if (type === "users" && audience?.user_ids?.length) {
    return `${audience.user_ids.length} user(s)`;
  }
  return type;
};

const defaultColumns: CommonColumnConfig[] = [
  getLinkColumn(
    "title",
    "Title",
    (params) => (params.data?.id ? `/announcements/${params.data.id}` : null),
    { minWidth: 220, pinned: "left" },
  ),
  getTextColumn("type", "Type", { minWidth: 120 }),
  getRendererColumn(
    "audience_type",
    "Audience",
    (params: ICellRendererParams<Announcement>) => (
      <span className="text-sm capitalize text-neutral-700 dark:text-neutral-dark-700">
        {params.data ? audienceLabel(params.data) : "-"}
      </span>
    ),
    { minWidth: 180 },
  ),
  getDateColumn("start_date", "Start"),
  getDateColumn("end_date", "End"),
  getActiveStatusColumn("is_active", "Active", { minWidth: 100 }),
  getBooleanColumn("dismissible", "Dismissible", { minWidth: 110 }),
  getDateColumn("created_at", "Created At"),
];

const announcementRowActionsCellRenderer = createCrudRowActionsCellRenderer<Announcement>({
  actions: [
    buildToggleStatusRowAction("announcementGrid_toggleStatus", PERMISSIONS.ANNOUNCEMENT.UPDATE),
    buildEditRowAction("announcementGrid_openEdit", PERMISSIONS.ANNOUNCEMENT.UPDATE),
    buildDeleteRowAction("announcementGrid_requestDelete", PERMISSIONS.ANNOUNCEMENT.DELETE),
  ],
});

const Announcements = () => {
  const [, rerenderAfterWidthReset] = React.useState(0);
  React.useLayoutEffect(() => {
    if (resetSavedActionsColumnWidth(entityKey)) {
      rerenderAfterWidthReset((v) => v + 1);
    }
  }, []);

  const { permissions: userPermissions } = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filters, setFilters] = useState<FilterValues>(ANNOUNCEMENT_FILTER_DEFAULTS);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const deleteMutation = useDeleteAnnouncementsMutation();
  const toggleStatusMutation = useToggleSingleAnnouncementStatusMutation();
  const updateMutation = useUpdateAnnouncementMutation();
  const tableRef = React.useRef<CommonTableHandle>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const actionsColumn: CommonColumnConfig = React.useMemo(
    () => getActionsColumn(announcementRowActionsCellRenderer),
    [],
  );

  const announcementGridContext = useMemo(
    () => ({
      userPermissions,
      announcementGrid_toggleStatus: (data: Announcement) => {
        toggleStatusMutation.mutate(data);
      },
      announcementGrid_openEdit: (row: Announcement) => {
        setEditingAnnouncement(row);
        setShowEdit(true);
      },
      announcementGrid_requestDelete: (id: string) => {
        setConfirmTitle("Delete announcement");
        setConfirmMessage(
          "Are you sure you want to delete this announcement? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  const {
    data: announcementResponse,
    isLoading,
    isError,
    error,
  } = useGetAnnouncementListQuery({
    search,
    filters: toAnnouncementListApiFilters(filters),
    page,
    limit: pageSize,
  });

  useEffect(() => {
    if (isError) {
      toast.error(
        error ? getErrorMessage(error) : "Failed to load announcements. Please try again.",
        { duration: 4000, position: "top-right" },
      );
    }
  }, [isError, error]);

  const tableData = announcementResponse?.data?.announcements ?? [];
  const serverPagination = announcementResponse?.data?.pagination;

  const announcementsRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])].sort().join("|");
    const statusKey = tableData
      .map((row) => `${row.id}:${row.is_active ? "1" : "0"}`)
      .join("|");
    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one announcement before deleting.");
      return;
    }
    setConfirmTitle("Delete announcements");
    setConfirmMessage(
      `Are you sure you want to delete ${selectedIds.length} announcement(s)? This action cannot be undone.`,
    );
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(
      () => setShowCreate(true),
      hasPermission(userPermissions, PERMISSIONS.ANNOUNCEMENT.CREATE),
    ),
    buildDeleteAction(handleDelete, {
      disabled: selectedIds.length === 0,
      show: hasPermission(userPermissions, PERMISSIONS.ANNOUNCEMENT.DELETE),
    }),
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search announcements…"
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) => setSelectedView(key as "table" | "cards")}
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <CommonDataView
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Announcement"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView}
            tableRef={tableRef}
            gridContext={announcementGridContext}
            gridContextRevision={announcementsRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.ANNOUNCEMENT.UPDATE)) return;
              if (!id || !field || value === oldValue) return;
              if (field === "content") return;
              updateMutation.mutate({ id, [field]: value });
            }}
            page={page}
            pageSize={pageSize}
            total={serverPagination?.totalCount ?? 0}
            totalPages={serverPagination?.totalPages ?? 1}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: { id: string }) => row.id}
            columnSelectorTitle="Announcement columns"
            columnStateConfig={{ setColumns: setLocalColumns, actionsColumn }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(ANNOUNCEMENT_FILTER_DEFAULTS);
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
            onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
          />
        </div>
      </main>

      <FormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create announcement"
        subtitle="Publish a new announcement to selected users"
        icon={navIcons.announcements}
        maxWidth="max-w-3xl"
      >
        <AnnouncementForm mode="create" onSuccess={() => setShowCreate(false)} />
      </FormModal>

      <FormModal
        open={!!(showEdit && editingAnnouncement)}
        onClose={() => {
          setShowEdit(false);
          setEditingAnnouncement(null);
        }}
        title="Edit announcement"
        subtitle={editingAnnouncement?.title || "Update announcement"}
        icon={navIcons.announcements}
        maxWidth="max-w-3xl"
      >
        {editingAnnouncement ? (
          <AnnouncementForm
            mode="edit"
            initialValues={editingAnnouncement}
            onSuccess={() => {
              setShowEdit(false);
              setEditingAnnouncement(null);
            }}
          />
        ) : null}
      </FormModal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
          setConfirmIds([]);
        }}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(confirmIds);
            setSelectedIds((prev) => prev.filter((id) => !confirmIds.includes(id)));
            setConfirmOpen(false);
            setConfirmIds([]);
          } catch {
            // handled by mutation
          }
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={deleteMutation.isPending ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Announcements;
