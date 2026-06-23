import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
  buildAddAction,
  buildDeleteAction,
  buildColumnsAction,
  buildFiltersAction,
  buildImportAction,
  buildScanAction,
} from "@/components/core/table/CommonToolbar";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import { Table as TableIcon, Factory, LayoutGrid, Cpu, Download, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import {
  useGetAllAssetsQuery, useDeleteAssetMutation, useImportAssetsMutation,
  useExportAssetsMutation
} from "@/services/operations/assetsAPI";
import { useGetComponentTypeOptionsQuery } from "@/services/operations/componentAPI";
import {
  ASSET_STATUS_OPTIONS,
  ASSET_SORT_OPTIONS,
  useGetAssetTypeOptionsQuery,
  type AssetRow,
  type AssetListFilters,
} from "@/services/operations/assetsAPI";
import Modal from "@/components/common/Modal";
import AssetForm from "@/components/core/form/AssetForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  buildDisplayTextColumn,
  getDateColumn,
  getActionsColumn,
  getLinkColumn
} from "@/components/core/table/ListPageHelpers";

import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildReplaceRowAction,
} from "@/components/common/RowActions";

import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import { StatusBadge } from "./PlantAssetDetails";
import { PERMISSIONS, hasPermission, } from "@/utils/permissions";

import AssetReplacementForm from "@/components/core/form/AssetReplacementForm";
import AssetScanForm from "@/components/core/form/AssetScanForm";

// ─── Entity key ───────────────────────────────────────────────────────────────

const ASSET_ENTITY_KEY = "plantAsset";

// ─── Filter helpers ────────────────────────────────────────────────────────────

const {
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setScalarFilterParam,
  buildDateRangeFilterField,
} = CommonFilterPanel;

const ASSET_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "status",
    "category_name",
    "component_type",
    "installation_date_start",
    "installation_date_end",
    "commissioning_date_start",
    "commissioning_date_end",
    "purchase_date_start",
    "purchase_date_end",
    "warranty_start_date_start",
    "warranty_start_date_end",
    "warranty_end_date_start",
    "warranty_end_date_end",
    "created_at_start",
    "created_at_end",
    "updated_at_start",
    "updated_at_end",
  ],
});

function toAssetApiFilters(filters: FilterValues): AssetListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";

  const base: Record<string, unknown> = { sort_by, sort_order };

  setScalarFilterParam(base, filters, "status");
  setScalarFilterParam(base, filters, "category_name");
  setScalarFilterParam(base, filters, "component_type");
  setScalarFilterParam(base, filters, "installation_date_start");
  setScalarFilterParam(base, filters, "installation_date_end");
  setScalarFilterParam(base, filters, "commissioning_date_start");
  setScalarFilterParam(base, filters, "commissioning_date_end");
  setScalarFilterParam(base, filters, "purchase_date_start");
  setScalarFilterParam(base, filters, "purchase_date_end");
  setScalarFilterParam(base, filters, "warranty_start_date_start");
  setScalarFilterParam(base, filters, "warranty_start_date_end");
  setScalarFilterParam(base, filters, "warranty_end_date_start");
  setScalarFilterParam(base, filters, "warranty_end_date_end");
  setScalarFilterParam(base, filters, "created_at_start");
  setScalarFilterParam(base, filters, "created_at_end");
  setScalarFilterParam(base, filters, "updated_at_start");
  setScalarFilterParam(base, filters, "updated_at_end");

  return base as AssetListFilters;
}


// ─── Row actions cell renderer ────────────────────────────────────────────────

const assetRowActionsCellRenderer =
  createCrudRowActionsCellRenderer<AssetRow>({
    actions: [
      // buildEditRowAction("assetGrid_openEdit",PERMISSIONS.ASSET.UPDATE),
      // buildDeleteRowAction("assetGrid_requestDelete",PERMISSIONS.ASSET.DELETE),
      // buildReplaceRowAction("assetGrid_replaceAsset",PERMISSIONS.ASSET.REPLACE)

      buildEditRowAction("assetGrid_openEdit"),
      buildDeleteRowAction("assetGrid_requestDelete"),
      buildReplaceRowAction("assetGrid_replaceAsset")
    ],
  });

// ─── Page component ───────────────────────────────────────────────────────────

const PlantAssets: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();

  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  // ── Local state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(() => ({ ...ASSET_FILTER_DEFAULTS }));
  const [showCreate, setShowCreate] = useState(false);
  const [showReplace, setShowReplace] = useState(false)
  const [showScan, setShowScan] = useState(false);
  const [assetToReplaceId, setAssetToReplaceId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const confirmIdsRef = React.useRef<string[]>([]);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const tableRef = React.useRef<CommonTableHandle>(null);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  // ── API filters ───────────────────────────────────────────────────────────
  const apiFilters = useMemo(() => toAssetApiFilters(filters), [filters]);

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(assetRowActionsCellRenderer), []);

  const gridContext = useMemo(
    () => ({
      assetGrid_openEdit: (row: AssetRow) => {
        console.log(row)
        setEditingAsset(row);
        setShowEdit(true);
      },
      assetGrid_requestDelete: (rowOrId: AssetRow | string) => {
        const id = typeof rowOrId === "string" ? rowOrId : rowOrId?.id;
        if (!id) return;
        setConfirmTitle("Delete Asset");
        setConfirmMessage("Are you sure you want to delete this asset? This action cannot be undone.");
        setConfirmIds([id]);
        confirmIdsRef.current = [id];
        setConfirmOpen(true);
      },
      assetGrid_replaceAsset: (id: string) => {

        console.log("Replace asset id:", id);

        setAssetToReplaceId(id);
        setShowReplace(true);
      }
    }),
    []
  );

  // ── Data query ────────────────────────────────────────────────────────────
  const {
    data: assetResponse,
    isLoading,
    isError,
    error,
  } = useGetAllAssetsQuery({
    search,
    filters: apiFilters,
    page,
    limit: pageSize,
    plantId: plantId ?? "",
    enabled: true,
  });

  const { data: assetTypes } = useGetAssetTypeOptionsQuery();

  const loadAssetTypeOptions = assetTypes ?? [];

  const { data: componentTypeData } = useGetComponentTypeOptionsQuery();
  const componentTypeOptions = componentTypeData ?? [];

  // ── Error toast ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isError) {
      const msg = error
        ? getErrorMessage(error)
        : "Failed to load assets. Please try again.";
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const tableData = useMemo(
    () => (assetResponse?.data?.assets ?? []).filter((a: AssetRow) => a.plant_id === plantId),
    [assetResponse?.data?.assets, plantId]
  );

  const pagination = useMemo(() => assetResponse?.pagination, [assetResponse?.pagination]);

  // ─── Column definitions ───────────────────────────────────────────────────────

  const assetColumns: CommonColumnConfig[] = useMemo(
    () => [
      getLinkColumn("name", "Name", (params) => (params.data?.id ? `/plants/${plantId}/asset/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
      // buildDisplayTextColumn("code", "Code", { minWidth: 140 }),
      buildDisplayTextColumn("category_name", "Category", { minWidth: 180 }),
      buildDisplayTextColumn("component_type", "Component Type", { minWidth: 180 }),
      buildDisplayTextColumn("model_number", "Model Number", { minWidth: 180 }),
      buildDisplayTextColumn("serial_number", "Serial Number", { minWidth: 180 }),
      buildDisplayTextColumn("manufacturer_name", "Manufacturer", { minWidth: 180 }),

      buildDisplayTextColumn("specifications", "Specifications", {
        minWidth: 250,
        visible: false,
      }),

      {
        ...buildDisplayTextColumn("status", "Status", {
          minWidth: 140,
        }),
        cellRenderer: (params: any) => (
          <StatusBadge status={params.value} />
        ),
      },

      getDateColumn("manufacture_date", "Manufacture Date", {
        minWidth: 180,
        dateOnly: true,
      }),

      getDateColumn("installation_date", "Installation Date", {
        minWidth: 180,
        dateOnly: true,
      }),

      getDateColumn("commissioning_date", "Commissioning Date", {
        minWidth: 180,
        dateOnly: true,
        visible: false,
      }),

      getDateColumn("purchase_date", "Purchase Date", {
        minWidth: 180,
        dateOnly: true,
      }),

      getDateColumn("warranty_start_date", "Warranty Start", {
        minWidth: 180,
        dateOnly: true,
        visible: true,
      }),

      getDateColumn("warranty_end_date", "Warranty End", {
        minWidth: 180,
        dateOnly: true,
        visible: true
      }),

      buildDisplayTextColumn("profile_url", "Profile URL", {
        minWidth: 220,
        visible: false,
      }),

      buildDisplayTextColumn("media", "Media", {
        minWidth: 220,
        visible: false,
      }),

      getDateColumn("retired_at", "Retired At", {
        minWidth: 180,
        dateOnly: true,
        visible: false,
      }),

      buildDisplayTextColumn("created_by", "Created By", {
        minWidth: 220,
        visible: false,
      }),

      buildDisplayTextColumn("updated_by", "Updated By", {
        minWidth: 220,
        visible: false,
      }),

      getDateColumn("created_at", "Created At"),

      getDateColumn("updated_at", "Updated At"),
    ],
    [],
  );


  // ── Filter fields ─────────────────────────────────────────────────────────
  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortFields = buildSortFilterFields({
      sortOptions: ASSET_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    return [
      ...sortFields,
      buildSelectFilter("status", "Status", ASSET_STATUS_OPTIONS),
      buildSelectFilter("category_name", "Category", loadAssetTypeOptions),
      buildSelectFilter("component_type", "Component Type", componentTypeOptions),
      buildDateRangeFilterField({ key: "installation_date", label: "Installation Date", startKey: "installation_date_start", endKey: "installation_date_end", }),
      buildDateRangeFilterField({ key: "commissioning_date", label: "Commissioning Date", startKey: "commissioning_date_start", endKey: "commissioning_date_end", }),
      buildDateRangeFilterField({ key: "purchase_date", label: "Purchase Date", startKey: "purchase_date_start", endKey: "purchase_date_end", }),
      buildDateRangeFilterField({ key: "warranty_start_date", label: "Warranty Start Date", startKey: "warranty_start_date_start", endKey: "warranty_start_date_end", }),
      buildDateRangeFilterField({ key: "warranty_end_date", label: "Warranty End Date", startKey: "warranty_end_date_start", endKey: "warranty_end_date_end", }),
      buildDateRangeFilterField({ key: "created_at", label: "Created At", startKey: "created_at_start", endKey: "created_at_end", }),
      buildDateRangeFilterField({ key: "updated_at", label: "Updated At", startKey: "updated_at_start", endKey: "updated_at_end", }),
    ];
  }, [componentTypeOptions]);

  // ── View tabs ─────────────────────────────────────────────────────────────
  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
    // { key: "board", label: "", icon: <KanbanSquare className="w-4 h-4" /> },
  ];

  const importMutation = useImportAssetsMutation();
  const exportMutation = useExportAssetsMutation();

  const toolbarActions = [
    buildAddAction(() => setShowCreate(true), hasPermission(userPermissions, PERMISSIONS.ASSET.CREATE)),
    buildScanAction(() => setShowScan(true)),
    buildDeleteAction(async () => {
      if (selectedIds.length === 0) return;
      setConfirmTitle("Delete Assets");
      setConfirmMessage(
        "Are you sure you want to delete the selected assets? This action cannot be undone.",
      );
      setConfirmIds([...selectedIds]);
      confirmIdsRef.current = [...selectedIds];
      setConfirmOpen(true);
    }, {
      disabled: selectedIds.length === 0,
      show: hasPermission(userPermissions, PERMISSIONS.ASSET.DELETE),
    }),
    buildFiltersAction(),
    buildColumnsAction(),
    {
      key: "export",
      label: "Export",
      icon: <Download className="w-4 h-4" />,
      onClick: () => exportMutation.mutate(plantId ?? ""),
      variant: "outline" as const,
      show: hasPermission(userPermissions, PERMISSIONS.ASSET.EXPORT)
    },
    {
      ...buildImportAction({ onImport: (file: File) => importMutation.mutate({ file, plantId: plantId ?? "" }) }),
      onClick: () => importFileRef.current?.click(),
      show: hasPermission(userPermissions, PERMISSIONS.ASSET.IMPORT)
    },
  ];

  const deleteAssetMutation = useDeleteAssetMutation();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search assets..."
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) => setSelectedView(key as "table" | "cards")}
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <CommonDataView
              data={tableData}
              loading={isLoading}
              entityKey={ASSET_ENTITY_KEY}
              entityLabel="Asset"
              columns={localColumns}
              defaultColumns={assetColumns}
              kanbanOptions={ASSET_STATUS_OPTIONS}
              selectedView={selectedView as "table" | "cards"}
              tableRef={tableRef}
              page={page}
              pageSize={pageSize}
              gridContext={gridContext}
              total={pagination?.totalCount ?? 0}
              totalPages={pagination?.totalPages ?? 1}
              pageStateConfig={{ setPage, setPageSize }}
              getRowId={(row: AssetRow) => row.id}
              columnSelectorTitle="Asset Columns"
              columnStateConfig={{
                setColumns: setLocalColumns,
                actionsColumn: actionsColumn,
              }}
              columnPanelRef={columnPanelRef}
              filterFields={filterFields}
              defaultFilters={ASSET_FILTER_DEFAULTS}
              filters={filters}
              onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
              onFiltersChange={setFilters}
              onApplyFilters={() => setPage(1)}
              onClearFilters={() => {
                setFilters({ ...ASSET_FILTER_DEFAULTS });
                setPage(1);
              }}
              filterPanelRef={filterPanelRef}
            // customCardComponent={AssetCard}
            />
          </div>

        </div>
      </main>
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Asset"
        subtitle="Add a new asset to keep the track"
        icon={Factory}
        maxWidth="max-w-3xl"
      >
        <AssetForm
          mode="create"
          onSuccess={() =>
            setShowCreate(false)
          }
          close={() => setShowCreate(false)}
          isOpen={showCreate}
        />
      </Modal>

      <Modal
        open={!!(showEdit && editingAsset)}
        onClose={() => {
          setShowEdit(false);
          setEditingAsset(null);
        }}
        title="Edit Asset"
        subtitle={editingAsset?.name || "Update asset details"}
        icon={Cpu}
        maxWidth="max-w-3xl"
      >
        {editingAsset && (
          <AssetForm
            mode="edit"
            initialValues={editingAsset}
            onSuccess={() => {
              setShowEdit(false);
              setEditingAsset(null);
            }}
            close={() => {
              setShowEdit(false);
              setEditingAsset(null);
            }}
            isOpen={!!(showEdit && editingAsset)}
          />
        )}
      </Modal>

      <Modal
        open={showReplace}

        onClose={() => setShowReplace(false)}
        title="Replace Asset"
        subtitle="Replace asset with other one"
        icon={Factory}
        maxWidth="max-w-3xl"
        centerModal
      >
        <AssetReplacementForm
          key={showReplace ? assetToReplaceId : "closed"}
          plantId={plantId as string}
          assetId={assetToReplaceId ?? ""}
          onSuccess={() => setShowReplace(false)}
          close={() => setShowReplace(false)}
          onOpenCreateAsset={() => {
            setShowReplace(false);
            setShowCreate(true);
          }}
        />
      </Modal>

      <Modal
        open={showScan}
        onClose={() => setShowScan(false)}
        title="Scan Asset"
        subtitle="Upload or capture an asset photo"
        icon={Camera}
        maxWidth="max-w-3xl"
        centerModal
      >
        <AssetScanForm
          key={showScan ? "open" : "closed"}
          plantId={plantId as string}
          onSuccess={() => setShowScan(false)}
          close={() => setShowScan(false)}
        />
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmIds([]);
        }}
        onConfirm={async () => {
          const ids = confirmIdsRef.current;
          if (!ids.length) return;
          await deleteAssetMutation.mutateAsync(ids);
          setConfirmOpen(false);
          setConfirmIds([]);
          confirmIdsRef.current = [];
          setSelectedIds([]);
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />

      <input
        ref={importFileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importMutation.mutate({ file, plantId: plantId ?? "" });  // ← pass plantId
          e.target.value = "";
        }} />
    </div>
  );
};

export default PlantAssets;