/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useMemo,
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { AgGridReact } from "@ag-grid-community/react";
import {
  ModuleRegistry,
  type ColDef,
  type ColumnMovedEvent,
  type ColumnResizedEvent,
  type GridOptions,
} from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { CsvExportModule } from "@ag-grid-community/csv-export";
import CommonColumnSelectorPanel, {
  type CommonColumnConfig,
} from "./CommonColumnSelectorPanel";
import CommonPagination from "./CommonPagination";
import CommonTableSkeleton, {
  CommonTablePaginationSkeleton,
} from "./CommonTableSkeleton";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";
import "./CommonTable.css";
import { useGridTheme } from "@/store/useGridTheme";
import { saveCsvStringAsXlsxFile } from "@/utils/gridExcelExport";
import { Building2, Check, Pencil, X } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";

ModuleRegistry.registerModules([ClientSideRowModelModule, CsvExportModule]);

export type { CommonColumnConfig };

export interface CommonTableHandle {
  exportCsv: (opts?: { onlySelected?: boolean; fileName?: string }) => void;
  exportExcel: (opts?: { onlySelected?: boolean; fileName?: string }) => void;
  getSelectedRowCount: () => number;
  hasExcelExport: () => boolean;
  scrollToRowById: (rowId: string, position?: "top" | "middle" | "bottom") => void;
  redrawRows: () => void;
}

export interface CommonTableProps {
  columns: CommonColumnConfig[];
  defaultColumns: CommonColumnConfig[];
  data: any[];
  columnSelectorTitle?: string;
  loading?: boolean;
  onSelectionChanged?: (selectedIds: string[]) => void;
  selectedIds?: string[];
  onCellUpdate?: (args: {
    id: string;
    field: string;
    value: unknown;
    data: any;
    oldValue: unknown;
  }) => void;
  rowIdField?: string;
  gridOptions?: GridOptions;
  entityKey: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  toolbar?: React.ReactNode;
  onRowClick?: (row: any) => void;
  className?: string;
  refColumnPanel?: React.Ref<{ openPanel: () => void }>;
  onColumnsChange?: (columns: CommonColumnConfig[]) => void;
  onResetColumns?: () => void;
  tableHeight?: string | number;
  gridMinHeight?: string | number;
  /**
   * Extra string included in the ag-Grid instance key.
   * Change this whenever data that drives cellRenderers (like permissions) changes
   * but is NOT reflected in the row data itself — e.g. pass serialised permissions.
   * When it changes, the grid remounts and all cellRenderers re-evaluate.
   */
  keyExtra?: string;
  /** Merged into ag-Grid `context` (e.g. row-action callbacks). Kept out of columnDefs to avoid header/column swap crashes. */
  gridContext?: Record<string, unknown>;
  /**
   * When this string changes (e.g. sorted permission ids), the grid refreshes visible cells so
   * plain `cellRenderer` functions that read `params.context` pick up new values — without a
   * separate inner React cell component or swapping columnDefs.
   */
  gridContextRevision?: string;
  // ag-Grid passthrough props
  [key: string]: any;
}

/** Empty / whitespace-only input commits as null, not "". */
const normalizeInlineEditValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const ConfirmCellEditor = forwardRef((params: any, ref: any) => {
  const [val, setVal] = React.useState(() =>
    params.value == null ? "" : String(params.value),
  );
  useImperativeHandle(ref, () => ({
    getValue: () => normalizeInlineEditValue(val),
  }));

  const stopEditing = React.useCallback(
    (cancel: boolean) => {
      // Prefer the official grid API; this reliably commits/cancels and triggers onCellValueChanged.
      if (params?.api && typeof params.api.stopEditing === "function") {
        params.api.stopEditing(cancel);
        return;
      }
      // Fallback for some versions/builds.
      if (typeof params?.stopEditing === "function") {
        params.stopEditing(cancel);
      }
    },
    [params],
  );

  const commitValue = React.useCallback(() => {
    const field =
      params?.colDef?.field ??
      (params?.column && typeof params.column.getColId === "function"
        ? params.column.getColId()
        : undefined);
    const rowId = params?.data?.id;
    const oldValue = normalizeInlineEditValue(params?.value);
    const newValue = normalizeInlineEditValue(val);

    if (
      params?.context?.onInlineEditCommit &&
      rowId != null &&
      field &&
      newValue !== oldValue
    ) {
      params.context.onInlineEditCommit({
        id: String(rowId),
        field: String(field),
        value: newValue,
        oldValue,
        data: params.data,
      });
    }

    // Let ag-Grid commit the value by calling the editor's getValue();
    // manually calling node.setDataValue here can trigger a *second* cellValueChanged.
    stopEditing(false);
  }, [params, stopEditing, val]);

  return (
    <div className="common-table-inline-editor flex flex-col gap-2 p-2 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 w-72 max-w-[80vw]">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commitValue();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            stopEditing(true);
          }
        }}
        className="w-full min-w-0 h-8 px-2 border border-brand-400 rounded-xs bg-white dark:bg-neutral-dark-100 text-sm outline-none text-neutral-900 dark:text-neutral-dark-950"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commitValue();
          }}
          className="flex items-center justify-center w-7 h-7 rounded-xs bg-brand-500 hover:bg-brand-600 text-white flex-shrink-0"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stopEditing(true);
          }}
          className="flex items-center justify-center w-7 h-7 rounded-xs bg-neutral-400 hover:bg-neutral-500 dark:bg-neutral-dark-300 dark:hover:bg-neutral-dark-400 text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const EditableCellRenderer: React.FC<{
  params: any;
  renderValue?: (params: any) => React.ReactNode;
}> = ({ params, renderValue }) => {
  const startEdit = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const api = params?.api;
      const rowIndex: number | null =
        typeof params?.node?.rowIndex === "number" ? params.node.rowIndex : null;
      const colKey =
        params?.column && typeof params.column.getColId === "function"
          ? params.column.getColId()
          : params?.colDef?.field;
      if (!api || rowIndex == null || !colKey) return;

      // Defer to next tick so ag-Grid doesn't swallow the event during its own mouse handling.
      window.setTimeout(() => {
        try {
          if (typeof api.setFocusedCell === "function") {
            api.setFocusedCell(rowIndex, colKey);
          }
          if (typeof api.startEditingCell === "function") {
            api.startEditingCell({ rowIndex, colKey });
          }
        } catch {
          // no-op
        }
      }, 0);
    },
    [params],
  );

  return (
    <div className="group flex items-center gap-2 min-w-0 z-50">
      <div className="flex-1 min-w-0 truncate">
        {typeof renderValue === "function" ? renderValue(params) : (params.value ?? "-")}
      </div>
      <button
        type="button"
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded-xs hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 text-neutral-600 dark:text-neutral-dark-600"
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const getColumnOrderKey = (entity: string) => `${entity}TableColumnOrder`;
const getColumnWidthKey = (entity: string) => `${entity}TableColumnWidths`;

const CommonTable = forwardRef<CommonTableHandle, CommonTableProps>(
  (
    {
      columns,
      defaultColumns,
      data,
      columnSelectorTitle,
      loading,
      onSelectionChanged,
      selectedIds = [],
      onCellUpdate,
      // rowIdField = "id",
      gridOptions = {},
      entityKey,
      page = 1,
      pageSize = 50,
      total,
      totalPages,
      onPageChange,
      toolbar,
      onRowClick,
      className = "",
      refColumnPanel,
      onColumnsChange,
      onResetColumns,
      tableHeight,
      gridMinHeight,
      gridContext,
      gridContextRevision,
      // keyExtra = "",
      ...agGridProps
    },
    ref,
  ) => {
    const [showColumnsPanel, setShowColumnsPanel] = useState(false);
    const [tableRootElement, setTableRootElement] =
      useState<HTMLDivElement | null>(null);
    const { gridTheme, gridOptions: themeGridOptions } = useGridTheme();
    const isLargeScreen = useMediaQuery("(min-width: 768px)");
    const tableRootRef = React.useRef<HTMLDivElement>(null);
    const setTableRootNode = useCallback((node: HTMLDivElement | null) => {
      tableRootRef.current = node;
      setTableRootElement(node);
    }, []);

    // Expose openPanel for column selector
    useImperativeHandle(
      refColumnPanel,
      () => ({ openPanel: () => setShowColumnsPanel(true) }),
      [],
    );

    // ag-Grid columnDefs
    const columnDefs = useMemo<ColDef[]>(() => {
      const savedWidths = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(getColumnWidthKey(entityKey)) || "{}",
          ) as Record<string, number>;
        } catch {
          return {} as Record<string, number>;
        }
      })();
      const visibleFields = columns
        .filter((c: any) => c.visible)
        .map((c: any) => c.field);
      return [
        {
          headerName: "",
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          width: 50,
          minWidth: 50,
          pinned: isLargeScreen ? "left" : undefined,
          suppressMenu: true,
        },
        ...columns
          .filter((col: any) => visibleFields.includes(col.field))
          .map((col: any) => ({
            ...col,
            filter: col.filter ?? "agTextColumnFilter",
            minWidth: col.minWidth || 120,
            flex: savedWidths[col.field] ? undefined : (col.flex ?? 1),
            width: savedWidths[col.field] ?? undefined,
            resizable: true,
            pinned: isLargeScreen ? col.pinned : undefined,
            editable: col.editable ?? false,
            cellRenderer:
              col.editable === true
                ? (params: any) => (
                  <EditableCellRenderer
                    params={params}
                    renderValue={
                      typeof col.cellRenderer === "function" ? col.cellRenderer : undefined
                    }
                  />
                )
                : col.cellRenderer,
            cellEditor: col.editable ? ConfirmCellEditor : col.cellEditor,
            cellEditorPopup: col.editable === true,
            cellEditorPopupPosition: col.editable === true ? "under" : undefined,
            cellEditorParams: col.cellEditorParams,
            suppressKeyboardEvent:
              col.editable === true
                ? (keyboardParams: any) => {
                    if (
                      typeof col.suppressKeyboardEvent === "function" &&
                      col.suppressKeyboardEvent(keyboardParams)
                    ) {
                      return true;
                    }
                    const { event, editing } = keyboardParams;
                    return (
                      editing &&
                      (event.key === "Enter" || event.key === "Escape")
                    );
                  }
                : col.suppressKeyboardEvent,
          })),
      ];
    }, [columns, entityKey, isLargeScreen]);

    const handleSelection = useCallback(
      (event: any) => {
        if (onSelectionChanged) {
          const selectedNodes = event.api.getSelectedNodes();
          const selectedIds = selectedNodes.map((node: any) =>
            String(node.id ?? ""),
          );
          onSelectionChanged(selectedIds);
        }
      },
      [onSelectionChanged],
    );

    const syncSelectedRows = useCallback(() => {
      const api = agGridRef.current?.api;
      if (!api) return;

      const selectedIdSet = new Set(selectedIds.map((id: string) => String(id)));
      let changed = false;

      api.forEachNode((node: any) => {
        const rowId = String(node.id ?? "");
        const shouldSelect = selectedIdSet.has(rowId);
        if (node.isSelected() !== shouldSelect) {
          node.setSelected(shouldSelect);
          changed = true;
        }
      });

      if (changed && selectedIds.length === 0) {
        api.deselectAll();
      }
    }, [selectedIds]);

    useEffect(() => {
      syncSelectedRows();
    }, [data, selectedIds, syncSelectedRows]);

    // Save column order to localStorage on move
    const onColumnMoved = useCallback(
      (event: ColumnMovedEvent) => {
        if (event.source === "uiColumnMoved") {
          const columnState = event.api.getColumnState();
          const visibleFields = columns
            .filter((c: any) => c.visible)
            .map((c: any) => c.field);
          const newOrder = columnState
            .map((s) => s.colId)
            .filter((colId) => colId && visibleFields.includes(colId));
          localStorage.setItem(
            getColumnOrderKey(entityKey),
            JSON.stringify(newOrder),
          );
        }
      },
      [entityKey, columns],
    );
    // Save column width to localStorage on change
    const onColumnResized = useCallback(
      (event: ColumnResizedEvent) => {
        if (!event.finished || event.source !== "uiColumnResized") return;

        const widths: Record<string, number> = {};
        event.api.getColumnState().forEach((col) => {
          if (col.colId && col.width) {
            widths[col.colId] = col.width;
          }
        });
        localStorage.setItem(
          getColumnWidthKey(entityKey),
          JSON.stringify(widths),
        );
      },
      [entityKey],
    );

    const agGridRef = React.useRef<AgGridReact>(null);

   useEffect(() => {
  const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
    const api = agGridRef.current?.api;
    if (!api || typeof api.getEditingCells !== "function") return;
    if (api.getEditingCells().length === 0) return;

    const target = event.target;
    if (!(target instanceof Node)) return;

    // The inline editor popup is portaled to document.body (via popupParent),
    // so it lives OUTSIDE tableRootRef — check it explicitly.
    const clickedInsideEditor =
      target instanceof Element &&
      target.closest(".common-table-inline-editor") != null;

    const clickedInsideTable =
      tableRootRef.current?.contains(target) ?? false;

    if (clickedInsideTable || clickedInsideEditor) return;

    api.stopEditing(true); // cancel = true, discard changes
  };

  document.addEventListener("mousedown", handleOutsideClick, true);
  document.addEventListener("touchstart", handleOutsideClick, { capture: true, passive: true });

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick, true);
    document.removeEventListener("touchstart", handleOutsideClick, true);
  };
}, []); // stable: agGridRef and tableRootRef are refs, never change identity

    const lastContextRevisionRef = React.useRef<string | null>(null);
    useEffect(() => {
      if (gridContextRevision === undefined) return;
      if (lastContextRevisionRef.current === null) {
        lastContextRevisionRef.current = gridContextRevision;
        return;
      }
      if (lastContextRevisionRef.current === gridContextRevision) return;
      lastContextRevisionRef.current = gridContextRevision;
      const api = agGridRef.current?.api;
      if (!api) return;
      const raf = requestAnimationFrame(() => {
        try {
          api.refreshCells({ force: true });
        } catch {
          // grid may be tearing down
        }
      });
      return () => cancelAnimationFrame(raf);
    }, [gridContextRevision]);

    const onInlineEditCommit = React.useCallback(
      (args: {
        id: string;
        field: string;
        value: unknown;
        oldValue: unknown;
        data: any;
      }) => {
        onCellUpdate?.(args);
      },
      [onCellUpdate],
    );

    // When columnDefs change AFTER initial mount (e.g. permissions load and actionsColumn
    // rebuilds), force ag-Grid to re-run cellRenderers for all visible rows.
    // We MUST skip the first run: on initial mount ag-Grid's MenuService hasn't finished
    // wiring up column objects yet, so calling refreshCells causes a null getColDef() crash.
    // const isFirstColumnDefs = React.useRef(true);
    // useEffect(() => {
    //   if (isFirstColumnDefs.current) {
    //     isFirstColumnDefs.current = false;
    //     return;
    //   }
    //   const api = agGridRef.current?.api;
    //   if (!api) return;
    //   try {
    //     api.refreshCells({ force: true });
    //   } catch {
    //     // grid may be mid-destroy cycle — safe to ignore
    //   }
    // }, [columnDefs]);

    // Handle data updates from outside (e.g., mutations) to refresh cell renderers like actions column
    const onCellValueChanged = React.useCallback(
      (params: any) => {
        // When a row data changes (e.g., after mutation), ensure actions column re-renders
        if (params?.api) {
          params.api.refreshCells({ force: true });
        }
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        exportCsv: (opts) => {
          const api = agGridRef.current?.api;
          if (!api) return;
          const fileName =
            opts?.fileName ??
            `${entityKey}-${new Date().toISOString().slice(0, 10)}.csv`;
          api.exportDataAsCsv({
            fileName,
            onlySelected: opts?.onlySelected === true,
          });
        },
        exportExcel: (opts) => {
          const api = agGridRef.current?.api;
          if (!api || typeof api.getDataAsCsv !== "function") return;
          const fileName =
            opts?.fileName ??
            `${entityKey}-${new Date().toISOString().slice(0, 10)}.xlsx`;
          // Do not call `api.exportDataAsExcel` here: on Community (and some builds) the method
          // exists as a stub and logs "ExcelExportModule is not registered" when invoked.
          const csv = api.getDataAsCsv({
            onlySelected: opts?.onlySelected === true,
          });
          if (csv == null || String(csv).trim() === "") return;
          saveCsvStringAsXlsxFile(String(csv), fileName);
        },
        getSelectedRowCount: () => {
          const api = agGridRef.current?.api;
          if (!api) return 0;
          return api.getSelectedNodes().length;
        },
        hasExcelExport: () => {
          // Excel export uses `getDataAsCsv` + client-side .xlsx (see `exportExcel`).
          return true;
        },
        scrollToRowById: (rowId, position = "middle") => {
          const api = agGridRef.current?.api;
          if (!api) return;
          let targetIndex = -1;
          api.forEachNode((node) => {
            if (targetIndex >= 0) return;
            const nodeId = node.data?.id ?? node.data?.flatRow?.node?.id;
            if (nodeId === rowId) targetIndex = node.rowIndex ?? -1;
          });
          if (targetIndex >= 0) api.ensureIndexVisible(targetIndex, position);
        },
        redrawRows: () => {
          agGridRef.current?.api?.redrawRows();
        },
      }),
      [entityKey],
    );

    // Row click handler
    const onRowClicked = useCallback(
      (event: any) => {
        if (onRowClick) {
          onRowClick(event.data);
        }
      },
      [onRowClick],
    );

    const hasPagination =
      total != null && total > 0 && totalPages != null;
    const gridHeight = hasPagination ? "calc(100% - 60px)" : "100%";
    const isEmpty = !loading && (!data || data.length === 0);
    const shouldLimitHeight = false;

    return (
      <div
        ref={setTableRootNode}
        className={`relative card w-full flex flex-col ${className}`}
        style={{ height: tableHeight ?? `calc(100vh - 110px)`, minHeight: 0 }}
      >
        {/* Toolbar */}
        {toolbar && <div className="mb-2 shrink-0">{toolbar}</div>}
        <CommonColumnSelectorPanel
          open={showColumnsPanel}
          onClose={() => setShowColumnsPanel(false)}
          columns={columns}
          onColumnsChange={onColumnsChange || (() => { })}
          onResetColumns={onResetColumns || (() => { })}
          title={columnSelectorTitle}
          entityKey={entityKey}
          defaultColumns={defaultColumns}
        />
        {/* Table - wrapper must have explicit height for ag-Grid to render rows */}
        <div
          className={`w-full flex-1 relative ${loading ? "" : gridTheme}`}
          style={{
            height: shouldLimitHeight ? "auto" : gridHeight,
            minHeight: shouldLimitHeight ? "auto" : (gridMinHeight ?? 300),
            maxHeight: shouldLimitHeight ? "400px" : undefined,
            minWidth: 0,
          }}
        >
          {loading ? (
            <CommonTableSkeleton columns={columns} />
          ) : (
            <>
              {/* Empty state - use flex layout instead of absolute when empty */}
              {isEmpty && (
                <div className="absolute inset-0 z-20 flex items-center justify-center py-16 px-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200">
                      <Building2 className="w-12 h-12 text-neutral-400 dark:text-neutral-dark-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950 mb-1">
                        No data found
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <AgGridReact
                {...agGridProps}
                ref={agGridRef}
                loading={false}
                popupParent={tableRootElement ?? undefined}
                context={{
                  onInlineEditCommit,
                  ...(gridContext ?? {}),
                }}
                columnDefs={columnDefs}
                rowData={data}
                getRowId={agGridProps.getRowId}
                gridOptions={{
                  ...themeGridOptions,
                  ...gridOptions,
                  rowSelection: "multiple",
                  suppressRowClickSelection: true,
                  suppressContextMenu: false,
                  suppressNoRowsOverlay: true,
                  pagination: false, // Disable default pagination
                  suppressColumnMoveAnimation: false,
                  // We only start editing via the pencil icon, to avoid accidental edits and duplicate commits.
                  singleClickEdit: false,
                  suppressClickEdit: true,
                  stopEditingWhenCellsLoseFocus: true,
                  ...agGridProps.gridOptions,
                }}
                onSelectionChanged={handleSelection}
                onGridReady={(event: any) => {
                  syncSelectedRows();
                  agGridProps.onGridReady?.(event);
                }}
                onFirstDataRendered={(event: any) => {
                  syncSelectedRows();
                  agGridProps.onFirstDataRendered?.(event);
                }}
                onColumnMoved={onColumnMoved}
                onColumnResized={onColumnResized}
                onRowClicked={onRowClicked}
                onCellValueChanged={onCellValueChanged}
              />
            </>
          )}
        </div>

        {/* Pagination */}
        {onPageChange != null &&
          (loading ? (
            <CommonTablePaginationSkeleton className="shrink-0 card bg-white dark:bg-neutral-dark-100" />
          ) : (
            <CommonPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages ?? 1}
              onPageChange={onPageChange}
              className="shrink-0 card bg-white dark:bg-neutral-dark-100 text-neutral-700 dark:text-neutral-dark-900"
            />
          ))}
      </div>
    );
  },
);

export default CommonTable;
