/**
 * Permissions module — list / CRUD for permission definitions (CommonToolbar + CommonDataView).
 */
import React, { useState, useEffect, useMemo } from "react";
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
  useGetPermissionListQuery,
  useDeletePermissionMutation,
  useTogglePermissionStatusMutation,
  useUpdatePermissionMutation,
  loadPermissionRoleFilterOptions,
  loadPermissionParentFilterOptions,
  PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
  type PermissionListFilters,
  type Permission,
} from "@/services/operations/permissionAPI";
import { PERMISSION_SORT_BY_OPTIONS } from "@/utils/selectOptions";
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
import PermissionForm from "@/components/core/form/PermissionForm";

import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import FormModal from "@/components/common/Modal";
import ColorBadge from "@/components/common/ColorBadge";
import type {
  ICellRendererParams,
} from "@ag-grid-community/core";
import {
  getActionsColumn,
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getDisplayTextColumn,
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

const entityKey = "permission";
const {
  buildAsyncMultiselectFilter,
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildSortFilterFields,
  buildTextFilter,
  createFilterDefaults,
  setBooleanFilterParam,
  setMultiSelectFilterParam,
  setScalarFilterParam,
  setSingleSelectFilterParam,
} = CommonFilterPanel;

const PERMISSION_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "module",
    "roles",
    "parent_permission_id",
    "is_active",
    "is_default",
    "created_by",
    "updated_by",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ],
});

function toPermissionListApiFilters(filters: FilterValues): PermissionListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, string | string[] | boolean> = { sort_by, sort_order };

  setScalarFilterParam(base, filters, "module");
  setMultiSelectFilterParam(base, filters, "created_by");
  setMultiSelectFilterParam(base, filters, "updated_by");
  setScalarFilterParam(base, filters, "created_at_start");
  setScalarFilterParam(base, filters, "created_at_end");
  setScalarFilterParam(base, filters, "updated_at_start");
  setScalarFilterParam(base, filters, "updated_at_end");
  setBooleanFilterParam(base, filters, "is_active");
  setBooleanFilterParam(base, filters, "is_default");
  setMultiSelectFilterParam(base, filters, "roles");
  setMultiSelectFilterParam(base, filters, "parent_permission_id");
  if (!("parent_permission_id" in base)) {
    setSingleSelectFilterParam(base, filters, "parent_permission_id");
  }

  return base;
}

// ─── Filter field config (`filterable: true` in permission field config) ─────

const filterFields: FilterFieldConfig[] = [
  buildTextFilter("module", "Module"),
  buildAsyncMultiselectFilter("roles", "Roles", loadPermissionRoleFilterOptions, { apiSearch: false }),
  buildAsyncMultiselectFilter("parent_permission_id", "Parent Permission", loadPermissionParentFilterOptions),
  buildBoolSelectFilter("is_active", "Active"),
  buildBoolSelectFilter("is_default", "Is Default"),
  ...buildAuditFilterFields({
    CreatedBy: false,
    UpdatedBy: false,
    CreatedAt: true,
    UpdatedAt: true,
    dateMode: "daterange",
  }),
  ...buildSortFilterFields({
    sortOptions: PERMISSION_SORT_BY_OPTIONS,
  }),
];

// ─── Default column definitions ───────────────────────────────────────────────

const defaultColumns: CommonColumnConfig[] = [
  getLinkColumn("display_name", "Display Name", (params) => (params.data?.id ? `/permissions/${params.data.id}` : null), { minWidth: 200, pinned: "left", editable: true }),
  getTextColumn("name", "Name", { minWidth: 200, editable: true }),
  getTextColumn("module", "Module", { minWidth: 150, editable: true }),
  getRendererColumn("roles", "Roles", (params: ICellRendererParams<Permission, string[]>) => !params.value || !Array.isArray(params.value) ? "-" : <div className="flex items-center flex-wrap py-2 gap-1">{params.value.map((role: string, idx: number) => <ColorBadge key={idx} variant="orange" className="capitalize">{role}</ColorBadge>)}</div>, { minWidth: 220 }),
  getBooleanColumn("is_default", "Default", { minWidth: 100 }),
  getDisplayTextColumn("parent_permission_name", "Parent Permission", { minWidth: 200 }),
  getActiveStatusColumn("is_active", "Active", { minWidth: 100 }),
  getDateColumn("created_at", "Created At"),
  getDateColumn("updated_at", "Updated At"),
];

// ─── Row actions cell renderer ────────────────────────────────────────────────

const permissionsRowActionsCellRenderer =
  createCrudRowActionsCellRenderer<Permission>({
    actions: [
      buildToggleStatusRowAction("permissionGrid_toggleStatus", PERMISSIONS.PERMISSION.UPDATE),
      buildEditRowAction("permissionGrid_openEdit", PERMISSIONS.PERMISSION.UPDATE),
      buildDeleteRowAction("permissionGrid_requestDelete", PERMISSIONS.PERMISSION.DELETE),
    ],
  });

// ─── Page component ───────────────────────────────────────────────────────────

const Permissions = () => {
  const [, rerenderAfterWidthReset] = React.useState(0);
  React.useLayoutEffect(() => {
    if (resetSavedActionsColumnWidth(entityKey)) {
      rerenderAfterWidthReset((value) => value + 1);
    }
  }, []);

  const { permissions: userPermissions } = useAppSelector(
    (state) => state.auth,
  );
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [filters, setFilters] = useState<FilterValues>(PERMISSION_FILTER_DEFAULTS);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const deleteMutation = useDeletePermissionMutation();
  const toggleStatusMutation = useTogglePermissionStatusMutation();
  const updateMutation = useUpdatePermissionMutation();

  const tableRef = React.useRef<CommonTableHandle>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const actionsColumn: CommonColumnConfig = React.useMemo(() => getActionsColumn(permissionsRowActionsCellRenderer),[],);
  const canShowPermissionActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.PERMISSION.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.PERMISSION.DELETE);

  const permissionGridContext = useMemo(
    () => ({
      userPermissions,
      permissionGrid_toggleStatus: (data: Permission) => {
        toggleStatusMutation.mutate(data.id);
      },
      permissionGrid_openEdit: (p: Permission) => {
        setEditingPermission(p);
        setShowEdit(true);
      },
      permissionGrid_requestDelete: (id: string) => {
        setConfirmTitle("Delete Permission");
        setConfirmMessage(
          "Are you sure you want to delete this permission? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  const {
    data: permissionResponse,
    isLoading,
    isError,
    error,
  } = useGetPermissionListQuery({
    search,
    filters: toPermissionListApiFilters(filters),
    page,
    limit: pageSize,
  });

  const isPermissionFormModalOpen =
    showCreate || (!!showEdit && !!editingPermission);
  const parentListForPermissionForm = useGetPermissionListQuery({
    ...PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
    enabled: isPermissionFormModalOpen,
  });

  // Show error toast when API fails
  useEffect(() => {
    if (isError) {
      const errorMessage = error
        ? getErrorMessage(error)
        : "Failed to load permissions data. Please try again.";
      toast.error(errorMessage, {
        duration: 4000,
        position: "top-right",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const tableData = permissionResponse?.data?.permissions ?? [];

  const permissionsRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((p) => String(p).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((row) => `${row.id}:${row.is_active ? "1" : "0"}`)
      .join("|");
    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const serverPagination = permissionResponse?.data?.pagination;

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one permission before deleting.");
      return;
    }

    setConfirmTitle("Delete Permissions");
    setConfirmMessage(
      `Are you sure you want to delete ${selectedIds.length} permissions? This action cannot be undone.`,
    );
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.PERMISSION.CREATE)),
    buildDeleteAction(handleDelete, { 
      disabled: selectedIds.length === 0, 
      show: hasPermission(userPermissions, PERMISSIONS.PERMISSION.DELETE) 
    }),
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];
  return (
    <div className="w-full flex flex-col px-2">
      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 ">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Toolbar */}
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search permissions.."
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) =>
              setSelectedView(key as "table" | "cards")
            }
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          {/* Table area */}
          <CommonDataView
            key={`${entityKey}-${permissionsRevision}`}
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Permission"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={permissionGridContext}
            gridContextRevision={permissionsRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (
                !hasPermission(userPermissions, PERMISSIONS.PERMISSION.UPDATE)
              )
                return;
              if (!id || !field) return;
              if (value === oldValue) return;

              updateMutation.mutate({
                id,
                [field]: value,
              });
            }}
            page={page}
            pageSize={pageSize}
            total={serverPagination?.totalCount ?? 0}
            totalPages={serverPagination?.totalPages ?? 1}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: { id: string }) => row.id}
            columnSelectorTitle="Permission Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: canShowPermissionActionsColumn ? actionsColumn : undefined,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(PERMISSION_FILTER_DEFAULTS);
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
        title="Create Permission"
        subtitle="Add a new permission to the system"
        icon={navIcons.permissions}
        maxWidth="max-w-3xl"
      >
        <PermissionForm
          mode="create"
          parentPermissionListResult={{
            data: parentListForPermissionForm.data,
            isLoading: parentListForPermissionForm.isLoading,
          }}
          onSuccess={() => setShowCreate(false)}
        />
      </FormModal>

      <FormModal
        open={!!(showEdit && editingPermission)}
        onClose={() => {
          setShowEdit(false);
          setEditingPermission(null);
        }}
        title="Edit Permission"
        subtitle={editingPermission?.display_name || "Update permission"}
        icon={navIcons.permissions}
        maxWidth="max-w-3xl"
      >
        {editingPermission && (
          <PermissionForm
            mode="edit"
            initialValues={editingPermission}
            parentPermissionListResult={{
              data: parentListForPermissionForm.data,
              isLoading: parentListForPermissionForm.isLoading,
            }}
            onSuccess={() => {
              setShowEdit(false);
              setEditingPermission(null);
            }}
          />
        )}
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
            setSelectedIds((prev) =>
              prev.filter((id) => !confirmIds.includes(id)),
            );
            setConfirmOpen(false);
            setConfirmIds([]);
          } catch {
            // handled by mutation
          }
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Permissions;
