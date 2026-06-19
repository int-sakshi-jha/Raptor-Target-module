/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useState } from "react";
import Spinner from "../../common/Spinner";
import CommonPagination from "./CommonPagination";
import Avatar from "../../common/Avatar";
import { Check, Inbox } from "lucide-react";

export interface CommonCardListProps {
  data: any[];
  columns: {
    field: string;
    headerName: string;
    cellRenderer?: (params: any) => React.ReactNode;
  }[];
  loading?: boolean;
  getRowId: (row: any) => string;
  onRowClick?: (row: any) => void;
  entityLabel?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  gridContext?: Record<string, unknown>;
  customCardComponent?: React.ComponentType<CommonCustomCardProps>;
  /** Controlled selected row ids shared with table view */
  selectedIds?: string[];
  /** Mirror of AG Grid's onSelectionChanged — called whenever selected ids change */
  onSelectionChanged?: (selectedIds: string[]) => void;
}

export interface CommonCustomCardProps {
  row: any;
  rowId: string;
  columns: {
    field: string;
    headerName: string;
    cellRenderer?: (params: any) => React.ReactNode;
  }[];
  onRowClick?: (row: any) => void;
  gridContext?: Record<string, unknown>;
  selected?: boolean;
  onToggleSelect?: (rowId: string) => void;
}

function getDisplayValue(val: any): string {
  if (val == null) return "—";
  if (typeof val === "object") {
    if ("value" in val) return String(val.value);
    if ("name" in val) return String(val.name);
    if ("id" in val) return String(val.id);
    return JSON.stringify(val);
  }
  return String(val);
}

const FieldValue: React.FC<{ value: string }> = ({ value }) => {
  const isLong = value.length > 36;
  const [expanded, setExpanded] = useState(false);

  return (
    <span className="block min-w-0 max-w-full text-xs font-medium leading-snug text-neutral-800 [overflow-wrap:anywhere] dark:text-neutral-dark-800">
      {isLong && !expanded ? `${value.slice(0, 36)}…` : value}
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((p) => !p);
          }}
          className="ml-1 inline text-[11px] font-semibold text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-dark-500 dark:hover:text-neutral-dark-700"
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </span>
  );
};

const isActionsColumn = (col: {
  field: string;
  headerName: string;
  cellRenderer?: (params: any) => React.ReactNode;
}) =>
  col.field === "id" &&
  typeof col.cellRenderer === "function" &&
  col.headerName.trim().toLowerCase().startsWith("action");

/** Avatar that doubles as a selection toggle */
const SelectableAvatar: React.FC<{
  label: string;
  seed: string;
  selected: boolean;
  onToggle: () => void;
}> = ({ label, seed, selected, onToggle }) => (
  <button
    type="button"
    aria-label={selected ? `Deselect ${label}` : `Select ${label}`}
    aria-pressed={selected}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={[
      "group/avatar relative shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
      // ring visible only when selected
      selected
        ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-brand-400"
        : "ring-0",
    ].join(" ")}
    style={{ width: 28, height: 28 }}
  >
    {/* Base avatar — fades out when selected */}
    <span
      className={[
        "absolute inset-0 transition-opacity duration-200",
        selected ? "opacity-0" : "opacity-100 group-hover/avatar:opacity-0",
      ].join(" ")}
    >
      <Avatar label={label} seed={seed} size={28} />
    </span>

    {/* Check overlay — fades in on hover OR when selected */}
    <span
      className={[
        "absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200",
        selected
          ? "bg-brand-500 opacity-100 scale-100"
          : "bg-brand-500/80 opacity-0 scale-90 group-hover/avatar:opacity-100 group-hover/avatar:scale-100",
      ].join(" ")}
    >
      <Check className="w-3.5 h-3.5 text-white" aria-hidden />
    </span>
  </button>
);

const CommonCardList: React.FC<CommonCardListProps> = ({
  data,
  columns,
  loading = false,
  getRowId,
  onRowClick,
  entityLabel = "Item",
  page = 1,
  pageSize = 20,
  total,
  totalPages,
  onPageChange,
  gridContext,
  customCardComponent: CustomCardComponent,
  selectedIds = [],
  onSelectionChanged,
}) => {
  const selectedIdSet = useMemo(
    () => new Set(selectedIds.map((id) => String(id))),
    [selectedIds]
  );
  const allVisibleRowIds = useMemo(
    () => data.map((row) => String(getRowId(row))),
    [data, getRowId]
  );
  const areAllVisibleSelected =
    allVisibleRowIds.length > 0 &&
    allVisibleRowIds.every((rowId) => selectedIdSet.has(rowId));

  const handleToggleSelect = useCallback(
    (rowId: string) => {
      const next = new Set(selectedIdSet);
      const normalizedRowId = String(rowId);
      if (next.has(normalizedRowId)) next.delete(normalizedRowId);
      else next.add(normalizedRowId);
      onSelectionChanged?.(Array.from(next));
    },
    [onSelectionChanged, selectedIdSet]
  );

  const handleToggleSelectAll = useCallback(() => {
    const next = new Set(selectedIdSet);
    if (areAllVisibleSelected) {
      allVisibleRowIds.forEach((rowId) => next.delete(rowId));
    } else {
      allVisibleRowIds.forEach((rowId) => next.add(rowId));
    }
    onSelectionChanged?.(Array.from(next));
  }, [allVisibleRowIds, areAllVisibleSelected, onSelectionChanged, selectedIdSet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2">
        <div className="w-10 h-10 rounded-xs bg-neutral-100 dark:bg-neutral-dark-100 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-neutral-400 dark:text-neutral-dark-400" />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
          No {entityLabel}s found
        </p>
      </div>
    );
  }

  const actionsColumn = columns.find(isActionsColumn);
  const regularColumns = columns.filter((col) => !isActionsColumn(col));

  const headerCol = regularColumns[0];
  const otherCols = regularColumns.slice(1);

  return (
    <div
      className="relative w-full flex flex-col"
      style={{ height: "calc(100vh - 110px)", minHeight: 0 }}
    >
      <div className="mb-2 flex items-center justify-between px-1 shrink-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-dark-500">
          {selectedIds.length} selected
        </p>
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {areAllVisibleSelected ? "Unselect all" : "Select all"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className={`grid min-w-0 gap-2 pb-2 ${
          data.length === 1 
            ? 'grid-cols-1' 
            : data.length === 2 
              ? 'grid-cols-1 sm:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
        {data.map((row) => {
          const rowId = String(getRowId(row));
          const isSelected = selectedIdSet.has(rowId);

          if (CustomCardComponent) {
            return (
              <CustomCardComponent
                key={rowId}
                row={row}
                rowId={rowId}
                columns={columns}
                onRowClick={onRowClick}
                gridContext={gridContext}
                selected={isSelected}
                onToggleSelect={handleToggleSelect}
              />
            );
          }

          const headerValue = headerCol
            ? getDisplayValue(row[headerCol.field])
            : "";

          return (
            <div
              key={rowId}
              onClick={() => onRowClick?.(row)}
              className={[
                "group flex min-w-0 flex-col",
                "bg-neutral-0 dark:bg-neutral-dark-100",
                "border rounded-xs overflow-hidden",
                "transition-all duration-150",
                // selected state gets a brand-colored border + subtle tint
                isSelected
                  ? "border-brand-200 bg-brand-200/20 dark:border-brand-300 dark:bg-brand-200"
                  : "border-neutral-200 dark:border-neutral-dark-200",
                onRowClick
                  ? "cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-dark-400 hover:bg-white dark:hover:bg-neutral-dark-100"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Card Header */}
              <div className="flex min-w-0 items-center gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-dark-200">
                {/* Selectable Avatar */}
                <SelectableAvatar
                  label={headerValue || rowId}
                  seed={rowId}
                  selected={isSelected}
                  onToggle={() => handleToggleSelect(rowId)}
                />

                {/* Title */}
                <div className="flex-1 min-w-0">
                  {headerCol &&
                    (headerCol.cellRenderer ? (
                      <div
                        className="min-w-0 text-sm [&_a]:max-w-full [&_a]:inline-block [&_a]:truncate"
                        title={headerValue}
                        onClick={
                          onRowClick ? (e) => e.stopPropagation() : undefined
                        }
                      >
                        {headerCol.cellRenderer({
                          value: row[headerCol.field],
                          data: row,
                          context: gridContext,
                        })}
                      </div>
                    ) : (
                      <span
                        className="block text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950 truncate"
                        title={headerValue}
                      >
                        {headerValue || "—"}
                      </span>
                    ))}
                </div>

                {/* Actions */}
                {actionsColumn?.cellRenderer && (
                  <div
                    className="shrink-0 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionsColumn.cellRenderer({
                      value: row.id,
                      data: row,
                      context: gridContext,
                    })}
                  </div>
                )}
              </div>

              {/* Card Body */}
              {otherCols.length > 0 && (
                <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-x-3 gap-y-2 px-3 py-2">
                  {otherCols.map((col) => {
                    const rawVal = row[col.field];
                    const displayVal = getDisplayValue(rawVal);
                    const isEmpty = displayVal === "—";

                    return (
                      <div
                        key={col.field}
                        className="flex min-w-0 flex-col gap-0.5 overflow-hidden"
                      >
                        <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400">
                          {col.headerName}
                        </span>
                        {col.cellRenderer ? (
                          <div className="min-w-0 max-w-full text-xs font-medium text-neutral-800 [overflow-wrap:anywhere] dark:text-neutral-dark-800 [&_a]:min-w-0 [&_a]:max-w-full [&_a]:break-words">
                            {col.cellRenderer({
                              value: rawVal,
                              data: row,
                              context: gridContext,
                            })}
                          </div>
                        ) : isEmpty ? (
                          <span className="text-xs text-neutral-300 dark:text-neutral-dark-300">
                            —
                          </span>
                        ) : (
                          <FieldValue value={displayVal} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {onPageChange != null && (
        <CommonPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages ?? 1}
          onPageChange={onPageChange}
          className="shrink-0 card bg-white dark:bg-neutral-dark-100 text-neutral-700 dark:text-neutral-dark-900"
        />
      )}
    </div>
  );
};

export default CommonCardList;