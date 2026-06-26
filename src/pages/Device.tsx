/**
 * Devices module — list / CRUD for field devices (CommonToolbar + CommonDataView).
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
  buildAddAction,
  buildColumnsAction,
  buildDeleteAction,
  buildExportAction,
  buildFiltersAction,
  buildStatusAction,
} from "../components/core/table/CommonToolbar";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import {
  useGetDeviceDetailsQuery,
  useGetDeviceListQuery,
  useUpdateDeviceMutation,
  useDeleteDeviceMutation,
  useToggleDeviceStatusMutation,
  fetchDeviceTypeOptions,
  type Device,
  type DeviceListFilters,
} from "@/services/operations/deviceAPI";
import {
  DEVICE_SORT_BY_OPTIONS,
} from "@/utils/selectOptions";
import DeviceForm from "@/components/core/form/DeviceForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
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
import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import {
  PERMISSIONS,
  hasPermission,
  isAdminOrSuperAdminRole,
  usesScopedDeviceListAccess,
} from "@/utils/permissions";
import Modal from "@/components/common/Modal";
import Spinner from "@/components/common/Spinner";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchHealthTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import ColorBadge from "@/components/common/ColorBadge";
import type {
  ICellRendererParams,
  ValueFormatterParams,
} from "@ag-grid-community/core";
import {
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getDisplayNumberColumn,
  getRendererColumn,
  getLinkedUserNameAuditColumn,
  getActionsColumn,
  getDisplayTextColumn,
  getLinkColumn,
} from "@/components/core/table/ListPageHelpers";

const DEVICE_ENTITY_KEY = "device";
const {
  buildAsyncMultiselectFilter,
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildNumberFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setBooleanFilterParam,
  setMultiSelectFilterParam,
  setScalarFilterParam,
} = CommonFilterPanel;

// ─── Filter API keys (allowed panel keys by list scope; aligns with device field config) ─

const DEVICE_FILTER_KEYS_SCOPED = new Set([
  "sort_by",
  "sort_order",
  "plant_id",
  "device_type",
  "data_interval_seconds",
  "is_online",
  "is_active",
  "is_default_config",
  "health_vd",
  "warranty_start_date_start",
  "warranty_start_date_end",
  "warranty_end_date_start",
  "warranty_end_date_end",
  "created_at_start",
  "created_at_end",
  "updated_at_start",
  "updated_by",
  "updated_at_end",
]);

const DEVICE_FILTER_KEYS_ADMIN = new Set([
  ...DEVICE_FILTER_KEYS_SCOPED,
  "tenant_id",
  "created_by",
  "health_tag_template_id",
]);

/** Default filter state — `internalName` where `filterable: true`. */
const DEVICE_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "tenant_id",
    "plant_id",
    "device_type",
    "data_interval_seconds",
    "is_online",
    "is_active",
    "is_default_config",
    "health_vd",
    "health_tag_template_id",
    "warranty_start_date",
    "warranty_end_date",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
});

function toDeviceListApiFilters(
  filters: FilterValues,
  useGetAllDevices: boolean,
): Record<string, unknown> {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, unknown> = { sort_by, sort_order };

  setMultiSelectFilterParam(base, filters, "plant_id");
  setMultiSelectFilterParam(base, filters, "device_type");

  setBooleanFilterParam(base, filters, "is_active");
  setBooleanFilterParam(base, filters, "is_online");
  setBooleanFilterParam(base, filters, "is_default_config");

  for (const key of [
    "data_interval_seconds",
    "health_vd",
    "warranty_start_date_start",
    "warranty_start_date_end",
    "warranty_end_date_start",
    "warranty_end_date_end",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  if (useGetAllDevices) {
    setMultiSelectFilterParam(base, filters, "tenant_id");
    setMultiSelectFilterParam(base, filters, "created_by");
    setMultiSelectFilterParam(base, filters, "updated_by");
    setMultiSelectFilterParam(base, filters, "health_tag_template_id");
  }

  return base;
}

// ─── Row actions cell renderer ────────────────────────────────────────────────

const deviceRowActionsCellRenderer = createCrudRowActionsCellRenderer<Device>({
  actions: [
    buildToggleStatusRowAction("deviceGrid_toggleStatus", PERMISSIONS.DEVICE.UPDATE),
    buildEditRowAction("deviceGrid_openEdit", PERMISSIONS.DEVICE.UPDATE),
    buildDeleteRowAction("deviceGrid_requestDelete", PERMISSIONS.DEVICE.DELETE),
  ],
});

// ─── Page component ───────────────────────────────────────────────────────────

const Devices = () => {
  const { token, user, permissions: userPermissions } = useAppSelector(
    (state) => state.auth,
  );
  const usesScopedListAccess = usesScopedDeviceListAccess(
    userPermissions,
    user?.role,
  );
  const isAdmin = isAdminOrSuperAdminRole(user?.role);
  const useGetAllDevices = !usesScopedListAccess;
  const canShowDeviceActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.DEVICE.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.DEVICE.DELETE);
  const deviceListScope = usesScopedListAccess ? "scoped" : "all";
  const isDeviceListQueryEnabled = Boolean(user?.role) || !token;
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(DEVICE_FILTER_DEFAULTS);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const tableRef = React.useRef<CommonTableHandle>(null);
  const entityKey = isAdmin ? `${DEVICE_ENTITY_KEY}-admin` : `${DEVICE_ENTITY_KEY}-basic`;

  // ── Default columns (admin vs scoped list) ─────────────────────────────────

  const defaultColumns: CommonColumnConfig[] = useMemo(
    () => [
      getLinkColumn("device_name", "Device Name", (params) => (params.data?.id ? `/devices/${params.data.id}` : null), { minWidth: 180, pinned: "left", editable: true }),
      getDisplayTextColumn("device_type", "Device Type", { minWidth: 160 }),
      ...(isAdmin
        ? [
          getLinkColumn("tenant_id", "Tenant", (params) => (params.data?.tenant_id ? `/tenant/${params.data.tenant_id}` : null), { minWidth: 180, valueGetter: (params: ICellRendererParams<Device, string>) => params.data?.tenant_name || params.data?.tenant_id || "" }),
        ]
        : []),
      getLinkColumn("plant_id", "Plant", (params) => (params.data?.plant_id ? `/plants/${params.data.plant_id}` : null), { minWidth: 200, valueGetter: (params: ICellRendererParams<Device, string>) => params.data?.plant_name || params.data?.plant_id || "" }),
      getDisplayTextColumn("serial_number", "Serial Number", { minWidth: 180, editable: true }),
      getDisplayTextColumn("mac_address", "MAC Address", { minWidth: 180, editable: true }),
      getDisplayTextColumn("imei", "IMEI", { minWidth: 180, editable: true }),
      getDisplayTextColumn("model_code", "Model Code", { minWidth: 160, editable: true }),
      getDisplayTextColumn("manufacturer", "Manufacturer", { minWidth: 180, editable: true }),
      ...(isAdmin
        ? [
          getDisplayTextColumn("client_id", "Client ID", { minWidth: 180, editable: true }),
          getDisplayTextColumn("username", "Username", { minWidth: 180, editable: true }),
          getDisplayNumberColumn("data_interval_seconds", "Data Interval", { minWidth: 140 }),
          getDisplayTextColumn("ip_address", "IP Address", { minWidth: 160 }),
        ]
        : []),
      getBooleanColumn("is_online", "Online", { minWidth: 110 }),
      ...(isAdmin
        ? [
          getRendererColumn("is_default_config", "Default Config", (params: ICellRendererParams<Device, boolean>) => params.value != null ? <ColorBadge variant={params.value ? "yes" : "no"}>{params.value ? "Yes" : "No"}</ColorBadge> : "-", { minWidth: 150, filter: "agSetColumnFilter", filterParams: { values: [true, false], valueFormatter: (p: ValueFormatterParams<boolean>) => p.value ? "Yes" : "No" } }),
          getDisplayNumberColumn("health_vd", "Health VD", { minWidth: 120 }),
        ]
        : []),
      getDateColumn("warranty_start_date", "Warranty Start"),
      getDateColumn("warranty_end_date", "Warranty End"),
      ...(isAdmin
        ? [
          getLinkColumn("health_tag_template_id", "Health Template", (params) => (params.data?.health_tag_template_id ? `/tag-templates/${params.data.health_tag_template_id}` : null), { minWidth: 200, valueGetter: (params: ICellRendererParams<Device, string>) => params.data?.health_tag_template_name || params.data?.tag_template_name || params.data?.health_tag_template_id || "" }),
        ]
        : []),
      getActiveStatusColumn("is_active", "Active", { minWidth: 100 }),
      ...(isAdmin ?
        [getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 180 })] : []),
      ...(isAdmin ?
        [getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 180 })] : []),
        getDateColumn("created_at", "Created At"),
      ...(isAdmin ?
        [getDateColumn("updated_at", "Updated At")] : []),
    ],
    [isAdmin],
  );

  // ── Sync filter keys when scope changes (render-phase) ─────────────────────

  const allowedFilterKeys = useGetAllDevices
    ? DEVICE_FILTER_KEYS_ADMIN
    : DEVICE_FILTER_KEYS_SCOPED;

  const effectiveFilters = useMemo(() => {
    const filtered = Object.fromEntries(
      Object.entries(filters).filter(([key]) => allowedFilterKeys.has(key)),
    ) as FilterValues;
    return Object.keys(filtered).length === Object.keys(filters).length
      ? filters
      : filtered;
  }, [filters, allowedFilterKeys]);

  // ── Mutations & edit detail query ─────────────────────────────────────────

  const deleteMutation = useDeleteDeviceMutation();
  const toggleStatusMutation = useToggleDeviceStatusMutation();
  const updateMutation = useUpdateDeviceMutation();
  const {
    data: editingDeviceResponse,
    isLoading: isLoadingEditingDevice,
  } = useGetDeviceDetailsQuery(showEdit ? editingDevice?.id : null, {
    staleTime: 0,
    enabled: !!showEdit && !!editingDevice?.id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const deviceGridContext = useMemo(
    () => ({
      userPermissions,
      deviceGrid_toggleStatus: (data: Device) => {
        toggleStatusMutation.mutate({ id: data.id, is_active: !data.is_active });
      },
      deviceGrid_openEdit: (device: Device) => {
        setEditingDevice(device);
        setShowEdit(true);
      },
      deviceGrid_requestDelete: (id: string) => {
        setConfirmTitle("Delete Device");
        setConfirmMessage(
          "Are you sure you want to delete this device? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  // ── Filter fields (`filterable: true` in device field config) ───────────────

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortFields: FilterFieldConfig[] = buildSortFilterFields({
      sortOptions: DEVICE_SORT_BY_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    const plantField = buildAsyncMultiselectFilter("plant_id", "Plant", (search = "") => fetchPlantNames(search, 1, 50), { placeholder: "Search plants…" });
    const deviceTypeMulti = buildAsyncMultiselectFilter("device_type", "Device type", (search = "") => fetchDeviceTypeOptions(search), { placeholder: "Select one or more types…" });

    const intervalAndHealthFields: FilterFieldConfig[] = [
      buildNumberFilter("data_interval_seconds", "Data interval (seconds)"),
      buildNumberFilter("health_vd", "Health VD"),
    ];

    const boolFields: FilterFieldConfig[] = [
      buildBoolSelectFilter("is_online", "Online"),
      buildBoolSelectFilter("is_default_config", "Default config"),
      buildBoolSelectFilter("is_active", "Active"),
    ];

    const warrantyAndAuditDates: FilterFieldConfig[] = [
      ...buildAuditFilterFields({
        dateMode: "daterange",
        CreatedAt: true,
        UpdatedAt: true,
        createdAtLabel: "Created at",
        updatedAtLabel: "Updated at",
      }),
      {
        key: "warranty_start_date",
        label: "Warranty Start Date",
        type: "daterange",
        startKey: "warranty_start_date_start",
        endKey: "warranty_start_date_end",
      },
      {
        key: "warranty_end_date",
        label: "Warranty End Date",
        type: "daterange",
        startKey: "warranty_end_date_start",
        endKey: "warranty_end_date_end",
      },

    ];

    if (!useGetAllDevices) {
      return [
        plantField,
        deviceTypeMulti,
        ...intervalAndHealthFields,
        ...boolFields,
        ...warrantyAndAuditDates,
        ...sortFields,
      ];
    }

    const adminFields: FilterFieldConfig[] = [];

    if (hasPermission(userPermissions, PERMISSIONS.TENANT.GET_ALL_NAMES)) {
      adminFields.push(
        buildAsyncMultiselectFilter("tenant_id", "Tenant", (search = "") => fetchTenantNames(search, 1, 50), { placeholder: "Search tenants…" }),
      );
    }

    return [
      ...adminFields,
      plantField,
      deviceTypeMulti,
      ...intervalAndHealthFields,
      ...boolFields,
      buildAsyncMultiselectFilter("health_tag_template_id", "Health template", (search = "") => fetchHealthTagTemplateNames(search, 1, 50), { placeholder: "Search health templates…" }),
      ...buildAuditFilterFields(
        {
          CreatedBy: true,
          UpdatedBy: true,
          updatedByLabel: "Updated by",
          createdByLabel: "Created by",
          userLoadOptions: (search = "") => fetchUserNames(search, 1, 50),
        }),


      ...warrantyAndAuditDates,
      ...sortFields,
    ];
  }, [useGetAllDevices, userPermissions]);

  // ── Actions column ─────────────────────────────────────────────────────────

  const actionsColumn: CommonColumnConfig = React.useMemo(() => getActionsColumn(deviceRowActionsCellRenderer),[]);
  

  // ── Query filters (API) ─────────────────────────────────────────────────────

  const queryFilters = useMemo(
    () => toDeviceListApiFilters(effectiveFilters, useGetAllDevices),
    [effectiveFilters, useGetAllDevices],
  );

  // ── Data queries ────────────────────────────────────────────────────────────

  const {
    data: deviceResponse,
    isLoading,
    isError,
    error,
  } = useGetDeviceListQuery({
    search,
    filters: queryFilters as DeviceListFilters,
    page,
    limit: pageSize,
    scope: deviceListScope,
    enabled: isDeviceListQueryEnabled,
  });

  // ── Load error (toast) ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isError) {
      const errorMessage = error
        ? getErrorMessage(error)
        : "Failed to load devices data. Please try again.";
      toast.error(errorMessage, { duration: 4000, position: "top-right" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // ── Table rows & grid revision ──────────────────────────────────────────────

  const tableData = React.useMemo(() => {
    return deviceResponse?.data?.data || [];
  }, [deviceResponse?.data?.data]);

  const permissionsRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((device: Device) => `${device.id}:${device.is_active ? "1" : "0"}`)
      .join("|");

    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const serverPagination = useMemo(() => {
    return deviceResponse?.data?.pagination;
  }, [deviceResponse?.data?.pagination]);

  const editingDeviceDetails = editingDeviceResponse?.data;

  // ── Toolbar ─────────────────────────────────────────────────────────────────

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.DEVICE.CREATE)),
    buildDeleteAction(async () => {
      if (selectedIds.length === 0) return;
      setConfirmTitle("Delete Devices");
      setConfirmMessage(
        "Are you sure you want to delete the selected devices? This action cannot be undone.",
      );
      setConfirmIds(selectedIds);
      setConfirmOpen(true);
    }, {
      disabled: selectedIds.length === 0,
      show: hasPermission(userPermissions, PERMISSIONS.DEVICE.DELETE),
    }),
    buildStatusAction({
      selectedIds,
      rows: tableData,
      entityLabel: "device",
      isLoading: toggleStatusMutation.isPending,
      show: hasPermission(userPermissions, PERMISSIONS.DEVICE.UPDATE),
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
            placeholder="Search devices..."
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
            entityLabel="Device"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={deviceGridContext}
            gridContextRevision={permissionsRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.DEVICE.UPDATE))
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
            getRowId={(row: Device) => row.id}
            columnSelectorTitle="Device Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: useGetAllDevices && canShowDeviceActionsColumn ? actionsColumn : undefined,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(DEVICE_FILTER_DEFAULTS);
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
        title="Create Device"
        subtitle="Add a new device to the system"
        icon={navIcons.devices}
        maxWidth="max-w-3xl"
      >
        <DeviceForm mode="create" onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={!!(showEdit && editingDevice)}
        onClose={() => {
          setShowEdit(false);
          setEditingDevice(null);
        }}
        title="Edit Device"
        subtitle={editingDevice?.device_name || "Update device details"}
        icon={navIcons.devices}
        maxWidth="max-w-3xl"
      >
        {showEdit && isLoadingEditingDevice && !editingDeviceDetails ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={3} />
          </div>
        ) : editingDevice && (
          <DeviceForm
            mode="edit"
            initialValues={editingDevice}
            editValues={editingDeviceDetails?.device}
            onSuccess={() => {
              setShowEdit(false);
              setEditingDevice(null);
            }}
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
          try {
            await deleteMutation.mutateAsync(confirmIds);
            setConfirmOpen(false);
            setConfirmIds([]);
            setSelectedIds([]);
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

export default Devices;
