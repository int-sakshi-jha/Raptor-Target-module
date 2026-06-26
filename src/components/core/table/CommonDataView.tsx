/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useImperativeHandle, useCallback } from "react";
import CommonTable, { type CommonColumnConfig, type CommonTableHandle } from "./CommonTable";
import CommonCardList from "./CommonCardList";
import type { CommonCustomCardProps } from "./CommonCardList";
import CommonFilterPanel from "./CommonFilterPanel";
import CommonColumnSelectorPanel from "./CommonColumnSelectorPanel";
import type { FilterFieldConfig, FilterValues } from "./CommonFilterPanel";

const getColumnsKey = (entityKey: string) => `${entityKey}TableColumns`;
const getOrderKey = (entityKey: string) => `${entityKey}TableColumnOrder`;

const hasValidVisibilityShape = (
  value: unknown,
): value is Array<{ field: string; visible: boolean }> =>
  Array.isArray(value) &&
  value.every(
    (col) =>
      typeof col === "object" &&
      col !== null &&
      "field" in col &&
      "visible" in col &&
      typeof (col as { field?: unknown }).field === "string" &&
      typeof (col as { visible?: unknown }).visible === "boolean",
  );

const loadCommonInitialColumns = ({
  entityKey,
  defaultColumns,
  validateSavedColumns = true,
  logSavedColumnsParseError = false,
  logSavedOrderParseError = true,
}: {
  entityKey: string;
  defaultColumns: CommonColumnConfig[];
  validateSavedColumns?: boolean;
  logSavedColumnsParseError?: boolean;
  logSavedOrderParseError?: boolean;
}): CommonColumnConfig[] => {
  const saved = localStorage.getItem(getColumnsKey(entityKey));
  let initialColumns: CommonColumnConfig[] = [...defaultColumns];

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (validateSavedColumns) {
        if (hasValidVisibilityShape(parsed)) {
          initialColumns = defaultColumns.map((defaultCol) => {
            const savedCol = parsed.find((col) => col.field === defaultCol.field);
            return savedCol
              ? { ...defaultCol, visible: savedCol.visible }
              : defaultCol;
          });
        }
      } else if (Array.isArray(parsed)) {
        initialColumns = defaultColumns.map((defaultCol) => {
          const savedCol = parsed.find((col: any) => col?.field === defaultCol.field);
          return savedCol
            ? { ...defaultCol, visible: savedCol.visible }
            : defaultCol;
        });
      }
    } catch (error) {
      if (logSavedColumnsParseError) {
        console.error("Failed to parse saved columns:", error);
      }
      initialColumns = [...defaultColumns];
    }
  }

  const savedOrder = localStorage.getItem(getOrderKey(entityKey));
  if (savedOrder) {
    try {
      const orderedFields: string[] = JSON.parse(savedOrder);
      initialColumns = [...initialColumns].sort(
        (a, b) => orderedFields.indexOf(a.field) - orderedFields.indexOf(b.field),
      );
    } catch (error) {
      if (logSavedOrderParseError) {
        console.error("Failed to parse saved column order:", error);
      }
    }
  }

  return initialColumns;
};

const handleCommonInitializeColumns = ({
  entityKey,
  defaultColumns,
  setColumns,
  actionsColumn,
  excludedFields = ["id"],
  validateSavedColumns,
  logSavedColumnsParseError,
  logSavedOrderParseError,
}: {
  entityKey: string;
  defaultColumns: CommonColumnConfig[];
  setColumns: React.Dispatch<React.SetStateAction<CommonColumnConfig[]>>;
  actionsColumn?: CommonColumnConfig;
  excludedFields?: string[];
  validateSavedColumns?: boolean;
  logSavedColumnsParseError?: boolean;
  logSavedOrderParseError?: boolean;
}) => {
  const excludedFieldSet = new Set(excludedFields);
  const initialColumns = loadCommonInitialColumns({
    entityKey,
    defaultColumns,
    validateSavedColumns,
    logSavedColumnsParseError,
    logSavedOrderParseError,
  });
  const nextColumns = [
    ...initialColumns.filter((col) => !excludedFieldSet.has(col.field)),
    ...(actionsColumn ? [actionsColumn] : []),
  ];
  setColumns(nextColumns);
};

const handleCommonPageChange = ({
  newPage,
  newPageSize,
  pageSize,
  setPage,
  setPageSize,
}: {
  newPage: number;
  newPageSize: number;
  pageSize: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}) => {
  if (newPageSize !== pageSize) {
    setPage(1);
    setPageSize(newPageSize);
    return;
  }
  setPage(newPage);
};

const handleCommonColumnsChange = ({
  columns,
  entityKey,
  setLocalColumns,
  excludedFields = ["id"],
}: {
  columns: CommonColumnConfig[];
  entityKey: string;
  setLocalColumns: React.Dispatch<React.SetStateAction<CommonColumnConfig[]>>;
  excludedFields?: string[];
}) => {
  const excludedFieldSet = new Set(excludedFields);
  const columnsToPersist = columns.filter((col) => !excludedFieldSet.has(col.field));

  setLocalColumns(columns);

  const toSave = columnsToPersist.map(({ field, visible }) => ({
    field,
    visible,
  }));

  localStorage.setItem(`${entityKey}TableColumns`, JSON.stringify(toSave));
};

const handleCommonResetColumns = ({
  defaultColumns,
  actionsColumn,
  entityKey,
  setLocalColumns,
  excludedFields = ["id"],
  clearWidthState = false,
}: {
  defaultColumns: CommonColumnConfig[];
  actionsColumn?: CommonColumnConfig;
  entityKey: string;
  setLocalColumns: React.Dispatch<React.SetStateAction<CommonColumnConfig[]>>;
  excludedFields?: string[];
  clearWidthState?: boolean;
}) => {
  const excludedFieldSet = new Set(excludedFields);
  const reset = [
    ...defaultColumns.filter((col) => !excludedFieldSet.has(col.field)),
    ...(actionsColumn ? [actionsColumn] : []),
  ];

  setLocalColumns(reset);
  localStorage.removeItem(`${entityKey}TableColumns`);
  localStorage.removeItem(`${entityKey}TableColumnOrder`);

  if (clearWidthState) {
    localStorage.removeItem(`${entityKey}TableColumnWidths`);
  }
};

export interface CommonDataViewProps {
  // Data
  data: any[];
  loading?: boolean;
  entityKey: string;
  entityLabel: string;

  // Columns
  columns: CommonColumnConfig[];
  defaultColumns: CommonColumnConfig[];

  // View
  selectedView: "table" | "cards";

  // Pagination
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  pageStateConfig?: {
    setPage: React.Dispatch<React.SetStateAction<number>>;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
  };

  // Filters
  filterFields?: FilterFieldConfig[];
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;
  defaultFilters?: FilterValues;
  filterPanelRef?: React.Ref<{ openPanel: () => void }>;
  /** Called when the filter panel opens or closes (e.g. to lazy-load filter options). */
  onFilterPanelOpenChange?: (open: boolean) => void;

  // Column management
  onColumnsChange?: (columns: CommonColumnConfig[]) => void;
  onResetColumns?: () => void;
  columnSelectorTitle?: string;
  columnStateConfig?: {
    setColumns: React.Dispatch<React.SetStateAction<CommonColumnConfig[]>>;
    actionsColumn?: CommonColumnConfig;
    excludedFields?: string[];
    clearWidthStateOnReset?: boolean;
    validateSavedColumns?: boolean;
    logSavedColumnsParseError?: boolean;
    logSavedOrderParseError?: boolean;
  };
  columnPanelRef?: React.Ref<{ openPanel: () => void }>;

  // Selection
  selectedIds?: string[];
  onSelectionChanged?: (selectedIds: string[]) => void;

  // Inline edit
  onCellUpdate?: (args: {
    id: string;
    field: string;
    value: unknown;
    data: any;
    oldValue: unknown;
  }) => void;

  // Row click
  onRowClick?: (row: any) => void;

  // Get row ID
  getRowId: (row: any) => string;

  // Additional props
  className?: string;
  gridOptions?: any;
  tableRef?: React.Ref<CommonTableHandle>;
  /** Passed to CommonTable → ag-Grid context (row actions, etc.) */
  gridContext?: Record<string, unknown>;
  /** When set, cell renderers that read `params.context` refresh when this value changes. */
  gridContextRevision?: string;
  customCardComponent?: React.ComponentType<CommonCustomCardProps>;
  [key: string]: any;
}

const CommonDataView: React.FC<CommonDataViewProps> = ({
  data,
  loading = false,
  entityKey,
  entityLabel,
  columns,
  defaultColumns,
  selectedView,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  pageStateConfig,
  filterFields = [],
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  defaultFilters = {},
  filterPanelRef,
  onFilterPanelOpenChange,
  onColumnsChange,
  onResetColumns,
  columnSelectorTitle,
  columnStateConfig,
  columnPanelRef,
  selectedIds: selectedIdsProp,
  onSelectionChanged,
  onCellUpdate,
  onRowClick,
  getRowId,
  className = "",
  gridOptions,
  tableRef,
  gridContext,
  gridContextRevision,
  customCardComponent,
  ...restProps
}) => {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = React.useMemo(
    () => (selectedIdsProp ?? internalSelectedIds).map((id) => String(id)),
    [internalSelectedIds, selectedIdsProp]
  );
  const handleSelectionChanged = useCallback(
    (nextSelectedIds: string[]) => {
      const normalizedIds = nextSelectedIds.map((id) => String(id));
      if (selectedIdsProp === undefined) {
        setInternalSelectedIds(normalizedIds);
      }
      onSelectionChanged?.(normalizedIds);
    },
    [onSelectionChanged, selectedIdsProp]
  );

  // Prepare columns for card view (filter visible columns)
  const visibleColumns = React.useMemo(
    () => columns.filter((col) => col.visible),
    [columns]
  );

  console.log("CommonDataView Rendered");
console.log(
  "Received actionsColumn:",
  columnStateConfig?.actionsColumn
);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  useImperativeHandle(
    filterPanelRef,
    () => ({ openPanel: () => setShowFilterPanel(true) }),
    []
  );
  useImperativeHandle(
    columnPanelRef,
    () => ({ openPanel: () => setShowColumnPanel(true) }),
    []
  );
  React.useEffect(() => {
    onFilterPanelOpenChange?.(showFilterPanel);
  }, [showFilterPanel, onFilterPanelOpenChange]);

  React.useEffect(() => {
    if (!columnStateConfig) return;
    handleCommonInitializeColumns({
      entityKey,
      defaultColumns,
      setColumns: columnStateConfig.setColumns,
      actionsColumn: columnStateConfig.actionsColumn,
      excludedFields: columnStateConfig.excludedFields,
      validateSavedColumns: columnStateConfig.validateSavedColumns,
      logSavedColumnsParseError: columnStateConfig.logSavedColumnsParseError,
      logSavedOrderParseError: columnStateConfig.logSavedOrderParseError,
    });
    // Intentionally run once on mount to preserve existing page behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvedOnPageChange = React.useCallback(
    (nextPage: number, nextPageSize: number) => {
      if (pageStateConfig) {
        handleCommonPageChange({
          newPage: nextPage,
          newPageSize: nextPageSize,
          pageSize,
          setPage: pageStateConfig.setPage,
          setPageSize: pageStateConfig.setPageSize,
        });
        return;
      }
      onPageChange?.(nextPage, nextPageSize);
    },
    [onPageChange, pageStateConfig, pageSize]
  );

  const resolvedOnColumnsChange = React.useCallback(
    (nextColumns: CommonColumnConfig[]) => {
      if (columnStateConfig) {
        handleCommonColumnsChange({
          columns: nextColumns,
          entityKey,
          setLocalColumns: columnStateConfig.setColumns,
          excludedFields: columnStateConfig.excludedFields,
        });
        return;
      }
      onColumnsChange?.(nextColumns);
    },
    [columnStateConfig, entityKey, onColumnsChange]
  );

  const resolvedOnResetColumns = React.useCallback(() => {
    if (columnStateConfig) {
      handleCommonResetColumns({
        defaultColumns,
        actionsColumn: columnStateConfig.actionsColumn,
        entityKey,
        setLocalColumns: columnStateConfig.setColumns,
        excludedFields: columnStateConfig.excludedFields,
        clearWidthState: columnStateConfig.clearWidthStateOnReset,
      });
      return;
    }
    onResetColumns?.();
  }, [columnStateConfig, defaultColumns, entityKey, onResetColumns]);

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <CommonFilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filterFields={filterFields}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApplyFilters={onApplyFilters ?? (() => { })}
        onClearFilters={onClearFilters ?? (() => { })}
        entityKey={entityKey}
        defaultFilters={defaultFilters}
      />
      {columnStateConfig && (
        <CommonColumnSelectorPanel
          open={showColumnPanel}
          onClose={() => setShowColumnPanel(false)}
          columns={columns}
          onColumnsChange={resolvedOnColumnsChange}
          onResetColumns={resolvedOnResetColumns}
          title={columnSelectorTitle || `${entityLabel} Columns`}
          entityKey={entityKey}
          defaultColumns={defaultColumns}
          excludedFields={columnStateConfig.excludedFields}
        />
      )}
      {selectedView === "table" ? (
        <CommonTable
          ref={tableRef}
          entityKey={entityKey}
          columns={columns}
          defaultColumns={defaultColumns}
          data={data}
          columnSelectorTitle={columnSelectorTitle || `${entityLabel} Columns`}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChanged={handleSelectionChanged}
          onCellUpdate={onCellUpdate}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={resolvedOnPageChange}
          getRowId={(params: any) => getRowId(params.data)}
          onColumnsChange={resolvedOnColumnsChange}
          onResetColumns={resolvedOnResetColumns}
          onRowClick={onRowClick}
          gridOptions={gridOptions}
          gridContext={gridContext}
          gridContextRevision={gridContextRevision}
          {...restProps}
        />
      ) : (
        <>
          <div className="flex flex-col min-h-0">
            <CommonCardList
              data={data}
              columns={visibleColumns}
              loading={loading}
              getRowId={getRowId}
              entityLabel={entityLabel}
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={resolvedOnPageChange}
              gridContext={gridContext}
              onRowClick={onRowClick}
              customCardComponent={customCardComponent}
              selectedIds={selectedIds}
              onSelectionChanged={handleSelectionChanged}
            />
          </div>

          {tableRef ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
            >
              <CommonTable
                ref={tableRef}
                entityKey={entityKey}
                columns={columns}
                defaultColumns={defaultColumns}
                data={data}
                columnSelectorTitle={columnSelectorTitle || `${entityLabel} Columns`}
                loading={loading}
                selectedIds={selectedIds}
                onSelectionChanged={handleSelectionChanged}
                onCellUpdate={onCellUpdate}
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                onPageChange={resolvedOnPageChange}
                getRowId={(params: any) => getRowId(params.data)}
                onColumnsChange={resolvedOnColumnsChange}
                onResetColumns={resolvedOnResetColumns}
                onRowClick={onRowClick}
                gridOptions={gridOptions}
                gridContext={gridContext}
                gridContextRevision={gridContextRevision}
                containerHeight={1}
                minTableHeight={1}
                className="!h-px !min-h-0"
                {...restProps}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default CommonDataView;
