/**
 * Tag templates module — list / CRUD for tag templates (CommonToolbar + CommonDataView).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit, Layers3, Table as TableIcon, LayoutGrid } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

import CommonToolbar, {
  type ToolbarActionConfig,
} from "@/components/core/table/CommonToolbar";
import CommonDataView from "@/components/core/table/CommonDataView";
import {
  default as CommonFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/core/table/CommonFilterPanel";
import { useResponsiveDataView } from "@/components/core/table/UseResponsiveDataView";
import Modal from "@/components/common/Modal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import type {
  CommonColumnConfig,
  CommonTableHandle,
} from "@/components/core/table/CommonTable";
import {
  createCrudRowActionsCellRenderer,
  resetSavedActionsColumnWidth,
} from "@/components/core/table/TableRenderers";
import {
  fetchTagTemplateCategoryOptions,
  getTagTemplateCategoryLabel,
  getTagTemplatePlantCategoryLabel,
  normalizeTagTemplateClientRow,
  useGetAllTagTemplatesQuery,
  useGetTagTemplateDetailsQuery,
  useDeleteTagTemplateMutation,
  useToggleTagTemplateStatusMutation,
  useUpdateTagTemplateMutation,
  type TagTemplateRow,
} from "@/services/operations/tagTemplateAPI";
import { fetchPlantCategoryOptions } from "@/services/operations/plantAPI";
import { getErrorMessage } from "@/services/api";
import ColorBadge from "@/components/common/ColorBadge";
import TagTemplateForm from "@/components/core/form/TagTemplateForm";
import { hasPermission, PERMISSIONS, isAdminOrSuperAdminRole } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";
import Spinner from "@/components/common/Spinner";
import { fetchUserNames } from "@/services/operations/userAPI";
import type { ICellRendererParams } from "@ag-grid-community/core";
import {
  getActiveStatusColumn,
  getDateColumn,
  getLinkColumn,
  getRendererColumn,
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
import BulkTagTemplateForm from "@/components/core/form/BulkTagTemplateForm";

const BASE_ENTITY_KEY = "tagTemplate";
const {
  buildActiveStatusFilter,
  buildAsyncSelectFilter,
  buildAuditFilterFields,
  buildSortFilterFields,
  createFilterDefaults,
  DESC_ASC_SORT_OPTIONS,
  setMultiSelectFilterParam,
  setSingleSelectFilterParam,
} = CommonFilterPanel;

function toTagTemplateListFilters(filters: FilterValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(filters)) {
    if (key === "created_by" || key === "updated_by") {
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) out[key] = value;
  }

  setMultiSelectFilterParam(out, filters, "created_by");
  setMultiSelectFilterParam(out, filters, "updated_by");
  setSingleSelectFilterParam(out, filters, "category");
  setSingleSelectFilterParam(out, filters, "plant_category");

  return out;
}

// ─── Cell badges (category / status) ──────────────────────────────────────────

const CategoryBadge = ({ value }: { value: string }) => (
  <ColorBadge variant="orange" className="tracking-wide">
    {getTagTemplateCategoryLabel(value)}
  </ColorBadge>
);

const PlantCategoryBadge = ({ value }: { value: string }) => (
  <ColorBadge variant="blue" className="tracking-wide">
    {getTagTemplatePlantCategoryLabel(value)}
  </ColorBadge>
);

// ─── Row actions cell renderer ────────────────────────────────────────────────

const tagTemplateRowActionsCellRenderer =
  createCrudRowActionsCellRenderer<TagTemplateRow>({
    actions: [
      buildToggleStatusRowAction("tagTemplateGrid_toggleStatus", PERMISSIONS.Tag_TEMPLATE.UPDATE),
      buildEditRowAction("tagTemplateGrid_openEdit", PERMISSIONS.Tag_TEMPLATE.UPDATE),
      buildDeleteRowAction("tagTemplateGrid_requestDelete", PERMISSIONS.Tag_TEMPLATE.DELETE),
    ],
  });

// ─── Page component ───────────────────────────────────────────────────────────

const TagTemplates: React.FC = () => {
  const [, rerenderAfterWidthReset] = React.useState(0);
  React.useLayoutEffect(() => {
    if (resetSavedActionsColumnWidth(entityKey)) {
      rerenderAfterWidthReset((value) => value + 1);
    }
  }, []);

  const { user, permissions: userPermissions } = useAppSelector(
    (state) => state.auth,
  );
  const isAdmin = isAdminOrSuperAdminRole(user?.role);
  const entityKey = isAdmin ? `${BASE_ENTITY_KEY}-admin` : `${BASE_ENTITY_KEY}-basic`;

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
  const [selectedView, setSelectedView] = useResponsiveDataView();

  const [showCreate, setShowCreate] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingRow, setEditingRow] = useState<TagTemplateRow | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const tableRef = useRef<CommonTableHandle>(null);
  const filterPanelRef = useRef<{ openPanel: () => void }>(null);
  const columnPanelRef = useRef<{ openPanel: () => void }>(null);

  const [filters, setFilters] = useState<FilterValues>(
    createFilterDefaults({
      keys: [
        "category",
        "plant_category",
        "is_active",
        "created_by",
        "updated_by",
        "created_at_start",
        "created_at_end",
        "updated_at_start",
        "updated_at_end",
      ],
    }),
  );

  // ── Filter fields ───────────────────────────────────────────────────────────

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      buildAsyncSelectFilter("category", "Category", fetchTagTemplateCategoryOptions, { placeholder: "Search category…" }),
      buildAsyncSelectFilter("plant_category", "Plant category", fetchPlantCategoryOptions, { placeholder: "Search plant category…" }),
      buildActiveStatusFilter("is_active", "Status"),
      ...buildAuditFilterFields({
        CreatedAt: true,
        UpdatedAt: true,
        CreatedBy: true,
        UpdatedBy: true,
        dateMode: "daterange",
        createdAtKey: "created_at",
        updatedAtKey: "updated_at",
        createdAtLabel: "Created at",
        updatedAtLabel: "Updated at",
        userLoadOptions: (search = "") => fetchUserNames(search, 1, 50),
      }),
      ...buildSortFilterFields({
        sortOptions: [
          { value: "created_at", label: "Created At" },
          { value: "updated_at", label: "Updated At" },
          { value: "name", label: "Name" },
          { value: "category", label: "Category" },
          { value: "plant_category", label: "Plant category" },
          { value: "version", label: "Version" },
        ],
        sortOrderOptions: DESC_ASC_SORT_OPTIONS,
      }),
    ],
    [],
  );

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteTagTemplateMutation();
  const toggleStatusMutation = useToggleTagTemplateStatusMutation();
  const updateMutation = useUpdateTagTemplateMutation();
  const {
    data: editingTagTemplateResponse,
    isLoading: isLoadingEditingTagTemplate,
  } = useGetTagTemplateDetailsQuery(showEdit ? editingRow?.id : null, {
    staleTime: 0,
    enabled: !!showEdit && !!editingRow?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ── Columns ───────────────────────────────────────────────────────────────────
  const defaultColumns: CommonColumnConfig[] = useMemo(
    () => [
      getLinkColumn("name", "Name", (params) => (params.data?.id ? `/tag-templates/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
      getRendererColumn("category", "Category", (params: ICellRendererParams) => params.value ? <CategoryBadge value={params.value} /> : "-", { minWidth: 120 }),
      getRendererColumn("plant_category", "Plant category", (params: ICellRendererParams) => params.value ? <PlantCategoryBadge value={params.value} /> : "-", { minWidth: 130 }),
      getRendererColumn("version", "Version", (params: ICellRendererParams) => params.value != null ? <span className="font-medium text-neutral-800 dark:text-neutral-100">{params.value}</span> : "-", { minWidth: 130, filter: "agTextColumnFilter", filterValueGetter: (params: any) => params.data?.version }),
      getActiveStatusColumn("is_active", "Status", { minWidth: 100, badgeClassName: "tracking-wide" }),
      getLinkedUserNameAuditColumn("created_by_name", "Created By", "created_by", { visible: true, minWidth: 160 }),
      getLinkedUserNameAuditColumn("updated_by_name", "Updated By", "updated_by", { visible: true, minWidth: 160 }),
      getDateColumn("created_at", "Created At"),
      getDateColumn("updated_at", "Updated At"),
    ],
    [],
  );

  const actionsColumn: CommonColumnConfig = useMemo(() => getActionsColumn(tagTemplateRowActionsCellRenderer),[],);
  const canShowTagTemplateActionsColumn =
    hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.UPDATE) ||
    hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.DELETE);

  const gridContext = useMemo(
    () => ({
      userPermissions,
      tagTemplateGrid_toggleStatus: (row: TagTemplateRow) => {
        if (!row?.id) return;
        toggleStatusMutation.mutate(
          { id: row.id, is_active: !row.is_active },
          {
            onSuccess: () =>
              queryClient.invalidateQueries({
                queryKey: ["tagTemplates", "list"],
              }),
          },
        );
      },
      tagTemplateGrid_openEdit: (row: TagTemplateRow) => {
        setEditingRow(row);
        setShowEdit(true);
      },
      tagTemplateGrid_requestDelete: (id: string) => {
        if (!id) return;
        setConfirmTitle("Delete Tag Template");
        setConfirmMessage(
          "Are you sure you want to delete this tag template? This cannot be undone.",
        );
        setConfirmIds([id]);
        setConfirmOpen(true);
      },
    }),
    [queryClient, toggleStatusMutation, userPermissions],
  );

  // ── Query ──────────────────────────────────────────────────────────────────────
  const listApiFilters = useMemo(() => toTagTemplateListFilters(filters), [filters]);

  const { data, isLoading, isError, error } = useGetAllTagTemplatesQuery({
    search,
    filters: listApiFilters,
    page,
    limit: pageSize,
  });

  useEffect(() => {
    if (!isError) return;
    toast.error(
      error ? getErrorMessage(error) : "Failed to load tag templates",
      {
        duration: 4000,
        position: "top-right",
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const tableData = useMemo(() => {
    const payload = data as { data?: { templates?: unknown; data?: unknown; pagination?: unknown } } | undefined;
    const raw = payload?.data?.templates ?? payload?.data?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((row: Record<string, unknown>) =>
      normalizeTagTemplateClientRow(row),
    );
  }, [data]);
  const gridContextRevision = useMemo(() => {
    const permissionsKey = [...(userPermissions ?? [])]
      .map((permission) => String(permission).toLowerCase())
      .sort()
      .join("|");
    const statusKey = tableData
      .map((template: TagTemplateRow) => `${template.id}:${template.is_active ? "1" : "0"}`)
      .join("|");

    return `${permissionsKey}__${statusKey}`;
  }, [tableData, userPermissions]);
  const serverPagination = useMemo(
    () => data?.data?.pagination as { totalCount: number, totalPages: number } | undefined,
    [data],
  );
  const editingTagTemplateDetails = editingTagTemplateResponse ?? null;

  // ── Bulk delete ───────────────────────────────────────────────────────────────
  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one template to delete");
      return;
    }
    setConfirmTitle("Delete Tag Templates");
    setConfirmMessage(
      `Delete ${selectedIds.length} tag template(s)? This cannot be undone.`,
    );
    setConfirmIds(selectedIds);
    setConfirmOpen(true);
  };

  const viewTabs = [
    { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
    { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const toolbarActions: ToolbarActionConfig[] = [
    buildAddAction(() => setShowCreate(true), true),
    {
      key: "bulk-add",
      label: "Bulk Add",
      icon: <Layers3 className="w-4 h-4" />,
      onClick: () => setShowBulkCreate(true),
      variant: "primary",
      show: true,
    },
    buildDeleteAction(handleDeleteBulk, { disabled: selectedIds.length === 0, show: true }),
    buildStatusAction({
      selectedIds,
      rows: tableData,
      entityLabel: "tag template",
      isLoading: toggleStatusMutation.isPending,
      show: hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.UPDATE),
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
    <div className="w-full flex flex-col px-2">
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CommonToolbar
            search={search}
            onSearchChange={setSearch}
            actions={toolbarActions}
            placeholder="Search tag templates…"
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
            entityLabel="Tag Template"
            columns={localColumns}
            defaultColumns={defaultColumns}
            selectedView={selectedView as "table" | "cards"}
            tableRef={tableRef}
            gridContext={gridContext}
            gridContextRevision={gridContextRevision}
            onCellUpdate={({ id, field, value, oldValue }) => {
              if (!hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.UPDATE))
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
            columnSelectorTitle="Tag Template Columns"
            columnStateConfig={{
              setColumns: setLocalColumns,
              actionsColumn: canShowTagTemplateActionsColumn ? actionsColumn : undefined,
              validateSavedColumns: false,
              logSavedOrderParseError: false,
            }}
            columnPanelRef={columnPanelRef}
            filterFields={filterFields}
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={() => setPage(1)}
            onClearFilters={() => {
              setFilters(
                createFilterDefaults({
                  keys: [
                    "category",
                    "plant_category",
                    "is_active",
                    "created_by",
                    "updated_by",
                    "created_at_start",
                    "created_at_end",
                    "updated_at_start",
                    "updated_at_end",
                  ],
                }),
              );
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
        title="Create Tag Template"
        subtitle="Define a new tag mapping template"
        icon={navIcons.tagTemplates}
        maxWidth="max-w-3xl"
      >
        <TagTemplateForm mode="create" onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={showBulkCreate}
        onClose={() => setShowBulkCreate(false)}
        title="Bulk Create Tag Templates"
        subtitle="Generate and review multiple tag templates before sending one bulk request"
        icon={Layers3}
        maxWidth="max-w-3xl"
      >
        <BulkTagTemplateForm onSuccess={() => setShowBulkCreate(false)} />
      </Modal>

      <Modal
        open={!!(showEdit && editingRow)}
        onClose={() => {
          setShowEdit(false);
          setEditingRow(null);
        }}
        title="Edit Tag Template"
        subtitle={editingRow?.name ?? "Update tag template"}
        icon={Edit}
        maxWidth="max-w-3xl"
      >
        {showEdit && isLoadingEditingTagTemplate && !editingTagTemplateDetails ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={3} />
          </div>
        ) : editingRow && (
          <TagTemplateForm
            key={editingRow.id}
            mode="edit"
            initialValues={editingRow}
            editValues={editingTagTemplateDetails}
            onSuccess={() => {
              setShowEdit(false);
              setEditingRow(null);
            }}
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
            /* handled by mutation */
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

export default TagTemplates;
