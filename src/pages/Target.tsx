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
} from "@/components/core/table/CommonToolbar";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import CommonDataView from "@/components/core/table/CommonDataView";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import { Table as TableIcon, Factory, LayoutGrid, Cpu } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import { useGetAllTargetsQuery, useDeleteTargetMutation } from "@/services/operations/targetAPI";
import {
  TARGET_STATUS_OPTIONS,
  TARGET_PERIOD_OPTIONS,
  TARGET_SORT_OPTIONS,
  type TargetRow,
  type TargetListFilters,
} from "@/services/operations/targetAPI";
import Modal from "@/components/common/Modal";
import TargetForm from "@/components/core/form/TargetForm.tsx";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  buildDisplayTextColumn,
  getDateColumn,
  getLinkColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";

import {
  buildDeleteRowAction,
  buildEditRowAction,
} from "@/components/common/RowActions";

import {
  createCrudRowActionsCellRenderer,
} from "@/components/core/table/TableRenderers";
import { PERMISSIONS, hasPermission, isAdminOrSuperAdminRole } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";

// ─── Entity key ───────────────────────────────────────────────────────────────

const TARGET_ENTITY_KEY = "Target";

const formatTargetParameters = (parameters: TargetRow["parameters"] | null | undefined) => {
  if (!parameters || typeof parameters !== "object") return "-";

  const entries = Object.entries(parameters);
  if (entries.length === 0) return "-";

  return entries
    .map(([key, config]) => `${key}: ${Number(config.value).toLocaleString("en-IN")}`)
    .join(", ");
};

// ─── Filter helpers ────────────────────────────────────────────────────────────

const {
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setScalarFilterParam,
  buildDateRangeFilterField
} = CommonFilterPanel;

const TARGET_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "tenant",
    "plant",
    "component",
    "parameter",
    "status",
    "period",
    "start_date",
    "end_date",
  ],
});

function toTargetApiFilters(filters: FilterValues): TargetListFilters {
  const sort_by = filters.sort_by?.trim() || "created_at";
  const sort_order = filters.sort_order?.trim() || "desc";

  const base: Record<string, unknown> = {
    sort_by,
    sort_order,
  };

  setScalarFilterParam(base, filters, "tenant");
  setScalarFilterParam(base, filters, "plant");
  setScalarFilterParam(base, filters, "component");
  setScalarFilterParam(base, filters, "parameter");
  setScalarFilterParam(base, filters, "status");
  setScalarFilterParam(base, filters, "target_period");
  setScalarFilterParam(base, filters, "start_date");
  setScalarFilterParam(base, filters, "end_date");

  return base as TargetListFilters;
}

// ─── Row actions cell renderer ────────────────────────────────────────────────

const targetRowActionsCellRenderer =
  createCrudRowActionsCellRenderer<TargetRow>({
    actions: [
      buildEditRowAction("targetGrid_openEdit", PERMISSIONS.TARGET.UPDATE),
      buildDeleteRowAction("targetGrid_requestDelete", PERMISSIONS.TARGET.DELETE),
    ],
  });

// ─── Page component ───────────────────────────────────────────────────────────

const Target: React.FC = () => {
  const { id: plantId } = useParams<{ id: string }>();

  // ── Local state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>(() => ({ ...TARGET_FILTER_DEFAULTS }));
  const [showCreate, setShowCreate] = useState(false);
  const [selectedView, setSelectedView] = useResponsiveDataView();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");

  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const confirmIdsRef = React.useRef<string[]>([]);

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const tableRef = React.useRef<CommonTableHandle>(null);

  const { permissions: userPermissions, role: userRole } = useAppSelector((state) => state.auth);
  const isAdminOrSuper = isAdminOrSuperAdminRole(userRole);

  // ── API filters ───────────────────────────────────────────────────────────
  const apiFilters = useMemo(() => toTargetApiFilters(filters), [filters]);

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(targetRowActionsCellRenderer), []);

  const gridContext = useMemo(
    () => ({
      userPermissions: isAdminOrSuper ? ["super-admin"] : (userPermissions ?? []),
      targetGrid_openEdit: (row: TargetRow) => {
        setEditingTarget(row);
        setShowEdit(true);
      },

      targetGrid_requestDelete: (rowOrId: TargetRow | string) => {
        const id = typeof rowOrId === "string" ? rowOrId : rowOrId?.id;
        if (!id) return;
        setConfirmTitle("Delete Target");
        setConfirmMessage("Are you sure...");
        setConfirmIds([id]);
        confirmIdsRef.current = [id];
        setConfirmOpen(true);
      },
    }),
    [isAdminOrSuper, userPermissions]
  );

  // ── Data query ────────────────────────────────────────────────────────────
  const {
    data: targetResponse,
    isLoading,
    isError,
    error,
  } = useGetAllTargetsQuery({
    search,
    filters: apiFilters,
    page,
    limit: pageSize,
    plantId: plantId ?? "",
    enabled: true,
  });
  console.log(targetResponse)

  // ── Error toast ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isError) {
      const msg = error
        ? getErrorMessage(error)
        : "Failed to load targets. Please try again.";
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const tableData = useMemo(
    () =>
      (targetResponse?.data?.targets ?? []).filter(
        (t: TargetRow) => t.plant_id === plantId
      ),
    [targetResponse?.data?.targets, plantId]
  );
  const pagination = useMemo(() => targetResponse?.pagination, [targetResponse?.pagination]);

  // ─── Column definitions ───────────────────────────────────────────────────────

  const targetColumns: CommonColumnConfig[] = useMemo(
    () => [
      getLinkColumn("target_name", "Target Name", (params) => (params.data?.id ? `/plants/${plantId}/target/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
      getLinkColumn("tenant_name", "Tenant", (params) => (params.data?.id ? `/tenant/${params.data?.tenant_id}` : null), { minWidth: 220, editable: true }),
      getLinkColumn("plant_name", "Plant", (params) => (params.data?.id ? `/plants/${params.data?.plant_id}` : null), { minWidth: 220, editable: true }),
      getLinkColumn("component_name", "Component", (params) => (params.data?.id ? `/components/${params.data?.component_id}` : null), { minWidth: 220, editable: true }),

      buildDisplayTextColumn("status", "Status", { minWidth: 140 }),
      buildDisplayTextColumn("target_period", "Period", { minWidth: 140 }),
      getDateColumn("start_date", "Start Date", {
        minWidth: 180,
        dateOnly: true,
      }),
      getDateColumn("end_date", "End Date", {
        minWidth: 180,
        dateOnly: true,
      }),
      getDateColumn("created_at", "Created At"),
      getDateColumn("updated_at", "Updated At"),
      getLinkColumn("component_name", "Component", (params) => (params.data?.id ? `/components/${params.data?.component_id}` : null), { minWidth: 220, editable: true }),
      getLinkColumn("created_by_name", "Created By", (params) => (params.data?.id ? `/users/${params.data?.created_by}` : null), { minWidth: 220, editable: true }),
      getLinkColumn("updated_by_name", "Updated By", (params) => (params.data?.id ? `/users/${params.data?.updated_by}` : null), { minWidth: 220, editable: true }),
    ],
    [],
  );

  // ── Filter fields ─────────────────────────────────────────────────────────
  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const sortFields = buildSortFilterFields({
      sortOptions: TARGET_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      sortByLabel: "Sort by",
      sortOrderLabel: "Sort order",
    });

    return [
      ...sortFields,
      buildSelectFilter("status", "Status", TARGET_STATUS_OPTIONS),
      buildSelectFilter("target_period", "Period", TARGET_PERIOD_OPTIONS),
      buildDateRangeFilterField({
        key: "start_date",
        label: "Start Date",
        startKey: "start_date_from",
        endKey: "start_date_to",
      }),

      buildDateRangeFilterField({
        key: "end_date",
        label: "End Date",
        startKey: "end_date_from",
        endKey: "end_date_to",
      }),

      buildDateRangeFilterField({
        key: "created_at",
        label: "Created At",
        startKey: "created_at_from",
        endKey: "created_at_to",
      }),

      buildDateRangeFilterField({
        key: "updated_at",
        label: "Updated At",
        startKey: "updated_at_from",
        endKey: "updated_at_to",
      }),
    ];
  }, []);

  // ── View tabs ─────────────────────────────────────────────────────────────
  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const toolbarActions = [
    buildAddAction(() => setShowCreate(true), isAdminOrSuper || hasPermission(userPermissions, PERMISSIONS.TARGET.CREATE)),
    buildDeleteAction(async () => {
      if (selectedIds.length === 0) return;
      setConfirmTitle("Delete Devices");
      setConfirmMessage(
        "Are you sure you want to delete the selected devices? This action cannot be undone.",
      );
      setConfirmIds([...selectedIds]);
      confirmIdsRef.current = [...selectedIds];
      setConfirmOpen(true);
    }, {
      disabled: selectedIds.length === 0,
      show: isAdminOrSuper || hasPermission(userPermissions, PERMISSIONS.TARGET.DELETE),
    }),
    buildFiltersAction(),
    buildColumnsAction(),
  ];

  const deleteTargetMutation = useDeleteTargetMutation();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search targets..."
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
              entityKey={TARGET_ENTITY_KEY}
              entityLabel="Target"
              columns={localColumns}
              defaultColumns={targetColumns}
              kanbanOptions={TARGET_STATUS_OPTIONS}
              selectedView={selectedView as "table" | "cards"}
              tableRef={tableRef}
              page={page}
              pageSize={pageSize}
              gridContext={gridContext}
              total={pagination?.totalCount ?? 0}
              totalPages={pagination?.totalPages ?? 1}
              pageStateConfig={{ setPage, setPageSize }}
              getRowId={(row: TargetRow) => row.id}
              columnSelectorTitle="Target Columns"
              columnStateConfig={{
                setColumns: setLocalColumns,
                actionsColumn: actionsColumn,
              }}
              columnPanelRef={columnPanelRef}
              filterFields={filterFields}
              defaultFilters={TARGET_FILTER_DEFAULTS}
              filters={filters}
              onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
              onFiltersChange={setFilters}
              onApplyFilters={() => setPage(1)}
              onClearFilters={() => {
                setFilters({ ...TARGET_FILTER_DEFAULTS });
                setPage(1);
              }}
              filterPanelRef={filterPanelRef}

            />
          </div>

        </div>
      </main>
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Target"
        subtitle="Add a new target to keep track"
        icon={Factory}
        maxWidth="max-w-3xl"
      >
        <TargetForm
          mode="create"
          onSuccess={() => setShowCreate(false)}
          close={() => setShowCreate(false)}
          isOpen={showCreate}
          plantId={plantId ?? ""}
        />
      </Modal>

      <Modal
        open={!!(showEdit && editingTarget)}
        onClose={() => {
          setShowEdit(false);
          setEditingTarget(null);
        }}
        title="Edit Target"
        subtitle={editingTarget?.target_name || "Update target details"}
        icon={Cpu}
        maxWidth="max-w-3xl"
      >
        {editingTarget && (
          <TargetForm
            mode="edit"
            initialValues={editingTarget}
            onSuccess={() => {
              setShowEdit(false);
              setEditingTarget(null);
            }}
            close={() => {
              setShowEdit(false);
              setEditingTarget(null);
            }}
            isOpen={!!(showEdit && editingTarget)}
            plantId={plantId ?? ""}
          />
        )}
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
          await deleteTargetMutation.mutateAsync(ids);
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
    </div>
  );
};

export default Target;
