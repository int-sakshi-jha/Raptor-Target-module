/**
 * Inverter types module — list / CRUD for inverter type catalog (CommonToolbar + CommonDataView).
 */
import React, { useState, useEffect } from "react";
import { type CommonColumnConfig } from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
} from "../components/core/table/CommonToolbar";
import { navIcons } from "@/components/core/navbar/navItems";
import { Link } from "react-router-dom";
import {
  useGetInverterListQuery,
  type Inverter,
  type InverterListFilters,
  useDeleteInverterMutation,
  useToggleInverterStatusMutation,
  useUpdateInverterMutation,
} from "@/services/operations/inverterTypeAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import { Table as TableIcon, LayoutGrid } from "lucide-react";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  PERMISSIONS,
  hasPermission,
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
} from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";
import { type CommonTableHandle } from "@/components/core/table/CommonTable";
import Modal from "@/components/common/Modal";
import CreateInverterTypeForm from "@/components/core/form/InverterTypeForm";
import {
  arrayCellRenderer,
  unitCellRenderer,
} from "@/utils/agGridCellRenderers";
import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import { COUNTRIES } from "@/utils/countries";
import type {
  ICellRendererParams,
  
} from "@ag-grid-community/core";
import {
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getRendererColumn,
  getCapitalizedDisplayTextColumn,
  getTextColumn,
  getLinkedUserNameAuditColumn,
  getActionsColumn,
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
  buildStatusAction,
} from "@/components/core/table/CommonToolbar";

const BASE_ENTITY_KEY = "inverter";
const {
  buildAsyncMultiselectFilter,
  buildAuditFilterFields,
  buildBoolSelectFilter,
  buildNumberFilter,
  buildSelectFilter,
  buildSortFilterFields,
  buildTextFilter,
  createFilterDefaults,
  setBooleanFilterParam,
  setMultiSelectFilterParam,
  setScalarFilterParam,
} = CommonFilterPanel;

/**
 * Default filter keys align with `inverterTypeFieldConfigs` (`filterable` / `internalName`).
 * Extra query params are ignored by the API until supported server-side.
 */
const INVERTER_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "brand",
    "model",
    "country_of_origin",
    "capacity_kw",
    "max_ac_power_kw",
    "max_dc_power_kw",
    "mppt_voltage_range_max",
    "phase_type",
    "has_wifi",
    "has_ethernet",
    "has_rs485",
    "has_display",
    "alarm_tag_template_id",
    "is_active",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
});

/**
 * Sort fields where `sortable: true` in inverter type field config (UUID/id fields excluded).
 */
const INVERTER_LIST_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "created_at", label: "Created at" },
  { value: "updated_at", label: "Updated at" },
  { value: "brand", label: "Brand" },
  { value: "model", label: "Model" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "capacity_kw", label: "Capacity (kW)" },
  { value: "max_ac_power_kw", label: "Max AC power (kW)" },
  { value: "max_dc_power_kw", label: "Max DC power (kW)" },
  { value: "nominal_power_kw", label: "Nominal power (kW)" },
  { value: "mppt_count", label: "MPPT count" },
  { value: "strings_per_mppt", label: "Strings per MPPT" },
  { value: "max_string_count", label: "Max strings" },
  { value: "max_dc_voltage", label: "Max DC voltage" },
  { value: "min_dc_voltage", label: "Min DC voltage" },
  { value: "mppt_voltage_range_min", label: "MPPT voltage min" },
  { value: "mppt_voltage_range_max", label: "MPPT voltage max" },
  { value: "max_dc_current_per_mppt", label: "Max DC current / MPPT" },
  { value: "max_short_circuit_current", label: "Max short-circuit current" },
  { value: "ac_voltage_nominal", label: "AC voltage nominal" },
  { value: "ac_voltage_range_min", label: "AC voltage min" },
  { value: "ac_voltage_range_max", label: "AC voltage max" },
  { value: "ac_frequency_nominal", label: "AC frequency nominal" },
  { value: "ac_frequency_range_min", label: "AC frequency min" },
  { value: "ac_frequency_range_max", label: "AC frequency max" },
  { value: "max_ac_current", label: "Max AC current" },
  { value: "power_factor_range_min", label: "Power factor min" },
  { value: "power_factor_range_max", label: "Power factor max" },
  { value: "phase_type", label: "Phase type" },
  { value: "phase_count", label: "Phase count" },
  { value: "weight_kg", label: "Weight (kg)" },
  { value: "protection_rating", label: "Protection rating" },
  { value: "operating_temp_min", label: "Operating temp min" },
  { value: "has_wifi", label: "WiFi" },
  { value: "warranty_years", label: "Warranty (years)" },
  { value: "list_price", label: "List price" },
  { value: "is_active", label: "Active" },
];

/** Maps filter panel state → list API query params (`internalName` keys). */
function toInverterTypeListApiFilters(
  filters: FilterValues,
  showAuditUserFilters: boolean,
): InverterListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";
  const base: Record<string, string | string[] | boolean> = {
    sort_by,
    sort_order,
  };

  setMultiSelectFilterParam(base, filters, "alarm_tag_template_id");
  if (showAuditUserFilters) {
    setMultiSelectFilterParam(base, filters, "created_by");
    setMultiSelectFilterParam(base, filters, "updated_by");
  }

  for (const key of [
    "is_active",
    "has_wifi",
    "has_ethernet",
    "has_rs485",
    "has_display",
  ] as const) {
    setBooleanFilterParam(base, filters, key);
  }

  for (const key of [
    "phase_type",
    "country_of_origin",
    "brand",
    "model",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  for (const key of [
    "capacity_kw",
    "max_ac_power_kw",
    "max_dc_power_kw",
    "mppt_voltage_range_max",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  for (const key of [
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ] as const) {
    setScalarFilterParam(base, filters, key);
  }

  return base;
}

const inverterBaseFilterFields: FilterFieldConfig[] = [
  buildSelectFilter("country_of_origin", "Country of origin", [
    { value: "", label: "All" },
    ...COUNTRIES.map((country) => ({ value: country.value, label: country.label })),
  ]),
  buildTextFilter("brand", "Brand"),
  buildTextFilter("model", "Model"),
  buildNumberFilter("capacity_kw", "Capacity (kW)"),
  buildNumberFilter("max_ac_power_kw", "Max AC power (kW)"),
  buildNumberFilter("max_dc_power_kw", "Max DC power (kW)"),
  buildNumberFilter("mppt_voltage_range_max", "MPPT voltage max"),
  buildSelectFilter("phase_type", "Phase type", [
    { value: "", label: "All" },
    { value: "single_phase", label: "Single phase" },
    { value: "three_phase", label: "Three phase" },
  ]),
  buildBoolSelectFilter("has_wifi", "WiFi"),
  buildBoolSelectFilter("has_ethernet", "Ethernet"),
  buildBoolSelectFilter("has_rs485", "RS485"),
  buildBoolSelectFilter("has_display", "Display"),
  buildAsyncMultiselectFilter("alarm_tag_template_id", "Alarm tag template", (search = "") => fetchTagTemplateNames(search, 1, 50), { placeholder: "Search alarm templates…" }),
  buildBoolSelectFilter("is_active", "Active"),
];

// ─── Row actions cell renderer ────────────────────────────────────────────────

const inverterRowActionsCellRenderer = createCrudRowActionsCellRenderer<Inverter>({
  actions: [
    buildToggleStatusRowAction("inverterGrid_toggleStatus", PERMISSIONS.INVERTER_TYPE.UPDATE),
    buildEditRowAction("inverterGrid_openEdit", PERMISSIONS.INVERTER_TYPE.UPDATE),
    buildDeleteRowAction("inverterGrid_requestDelete", PERMISSIONS.INVERTER_TYPE.DELETE),
  ],
});

// ─── Default column definitions ───────────────────────────────────────────────

const defaultColumns: CommonColumnConfig[] = [
  getRendererColumn("brand", "Brand", (params: ICellRendererParams<Inverter, string>) => !params.value ? "-" : params.data?.id ? <Link to={`/inverter-type/${params.data.id}`} className="text-brand-700 dark:text-brand-400 hover:underline font-medium">{params.value}</Link> : <span className="font-medium">{params.value}</span>, { minWidth: 120, pinned: "left", editable: true }),
  getTextColumn("model", "Model", { minWidth: 180, editable: true }),
  getTextColumn("model_number", "Model Number", { minWidth: 160, editable: true }),
  getTextColumn("manufacturer", "Manufacturer", { minWidth: 200, editable: true }),
  getTextColumn("country_of_origin", "Country of Origin", { minWidth: 180, editable: true }),
  getRendererColumn("capacity_kw", "Capacity (kW)", unitCellRenderer("kW"), { minWidth: 150, editable: true }),
  getRendererColumn("max_ac_power_kw", "Max AC Power (kW)", unitCellRenderer("kW"), { minWidth: 180, editable: true }),
  getRendererColumn("max_dc_power_kw", "Max DC Power (kW)", unitCellRenderer("kW"), { minWidth: 180, editable: true }),
  getRendererColumn("nominal_power_kw", "Nominal Power (kW)", unitCellRenderer("kW"), { minWidth: 180, editable: true }),
  getTextColumn("mppt_count", "MPPT Count", { minWidth: 180, editable: true }),
  getTextColumn("strings_per_mppt", "Strings / MPPT", { minWidth: 180, editable: true }),
  getTextColumn("max_string_count", "Max Strings", { minWidth: 180, editable: true }),
  getRendererColumn("max_dc_voltage", "Max DC Voltage (V)", unitCellRenderer("V"), { minWidth: 180, editable: true }),
  getRendererColumn("min_dc_voltage", "Min DC Voltage (V)", unitCellRenderer("V"), { minWidth: 180, editable: true }),
  getRendererColumn("mppt_voltage_range_min", "MPPT Voltage Min (V)", unitCellRenderer("V"), { minWidth: 190, editable: true }),
  getRendererColumn("mppt_voltage_range_max", "MPPT Voltage Max (V)", unitCellRenderer("V"), { minWidth: 190, editable: true }),
  getRendererColumn("max_dc_current_per_mppt", "Max DC Current / MPPT (A)", unitCellRenderer("A"), { minWidth: 210, editable: true }),
  getRendererColumn("max_short_circuit_current", "Max Short Circuit Current (A)", unitCellRenderer("A"), { minWidth: 230, editable: true }),
  getRendererColumn("ac_voltage_nominal", "AC Voltage Nominal (V)", unitCellRenderer("V"), { minWidth: 190, editable: true }),
  getRendererColumn("ac_voltage_range_min", "AC Voltage Min (V)", unitCellRenderer("V"), { minWidth: 170, editable: true }),
  getRendererColumn("ac_voltage_range_max", "AC Voltage Max (V)", unitCellRenderer("V"), { minWidth: 170, editable: true }),
  getRendererColumn("ac_frequency_nominal", "AC Frequency Nominal (Hz)", unitCellRenderer("Hz"), { minWidth: 210, editable: true }),
  getRendererColumn("ac_frequency_range_min", "AC Frequency Min (Hz)", unitCellRenderer("Hz"), { minWidth: 190, editable: true }),
  getRendererColumn("ac_frequency_range_max", "AC Frequency Max (Hz)", unitCellRenderer("Hz"), { minWidth: 190, editable: true }),
  getRendererColumn("max_ac_current", "Max AC Current (A)", unitCellRenderer("A"), { minWidth: 170, editable: true }),
  getTextColumn("power_factor_range_min", "Power Factor Min", { minWidth: 160, editable: true }),
  getTextColumn("power_factor_range_max", "Power Factor Max", { minWidth: 160, editable: true }),
  getCapitalizedDisplayTextColumn("phase_type", "Phase Type", { minWidth: 130, editable: false }),
  getTextColumn("phase_count", "Phase Count", { minWidth: 120, editable: true }),
  getRendererColumn("weight_kg", "Weight (kg)", unitCellRenderer("kg"), { minWidth: 130, editable: true }),
  getTextColumn("cooling_method", "Cooling Method", { minWidth: 160, editable: false }),
  getTextColumn("protection_rating", "Protection Rating", { minWidth: 180, editable: true }),
  getRendererColumn("noise_level_db", "Noise Level (dB)", unitCellRenderer("dB"), { minWidth: 180, editable: true }),
  getRendererColumn("operating_temp_min", "Operating Temp Min (°C)", unitCellRenderer("°C"), { minWidth: 200, editable: true }),
  getRendererColumn("operating_temp_max", "Operating Temp Max (°C)", unitCellRenderer("°C"), { minWidth: 200, editable: true }),
  getBooleanColumn("has_wifi", "WiFi", { minWidth: 100, editable: true }),
  getBooleanColumn("has_ethernet", "Ethernet", { minWidth: 110, editable: true }),
  getBooleanColumn("has_rs485", "RS485", { minWidth: 100, editable: true }),
  getBooleanColumn("has_display", "Display", { minWidth: 100, editable: true }),
  {
    field: "alarm_tag_template_name",
    headerName: "Alarm Tag Template",
    visible: true,
    minWidth: 200,
    filter: "agTextColumnFilter",
    cellRenderer: (params: ICellRendererParams<Inverter, string>) => {
      const id = params.data?.alarm_tag_template_id as string | undefined;
      const name = params.data?.alarm_tag_template_name as string | undefined;
      const label =
        typeof name === "string" && name.trim() ? name.trim() : null;
      if (!id && !label) return "-";
      if (id) {
        return (
          <Link
            to={`/tag-templates/${id}`}
            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
            onClick={(e) => e.stopPropagation()}
          >
            {label ?? "View template"}
          </Link>
        );
      }
      return label ?? "-";
    },
  },
  {
    field: "protocols_supported",
    headerName: "Protocols Supported",
    visible: false,
    minWidth: 200,
    cellRenderer: arrayCellRenderer,
  },
  {
    field: "warranty_years",
    headerName: "Warranty (Years)",
    visible: false,
    minWidth: 150,
    editable: true,
    cellRenderer: (p: ICellRendererParams<Inverter, number>) =>
      p.value != null ? `${p.value} yrs` : "-",
  },
  {
    field: "datasheet_url",
    headerName: "Datasheet",
    visible: false,
    minWidth: 120,
    editable: true,
    cellRenderer: (p: ICellRendererParams<Inverter, string>) =>
      p.value ? (
        <a
          href={p.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View PDF
        </a>
      ) : (
        "-"
      ),
  },
  {
    field: "list_price",
    headerName: "List Price",
    visible: false,
    minWidth: 130,
    editable: true,
    cellRenderer: (p: ICellRendererParams<Inverter, number>) =>
      p.value != null ? `${p.value}` : "-",
  },
  getActiveStatusColumn("is_active", "Active", { minWidth: 100, fallbackValue: true }),
  getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 170 }),
  getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 170 }),
  getDateColumn("created_at", "Created At"),
  getDateColumn("updated_at", "Updated At"),
];

// ─── Page component ───────────────────────────────────────────────────────────

export const InverterType = () => {
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const showAuditUserFilters = !isTenantOrUserRole(userRole);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(INVERTER_FILTER_DEFAULTS);

  const filterFields: FilterFieldConfig[] = React.useMemo(
    () => [
      ...inverterBaseFilterFields,
      ...buildAuditFilterFields({
        CreatedBy: showAuditUserFilters,
        UpdatedBy: showAuditUserFilters,
        CreatedAt: true,
        UpdatedAt: true,
        createdByLabel: "Created By",
        updatedByLabel: "Updated By",
        createdAtLabel: "Created At",
        updatedAtLabel: "Updated At",
        dateMode: "daterange",
        userLoadOptions: (search = "") => fetchUserNames(search, 1, 50),
      }),
      ...buildSortFilterFields({
        sortOptions: INVERTER_LIST_SORT_OPTIONS,
        sortByLabel: "Sort By",
        sortOrderLabel: "Sort Order",
      }),
    ],
    [showAuditUserFilters],
  );

  const queryFilters = React.useMemo(
    () => toInverterTypeListApiFilters(filters, showAuditUserFilters),
    [filters, showAuditUserFilters],
  );
  const resolvedDefaultColumns = React.useMemo(
    () =>
      showAuditUserFilters
        ? defaultColumns
        : defaultColumns.filter(
            (column) =>
              column.field !== "created_by" && column.field !== "updated_by",
          ),
    [showAuditUserFilters],
  );
  const isAdmin = isAdminOrSuperAdminRole(userRole);
  const entityKey = isAdmin ? `${BASE_ENTITY_KEY}-admin` : `${BASE_ENTITY_KEY}-basic`;

  const [selectedView, setSelectedView] = useResponsiveDataView();

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingInverter, setEditingInverter] = useState<Inverter | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Delete Inverter");
  const [confirmMessage, setConfirmMessage] = useState(
    "Are you sure you want to delete this inverter? This action cannot be undone.",
  );
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const deleteMutation = useDeleteInverterMutation();
  const toggleStatusMutation = useToggleInverterStatusMutation();
  const updateMutation = useUpdateInverterMutation();

  const tableRef = React.useRef<CommonTableHandle>(null);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  // ── actionsColumn defined inside component so it can access state ──────────
  const actionsColumn: CommonColumnConfig = React.useMemo(() => getActionsColumn(inverterRowActionsCellRenderer),[],);
  const canShowInverterActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.DELETE);


  const gridContext = React.useMemo(
    () => ({
      userPermissions,
      inverterGrid_toggleStatus: (data: Inverter) => {
        if (!data?.id) return;
        toggleStatusMutation.mutate({ id: data.id, is_active: !data.is_active });
      },
      inverterGrid_openEdit: (row: Inverter) => {
        setEditingInverter(row);
        setShowEdit(true);
      },
      inverterGrid_requestDelete: (id: string) => {
        if (!id) return;
        setConfirmTitle("Delete Inverter");
        setConfirmMessage(
          "Are you sure you want to delete this inverter? This action cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  // GET ALL
  const {
    data: inverterResponse,
    isLoading,
    isError,
    error,
  } = useGetInverterListQuery({ page, limit: pageSize, search, filters: queryFilters });

  useEffect(() => {
    if (isError) {
      toast.error(
        error ? getErrorMessage(error) : "Failed to load inverter data.",
        {
          duration: 4000,
          position: "top-right",
        },
      );
    }
  }, [error, isError]);

  const tableData = React.useMemo(
    () => inverterResponse?.data?.data ?? [],
    [inverterResponse],
  );

  // Load columns from localStorage on mount
  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.CREATE)),
    buildDeleteAction(async () => {
      if (selectedIds.length === 0) return;
      setConfirmTitle("Delete Inverters");
      setConfirmMessage(
        "Are you sure you want to delete the selected inverters? This action cannot be undone.",
      );
      setConfirmIds(selectedIds);
      setConfirmOpen(true);
    }, { 
      disabled: selectedIds.length === 0, 
      show: hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.DELETE) 
    }),
    buildStatusAction({
      selectedIds,
      rows: tableData,
      entityLabel: "inverter",
      isLoading: toggleStatusMutation.isPending,
      show: hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.UPDATE),
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

  const gridContextRevision = React.useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((inverter: Inverter) => `${inverter.id}:${inverter.is_active ? "1" : "0"}`)
      .join("|");

    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const pagination = React.useMemo(
    () =>
      inverterResponse?.data?.pagination ?? {
        page: 1,
        limit: pageSize,
        totalCount: 0,
        totalPages: 1,
      },
    [inverterResponse, pageSize],
  );

  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search inverter by brand, model, manufacturer..."
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
            entityLabel="Inverter"
            columns={localColumns}
            defaultColumns={resolvedDefaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={gridContext}
            gridContextRevision={gridContextRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.UPDATE)) return;
              if (!id || !field) return;
              if (value === oldValue) return;
              updateMutation.mutate(
                { 
                  id, [field]: value 
                }
              );
            }}
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.totalCount}
            totalPages={pagination.totalPages}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: Inverter) => row.id}
            columnSelectorTitle="Inverter Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: canShowInverterActionsColumn ? actionsColumn : undefined,
              excludedFields: ["id"],
              clearWidthStateOnReset: true,
              logSavedColumnsParseError: true,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(INVERTER_FILTER_DEFAULTS);
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
        title="Create Inverter Type"
        subtitle="Add a new inverter type"
        maxWidth="max-w-3xl"
        icon={navIcons.inverterTypes}
      >
        <CreateInverterTypeForm
          mode="create"
          onSuccess={() => setShowCreate(false)}

        />
      </Modal>

      <Modal
        open={!!(showEdit && editingInverter)}
        onClose={() => { setShowEdit(false); setEditingInverter(null); }}
        title="Edit Inverter Type"
        subtitle={editingInverter?.brand || editingInverter?.model || "Update inverter type details"}
        maxWidth="max-w-3xl"
        icon={navIcons.inverterTypes}
      >
        {editingInverter && (
          <CreateInverterTypeForm
            mode="edit"
            initialValues={editingInverter}
            onSuccess={() => { setShowEdit(false); setEditingInverter(null); }}
          />
        )}
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={async () => {
          if (confirmIds.length === 0) return;
          deleteMutation.mutate(confirmIds, {
            onSettled: () => {
              setConfirmOpen(false);
              setConfirmIds([]);
              setSelectedIds([]);
            },
          });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
