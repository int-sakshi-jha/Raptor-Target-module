
import React, { useEffect, useMemo, useState } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
  buildAddAction,
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import {
  fetchPlantCategoryOptions,
  fetchPlantTypeOptions,
  fetchRevenueOptions,
  useDeletePlantMutation,
  useGetAllPlantsQuery,
  useGetMyPlantsQuery,
  useTogglePlantStatusMutation,
  useUpdatePlantMutation,
  type PlantRow,
  type PlantsListFilters,
} from "@/services/operations/plantAPI";
import {
  PLANT_LIST_SORT_OPTIONS,
  PLANT_STATE_FILTER_OPTIONS,
} from "@/utils/selectOptions";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import Modal from "@/components/common/Modal";
import {
  getDisplayNumberColumn,
  getDisplayTextColumn,
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getCapitalizedDisplayTextColumn,
  getLinkColumn,
  getLinkedUserNameAuditColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import PlantForm from "@/components/core/form/PlantForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  PERMISSIONS,
  canGetAllPlants,
  canGetMyPlants,
  canOpenOwnerProfileByRole,
  canPlantAdminLifecycleAction,
  hasPermission,
  isAdminOrSuperAdminRole,
} from "@/utils/permissions";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import PlantCard from "@/components/core/customcards/PlantCard";


const BASE_ENTITY_KEY = "plant";
const {
  buildAuditFilterFields,
  buildDateRangeFilterField,
  buildSortFilterFields,
  buildSelectFilter,
  buildNumberFilter,
  buildTextFilter,
  buildBoolSelectFilter,
  buildAsyncMultiselectFilter,
  buildAsyncSelectFilter,
  createFilterDefaults,
  setBooleanFilterParam,
  setMultiSelectFilterParam,
  setScalarFilterParam,
  setSingleSelectFilterParam,
} = CommonFilterPanel;

/** Default filter shape: keys match `internalName` where `filterable: true` in `platform/src/valid-fields/plant.ts`. */
const PLANTS_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "tenant_id",
    "plant_type",
    "plant_category",
    "is_forecast",
    "dc_capacity_kw",
    "ac_capacity_kw",
    "sanctioned_load_kw",
    "connected_load_kw",
    "discom_name",
    "state",
    "net_metering",
    "commissioning_date",
    "cod_date",
    "ppa_rate",
    "revenue_type",
    "is_active",
    "communication_status",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
});

/**
 * Maps filter panel values to query params using the same keys as `internalName` in
 * `platform/src/valid-fields/plant.ts` (`filterable: true`). Extra params are ignored by the API until the
 * backend implements them; `plantAPI` forwards all non-empty values.
 *
 * `tenant_id` is only meaningful for `GET /v1/plants` (all plants).
 */
function toPlantsListApiFilters(
  filters: FilterValues,
  listMode: "all" | "my",
): PlantsListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, string | string[] | boolean> = {
    sort_by,
    sort_order,
  };

  if (listMode === "all") {
    setMultiSelectFilterParam(base, filters, "tenant_id");
    setMultiSelectFilterParam(base, filters, "created_by");
    setMultiSelectFilterParam(base, filters, "updated_by");
    setBooleanFilterParam(base, filters, "is_forecast");
    setBooleanFilterParam(base, filters, "is_active");
  }

  setBooleanFilterParam(base, filters, "net_metering");

  for (const key of [
    "plant_type",
    "plant_category",
    "discom_name",
    "state",
    "communication_status",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  for (const key of [
    "dc_capacity_kw",
    "ac_capacity_kw",
    "sanctioned_load_kw",
    "connected_load_kw",
    "ppa_rate",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  setSingleSelectFilterParam(base, filters, "revenue_type");

  for (const key of [
    "commissioning_date_start",
    "commissioning_date_end",
    "cod_date_start",
    "cod_date_end",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  return base as PlantsListFilters;
}

// ─── Row actions cell renderer ────────────────────────────────────────────────

const plantRowActionsCellRenderer = createCrudRowActionsCellRenderer<PlantRow>({
  actions: [
    buildToggleStatusRowAction("plantGrid_toggleStatus", PERMISSIONS.PLANT.UPDATE, { show: ({ context, userPermissions }: { context: Record<string, unknown>; userPermissions?: string[] }) => canPlantAdminLifecycleAction(context.userRole as string | undefined, userPermissions, PERMISSIONS.PLANT.UPDATE) }),
    buildEditRowAction("plantGrid_openEdit", PERMISSIONS.PLANT.UPDATE),
    buildDeleteRowAction("plantGrid_requestDelete", PERMISSIONS.PLANT.DELETE, { show: ({ context, userPermissions }: { context: Record<string, unknown>; userPermissions?: string[] }) => canPlantAdminLifecycleAction(context.userRole as string | undefined, userPermissions, PERMISSIONS.PLANT.DELETE) }),
  ],
});

// ─── Page component ───────────────────────────────────────────────────────────

const Plants = () => {

  const queryClient = useQueryClient();

  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = isAdminOrSuperAdminRole(userRole);
  const useGetAll = canGetAllPlants(userPermissions);
  const useGetMy = !useGetAll && canGetMyPlants(userPermissions);
  const canShowPlantActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.PLANT.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.PLANT.DELETE);

  const [search, setSearch] = useState("");
  const [, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRow | null>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const entityKey = useGetAll ? `${BASE_ENTITY_KEY}-all` : `${BASE_ENTITY_KEY}-my`;

  // ── Filter fields ──────────────────────────────────────────────────────────

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortFields = buildSortFilterFields({
      sortOptions: PLANT_LIST_SORT_OPTIONS,
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    // Filters supported by both get-all-plants and get-my-plants
    const commonFilters: FilterFieldConfig[] = [
      buildAsyncSelectFilter("plant_type", "Plant type", fetchPlantTypeOptions, { placeholder: "Search plant type…" }),
      buildAsyncSelectFilter("plant_category", "Plant category", fetchPlantCategoryOptions, { placeholder: "Search plant category…" }),
      buildNumberFilter("dc_capacity_kw", "DC capacity (kW)"),
      buildNumberFilter("ac_capacity_kw", "AC capacity (kW)"),
      buildNumberFilter("sanctioned_load_kw", "Sanctioned load (kW)"),
      buildNumberFilter("connected_load_kw", "Connected load (kW)"),
      buildTextFilter("discom_name", "Discom name"),
      buildSelectFilter("state", "State", PLANT_STATE_FILTER_OPTIONS),
      buildBoolSelectFilter("net_metering", "Net metering"),
      buildNumberFilter("ppa_rate", "PPA rate"),
      buildAsyncSelectFilter("revenue_type", "Revenue type", (search = "") => fetchRevenueOptions(search), { placeholder: "Search revenue type…" }),
      buildDateRangeFilterField({ key: "commissioning_date", label: "Commissioning date", startKey: "commissioning_date_start", endKey: "commissioning_date_end" }),
      buildDateRangeFilterField({ key: "cod_date", label: "COD date", startKey: "cod_date_start", endKey: "cod_date_end" }),
    ];

    // Extra filters only available to superadmin/admin (get-all-plants)
    if (isAdmin) {
      return [
        buildAsyncMultiselectFilter("tenant_id", "Tenant", (search = "") => fetchTenantNames(search, 1, 50), { placeholder: "Search tenants…" }),
        buildBoolSelectFilter("is_forecast", "Forecast"),
        buildBoolSelectFilter("is_active", "Active status"),
        ...commonFilters,
        ...buildAuditFilterFields({
          CreatedBy: true,
          UpdatedBy: true,
          CreatedAt: true,
          UpdatedAt: true,
          dateMode: "daterange",
          createdByLabel: "Created by",
          updatedByLabel: "Updated by",
          createdAtLabel: "Created at",
          updatedAtLabel: "Updated at",
          userLoadOptions: (s = "") => fetchUserNames(s, 1, 50),
        }),
        ...sortFields,
      ];
    }

    return [
      ...commonFilters,
      ...buildAuditFilterFields({
        CreatedAt: true,
        UpdatedAt: true,
        dateMode: "daterange",
        createdAtLabel: "Created at",
        updatedAtLabel: "Updated at",
      }),
      ...sortFields,
    ];
  }, [isAdmin]);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...PLANTS_FILTER_DEFAULTS,
  }));

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);

  const deleteMutation = useDeletePlantMutation();
  const toggleStatusMutation = useTogglePlantStatusMutation();
  const updateMutation = useUpdatePlantMutation();
  const tableRef = React.useRef<CommonTableHandle>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];
  const canOpenOwnerProfile = canOpenOwnerProfileByRole(userRole);

  // ── Column definitions ─────────────────────────────────────────────────────
  const defaultColumns: CommonColumnConfig[] = useMemo(
    () => [
      getLinkColumn("plant_name", "Plant Name", (params) => (params.data?.id ? `/plants/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
      getCapitalizedDisplayTextColumn("plant_type", "Plant Type", { minWidth: 130, editable: false }),
      ...(isAdmin
        ? [
          getLinkColumn(
            "tenant_name",
            "Tenant",
            (params) =>
              params.data?.tenant_id
                ? `/tenant/${params.data.tenant_id}`
                : null,
            {
              minWidth: 200,
              valueGetter: (params) =>
                params.data?.tenant_name ||
                params.data?.tenant_id ||
                "",
            }
          ),
        ]
        : []),
      getCapitalizedDisplayTextColumn("plant_category", "Category", { minWidth: 130, editable: false }),
      getCapitalizedDisplayTextColumn("grid_type", "Grid Type", { minWidth: 130, editable: false }),
      getLinkColumn("owner", "Owner", (params) => (canOpenOwnerProfile && params.data?.owner?.id ? `/users/${params.data.owner.id}/profile` : null), { minWidth: 180, valueGetter: (params) => params.data?.owner?.name || params.data?.username || "" }),
      getDisplayTextColumn("contact_person_name", "Contact Person", { minWidth: 180, editable: true }),
      getDisplayTextColumn("contact_person_email", "Contact Email", { minWidth: 220, editable: true }),
      getDisplayNumberColumn("dc_capacity_kw", "DC Capacity (kW)", { minWidth: 150 }),
      getDisplayNumberColumn("ac_capacity_kw", "AC Capacity (kW)", { minWidth: 150 }),
      getDisplayNumberColumn("sanctioned_load_kw", "Sanctioned Load (kW)", { minWidth: 170 }),
      getDisplayNumberColumn("connected_load_kw", "Connected Load (kW)", { minWidth: 170 }),
      getDisplayNumberColumn("grid_voltage_kv", "Grid Voltage (kV)", { minWidth: 160 }),
      getDisplayTextColumn("connection_point", "Connection Point", { minWidth: 170, editable: true }),
      getDisplayNumberColumn("transformer_capacity_kva", "Transformer (kVA)", { minWidth: 170 }),
      getDisplayTextColumn("location_name", "Location", { minWidth: 180, editable: true }),
      getDisplayTextColumn("city", "City", { minWidth: 120, editable: true }),
      getDisplayTextColumn("state", "State", { minWidth: 120, editable: true }),
      getDisplayTextColumn("district", "District", { minWidth: 130, editable: true }),
      getDisplayTextColumn("country", "Country", { minWidth: 110, editable: true }),
      getDisplayNumberColumn("latitude", "Latitude", { minWidth: 130 }),
      getDisplayNumberColumn("longitude", "Longitude", { minWidth: 130 }),
      getDisplayTextColumn("discom_name", "Discom", { minWidth: 150, editable: true }),
      getDateColumn("commissioning_date", "Commissioned Date", { minWidth: 160, dateOnly: true }),
      getDateColumn("cod_date", "COD Date", { minWidth: 150, dateOnly: true }),
      getDisplayNumberColumn("ppa_rate", "PPA Rate", { minWidth: 110 }),
      getCapitalizedDisplayTextColumn("revenue_type", "Revenue Type", { minWidth: 140 }),
      getDisplayTextColumn("meter_number", "Meter No.", { minWidth: 140 }),
      getDisplayTextColumn("contact_person_phone", "Contact Phone", { minWidth: 160, editable: true }),
      getDisplayTextColumn("contact_person_designation", "Designation", { minWidth: 180, editable: true }),
      getBooleanColumn("is_forecast", "Forecast", { visible: false, minWidth: 100 }),
      getBooleanColumn("net_metering", "Net Metering", { visible: false, minWidth: 120 }),
      getBooleanColumn("is_commissioned", "Comm. Status", { minWidth: 140 }),
      getActiveStatusColumn("is_active", "Active", { minWidth: 100 }),
      ...(isAdmin ?
        [getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 180 })] : []),
      ...(isAdmin ?
        [getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 180 })] : []),
      getDateColumn("created_at", "Created At"),
      ...(isAdmin ?
        [getDateColumn("updated_at", "Updated At")] : []),
    ],
    [canOpenOwnerProfile, isAdmin],
  );

  // ── Actions column ─────────────────────────────────────────────────────────

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(plantRowActionsCellRenderer),[],);

  const gridContext = useMemo(
    () => ({
      userPermissions,
      userRole,
      plantGrid_toggleStatus: (row: PlantRow) => {
        if (!row?.id) return;
        toggleStatusMutation.mutate(
          { id: row.id },
          {
            onSuccess: () =>
              queryClient.invalidateQueries({
                queryKey: ["plants", "list"],
              }),
          },
        );
      },
      plantGrid_openEdit: (row: PlantRow) => {
        setEditingPlant(row);
        setShowEdit(true);
      },
      plantGrid_requestDelete: (id: string) => {
        if (!id) return;
        setConfirmTitle("Delete Plant");
        setConfirmMessage(
          "Are you sure you want to delete this plant? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [queryClient, toggleStatusMutation, userPermissions, userRole],
  );

  // ── Data queries ───────────────────────────────────────────────────────────

  const queryFilters = useMemo(
    () => toPlantsListApiFilters(filters, useGetAll ? "all" : "my"),
    [filters, useGetAll],
  );

  const {
    data: allPlantsResp,
    isLoading: isLoadingAll,
    isError: isErrorAll,
    error: errorAll,
  } = useGetAllPlantsQuery({
    search,
    filters: queryFilters,
    page,
    limit: pageSize,
    enabled: useGetAll,
  });

  const {
    data: myPlantsResp,
    isLoading: isLoadingMy,
    isError: isErrorMy,
    error: errorMy,
  } = useGetMyPlantsQuery({
    search,
    filters: queryFilters,
    page,
    limit: pageSize,
    enabled: useGetMy,
  });

  const isLoading = useGetAll ? isLoadingAll : isLoadingMy;
  const isError = useGetAll ? isErrorAll : isErrorMy;
  const error = useGetAll ? errorAll : errorMy;

  useEffect(() => {
    if (!isError) return;
    const msg = error
      ? getErrorMessage(error)
      : "Failed to load plants. Please try again.";
    toast.error(msg, { duration: 4000, position: "top-right" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const plantsResp = useGetAll ? allPlantsResp : myPlantsResp;
  const tableData: PlantRow[] = React.useMemo(
    () =>
      plantsResp?.data?.plants ||
      plantsResp?.data?.data ||
      [],
    [plantsResp],
  );
  const gridContextRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const roleKey = userRole ?? "";
    const statusKey = tableData
      .map((plant: PlantRow) => `${plant.id}:${plant.is_active ? "1" : "0"}`)
      .join("|");

    return `${permissionsKey}__${roleKey}__${statusKey}`;
  }, [tableData, userPermissions, userRole]);
  const serverPagination = useMemo(
    () => plantsResp?.data?.pagination,
    [plantsResp],
  );

  // ── Column state persistence ───────────────────────────────────────────────

  // ── Toolbar ────────────────────────────────────────────────────────────────

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.PLANT.CREATE)),
    buildFiltersAction(),
    buildColumnsAction(),
    buildExportAction(),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search plants…"
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
            entityLabel="Plant"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.PLANT.UPDATE))
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
            getRowId={(row: { id: string }) => row.id}
            columnSelectorTitle="Plant Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: useGetAll && canShowPlantActionsColumn ? actionsColumn : undefined,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            defaultFilters={PLANTS_FILTER_DEFAULTS}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters({ ...PLANTS_FILTER_DEFAULTS });
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
            onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
            gridContext={gridContext}
            gridContextRevision={gridContextRevision}
            customCardComponent={PlantCard}
          />
        </div>
      </main>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Plant"
        subtitle="Add a new solar plant to the system"
        icon={navIcons.plants}
        maxWidth="max-w-3xl"
      >
        <PlantForm
          mode="create"
          onSuccess={() => setShowCreate(false)}
          close={() => setShowCreate(false)}
          isOpen={showCreate}
        />
      </Modal>

      <Modal
        open={!!(showEdit && editingPlant)}
        onClose={() => {
          setShowEdit(false);
          setEditingPlant(null);
        }}
        title="Edit Plant"
        subtitle={
          editingPlant?.plant_name ||
          "Update plant details"
        }
        icon={navIcons.plants}
        maxWidth="max-w-3xl"
      >
        {editingPlant && (
          <PlantForm
            mode="edit"
            initialValues={editingPlant}
            onSuccess={() => {
              setShowEdit(false);
              setEditingPlant(null);
            }}
            close={() => {
              setShowEdit(false);
              setEditingPlant(null);
            }}
            isOpen={!!(showEdit && editingPlant)}
          />
        )}
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

export default Plants;
