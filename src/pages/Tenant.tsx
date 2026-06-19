/**
 * Tenants module — list / CRUD for tenants (CommonToolbar + CommonDataView).
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
} from "../components/core/table/CommonToolbar";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import {
  useGetTenantListQuery,
  useGetTenantDetailsQuery,
  useDeleteTenantMutation,
  useToggleTenantStatusMutation,
  useUpdateTenantMutation,
  type Tenant,
  type TenantListFilters,
} from "@/services/operations/tenantAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";

import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import TenantForm from "@/components/core/form/TenantForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import {
  PERMISSIONS,
  hasPermission,
  isTenantOrUserRole,
} from "@/utils/permissions";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import Modal from "@/components/common/Modal";
import ColorBadge from "@/components/common/ColorBadge";
import Spinner from "@/components/common/Spinner";
import { INDIAN_STATES_AND_UTS } from "@/utils/indianStates";
import type { ValueFormatterParams } from "@ag-grid-community/core";
import {
  getActiveStatusColumn,
  getDateColumn,
  getDisplayNumberColumn,
  getDisplayTextColumn,
  getLinkColumn,
  getLinkedUserNameAuditColumn,
  getRendererColumn,
  getTextColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";
import {
  buildAddAction,
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
  buildStatusAction,
} from "@/components/core/table/CommonToolbar";

const BASE_ENTITY_KEY = "tenant";
const {
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildNumberFilter,
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setMultiSelectFilterParam,
} = CommonFilterPanel;

// ─── Row actions cell renderer ────────────────────────────────────────────────

const tenantRowActionsCellRenderer = createCrudRowActionsCellRenderer<Tenant>({
  actions: [
    buildToggleStatusRowAction("tenantGrid_toggleStatus", PERMISSIONS.TENANT.UPDATE),
    buildEditRowAction("tenantGrid_openEdit", PERMISSIONS.TENANT.UPDATE),
    buildDeleteRowAction("tenantGrid_requestDelete", PERMISSIONS.TENANT.DELETE),
  ],
});

const TENANT_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "state",
    "is_active",
    "create_generation_table",
    "data_retention_days",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
});

const tenantBaseFilterFields: FilterFieldConfig[] = [
  buildSelectFilter("state", "State", [
    { value: "", label: "All" },
    ...INDIAN_STATES_AND_UTS.map((s) => ({ value: s.value, label: s.label })),
  ]),
  buildBoolSelectFilter("is_active", "Active"),
  buildBoolSelectFilter("create_generation_table", "Generation Table"),
  buildNumberFilter("data_retention_days", "Data Retention Days"),
];

// ─── Default column definitions ───────────────────────────────────────────────

const commonTenantColumns: CommonColumnConfig[] = [
  getLinkColumn("name", "Name", (params) => (params.data?.id ? `/tenant/${params.data.id}` : null), { minWidth: 200, pinned: "left", editable: true }),
  getTextColumn("email", "Email", { minWidth: 220, editable: true }),
  getDisplayTextColumn("phone", "Phone", { minWidth: 160, editable: true }),
  getDisplayTextColumn("city", "City", { minWidth: 130, editable: true }),
  getDisplayTextColumn("district", "District", { minWidth: 130, editable: true }),
  getDisplayTextColumn("state", "State", { minWidth: 130, editable: true }),
  getDisplayTextColumn("country", "Country", { minWidth: 120, editable: true }),
  getDisplayTextColumn("contact_person", "Contact Person", { minWidth: 180, editable: true }),
  getDisplayTextColumn("contact_email", "Contact Email", { minWidth: 200, editable: true }),
  getDisplayTextColumn("contact_phone", "Contact Phone", { minWidth: 160, editable: true }),
  getDisplayTextColumn("contact_person_designation", "Designation", { minWidth: 180, editable: true }),
  getDisplayNumberColumn("data_retention_days", "Retention (Days)", { minWidth: 160 }),
  getActiveStatusColumn("is_active", "Active", { minWidth: 100 }),
  getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 160 }),
  getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 160 }),
  getDateColumn("created_at", "Created At"),
  getDateColumn("updated_at", "Updated At"), 
];

const developerTenantColumns: CommonColumnConfig[] = [
  getRendererColumn("create_generation_table", "Generation Table", (params) => params.value !== undefined ? <ColorBadge variant="orange">{params.value ? "True" : "False"}</ColorBadge> : "-", { minWidth: 180, filter: "agSetColumnFilter", filterParams: { values: [true, false], valueFormatter: (p: ValueFormatterParams) => p.value ? "True" : "False" } }),
];

// ─── Page component ───────────────────────────────────────────────────────────

const Tenants = () => {
  const { permissions: userPermissions } = useAppSelector(
    (state) => state.auth,
  );
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const canViewDeveloperFields = (userPermissions ?? []).some(
    (permission) =>
      String(permission).toLowerCase() ===
      String(PERMISSIONS.DEVELOPER).toLowerCase(),
  );
  const showAuditUserFilters = !isTenantOrUserRole(userRole);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [filters, setFilters] = useState<FilterValues>(() => ({ ...TENANT_FILTER_DEFAULTS }));
  const isEditModalOpen = !!showEdit && !!editingTenant?.id;

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();

  const entityKey = canViewDeveloperFields
    ? `${BASE_ENTITY_KEY}-${showAuditUserFilters ? "developer-admin" : "developer-scoped"}`
    : `${BASE_ENTITY_KEY}-${showAuditUserFilters ? "basic-admin" : "basic-scoped"}`;

  // ── Mutations & edit detail query ─────────────────────────────────────────

  const deleteMutation = useDeleteTenantMutation();
  const toggleStatusMutation = useToggleTenantStatusMutation();
  const updateMutation = useUpdateTenantMutation();
  const tenantScopedFilterFields: FilterFieldConfig[] = useMemo(
    () => [
      ...tenantBaseFilterFields,
      ...buildAuditFilterFields({
        dateMode: "daterange",
        CreatedBy: showAuditUserFilters,
        UpdatedBy: showAuditUserFilters,
        CreatedAt: true,
        UpdatedAt: true,
        createdAtLabel: "Created At",
        updatedAtLabel: "Updated At",
        userLoadOptions: (search = "") => fetchUserNames(search, 1, 50),
      }),
      ...buildSortFilterFields({
        sortOptions: [
          { value: "name", label: "Name" },
          { value: "email", label: "Email" },
          { value: "city", label: "City" },
          { value: "created_at", label: "Created At" },
          { value: "updated_at", label: "Updated At" },
        ],
      }),
    ],
    [showAuditUserFilters],
  );
  const tenantListFilters = useMemo<TenantListFilters>(() => {
    const next: TenantListFilters = { ...filters } as TenantListFilters;

    setMultiSelectFilterParam(next, filters, "created_by");
    setMultiSelectFilterParam(next, filters, "updated_by");

    if (!showAuditUserFilters) {
      delete next.created_by;
      delete next.updated_by;
    }

    return next;
  }, [filters, showAuditUserFilters]);
  const {
    data: editingTenantResponse,
    isLoading: isLoadingEditingTenant,
  } = useGetTenantDetailsQuery(isEditModalOpen ? editingTenant?.id : null, { enabled: isEditModalOpen });

  const tableRef = React.useRef<CommonTableHandle>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const tenantGridContext = useMemo(
    () => ({
      userPermissions,
      tenantGrid_toggleStatus: (tenant: Tenant) => {
        const tenantId =
          tenant?.id || (tenant as Tenant & { tenant_id?: string }).tenant_id;

        if (!tenantId) {
          toast.error("Unable to update tenant status right now.");
          return;
        }

        toggleStatusMutation.mutate({
          id: tenantId,
          is_active: !tenant.is_active,
        });
      },
      tenantGrid_openEdit: (tenant: Tenant) => {
        setEditingTenant(tenant);
        setShowEdit(true);
      },
      tenantGrid_requestDelete: (id: string) => {
        setConfirmTitle("Delete Tenant");
        setConfirmMessage(
          "Are you sure you want to delete this tenant? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  // ── Actions column ─────────────────────────────────────────────────────────

  const actionsColumn: CommonColumnConfig = React.useMemo(() => getActionsColumn(tenantRowActionsCellRenderer),[],);

  // ── Data queries ────────────────────────────────────────────────────────────

  const {
    data: tenantResponse,
    isLoading,
    isError,
    error,
  } = useGetTenantListQuery({
    search,
    filters: tenantListFilters,
    page,
    limit: pageSize,
  });

  // ── Load error (toast) ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isError) {
      const errorMessage = error
        ? getErrorMessage(error)
        : "Failed to load tenants data. Please try again.";
      toast.error(errorMessage, { duration: 4000, position: "top-right" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // ── Table rows & grid revision ───────────────────────────────────────────────

  const tableData = React.useMemo(() => {
    return tenantResponse?.data?.data || [];
  }, [tenantResponse?.data?.data]);

  const permissionsRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((tenant: Tenant) => `${tenant.id}:${tenant.is_active ? "1" : "0"}`)
      .join("|");

    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const filterFields = useMemo(
    () =>
      canViewDeveloperFields
        ? tenantScopedFilterFields
        : tenantScopedFilterFields.filter(
          (field) => field.key !== "create_generation_table",
        ),
    [canViewDeveloperFields, tenantScopedFilterFields],
  );

  const defaultColumns = useMemo(
    () => {
      const columns = canViewDeveloperFields
        ? [
          ...commonTenantColumns.slice(0, 10),
          ...developerTenantColumns,
          ...commonTenantColumns.slice(10),
        ]
        : commonTenantColumns;

      return showAuditUserFilters
        ? columns
        : columns.filter(
            (column) =>
              column.field !== "created_by_name" &&
              column.field !== "updated_by_name",
          );
    },
    [canViewDeveloperFields, showAuditUserFilters],
  );

  const serverPagination = useMemo(() => {
    return tenantResponse?.data?.pagination;
  }, [tenantResponse?.data?.pagination]);

  const editingTenantDetails = editingTenantResponse?.data;

  // ── Toolbar ─────────────────────────────────────────────────────────────────

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.TENANT.CREATE)),
    buildStatusAction({
      selectedIds,
      rows: tableData,
      entityLabel: "tenant",
      isLoading: toggleStatusMutation.isPending,
      show: hasPermission(userPermissions, PERMISSIONS.TENANT.UPDATE),
      onChange: async ({ ids, is_active }) => {
        try {
          await toggleStatusMutation.mutateAsync({ ids, is_active });
        } catch {
          // handled by mutation
        }
      },
    }),
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search tenants..."
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
            entityLabel="Tenant"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={tenantGridContext}
            gridContextRevision={permissionsRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.TENANT.UPDATE))
                return;
              if (!id || !field) return;
              if (value === oldValue) return;
              updateMutation.mutate({ id, [field]: value });
            }}
            page={page}
            pageSize={pageSize}
            total={serverPagination?.totalCount ?? 0}
            totalPages={serverPagination?.totalPages ?? 1}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: Tenant) => row.id}
            columnSelectorTitle="Tenant Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters({ ...TENANT_FILTER_DEFAULTS });
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
            onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
          />
        </div>
      </main>
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Tenant"
        subtitle="Add a new tenant to the system"
        maxWidth="max-w-3xl"
        icon={navIcons.tenant}
      >
        <TenantForm
          mode="create"
          onSuccess={() => setShowCreate(false)}
          isOpen={showCreate}
        />
      </Modal>

      <Modal
        open={isEditModalOpen}
        onClose={() => {
          setShowEdit(false);
          setEditingTenant(null);
        }}
        title="Edit Tenant"
        maxWidth="max-w-3xl"
        subtitle={
          editingTenant?.name || editingTenant?.email || "Update tenant details"
        }
        icon={navIcons.tenant}
      >
        {isEditModalOpen && isLoadingEditingTenant && !editingTenantDetails ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={3} />
          </div>
        ) : editingTenant && (
          <TenantForm
            mode="edit"
            initialValues={editingTenant}
            editValues={editingTenantDetails}
            onSuccess={() => {
              setShowEdit(false);
              setEditingTenant(null);
            }}
            isOpen={!!showEdit}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
          setConfirmIds([]);
        }}
        onConfirm={async () => {
          if (confirmIds.length === 0) return;
          try {
            for (const id of confirmIds) {
              await deleteMutation.mutateAsync(id);
            }
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

export default Tenants;
