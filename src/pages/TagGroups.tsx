import React, { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import CommonToolbar, {
  type ToolbarActionConfig,
  buildAddAction,
  buildColumnsAction,
  buildDeleteAction,
  buildExportAction,
  buildFiltersAction,
  buildStatusAction,
} from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  type CommonColumnConfig,
  type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import Modal from "@/components/common/Modal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Spinner from "@/components/common/Spinner";
import TagGroupForm from "@/components/core/form/TagGroupForm";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchUserNames } from "@/services/operations/userAPI";
import {
  TAG_GROUP_ACTIVE_FILTER_OPTIONS,
  TAG_GROUP_SORT_OPTIONS,
  useDeleteTagGroupMutation,
  useGetTagGroupDetailsQuery,
  useGetTagGroupsListQuery,
  useToggleTagGroupStatusMutation,
  type TagGroupListFilters,
  type TagGroupRow,
} from "@/services/operations/tagGroupAPI";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";
import {
  getActiveStatusColumn,
  getDateColumn,
  getDisplayTextColumn,
  getLinkColumn,
  getLinkedUserNameAuditColumn,
  getActionsColumn,
} from "@/components/core/table/ListPageHelpers";
import {
  buildDeleteRowAction,
  buildEditRowAction,
  buildToggleStatusRowAction,
} from "@/components/common/RowActions";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";


const entityKey = "tag-group";
const actionsField = "id";
const {
  buildAsyncSelectFilter,
  buildAuditFilterFields,
  buildSelectFilter,
  buildSortFilterFields,
  createFilterDefaults,
  setMultiSelectFilterParam,
  setSingleSelectFilterParam,
} = CommonFilterPanel;

const TAG_GROUP_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
  keys: [
    "plant_id",
    "category",
    "is_active",
    "created_by",
    "created_at",
    "updated_by",
    "updated_at",
  ],
});

function toTagGroupListFilters(filters: FilterValues): TagGroupListFilters {
  const out: TagGroupListFilters = {};

  for (const [key, raw] of Object.entries(filters)) {
    if (key === "plant_id" || key === "created_by" || key === "updated_by") {
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) out[key] = value;
  }

  setSingleSelectFilterParam(out, filters, "plant_id");
  setMultiSelectFilterParam(out, filters, "created_by");
  setMultiSelectFilterParam(out, filters, "updated_by");

  return out;
}

const tagGroupRowActions = createCrudRowActionsCellRenderer<TagGroupRow>({
  actions: [
    buildToggleStatusRowAction("tagGroupGrid_toggleStatus"),
    buildEditRowAction("tagGroupGrid_openEdit"),
    buildDeleteRowAction("tagGroupGrid_requestDelete"),
  ],
});

const filterFields: FilterFieldConfig[] = [
  buildAsyncSelectFilter("plant_id", "Plant", (search = "") => fetchPlantNames(search, 1, 50), { placeholder: "Search plant..." }),
  {
    key: "category",
    label: "Category",
    placeholder: "Filter by category",
  },
  buildSelectFilter("is_active", "Active", TAG_GROUP_ACTIVE_FILTER_OPTIONS),
  ...buildAuditFilterFields({
    dateMode: "daterange",
    CreatedBy: true,
    UpdatedBy: true,
    CreatedAt: true,
    UpdatedAt: true,
    createdByLabel: "Created by",
    updatedByLabel: "Updated by",
    createdAtLabel: "Created at",
    updatedAtLabel: "Updated at",
    userLoadOptions: (search = "") => fetchUserNames(search, 1, 50),
  }),
  ...buildSortFilterFields({
    sortOptions: TAG_GROUP_SORT_OPTIONS,
    sortByLabel: "Sort by",
    sortOrderLabel: "Sort order",
  }),
];

const defaultColumns: CommonColumnConfig[] = [
  getLinkColumn("name", "Tag group", (params) => (params.data?.id ? `/tag-groups/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
  getLinkColumn("plant_name", "Plant", (params) => (params.data?.plant_id && params.value ? `/plants/${params.data.plant_id}` : null), { minWidth: 190 }),
  getDisplayTextColumn("category", "Category", { minWidth: 160, editable: true }),
  getActiveStatusColumn("is_active", "Active", { minWidth: 110 }),
  getLinkedUserNameAuditColumn("created_by_name", "Created by", "created_by", { visible: true, minWidth: 170 }),
  getLinkedUserNameAuditColumn("updated_by_name", "Updated by", "updated_by", { visible: true, minWidth: 170 }),
  getDateColumn("created_at", "Created At"),
  getDateColumn("updated_at", "Updated At"),
];

const TagGroups: React.FC = () => {
  const [, rerenderAfterWidthReset] = React.useState(0);
  React.useLayoutEffect(() => {
    if (resetSavedActionsColumnWidth(entityKey, actionsField)) {
      rerenderAfterWidthReset((value) => value + 1);
    }
  }, []);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterValues>({ ...TAG_GROUP_FILTER_DEFAULTS });
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<TagGroupRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const listApiFilters = useMemo(() => toTagGroupListFilters(filters), [filters]);

  const deleteMutation = useDeleteTagGroupMutation();
  const toggleStatusMutation = useToggleTagGroupStatusMutation();

  const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
  const tableRef = React.useRef<CommonTableHandle>(null);
  const [selectedView, setSelectedView] = useResponsiveDataView();

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
  } = useGetTagGroupsListQuery({
    page,
    limit: pageSize,
    search,
    filters: listApiFilters,
  });

  const { data: editingDetails, isLoading: isLoadingEditingDetail } =
    useGetTagGroupDetailsQuery(showEdit && editing?.id ? editing.id : null, {
      enabled: !!showEdit && !!editing?.id,
      staleTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  useEffect(() => {
    if (isError) {
      toast.error(
        error ? getErrorMessage(error) : "Failed to load tag groups.",
        { duration: 4000, position: "top-right" },
      );
    }
  }, [error, isError]);

  const tableData = useMemo(() => listResponse?.rows ?? [], [listResponse]);

  const pagination = useMemo(() => {
    return listResponse?.pagination ?? {
      page,
      limit: pageSize,
      totalCount: 0,
      totalPages: 1,
    };
  }, [listResponse, page, pageSize]);

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(tagGroupRowActions),[],);
  const canShowTagGroupActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.TAG_GROUP.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.TAG_GROUP.DELETE);


  const gridContext = useMemo(
    () => ({
      tagGroupGrid_toggleStatus: (data: TagGroupRow) => {
        if (!data.id) return;
        toggleStatusMutation.mutate({ id: data.id, is_active: !data.is_active });
      },
      tagGroupGrid_openEdit: (row: TagGroupRow) => {
        setEditing(row);
        setShowEdit(true);
      },
      tagGroupGrid_requestDelete: (id: string) => {
        if (!id) return;
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [toggleStatusMutation],
  );

  const gridContextRevision = useMemo(
    () =>
      tableData
        .map((row) => `${row.id}:${row.is_active ? "1" : "0"}`)
        .join("|"),
    [tableData],
  );

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one tag group before deleting.");
      return;
    }
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="h-4 w-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
  ];

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), true),
    buildDeleteAction(handleDeleteBulk, { 
      disabled: selectedIds.length === 0, 
      show: true 
    }),
    buildStatusAction({
      selectedIds,
      rows: tableData,
      entityLabel: "tag group",
      isLoading: toggleStatusMutation.isPending,
      show: true,
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

  return (
    <div className="flex w-full flex-col px-2">
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search tag groups..."
            tabs={viewTabs}
            selectedTab={selectedView}
            onTabChange={(key: string) => setSelectedView(key as "table" | "cards")}
            filterPanelRef={filterPanelRef}
            columnPanelRef={columnPanelRef}
            tableRef={tableRef}
          />

          <CommonDataView
            data={tableData}
            loading={isLoading}
            entityKey={entityKey}
            entityLabel="Tag group"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView}
            tableRef={tableRef}
            gridContext={gridContext}
            gridContextRevision={gridContextRevision}
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.totalCount}
            totalPages={pagination.totalPages}
            pageStateConfig={{ setPage, setPageSize }}
            getRowId={(row: TagGroupRow) => row.id}
            columnSelectorTitle="Tag group columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: canShowTagGroupActionsColumn ? actionsColumn : undefined,
              excludedFields: ["id", actionsField],
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters({ ...TAG_GROUP_FILTER_DEFAULTS });
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
        title="Create tag group"
        subtitle="Configure grouped component tags for a plant"
        maxWidth="max-w-3xl"
        icon={navIcons.tagGroups}
      >
        <TagGroupForm mode="create" onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={!!(showEdit && editing)}
        onClose={() => {
          setShowEdit(false);
          setEditing(null);
        }}
        title="Edit tag group"
        subtitle={editing?.name || "Update tag group"}
        maxWidth="max-w-3xl"
        icon={navIcons.tagGroups}
      >
        {showEdit && editing ? (
          isLoadingEditingDetail && !editingDetails ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={3} />
            </div>
          ) : (
            <TagGroupForm
              mode="edit"
              initialValues={editing}
              editValues={editingDetails ?? editing}
              onSuccess={() => {
                setShowEdit(false);
                setEditing(null);
              }}
            />
          )
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
          if (confirmIds.length === 0) return;
          try {
            await deleteMutation.mutateAsync(confirmIds);
            setConfirmOpen(false);
            setConfirmIds([]);
          } catch {
            // handled in mutation
          }
        }}
        title={confirmIds.length > 1 ? "Delete tag groups" : "Delete tag group"}
        message={
          confirmIds.length > 1
            ? `Are you sure you want to delete ${confirmIds.length} tag groups? This action cannot be undone.`
            : "Are you sure you want to delete this tag group? This action cannot be undone."
        }
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default TagGroups;
