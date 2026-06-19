import React, { useEffect, useMemo, useState } from "react";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "../components/core/table/CommonTable";
import CommonToolbar, {
  type ToolbarActionConfig,
} from "../components/core/table/CommonToolbar";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import ColorBadge from "@/components/common/ColorBadge";
import {
  useGetPlantFeaturesListQuery,
  useGetPlantFeatureDetailsQuery,
  useDeletePlantFeatureMutation,
  useTogglePlantFeatureStatusMutation,
  pickPlantFeatureDetail,
  fetchPlantFeatureOptions,
  type PlantFeature,
  type PlantFeatureListFilters,
  type GetAllPlantFeaturesResponse,
  useUpdatePlantFeatureMutation
} from "@/services/operations/plantFeaturesAPI";
import { fetchPlantCategoryOptions } from "@/services/operations/plantAPI";
import Modal from "@/components/common/Modal";
import PlantFeatureForm from "@/components/core/form/PlantFeatureForm";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import Spinner from "@/components/common/Spinner";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import { useAppSelector } from "@/store/hooks";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import type {
  ICellRendererParams,
} from "@ag-grid-community/core";
import {
  getActiveStatusColumn,
  getBooleanColumn,
  getDateColumn,
  getDisplayTextColumn,
  getLinkColumn,
  getRendererColumn,
  getTextColumn,
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
} from "@/components/core/table/CommonToolbar";

const entityKey = "plant-feature";
const {
  buildAsyncSelectFilter,
  buildAuditFilterFields,
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  parseSingleFilter,
} = CommonFilterPanel;

const PLANT_FEATURE_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: ["parent_feature_id", "plant_category"],
});


function toPlantFeatureListFilters(
  filters: FilterValues,
): PlantFeatureListFilters {
  const out: PlantFeatureListFilters = {};
  for (const [key, raw] of Object.entries(filters)) {
    if (key === "parent_feature_id" || key === "plant_category") continue;
    const s = typeof raw === "string" ? raw : "";
    if (s.trim() !== "") {
      out[key] = s;
    }
  }
  const parentId = parseSingleFilter(filters.parent_feature_id);
  if (parentId) out.parent_feature_id = parentId;

  const plantCategory = parseSingleFilter(filters.plant_category);
  if (plantCategory) out.plant_category = plantCategory;

  return out;
}

function extractPlantFeatureList(
  raw: GetAllPlantFeaturesResponse | undefined,
): {
  rows: PlantFeature[];
  pagination: GetAllPlantFeaturesResponse["data"]["pagination"] | undefined;
} {
  return {
    rows: raw?.data?.plant_features ?? [],
    pagination: raw?.data?.pagination,
  };
}

const plantFeatureRowActions = createCrudRowActionsCellRenderer<PlantFeature>({
  actions: [
    buildToggleStatusRowAction("plantFeatureGrid_toggleStatus", PERMISSIONS.PLANT_FEATURE.UPDATE),
    buildEditRowAction("plantFeatureGrid_openEdit", PERMISSIONS.PLANT_FEATURE.UPDATE),
    buildDeleteRowAction("plantFeatureGrid_requestDelete", PERMISSIONS.PLANT_FEATURE.DELETE),
  ],
});

const filterFields: FilterFieldConfig[] = [
  buildAsyncSelectFilter("parent_feature_id", "Parent feature", (search = "") => fetchPlantFeatureOptions(search, 1, 50), { placeholder: "Search parent feature…" }),
  buildAsyncSelectFilter("plant_category", "Plant category", (search = "") => fetchPlantCategoryOptions(search), { placeholder: "Search plant category…" }),
  {
    key: "module",
    label: "Module",
  },
  buildSelectFilter("is_active", "Active", [
    { value: "", label: "All" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ]),
  buildSelectFilter("is_default", "Default", [
    { value: "", label: "All" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ]),
  ...buildAuditFilterFields({
    dateMode: "daterange",
    CreatedAt: true,
    UpdatedAt: true,
  }),
  ...buildSortFilterFields({
    sortOptions: [
      { value: "name", label: "Name" },
      { value: "display_name", label: "Display name" },
      { value: "module", label: "Module" },
      { value: "created_at", label: "Created At" },
      { value: "updated_at", label: "Updated At" },
    ],
  }),
];

const defaultColumns: CommonColumnConfig[] = [
  getLinkColumn("display_name", "Display name", (params) => (params.data?.id ? `/plant-feature/${params.data.id}` : null), { minWidth: 200, pinned: "left", editable: true }),
  getTextColumn("name", "Name", { minWidth: 160, editable: true }),
  getDisplayTextColumn("module", "Module", { minWidth: 120, editable: true }),
  getRendererColumn("plant_category", "Plant categories", (params: ICellRendererParams<PlantFeature, string[]>) => !params.value || !Array.isArray(params.value) ? "-" : <div className="flex items-center flex-wrap py-2 gap-1">{params.value.map((plantCategory: string, idx: number) => <ColorBadge key={idx} variant="orange" className="capitalize">{plantCategory}</ColorBadge>)}</div>, { minWidth: 280 }),
  getRendererColumn("price", "Price", (params: ICellRendererParams<PlantFeature>) => params.data?.price == null || params.data?.price === "" ? "-" : String(params.data.price), { minWidth: 100 }),
  getDisplayTextColumn("parent_feature_name", "Parent Feature", { minWidth: 200 }),
  getDisplayTextColumn("parent_display_name", "Parent Display Name", { visible: false, minWidth: 200 }),
  getBooleanColumn("is_default", "Default", { minWidth: 100 }),
  getActiveStatusColumn("is_active", "Active", { minWidth: 100, fallbackValue: true }),
  getDateColumn("created_at", "Created At"),
  getDateColumn("updated_at", "Updated At"),
];

const PlantFeatures: React.FC = () => {
  const [, rerenderAfterWidthReset] = React.useState(0);
  React.useLayoutEffect(() => {
    if (resetSavedActionsColumnWidth(entityKey)) {
      rerenderAfterWidthReset((value) => value + 1);
    }
  }, []);
  
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    ...PLANT_FEATURE_FILTER_DEFAULTS,
  });
  
  const updateMutation = useUpdatePlantFeatureMutation();

  const listApiFilters = useMemo(
    () => toPlantFeatureListFilters(filters),
    [filters],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<PlantFeature | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const deleteMutation = useDeletePlantFeatureMutation();
  const toggleStatusMutation = useTogglePlantFeatureStatusMutation();

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const tableRef = React.useRef<CommonTableHandle>(null);

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
  } = useGetPlantFeaturesListQuery({
    page,
    limit: pageSize,
    search,
    filters: listApiFilters,
  });

  const { data: editingDetailResponse, isLoading: isLoadingEditingDetail } =
    useGetPlantFeatureDetailsQuery(
      showEdit && editing?.id ? editing.id : null,
      {
        enabled: !!showEdit && !!editing?.id,
        staleTime: 0,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    );

  const editingDetails = useMemo(
    () => pickPlantFeatureDetail(editingDetailResponse),
    [editingDetailResponse],
  );

  useEffect(() => {
    if (isError) {
      toast.error(
        error ? getErrorMessage(error) : "Failed to load plant features.",
        { duration: 4000, position: "top-right" },
      );
    }
  }, [error, isError]);

  const tableData = useMemo(() => {
    const { rows } = extractPlantFeatureList(listResponse);
    return rows;
  }, [listResponse]);

  const pagination = useMemo(() => {
    const { pagination: p } = extractPlantFeatureList(listResponse);
    return (
      p ?? {
        page,
        limit: pageSize,
        totalCount: 0,
        totalPages: 1,
      }
    );
  }, [listResponse, page, pageSize]);

  const actionsColumn: CommonColumnConfig = React.useMemo(() => getActionsColumn(plantFeatureRowActions),[],);
  const canShowPlantFeatureActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.PLANT_FEATURE.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.PLANT_FEATURE.DELETE);

  const setColumnsWithActions = React.useCallback<
    React.Dispatch<React.SetStateAction<CommonColumnConfig[]>>
  >(
    (action) => {
      setLocalColumns((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        const baseColumns = next.filter((c) => c.field !== "id");
        return canShowPlantFeatureActionsColumn ? [...baseColumns, actionsColumn] : baseColumns;
      });
    },
    [actionsColumn, canShowPlantFeatureActionsColumn],
  );

  const gridContext = React.useMemo(
    () => ({
      userPermissions,
      plantFeatureGrid_toggleStatus: (data: PlantFeature) => {
        if (!data.id) return;
        toggleStatusMutation.mutate({ id: data.id, is_active: !data.is_active });
      },
      plantFeatureGrid_openEdit: (row: PlantFeature) => {
        setEditing(row);
        setShowEdit(true);
      },
      plantFeatureGrid_requestDelete: (id: string) => {
        if (!id) return;
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation, userPermissions],
  );

  const gridContextRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((row) => `${row.id}:${row.is_active ? "1" : "0"}`)
      .join("|");
    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one plant feature before deleting.");
      return;
    }
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.PLANT_FEATURE.CREATE)),
    buildDeleteAction(handleDeleteBulk, { 
      disabled: selectedIds.length === 0, 
      show: hasPermission(userPermissions, PERMISSIONS.PLANT_FEATURE.DELETE) 
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
            placeholder="Search plant features…"
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
            key={`${entityKey}-${gridContextRevision}`}
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Plant feature"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={gridContext}
            gridContextRevision={gridContextRevision}
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.totalCount}
            totalPages={pagination.totalPages}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: PlantFeature) => row.id}
            columnSelectorTitle="Plant feature columns"
            columnStateConfig={{
              setColumns: setColumnsWithActions,
              actionsColumn: canShowPlantFeatureActionsColumn ? actionsColumn : undefined,
              excludedFields: ["id"],
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters({ ...PLANT_FEATURE_FILTER_DEFAULTS });
              setPage(1);
            }}
            filterPanelRef={filterPanelRef}
            onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.PLANT_FEATURE.UPDATE)) return;
              if (!id || !field) return;
              if (value === oldValue) return;
              updateMutation.mutate({ id, [field]: value });
            }}
          />
        </div>
      </main>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create plant feature"
        subtitle="Add a plant feature"
        maxWidth="max-w-3xl"
        icon={navIcons.plantFeature}
      >
        {showCreate && (
          <PlantFeatureForm
            mode="create"
            onSuccess={() => setShowCreate(false)}
          />
        )}
      </Modal>

      <Modal
        open={!!(showEdit && editing)}
        onClose={() => {
          setShowEdit(false);
          setEditing(null);
        }}
        title="Edit plant feature"
        subtitle={editing?.display_name || editing?.name || "Update feature"}
        maxWidth="max-w-3xl"
        icon={navIcons.plantFeature}
      >
        {showEdit &&
          editing &&
          (isLoadingEditingDetail && !editingDetails ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={3} />
            </div>
          ) : (
            <PlantFeatureForm
              mode="edit"
              initialValues={editing}
              editValues={editingDetails ?? editing}
              onSuccess={() => {
                setShowEdit(false);
                setEditing(null);
              }}
            />
          ))}
      </Modal>

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
            await deleteMutation.mutateAsync(confirmIds);
            setConfirmOpen(false);
            setConfirmIds([]);
          } catch {
            // handled by mutation
          }
        }}
      
        title={confirmIds.length > 1 ? "Delete plant features" : "Delete plant feature"}
        message={
          confirmIds.length > 1
            ? `Are you sure you want to delete ${confirmIds.length} plant features? This action cannot be undone.`
            : "Are you sure you want to delete this plant feature? This action cannot be undone."
        }
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default PlantFeatures;
