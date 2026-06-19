
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit, LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";

import CommonToolbar, { type ToolbarActionConfig } from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  default as CommonFilterPanel,
} from "@/components/core/table/CommonFilterPanel";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import Modal from "@/components/common/Modal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Spinner from "@/components/common/Spinner";
import ColorBadge from "@/components/common/ColorBadge";
import type { CommonColumnConfig, CommonTableHandle } from "@/components/core/table/CommonTable";
import type { FilterFieldConfig, FilterValues } from "@/components/core/table/CommonFilterPanel";
import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import {
  getDisplayNumberColumn,
  getActiveStatusColumn,
  getBooleanColumn,
  getDisplayTextColumn,
  getDateColumn,
  getLinkColumn,
  getRendererColumn,
  getLinkedUserNameAuditColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";
import {
  buildAddAction,
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";

import ComponentForm from "@/components/core/form/ComponentForm";
import {
  isComponentDeleteChildrenConflict,
  useDeleteComponentMutation,
  useGetAllComponentQuery,
  useGetComponentDetailsQuery,
  useUpdateComponentMutation,
  fetchComponentNames,
  fetchComponentTypeOptions,
  type ComponentRow,
} from "@/services/operations/componentAPI";
import {
  COMPONENT_SORT_BY_OPTIONS,
  COMPONENT_SORT_ORDER_OPTIONS,
  COMPONENT_METER_TYPE_OPTIONS,
} from "@/utils/selectOptions";
import {
  formatComponentTypeLabel,
} from "@/utils/componentFormatters";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchInverterTypeNames } from "@/services/operations/inverterTypeAPI";
import { getErrorMessage } from "@/services/api";
import {
  PERMISSIONS,
  hasPermission,
  isAdminOrSuperAdminRole,
  usesScopedComponentListAccess,
} from "@/utils/permissions";
import type {
  ICellRendererParams,
} from "@ag-grid-community/core";


const BASE_ENTITY_KEY = "component";
const {
  buildActiveStatusFilter,
  buildAsyncMultiselectFilter,
  buildAsyncSelectFilter,
  buildNumberFilter,
  buildSelectFilter,
  parseMultiFilter,
  parseSingleFilter,
  setBooleanFilterParam,
  setScalarFilterParam,
} = CommonFilterPanel;

/** Default panel state — keys match `componentFieldConfigs` (`internalName`) for `filterable` fields. */
const COMPONENT_FILTER_DEFAULTS: FilterValues = {
  sort_by: "created_at",
  sort_order: "desc",
  tenant_id: "",
  plant_id: "",
  parent_id: "",
  component_type: "",
  device_id: "",
  inverter_type_id: "",
  tag_template_id: "",
  alarm_tag_template_id: "",
  vd_number: "",
  ac_capacity_kw: "",
  dc_capacity_kw: "",
  meter_type: "",
  is_bot_layer_process: "",
  is_active: "",
  created_by: "",
  updated_by: "",
  created_at_start: "",
  created_at_end: "",
  updated_at_start: "",
  updated_at_end: "",
};

/**
 * Scoped component lists omit tenant-based sort; align stored filters without an effect.
 */
function coerceComponentFiltersForScopedList(
  filters: FilterValues,
  usesScopedListAccess: boolean,
): FilterValues {
  if (usesScopedListAccess && filters.sort_by?.trim() === "tenant_id") {
    return { ...filters, sort_by: "component_name" };
  }
  return filters;
}

/**
 * Maps filter panel values to list API query params (`internalName`). Admin-only keys are omitted for scoped lists.
 */
function toComponentListApiFilters(
  filters: FilterValues,
  usesScopedListAccess: boolean,
): Record<string, unknown> {
  const f = coerceComponentFiltersForScopedList(filters, usesScopedListAccess);
  const sort_by = f.sort_by?.trim() || "created_by";
  const sort_order = f.sort_order?.trim() || "asc";
  const base: Record<string, unknown> = { sort_by, sort_order };

  const multiKeys = usesScopedListAccess
    ? (["plant_id"] as const)
    : (["tenant_id", "plant_id", "device_id", "created_by", "updated_by"] as const);

  for (const key of multiKeys) {
    const arr = parseMultiFilter(f[key]);
    if (arr.length > 0) base[key] = arr;
  }

  for (const key of (usesScopedListAccess
    ? ["component_type"] as const
    : ["component_type", "parent_id", "inverter_type_id", "tag_template_id", "alarm_tag_template_id"] as const)) {
    const id = parseSingleFilter(f[key]);
    if (id) base[key] = id;
  }

  setBooleanFilterParam(base, f, "is_active");
  setBooleanFilterParam(base, f, "is_bot_layer_process");

  for (const key of [
    "meter_type",
    "vd_number",
    "ac_capacity_kw",
    "dc_capacity_kw",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ] as const) {
    setScalarFilterParam(base, f, key);
  }

  return base;
}

/**
 * Row actions: reads `params.context` for handlers. Parent passes `gridContextRevision`
 * so cells refresh when permissions or row data relevant to actions change.
 */
const componentRowActionsCellRenderer = createCrudRowActionsCellRenderer<ComponentRow>({
  actions: [
    buildToggleStatusRowAction("componentGrid_toggleActive", PERMISSIONS.COMPONENT.UPDATE, { key: "toggleActive" }),
    buildEditRowAction("componentGrid_openEdit", PERMISSIONS.COMPONENT.UPDATE),
    buildDeleteRowAction("componentGrid_requestDelete", PERMISSIONS.COMPONENT.DELETE),
  ],
});

// ─── Page component ───────────────────────────────────────────────────────────

const Components: React.FC = () => {
  const { user, permissions: userPermissions } = useAppSelector((state) => state.auth);
  const usesScopedListAccess = usesScopedComponentListAccess(
    userPermissions,
    user?.role,
  );
  const isAdmin = isAdminOrSuperAdminRole(user?.role);
  const canShowComponentActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.COMPONENT.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.COMPONENT.DELETE);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const columnPanelRef = useRef<{ openPanel: () => void }>(null);
  const entityKey = isAdmin ? `${BASE_ENTITY_KEY}-all` : `${BASE_ENTITY_KEY}-scoped`;
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingRow, setEditingRow] = useState<ComponentRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [deleteNeedsSubtreeConfirm, setDeleteNeedsSubtreeConfirm] =
    useState(false);
  const [filters, setFilters] = useState<FilterValues>(COMPONENT_FILTER_DEFAULTS);

  const filtersForView = useMemo(
    () => coerceComponentFiltersForScopedList(filters, usesScopedListAccess),
    [filters, usesScopedListAccess],
  );

  const tableRef = useRef<CommonTableHandle>(null);
  const filterPanelRef = useRef<{ openPanel: () => void }>(null);

  const deleteMutation = useDeleteComponentMutation();
  const updateMutation = useUpdateComponentMutation();

  // ─── Actions column ───────────────────────────────────────────────────────────
  const componentActionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(componentRowActionsCellRenderer),[],);
  // ── Filter fields (`filterable: true` in component field config) ────────────

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortByOptions = (
      usesScopedListAccess
        ? COMPONENT_SORT_BY_OPTIONS.filter((o) => o.value !== "tenant_id")
        : COMPONENT_SORT_BY_OPTIONS
    ).map((option) => ({
      value: option.value,
      label: option.label,
    }));

    const sortFields: FilterFieldConfig[] = [
      buildSelectFilter("sort_by", "Sort by", sortByOptions),
      buildSelectFilter("sort_order", "Sort order", COMPONENT_SORT_ORDER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))),
    ];

    const plantField = buildAsyncMultiselectFilter("plant_id", "Plant", (value = "") => fetchPlantNames(value, 1, 50), { placeholder: "Search plants…" });
    const componentTypeField = buildAsyncSelectFilter("component_type", "Component type", (value = "") => fetchComponentTypeOptions(value), { placeholder: "Search component types…" });

    const capacityAndSpecFields: FilterFieldConfig[] = [
      buildNumberFilter("vd_number", "VD number"),
      buildNumberFilter("ac_capacity_kw", "AC capacity (kW)"),
      buildNumberFilter("dc_capacity_kw", "DC capacity (kW)"),
      buildSelectFilter("meter_type", "Meter type", [
        { value: "", label: "All" },
        ...COMPONENT_METER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      ]),
    ];

    const warrantyStatusFields: FilterFieldConfig[] = [
      buildActiveStatusFilter("is_active", "Active"),
      buildSelectFilter("is_bot_layer_process", "Bot Layer Process", [
        { value: "", label: "All" },
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ]),
    ];

    const auditDateFields: FilterFieldConfig[] = [
      {
        key: "created_at",
        label: "Created Range",
        type: "daterange",
        startKey: "created_at_start",
        endKey: "created_at_end",
      },
      {
        key: "updated_at",
        label: "Updated Range",
        type: "daterange",
        startKey: "updated_at_start",
        endKey: "updated_at_end",
      },
    ];

    if (usesScopedListAccess) {
      return [
        componentTypeField,
        plantField,
        ...capacityAndSpecFields,
        ...warrantyStatusFields,
        ...auditDateFields,
        ...sortFields,
      ];
    }

    return [
      componentTypeField,
      buildAsyncMultiselectFilter("tenant_id", "Tenant", (value = "") => fetchTenantNames(value, 1, 50), { placeholder: "Search tenants…" }),
      plantField,
      buildAsyncSelectFilter("parent_id", "Parent component", (value = "") => fetchComponentNames(value, 1, 50), { placeholder: "Search parent components…" }),
      buildAsyncMultiselectFilter("device_id", "Device", (value = "") => fetchDeviceNames(value, 1, 50), { placeholder: "Search devices…" }),
      buildAsyncSelectFilter("inverter_type_id", "Inverter type", (value = "") => fetchInverterTypeNames(value, 1, 50), { placeholder: "Search inverter types…" }),
      buildAsyncSelectFilter("tag_template_id", "Tag template", (value = "") => fetchTagTemplateNames(value, 1, 50), { placeholder: "Search tag templates…" }),
      buildAsyncSelectFilter("alarm_tag_template_id", "Alarm tag template", (value = "") => fetchTagTemplateNames(value, 1, 50), { placeholder: "Search alarm tag templates…" }),
      ...capacityAndSpecFields,
      ...warrantyStatusFields,
      buildAsyncMultiselectFilter("created_by", "Created by", (value = "") => fetchUserNames(value, 1, 50), { placeholder: "Search users…" }),
      buildAsyncMultiselectFilter("updated_by", "Updated by", (value = "") => fetchUserNames(value, 1, 50), { placeholder: "Search users…" }),
      ...auditDateFields,
      ...sortFields,
    ];
  }, [usesScopedListAccess]);

  // ── Query filters (API) ─────────────────────────────────────────────────────

  const queryFilters = useMemo(
    () => toComponentListApiFilters(filters, usesScopedListAccess),
    [filters, usesScopedListAccess],
  );

  // ── Column definitions (tenant/user scoping) ────────────────────────────────

  const defaultColumns: CommonColumnConfig[] = useMemo(
    () => [
      getDisplayTextColumn("id", "ID", { minWidth: 220, visible: false }),
      getLinkColumn("component_name", "Component Name", (params) => (params.data?.id ? `/components/${params.data.id}` : null), { minWidth: 140, pinned: "left", editable: true }),
      getDisplayNumberColumn("identifier", "Identifier", { minWidth: 100 }),
      getDisplayTextColumn("component_code", "Code", { minWidth: 160, editable: true }),
      getRendererColumn("component_type", "Type", (params: ICellRendererParams<ComponentRow, string>) => <ColorBadge variant="orange" className="tracking-wide">{params.value}</ColorBadge>, { minWidth: 140, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => formatComponentTypeLabel(params.data?.component_type) }),
      getLinkColumn("plant_name", "Plant", (params) => (params.data?.plant_id ? `/plants/${params.data.plant_id}` : null), { minWidth: 180 }),
      ...(isAdmin
        ?[
          getLinkColumn("tenant_name", "Tenant", (params) => (params.data?.tenant_id ? `/tenant/${params.data.tenant_id}` : null), { minWidth: 180 }),
        ]
        : []),
      getLinkColumn("parent_name", "Parent", (params) => (params.data?.parent_id ? `/components/${params.data.parent_id}` : null), { minWidth: 180, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => params.data?.parent_name || params.data?.parent_component_name || params.data?.parent_id || "" }),
      getDisplayTextColumn("share_component_type", "Share Component Type", { minWidth: 140, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => formatComponentTypeLabel(params.data?.share_component_type) }),
      getLinkColumn("share_component_name", "Share Component Name", (params) => (
        isAdmin && params.data?.share_component_id
          ? `/components/${params.data.share_component_id}`
          : null
      ), { minWidth: 180 }),
      getDisplayTextColumn("serial_number", "Serial Number", { editable: true, minWidth: 180 }),
      getLinkColumn("device_name", "Device", (params) => (params.data?.device_id ? `/devices/${params.data.device_id}` : null), { minWidth: 180, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => params.data?.device_name || params.data?.device_id || "" }),
      getLinkColumn("inverter_type_name", "Inverter Type", (params) => (params.data?.inverter_type_id ? `/inverter-type/${params.data.inverter_type_id}` : null), { minWidth: 180, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => { const name = params.data?.inverter_type_name; const code = params.data?.inverter_type_code; return name && code ? `${name} (${code})` : name || code || params.data?.inverter_type_id || ""; } }),
      ...(isAdmin ? [getLinkColumn("tag_template_name", "Tag Template", (params) => (params.data?.tag_template_id ? `/tag-templates/${params.data.tag_template_id}` : null), { minWidth: 180, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => params.data?.tag_template_name || params.data?.tag_template_id || "" })] : []),
      getLinkColumn("alarm_tag_template_name", "Alarm Tag Template", (params) => (params.data?.alarm_tag_template_id ? `/tag-templates/${params.data.alarm_tag_template_id}` : null), { minWidth: 200, valueGetter: (params: ICellRendererParams<ComponentRow, string>) => params.data?.alarm_tag_template_name || params.data?.alarm_tag_template_id || "" }),
      getDisplayNumberColumn("vd_number", "VD Number", { editable: true, minWidth: 120 }),
      getDisplayNumberColumn("ac_capacity_kw", "AC Capacity", { editable: true }),
      getDisplayNumberColumn("dc_capacity_kw", "DC Capacity", { editable: true }),
      getDisplayTextColumn("meter_type", "Meter Type", { minWidth: 120, editable: false }),
      getBooleanColumn("is_bot_layer_process", "Bot Layer Process", { minWidth: 150, editable: true, cellRenderer: (params: ICellRendererParams<ComponentRow, boolean>) => params.value == null ? "-" : params.value ? "Yes" : "No" }),
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

  // ── Data queries ────────────────────────────────────────────────────────────

  const {
  data: componentResponse,
  isLoading,
  isError,
  error,
} = useGetAllComponentQuery({
  search,
  filters: queryFilters,
  page,
  limit: pageSize,
});

  const {
    data: editingComponentResponse,
    isLoading: isLoadingEditingComponent,
  } = useGetComponentDetailsQuery(showEdit ? editingRow?.id : null, {
    staleTime: 0,
    enabled: !!showEdit && !!editingRow?.id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ── Load error (toast) ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isError) return;
    toast.error(error ? getErrorMessage(error) : "Failed to load components", {
      duration: 4000,
      position: "top-right",
    });
  }, [error, isError]);

  // ── Table rows & grid context ────────────────────────────────────────────────

  const tableData: ComponentRow[] = useMemo(
    () =>
      (componentResponse?.data?.data ?? []).map((component: ComponentRow) => ({
        ...component,
        parent_name:
          component.parent_name ??
          component.parent_component_name ??
          null,
      })),
    [componentResponse?.data?.data],
  );
  const serverPagination = componentResponse?.data?.pagination;
  const editingComponentDetails = editingComponentResponse?.data ?? null;


  const componentGridContext = useMemo(
    () => ({
      userPermissions,
      componentGrid_openEdit: (component: ComponentRow) => {
        setEditingRow(component);
        setShowEdit(true);
      },
      componentGrid_requestDelete: (id: string) => {
        setDeleteNeedsSubtreeConfirm(false);
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
      componentGrid_toggleActive: (data: ComponentRow) => {
        updateMutation.mutate({ id: data.id, is_active: !data.is_active });
      },
    }),
    [userPermissions, updateMutation],
  );

  const componentGridRevision = useMemo(
    () =>
      `${[...(userPermissions ?? [])]
        .map((permission) => String(permission).toLowerCase())
        .sort()
        .join("|")}__${tableData
          .map(
            (component) =>
              `${component.id}:${component.is_active ? "1" : "0"}:${component.device_name ?? component.device_id ?? ""}`,
          )
          .join("|")}`,
    [tableData, userPermissions],
  );

  // ── Toolbar ─────────────────────────────────────────────────────────────────

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.COMPONENT.CREATE)),
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
            placeholder="Search components..."
            tabs={[
              { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
              { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
            ]}
            selectedTab={selectedView}
            onTabChange={(key: string) => setSelectedView(key as "table" | "cards")}
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <CommonDataView
            key={entityKey}
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Component"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={componentGridContext}
            gridContextRevision={componentGridRevision}
            onCellUpdate={({ id, field, value, data }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.COMPONENT.UPDATE)) {
                return;
              }
              if (!id || !field) return;

              if (field === "ac_capacity_kw" || field === "dc_capacity_kw") {
                const ac = field === "ac_capacity_kw" ? Number(value) : Number(data.ac_capacity_kw);
                const dc = field === "dc_capacity_kw" ? Number(value) : Number(data.dc_capacity_kw);

                if (!isNaN(ac) && !isNaN(dc) && ac !== 0 && dc !== 0 && ac >= dc) {
                  toast.error("AC capacity must be less than DC capacity");
                  return;
                }
              }

              updateMutation.mutate({ id, [field]: value });
            }}
            page={page}
            pageSize={pageSize}
            total={serverPagination?.totalCount ?? 0}
            totalPages={serverPagination?.totalPages ?? 1}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: { id: string }) => row.id}
            columnSelectorTitle="Component Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: !usesScopedListAccess && canShowComponentActionsColumn ? componentActionsColumn : undefined,
              validateSavedColumns: false,
              logSavedOrderParseError: false,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filtersForView}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(COMPONENT_FILTER_DEFAULTS);
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
            onSelectionChanged={() => {}}
          />
        </div>
      </main>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Component"
        subtitle="Add a new component to the plant hierarchy"
        icon={navIcons.components}
        maxWidth="max-w-3xl"
      >
        <ComponentForm mode="create" onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={!!(showEdit && editingRow)}
        onClose={() => {
          setShowEdit(false);
          setEditingRow(null);
        }}
        title="Edit Component"
        subtitle={editingRow?.component_name ?? "Update component details"}
        icon={Edit}
        maxWidth="max-w-3xl"
      >
        {showEdit && isLoadingEditingComponent && !editingComponentDetails ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={3} />
          </div>
        ) : editingRow ? (
          <ComponentForm
            mode="edit"
            initialValues={editingRow}
            editValues={editingComponentDetails ?? undefined}
            onSuccess={() => {
              setShowEdit(false);
              setEditingRow(null);
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
          setDeleteNeedsSubtreeConfirm(false);
        }}
        onConfirm={async () => {
          if (confirmIds.length === 0) return;
          try {
            for (const id of confirmIds) {
              await deleteMutation.mutateAsync({
                id,
                is_delete_child: deleteNeedsSubtreeConfirm,
              });
            }
            setConfirmOpen(false);
            setConfirmIds([]);
            setDeleteNeedsSubtreeConfirm(false);
          } catch (e) {
            if (
              !deleteNeedsSubtreeConfirm &&
              isComponentDeleteChildrenConflict(e)
            ) {
              setDeleteNeedsSubtreeConfirm(true);
            }
          }
        }}
        title={
          deleteNeedsSubtreeConfirm
            ? "Delete entire subtree?"
            : confirmIds.length > 1
              ? "Delete components"
              : "Delete component"
        }
        message={
          deleteNeedsSubtreeConfirm
            ? confirmIds.length > 1
              ? "One or more selected components have child components. Proceeding will permanently delete the selected components and all nested child components. This cannot be undone."
              : "This component has child components. Proceeding will permanently delete this component and all nested child components. This cannot be undone."
            : confirmIds.length > 1
              ? `Are you sure you want to delete ${confirmIds.length} component(s)? This action cannot be undone.`
              : "Are you sure you want to delete this component? This action cannot be undone."
        }
        confirmText={deleteNeedsSubtreeConfirm ? "Delete subtree" : "Delete"}
        cancelText="Cancel"
        type={deleteNeedsSubtreeConfirm ? "warning" : "danger"}
        isLoading={deleteMutation.isPending}
      />

    </div>
  );
};

export default Components;
