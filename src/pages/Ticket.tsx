import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
    type CommonColumnConfig,
    type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import CommonToolbar, {
    buildAddAction,
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
import { Table as TableIcon, LayoutGrid, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/services/api";
import { useGetAllTicketsQuery } from "@/services/operations/ticketAPI";
import { useGetAllUsersQuery } from "@/services/operations/userAPI"
import {
    TICKET_STATUS_OPTIONS,
    TICKET_PRIORITY_OPTIONS,
    TICKET_SORT_OPTIONS,
    useDeleteTicketMutation,
    type TicketRow,
    type TicketListFilters,
    type Option
} from "@/services/operations/ticketAPI";
import TicketCard from "@/components/core/customcards/TicketCard.tsx";
import Modal from "@/components/common/Modal";
import TicketForm from "@/components/core/form/TicketForm";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
    buildDisplayNumberColumn,
    buildDisplayTextColumn,
    getDateColumn,
    getActionsColumn,
    getLinkColumn
} from "@/components/core/table/ListPageHelpers";
import {
    buildDeleteRowAction,
    buildEditRowAction,
} from "@/components/common/RowActions";
import { createCrudRowActionsCellRenderer } from "@/components/core/table/TableRenderers";
import { PERMISSIONS, hasPermission, } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";

// ─── Entity key ───────────────────────────────────────────────────────────────

const TICKET_ENTITY_KEY = "plantTicket";

// ─── Filter helpers ────────────────────────────────────────────────────────────

const {
    buildSelectFilter,
    buildDateRangeFilterField,
    buildSortFilterFields,
    createFilterDefaults,
    setScalarFilterParam,
} = CommonFilterPanel;

const TICKET_FILTER_DEFAULTS: FilterValues = createFilterDefaults({
    keys: [
        "status",
        "priority",
        "created_at",
        "resolved_at",
        "updated_at",
        "created_by",
        "updated_by",
    ],
});

function toTicketApiFilters(filters: FilterValues): TicketListFilters {
    const sort_by = filters.sort_by?.trim() || "created_at";
    const sort_order = filters.sort_order?.trim() || "desc";

    const base: Record<string, unknown> = { sort_by, sort_order };

    setScalarFilterParam(base, filters, "status");
    setScalarFilterParam(base, filters, "priority");
    setScalarFilterParam(base, filters, "created_at_from");
    setScalarFilterParam(base, filters, "created_at_to");
    setScalarFilterParam(base, filters, "resolved_at_from");
    setScalarFilterParam(base, filters, "resolved_at_to");
    setScalarFilterParam(base, filters, "updated_at_from");
    setScalarFilterParam(base, filters, "updated_at_to");
    setScalarFilterParam(base, filters, "created_by");
    setScalarFilterParam(base, filters, "updated_by");

    return base as TicketListFilters;
}

// ─── Row actions cell renderer ────────────────────────────────────────────────

const ticketRowActionsCellRenderer =createCrudRowActionsCellRenderer<TicketRow>({
        actions: [
            buildEditRowAction("ticketGrid_openEdit",PERMISSIONS.TICKET.UPDATE),
            // buildDeleteRowAction("ticketGrid_requestDelete"),
        ],
    });



// ─── Page component ───────────────────────────────────────────────────────────

const PlantTickets: React.FC = () => {
    // const { id: plantId } = useParams<{ id: string }>();

    // ── Local state ───────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [localColumns, setLocalColumns] = useState<CommonColumnConfig[]>([]);
    const [filters, setFilters] = useState<FilterValues>(() => ({ ...TICKET_FILTER_DEFAULTS }));
    const [showCreate, setShowCreate] = useState(false);
    const [selectedView, setSelectedView] = useResponsiveDataView();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showEdit, setShowEdit] = useState(false);
    const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState("Confirm");
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmIds, setConfirmIds] = useState<string[]>([]);
    const confirmIdsRef = React.useRef<string[]>([]);

    const filterPanelRef = React.useRef<{ openPanel: () => void }>(null);
    const columnPanelRef = React.useRef<{ openPanel: () => void }>(null);
    const tableRef = React.useRef<CommonTableHandle>(null);

    const { permissions: userPermissions } = useAppSelector((state) => state.auth);

    // ── API filters ───────────────────────────────────────────────────────────
    const apiFilters = useMemo(() => toTicketApiFilters(filters), [filters]);

    const actionsColumn: CommonColumnConfig = useMemo(
        () => getActionsColumn(ticketRowActionsCellRenderer),
        [],
    );

    const gridContext = useMemo(
        () => ({
          ticketGrid_openEdit: (row: TicketRow) => {
            setEditingTicket(row);
            setShowEdit(true);
          },
        //   ticketGrid_requestDelete: (rowOrId: TicketRow | string) => {
        //     const id = typeof rowOrId === "string" ? rowOrId : rowOrId?.id;
        //     if (!id) return;
        //     setConfirmTitle("Delete Asset");
        //     setConfirmMessage("Are you sure you want to delete this asset? This action cannot be undone.");
        //     setConfirmIds([id]);
        //     confirmIdsRef.current = [id];
        //     setConfirmOpen(true);
        //   },
          
        }),
        []
      );



    // ── Data query ────────────────────────────────────────────────────────────
    const {
        data: ticketResponse,
        isLoading,
        isError,
        error,
    } = useGetAllTicketsQuery({

        search,
        filters: apiFilters,
        page,
        limit: pageSize,

    });

    const { data: userOptionsData } = useGetAllUsersQuery({});
    const userOptions =
        (userOptionsData?.data?.users ?? []).map(
            (u: any) => ({
                value: u.id,
                label: u.full_name ?? u.email ?? u.id,
            })

        );
    
    // const loadUserOptions = useCallback(
    //     async (): Promise<Option[]> =>
    //         (userOptionsData?.rows ?? userOptionsData?.data?.rows ?? []).map(
    //             (u: any) => ({ value: u.id, label: u.name ?? u.email ?? u.id })
    //         ),
    //     [userOptionsData]
    // );


    // ── Error toast ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (isError) {
            const msg = error
                ? getErrorMessage(error)
                : "Failed to load tickets. Please try again.";
            toast.error(msg, { duration: 4000, position: "top-right" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isError]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const tableData = useMemo(() => ticketResponse?.data?.tickets ?? [], [ticketResponse?.data]);
    const pagination = useMemo(() => ticketResponse?.pagination, [ticketResponse?.pagination]);

    // ─── Column definitions ───────────────────────────────────────────────────

    const ticketColumns: CommonColumnConfig[] = useMemo(
        () => [
            // buildDisplayNumberColumn("ticket_number", "Ticket Number", { minWidth: 120 }),
            getLinkColumn("title", "Title", (params) => (params.data?.id ? `/ticket/${params.data.id}` : null), { minWidth: 220, pinned: "left", editable: true }),
            buildDisplayTextColumn("status", "Status", { minWidth: 140 }),
            buildDisplayTextColumn("priority", "Priority", { minWidth: 130 }),
            buildDisplayTextColumn("plant_name", "Plant", { minWidth: 180 }),
            buildDisplayTextColumn("name", "Reporter Name", { minWidth: 180 }),
            buildDisplayTextColumn("email", "Reporter Email", { minWidth: 200 }),
            buildDisplayTextColumn("phone_number", "Phone", { minWidth: 160 }),
            buildDisplayTextColumn("component_type", "Component Type", { minWidth: 180 }),
            buildDisplayTextColumn("component", "Component", { minWidth: 180 }),
            buildDisplayTextColumn("assigned_to", "Assigned To", { minWidth: 180 }),
            buildDisplayTextColumn("description", "Description", {
                minWidth: 300,
                visible: false,
            }),
            getDateColumn("due_date", "Due Date", { minWidth: 160, dateOnly: true }),
            //   getDateColumn("resolved_at", "Resolved At", { minWidth: 180 }),
            //   buildDisplayTextColumn("feedback", "Feedback", {
            //     minWidth: 220,
            //     visible: false,
            //   }),
            //   buildDisplayTextColumn("status_history", "Status History", {
            //     minWidth: 250,
            //     visible: false,
            //   }),
            //   buildDisplayTextColumn("created_by", "Created By", {
            //     minWidth: 220,
            //     visible: false,
            //   }),
            //   buildDisplayTextColumn("updated_by", "Updated By", {
            //     minWidth: 220,
            //     visible: false,
            //   }),
            //   getDateColumn("created_at", "Created At"),
            //   getDateColumn("updated_at", "Updated At"),
        ],
        [],
    );

    // ── Filter fields ─────────────────────────────────────────────────────────
    const filterFields: FilterFieldConfig[] = useMemo(() => {
        const sortFields = buildSortFilterFields({
            sortOptions: TICKET_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            sortByLabel: "Sort by",
            sortOrderLabel: "Sort order",
        });

        return [
    ...sortFields,
    buildSelectFilter("status", "Status", TICKET_STATUS_OPTIONS),
    buildSelectFilter("priority", "Priority", TICKET_PRIORITY_OPTIONS),

    buildDateRangeFilterField({
        key: "created_at",
        label: "Created At",
        startKey: "created_at_from",
        endKey: "created_at_to",
    }),

    buildDateRangeFilterField({
        key: "resolved_at",
        label: "Resolved At",
        startKey: "resolved_at_from",
        endKey: "resolved_at_to",
    }),

    buildDateRangeFilterField({
        key: "updated_at",
        label: "Updated At",
        startKey: "updated_at_from",
        endKey: "updated_at_to",
    }),

    buildSelectFilter(
        "created_by",
        "Created By",
        userOptions,
    ),

    buildSelectFilter(
        "updated_by",
        "Updated By",
        userOptions,
    ),
];
    }, []);

    // ── View tabs ─────────────────────────────────────────────────────────────
    const viewTabs = [
        { key: "table", label: "", icon: <TableIcon className="w-4 h-4" /> },
        { key: "cards", label: "", icon: <LayoutGrid className="w-4 h-4" /> },
    ];

    const toolbarActions = [
        buildAddAction(() => setShowCreate(true),hasPermission(userPermissions, PERMISSIONS.TICKET.CREATE)),
        // buildDeleteAction(async () => {
        //     if (selectedIds.length === 0) return;
        //     setConfirmTitle("Delete Assets");
        //     setConfirmMessage(
        //         "Are you sure you want to delete the selected assets? This action cannot be undone.",
        //     );
        //     setConfirmIds([...selectedIds]);
        //     confirmIdsRef.current = [...selectedIds];
        //     setConfirmOpen(true);
        // }, {
        //     disabled: selectedIds.length === 0,
        //     //   show: hasPermission(userPermissions, PERMISSIONS.ASSET.DELETE),
        // }),
        buildFiltersAction(),
        buildColumnsAction(),
    ];

    const deleteTicketMutation = useDeleteTicketMutation();

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full flex flex-col px-2">
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

                    <CommonToolbar
                        search={search}
                        onSearchChange={setSearch}
                        actions={toolbarActions}
                        placeholder="Search tickets..."
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
                            entityKey={TICKET_ENTITY_KEY}
                            entityLabel="Ticket"
                            columns={localColumns}
                            defaultColumns={ticketColumns}
                            kanbanOptions={TICKET_STATUS_OPTIONS}
                            selectedView={selectedView as "table" | "cards"}
                            tableRef={tableRef}
                            page={page}
                            pageSize={pageSize}
                            total={pagination?.totalCount ?? 0}
                            totalPages={pagination?.totalPages ?? 1}
                            pageStateConfig={{ setPage, setPageSize }}
                            gridContext={gridContext}
                            onSelectionChanged={(ids: string[]) => setSelectedIds(ids)}
                            getRowId={(row: TicketRow) => row.id}
                            columnSelectorTitle="Ticket Columns"
                            columnStateConfig={{
                                setColumns: setLocalColumns,
                                actionsColumn: actionsColumn,
                            }}
                            columnPanelRef={columnPanelRef}
                            filterFields={filterFields}
                            defaultFilters={TICKET_FILTER_DEFAULTS}
                            filters={filters}
                            onFiltersChange={setFilters}
                            onApplyFilters={() => setPage(1)}
                            onClearFilters={() => {
                                setFilters({ ...TICKET_FILTER_DEFAULTS });
                                setPage(1);
                            }}
                            filterPanelRef={filterPanelRef}
                            // customCardComponent={TicketCard}
                        />
                    </div>

                </div>
            </main>

            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create Ticket"
                subtitle="Raise a new support or maintenance ticket"
                icon={Ticket}
                maxWidth="max-w-3xl"
            >
                <TicketForm
                    mode="create"
                    onSuccess={() => setShowCreate(false)}
                    close={() => setShowCreate(false)}
                    isOpen={showCreate}
                />
            </Modal>

            <Modal
                open={!!(showEdit && editingTicket)}
                onClose={() => {
                    setShowEdit(false);
                    setEditingTicket(null);
                }}
                title="Edit Ticket"
                subtitle={editingTicket?.title || "Update ticket details"}
                icon={Ticket}
                maxWidth="max-w-3xl"
            >
                {editingTicket && (
                    <TicketForm
                        mode="edit"
                        initialValues={editingTicket}
                        onSuccess={() => {
                            setShowEdit(false);
                            setEditingTicket(null);
                        }}
                        close={() => {
                            setShowEdit(false);
                            setEditingTicket(null);
                        }}
                        isOpen={!!(showEdit && editingTicket)}
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
                    await deleteTicketMutation.mutateAsync(ids);
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

export default PlantTickets;