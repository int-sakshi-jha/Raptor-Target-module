/**
 * Users module — list / CRUD for users (all users vs my users by permission).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
} from "@/components/core/table/CommonToolbar";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import {
  useDeleteUserMutation,
  useGetAllUsersQuery,
  useGetUserProfileQuery,
  useGetMyUsersQuery,
  useToggleUserStatusMutation,
  useUpdateUserMutation,
  fetchUserNames,
  type UserRow,
  type UsersListFilters,
  type UpdateUserInput,
} from "@/services/operations/userAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import UserForm from "@/components/core/form/UserForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import {
  PERMISSIONS,
  canGetAllUsers,
  canGetMyUsers,
  hasPermission,
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
} from "@/utils/permissions";
import Modal from "@/components/common/Modal";
import ColorBadge from "@/components/common/ColorBadge";
import Spinner from "@/components/common/Spinner";
import {
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getLinkColumn,
  getRendererColumn,
  getTextColumn,
  getActionsColumn,
  getLinkedUserNameAuditColumn,
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
const BASE_ENTITY_KEY = "user";
const {
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setMultiSelectFilterParam,
} = CommonFilterPanel;

const BASE_FILTER_KEYS = new Set(["sort_by", "sort_order"]);
const ALL_USERS_SUPPORTED_FILTER_KEYS = new Set([
  ...BASE_FILTER_KEYS,
  "role",
  "tenant_id",
  "created_by",
  "is_active",
  "web_login_enabled",
  "app_login_enabled",
  "enable_api_access",
  "is_password_login_enable",
  "is_otp_login_enable",
  "created_at_start",
  "created_at_end",
  "updated_at_start",
  "updated_at_end",
]);
const MY_USERS_SUPPORTED_FILTER_KEYS = new Set([
  "is_active",
  "enable_api_access",
  ...BASE_FILTER_KEYS,
]);

/**
 * Plain ag-Grid cell renderer (not a nested React cell component): reads permissions from
 * `params.context.userPermissions`. Parent passes `gridContextRevision` so CommonTable can
 * refresh cells when permissions change.
 */
const usersRowActionsCellRenderer = createCrudRowActionsCellRenderer<UserRow>({
  actions: [
    buildToggleStatusRowAction("usersGrid_toggleStatus", PERMISSIONS.USER.UPDATE),
    buildEditRowAction("usersGrid_openEdit", PERMISSIONS.USER.UPDATE),
    buildDeleteRowAction("usersGrid_requestDelete", PERMISSIONS.USER.DELETE),
  ],
});

// ─── Component ────────────────────────────────────────────────────────────────

const Users = () => {
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = isAdminOrSuperAdminRole(userRole);
  const useGetAllUsers = canGetAllUsers(userPermissions);
  const useGetMyUsers = !useGetAllUsers && canGetMyUsers(userPermissions);
  const showAuditUserFields = useGetAllUsers && !isTenantOrUserRole(userRole);
  const canShowUsersActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.USER.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.USER.DELETE);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const entityKey = isAdmin ? `${BASE_ENTITY_KEY}-admin` : `${BASE_ENTITY_KEY}-basic`;

  useEffect(() => {
    resetSavedActionsColumnWidth(entityKey);
  }, [entityKey]);

  // ── Filter fields ───────────────────────────────────────────────────────────

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    // ── Base filters (all authorised users) ────────────────────────────────
    const base: FilterFieldConfig[] = [
      
      // Status toggles
      buildBoolSelectFilter("is_active", "Active"),
      buildBoolSelectFilter("web_login_enabled", "Web Login Enabled"),
      buildBoolSelectFilter("app_login_enabled", "App Login Enabled"),
      buildBoolSelectFilter("enable_api_access", "API Access Enabled"),
    ];

    // ── Admin / super-admin only filters ──────────────────────────────────
    if (useGetAllUsers) {
      base.push(
        buildBoolSelectFilter("is_password_login_enable", "Password Login Enabled"),
        buildBoolSelectFilter("is_otp_login_enable", "OTP Login Enabled"),
        ...buildAuditFilterFields({
          dateMode: "daterange",
          CreatedBy: showAuditUserFields,
          UpdatedBy: showAuditUserFields,
          CreatedAt: true,
          UpdatedAt: true,
          userLoadOptions: (s = "") => fetchUserNames(s, 1, 50),
        }),
      );

      // Role
      base.unshift(buildSelectFilter("role", "Role", [
        { value: "", label: "All" },
        { value: "admin", label: "Admin" },
        { value: "tenant", label: "Tenant" },
        { value: "user", label: "User" },
      ]));

      // Tenant (after role)
      base.splice(1, 0, {
        key: "tenant_id",
        label: "Tenant",
        type: "async-multiselect",
        apiSearch: true,
        placeholder: "Type to search tenants...",
        loadOptions: (search = "") => fetchTenantNames(search, 1, 50),
      });
    }

    base.push(
      ...buildSortFilterFields({
        sortOptions: [
          { value: "created_at", label: "Created At" },
          { value: "updated_at", label: "Updated At" },
          { value: "first_name", label: "First Name" },
          { value: "last_name", label: "Last Name" },
          { value: "full_name", label: "Full Name" },
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
          { value: "role", label: "Role" },
        ],
      })
    );

    return base;
  }, [showAuditUserFields, useGetAllUsers]);

  // ── Filter state ────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState<FilterValues>(createFilterDefaults());

  const [prevUseGetAllUsers, setPrevUseGetAllUsers] = useState(useGetAllUsers);
  if (useGetAllUsers !== prevUseGetAllUsers) {
    setPrevUseGetAllUsers(useGetAllUsers);

    const allowedKeys = useGetAllUsers
      ? ALL_USERS_SUPPORTED_FILTER_KEYS
      : MY_USERS_SUPPORTED_FILTER_KEYS;

    setFilters((prev) => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([key]) => allowedKeys.has(key)),
      ) as FilterValues;

      if (!useGetAllUsers && filtered.role) {
        filtered.role = "";
      }

      const hasChanged =
        Object.keys(filtered).length !== Object.keys(prev).length ||
        (!useGetAllUsers && prev.role !== filtered.role);

      return hasChanged ? filtered : prev;
    });
  }

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);

  const deleteMutation = useDeleteUserMutation();
  const toggleStatusMutation = useToggleUserStatusMutation();
  const updateMutation = useUpdateUserMutation();
  const tableRef = React.useRef<CommonTableHandle>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  // ── Column definitions ──────────────────────────────────────────────────────

  const defaultColumns: CommonColumnConfig[] = useMemo(
    () => {
      const columns: CommonColumnConfig[] = [
      // ── Identity ────────────────────────────────────────────────────────────
      getLinkColumn("full_name", "Full Name", (params) => (params.data?.id ? `/users/${params.data.id}/profile` : null), { minWidth: 220, pinned: "left" }),
      getTextColumn("username", "Username", { minWidth: 180, editable: true }),
      getTextColumn("first_name", "First Name", { visible: false, minWidth: 150, editable: true }),
      getTextColumn("last_name", "Last Name", { visible: false, minWidth: 150, editable: true }),
      getTextColumn("email", "Email", { minWidth: 220, editable: true }),
      getTextColumn("phone", "Phone", { minWidth: 160, editable: true }),
      // ── Role / Tenant ────────────────────────────────────────────────────────
      getRendererColumn("role", "Role", (params) => {const role = params.value ? String(params.value) : "";
        return role ? (
          <ColorBadge variant="orange" className="capitalize">
            {role.replaceAll("_", " ")}
          </ColorBadge>
        ) : (
          "-"
        );
      }, { minWidth: 140 }),
      getActiveStatusColumn("is_active", "Active", { minWidth: 170, fallbackValue: true }),
      ...(isAdmin
        ? [
          getLinkColumn(
            "tenant_id",
            "Tenant",
            (params) =>
              params.data?.tenant_id ? `/tenant/${params.data.tenant_id}` : null,
            {
              visible: false,
              minWidth: 200,
              valueGetter: (params) =>
                params.data?.tenant_name || params.data?.tenant_id || "",
            },
          ),
      getBooleanColumn("web_login_enabled", "Web Login", { visible: false, minWidth: 130 }),
      getBooleanColumn("app_login_enabled", "App Login", { visible: false, minWidth: 130 }),
      getBooleanColumn("enable_api_access", "API Access", { visible: false, minWidth: 130 }),
      getBooleanColumn("is_password_login_enable", "Password Login", { visible: false, minWidth: 155 }),
      getBooleanColumn("is_otp_login_enable", "OTP Login", { visible: false, minWidth: 130 }),
       getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 200 }),
      getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 200 }),
      getDateColumn("updated_at", "Updated At"),
      ]
        : []),
      getDateColumn("created_at", "Created At"),
     
    ];

      return showAuditUserFields
        ? columns
        : columns.filter(
            (column) =>
              column.field !== "created_by" && column.field !== "updated_by",
          );
    },
    [isAdmin, showAuditUserFields],
  );

  // ── Actions column ──────────────────────────────────────────────────────────

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(usersRowActionsCellRenderer), []);

  const usersGridContext = useMemo(
    () => ({
      userPermissions,
      usersGrid_toggleStatus: (data: UserRow) => {
        toggleStatusMutation.mutate(data.id);
      },
      usersGrid_openEdit: (user: UserRow) => {
        setEditingUser(user);
        setShowEdit(true);
      },
      usersGrid_requestDelete: (id: string) => {
        setConfirmTitle("Delete User");
        setConfirmMessage(
          "Are you sure you want to delete this user? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  // ── Data queries ────────────────────────────────────────────────────────────

  const queryFilters = useMemo<UsersListFilters>(
    () => {
      const next: UsersListFilters = { ...filters } as UsersListFilters;
      setMultiSelectFilterParam(next, filters, "tenant_id");
      if (showAuditUserFields) {
        setMultiSelectFilterParam(next, filters, "created_by");
        setMultiSelectFilterParam(next, filters, "updated_by");
      }
      return next;
    },
    [filters, showAuditUserFields],
  );

  const {
    data: allUsersResp,
    isLoading: isLoadingAllUsers,
    isError: isErrorAllUsers,
    error: errorAllUsers,
  } = useGetAllUsersQuery({
    search,
    filters: queryFilters,
    page,
    limit: pageSize,
    enabled: useGetAllUsers,
  });

  const {
    data: myUsersResp,
    isLoading: isLoadingMyUsers,
    isError: isErrorMyUsers,
    error: errorMyUsers,
  } = useGetMyUsersQuery({
    search,
    filters: queryFilters,
    page,
    limit: pageSize,
    enabled: useGetMyUsers,
  });

  const {
    data: editingUserProfileResp,
    isLoading: isLoadingEditingUserProfile,
  } = useGetUserProfileQuery(showEdit ? editingUser?.id : null);

  const isLoading = useGetAllUsers ? isLoadingAllUsers : isLoadingMyUsers;
  const isError = useGetAllUsers ? isErrorAllUsers : isErrorMyUsers;
  const error = useGetAllUsers ? errorAllUsers : errorMyUsers;

  useEffect(() => {
    if (!isError) return;
    const msg = error
      ? getErrorMessage(error)
      : "Failed to load users. Please try again.";
    toast.error(msg, { duration: 4000, position: "top-right" });
  }, [error, isError]);

  const usersResp = useGetAllUsers ? allUsersResp : myUsersResp;
  const editingUserDetails = editingUserProfileResp?.data?.user;
  const tableData = React.useMemo(
    () => usersResp?.data?.users || [],
    [usersResp?.data?.users],
  );
  const usersPermissionsRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((p) => String(p).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((user: UserRow) => `${user.id}:${user.is_active ? "1" : "0"}`)
      .join("|");
    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);
  const serverPagination = useMemo(
    () => usersResp?.data?.pagination,
    [usersResp?.data?.pagination],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one user before deleting.");
      return;
    }
    setConfirmTitle("Delete Users");
    setConfirmMessage(
      `Are you sure you want to delete ${selectedIds.length} user(s)? This action cannot be undone.`,
    );
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  // ── Toolbar ─────────────────────────────────────────────────────────────────

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.USER.CREATE)),
    buildDeleteAction(handleDeleteBulk, { 
      disabled: selectedIds.length === 0, 
      show: hasPermission(userPermissions, PERMISSIONS.USER.DELETE) 
    }),
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search users…"
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
            entityLabel="User"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={usersGridContext}
            gridContextRevision={usersPermissionsRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.USER.UPDATE))
                return;
              if (!id || !field) return;
              if (value === oldValue) return;
              updateMutation.mutate({ id, [field]: value } as UpdateUserInput);
            }}
            page={page}
            pageSize={pageSize}
            total={serverPagination?.totalCount ?? 0}
            totalPages={serverPagination?.totalPages ?? 1}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: UserRow) => row.id}
            columnSelectorTitle="User Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: canShowUsersActionsColumn ? actionsColumn : undefined,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(createFilterDefaults());
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
        title="Create User"
        subtitle="Add a new user to the system"
        icon={navIcons.users}
        maxWidth="max-w-3xl"
      >
        {showCreate ? (
          <UserForm
            mode="create"
            onSuccess={() => setShowCreate(false)}
          />
        ) : null}
      </Modal>

      <Modal
        open={!!(showEdit && editingUser)}
        onClose={() => {
          setShowEdit(false);
          setEditingUser(null);
        }}
        title="Edit User"
        subtitle={
          editingUser?.full_name || editingUser?.email || "Update user details"
        }
        icon={navIcons.users}
        maxWidth="max-w-3xl"
      >
        {editingUser && isLoadingEditingUserProfile ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={3} />
          </div>
        ) : editingUser && editingUserDetails ? (
          <UserForm
            mode="edit"
            editValues={editingUserDetails}
            onSuccess={() => {
              setShowEdit(false);
              setEditingUser(null);
            }}
          />
        ) : null}
      </Modal>

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
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Users;
