import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, ChevronDown, ChevronRight, Search } from "lucide-react";
import type { ICellRendererParams } from "@ag-grid-community/core";
import CommonTable, {
    type CommonColumnConfig,
    type CommonTableHandle,
} from "@/components/core/table/CommonTable";
import { resetSavedActionsColumnWidth } from "@/components/core/table/TableRenderers";
import ColorBadge from "@/components/common/ColorBadge";
import type { WithChildren } from "@/utils/flatToTree";
import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
    depthAccent,
    flattenAll,
    flattenVisible,
    findFirstMatchingComponentId,
    formatComponentTypeTag,
    formatKw,
    getComponentTypeInitial,
    normalizeComponentType,
    renderStatusBadge,
    typeIcon,
} from "./shared";
import type { FlatRow } from "./shared";

interface ComponentStatsHeaderProps {
    totalCount: number;
    componentCounts: Array<{ type: string; label: string; count: number }>;
    selectedType: string | null;
    onTypeSelect: (type: string | null) => void;
}

const statCardBaseClass = [
    "flex min-w-[7.5rem] flex-1 flex-col rounded-xs border px-3 py-2.5 text-left transition-all duration-200",
    "border-neutral-200/90 bg-white shadow-sm",
    "hover:border-brand-300/80 hover:bg-brand-50/40 hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1",
    "dark:border-neutral-dark-200/80 dark:bg-neutral-dark-100 dark:shadow-none",
    "dark:hover:border-brand-700/60 dark:hover:bg-brand-950/25",
].join(" ");

const statCardSelectedClass = [
    "border-brand-400 bg-brand-50/70 shadow-md ring-2 ring-brand-500/25",
    "dark:border-brand-600 dark:bg-brand-950/35 dark:ring-brand-500/30",
].join(" ");

const statIconWrapClass = [
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-xs",
    "bg-brand-500/10 text-brand-600 ring-1 ring-brand-500/15",
    "dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-400/20",
].join(" ");

const ComponentStatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    isSelected: boolean;
    onClick: () => void;
}> = ({ icon, label, value, isSelected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={[statCardBaseClass, isSelected ? statCardSelectedClass : ""].join(" ")}
    >
        <div className="flex min-w-0 items-center gap-2">
            <div className={statIconWrapClass}>{icon}</div>
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                {label}
            </span>
        </div>
        <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-neutral-900 dark:text-neutral-100">
            {value}
        </p>
    </button>
);

export const ComponentStatsHeader: React.FC<ComponentStatsHeaderProps> = ({
    totalCount,
    componentCounts,
    selectedType,
    onTypeSelect,
}) => (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-0 gap-2 px-2">
            <ComponentStatCard
                icon={<Boxes className="h-4 w-4" />}
                label="Total"
                value={totalCount}
                isSelected={selectedType === null}
                onClick={() => onTypeSelect(null)}
            />
            {componentCounts.map((item) => (
                <ComponentStatCard
                    key={item.type}
                    icon={typeIcon(item.type, "h-4 w-4")}
                    label={item.label}
                    value={item.count}
                    isSelected={selectedType === item.type}
                    onClick={() => onTypeSelect(item.type)}
                />
            ))}
        </div>
    </div>
);

interface TableViewProps {
    tree: WithChildren<PlantComponentRow>[];
    search: string;
    isSearchActive: boolean;
    effectiveExpandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    highlightedType: string | null;
    isHighlightPulsing: boolean;
    renderActions?: (row: PlantComponentRow) => React.ReactNode;
    showActions?: boolean;
    onClearSearch: () => void;
    tableRef: React.RefObject<CommonTableHandle | null>;
    columnPanelRef: React.RefObject<{ openPanel: () => void } | null>;
}

const ENTITY_KEY = "plantComponentsHierarchy";
const TREE_INDENT_WIDTH = 20;
const TREE_TOGGLE_SLOT_WIDTH = 20;
const SEARCHABLE_COMPONENT_FIELDS = [
    "component_name",
    "component_code",
    "component_type",
] as const;
const BASE_COLUMNS: CommonColumnConfig[] = [
    {
        field: "component",
        headerName: "Component",
        visible: true,
        minWidth: 200,
        flex: 3,
        sortable: false,
        filter: false,
    },
    {
        field: "type",
        headerName: "Type",
        visible: true,
        minWidth: 140,
        flex: 1,
        sortable: false,
        filter: "agTextColumnFilter",
    },
    {
        field: "ac_capacity_kw",
        headerName: "AC Capacity",
        visible: true,
        minWidth: 140,
        flex: 1,
        sortable: false,
        filter: false,
    },
    {
        field: "dc_capacity_kw",
        headerName: "DC Capacity",
        visible: true,
        minWidth: 140,
        flex: 1,
        sortable: false,
        filter: false,
    },
    {
        field: "status",
        headerName: "Status",
        visible: true,
        minWidth: 130,
        flex: 1,
        sortable: false,
        filter: "agTextColumnFilter",
    },
    {
        field: "actions",
        headerName: "Actions",
        visible: true,
        minWidth: 120,
        maxWidth: 130,
        flex: 0,
        pinned: "right",
        sortable: false,
        filter: false,
        suppressMenu: true,
    },
];

const renderCenteredCell = (content: React.ReactNode) => (
    <div className="flex h-full w-full items-center">
        {content}
    </div>
);

const TableView: React.FC<TableViewProps> = ({
    tree,
    search,
    isSearchActive,
    effectiveExpandedIds,
    onToggleExpand,
    highlightedType,
    isHighlightPulsing,
    renderActions,
    showActions = true,
    onClearSearch,
    tableRef,
    columnPanelRef,
}) => {
    const defaultColumns = useMemo(
        () =>
            showActions
                ? BASE_COLUMNS
                : BASE_COLUMNS.filter((column) => column.field !== "actions"),
        [showActions],
    );
    const [columns, setColumns] = useState<CommonColumnConfig[]>(defaultColumns);

    const allRows = useMemo(() => flattenAll(tree), [tree]);
    const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

    const flatRows = useMemo(() => {
        if (isSearchActive) {
            return allRows.filter(
                (row) => SEARCHABLE_COMPONENT_FIELDS.some((field) =>
                    row.node[field]?.toLowerCase().includes(normalizedSearch),
                ),
            );
        }
        return flattenVisible(tree, effectiveExpandedIds);
    }, [allRows, tree, effectiveExpandedIds, normalizedSearch, isSearchActive]);

    const rowData = useMemo(
        () =>
            flatRows.map((flatRow) => ({
                id: flatRow.node.id,
                flatRow,
            })),
        [flatRows],
    );

    const getRowClass = useCallback(
        (params: { data?: { flatRow?: FlatRow } }) => {
            if (!highlightedType || !isHighlightPulsing) return "";
            const rowType = normalizeComponentType(params.data?.flatRow?.node.component_type);
            return rowType === highlightedType ? "plant-component-type-highlight" : "";
        },
        [highlightedType, isHighlightPulsing],
    );

    useEffect(() => {
        tableRef.current?.redrawRows();
    }, [highlightedType, isHighlightPulsing, tableRef]);

    useEffect(() => {
        if (!highlightedType) return;
        const firstId = findFirstMatchingComponentId(tree, highlightedType);
        if (!firstId) return;
        const timer = window.setTimeout(() => {
            tableRef.current?.scrollToRowById(firstId, "middle");
        }, 80);
        return () => window.clearTimeout(timer);
    }, [highlightedType, tree, tableRef]);

    useEffect(() => {
        resetSavedActionsColumnWidth(ENTITY_KEY, "actions");
    }, []);

    useEffect(() => {
        setColumns((prevColumns) => {
            const nextFields = new Set(defaultColumns.map((column) => column.field));
            const nextColumns = prevColumns.filter((column) => nextFields.has(column.field));

            defaultColumns.forEach((column) => {
                if (!nextColumns.some((existing) => existing.field === column.field)) {
                    nextColumns.push(column);
                }
            });

            return nextColumns;
        });
    }, [defaultColumns]);

    const resolvedColumns = useMemo<CommonColumnConfig[]>(
        () =>
            columns.map((column) => {
                const alignedColumn = {
                    ...column,
                    cellStyle: {
                        display: "flex",
                        alignItems: "center",
                    },
                };

                if (column.field === "component") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (
                            params: ICellRendererParams<{ id: string; flatRow: FlatRow }>,
                        ) => {
                            const row = params.data?.flatRow;
                            if (!row) return "-";
                            const { node, depth, hasChildren } = row;
                            return (
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <div
                                        className="flex shrink-0 items-center"
                                        style={{ width: `${depth * TREE_INDENT_WIDTH + TREE_TOGGLE_SLOT_WIDTH}px` }}
                                    >
                                        {depth > 0 &&
                                            Array.from({ length: depth }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={`mx-[9px] h-full self-stretch border-l-2 border-dashed opacity-30 ${depthAccent(index)}`}
                                                    style={{ height: "inherit" }}
                                                />
                                            ))}
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onToggleExpand(node.id);
                                                }}
                                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs text-neutral-400 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-400"
                                                aria-label={effectiveExpandedIds.has(node.id) ? "Collapse" : "Expand"}
                                                aria-expanded={effectiveExpandedIds.has(node.id)}
                                            >
                                                {effectiveExpandedIds.has(node.id) ? (
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="h-5 w-4 shrink-0" />
                                        )}
                                    </div>

                                    <div className="flex px-2 py-1 shrink-0 items-center justify-center rounded-xs border border-brand-100 bg-brand-50 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/15 dark:text-brand-300">
                                        {getComponentTypeInitial(node.component_type)}
                                    </div>

                                    <div className="min-w-0">
                                        <Link
                                            to={`/components/${node.id}`}
                                            className="block truncate text-left text-sm font-medium text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                                            title={node.component_name}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            {node.component_name}
                                        </Link>
                                    </div>
                                </div>
                            );
                        },
                    };
                }

                if (column.field === "type") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (params: ICellRendererParams<{ id: string; flatRow: FlatRow }>) => {
                            const node = params.data?.flatRow.node;
                            if (!node?.component_type) return renderCenteredCell("-");
                            return renderCenteredCell(
                                <ColorBadge variant="orange" className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none">
                                    {formatComponentTypeTag(node.component_type)}
                                </ColorBadge>
                            );
                        },
                    };
                }

                if (column.field === "ac_capacity_kw") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (params: ICellRendererParams<{ id: string; flatRow: FlatRow }>) =>
                            renderCenteredCell(formatKw(params.data?.flatRow.node.ac_capacity_kw)),
                    };
                }

                if (column.field === "dc_capacity_kw") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (params: ICellRendererParams<{ id: string; flatRow: FlatRow }>) =>
                            renderCenteredCell(formatKw(params.data?.flatRow.node.dc_capacity_kw)),
                    };
                }

                if (column.field === "status") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (params: ICellRendererParams<{ id: string; flatRow: FlatRow }>) =>
                            renderCenteredCell(renderStatusBadge(params.data?.flatRow.node.status)),
                    };
                }

                if (column.field === "actions") {
                    return {
                        ...alignedColumn,
                        cellRenderer: (params: ICellRendererParams<{ id: string; flatRow: FlatRow }>) =>
                            renderCenteredCell(
                                params.data?.flatRow.node && renderActions
                                    ? renderActions(params.data.flatRow.node)
                                    : null,
                            ),
                    };
                }

                return alignedColumn;
            }),
        [columns, effectiveExpandedIds, onToggleExpand, renderActions],
    );

    if (rowData.length === 0 && isSearchActive) {
        return (
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Search className="h-8 w-8 text-neutral-300 dark:text-neutral-dark-500" />
                    <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-dark-700">
                            No results for &ldquo;{search}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-dark-500">
                            Try a different name or component code
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="mt-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
                    >
                        Clear search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-0 w-full flex-1">
            <div className="absolute inset-0 flex flex-col">
                <CommonTable
                    ref={tableRef}
                    entityKey={ENTITY_KEY}
                    columns={resolvedColumns}
                    defaultColumns={resolvedColumns}
                    data={rowData}
                    loading={false}
                    className="plant-components-table h-full w-full"
                    minTableHeight={0}
                    rowSelection="multiple"
                    suppressRowClickSelection
                    rowMultiSelectWithClick
                    rowHeight={42}
                    headerHeight={47}
                    getRowClass={getRowClass}
                    refColumnPanel={columnPanelRef}
                    onColumnsChange={setColumns}
                    onResetColumns={() => setColumns(defaultColumns)}
                />
            </div>
        </div>
    );
};

export default TableView;
