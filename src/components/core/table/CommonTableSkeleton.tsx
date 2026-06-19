import React from "react";
import type { CommonColumnConfig } from "./CommonColumnSelectorPanel";

const skeletonBlockClass =
  "animate-pulse rounded-sm bg-neutral-200/90 dark:bg-neutral-dark-300/80";

const SKELETON_ROW_COUNT = 10;

/** Vary skeleton cell widths per row for a natural table look. */
const CELL_WIDTHS = ["w-[72%]", "w-[58%]", "w-[84%]", "w-[46%]", "w-[64%]"];

type CellVariant = "text" | "pill" | "actions" | "checkbox";

function resolveCellVariant(field: string, headerName: string): CellVariant {
  const key = `${field} ${headerName}`.toLowerCase();
  if (field === "actions" || key.includes("action")) return "actions";
  if (key.includes("type") || key.includes("status") || key.includes("role")) {
    return "pill";
  }
  return "text";
}

function SkeletonCell({
  variant,
  rowIndex,
  colIndex,
}: {
  variant: CellVariant;
  rowIndex: number;
  colIndex: number;
}) {
  if (variant === "checkbox") {
    return (
      <div
        className={`h-4 w-4 shrink-0 ${skeletonBlockClass}`}
        aria-hidden
      />
    );
  }

  if (variant === "actions") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-7 w-7 shrink-0 ${skeletonBlockClass}`}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={`h-6 w-24 max-w-full rounded-full ${skeletonBlockClass}`}
        aria-hidden
      />
    );
  }

  const widthClass = CELL_WIDTHS[(rowIndex + colIndex) % CELL_WIDTHS.length];
  return (
    <div
      className={`h-4 max-w-full ${widthClass} ${skeletonBlockClass}`}
      aria-hidden
    />
  );
}

export interface CommonTableSkeletonProps {
  columns?: CommonColumnConfig[];
  rowCount?: number;
  className?: string;
}

const CommonTableSkeleton: React.FC<CommonTableSkeletonProps> = ({
  columns = [],
  rowCount = SKELETON_ROW_COUNT,
  className = "",
}) => {
  const visibleColumns = columns.filter((col) => col.visible !== false);

  const skeletonColumns: Array<{
    key: string;
    label: string;
    variant: CellVariant;
    minWidth?: number;
    pinned?: "left" | "right";
  }> = [
    { key: "__select", label: "", variant: "checkbox", minWidth: 50 },
    ...visibleColumns.map((col) => ({
      key: col.field,
      label: col.headerName,
      variant: resolveCellVariant(col.field, col.headerName),
      minWidth: col.minWidth ?? 120,
      pinned: col.pinned,
    })),
  ];

  if (skeletonColumns.length <= 1) {
    skeletonColumns.push(
      { key: "col-1", label: "Name", variant: "text", minWidth: 160 },
      { key: "col-2", label: "Code", variant: "text", minWidth: 120 },
      { key: "col-3", label: "Type", variant: "pill", minWidth: 120 },
      { key: "col-4", label: "Plant", variant: "text", minWidth: 140 },
      { key: "col-5", label: "Tenant", variant: "text", minWidth: 120 },
      { key: "actions", label: "Action", variant: "actions", minWidth: 110, pinned: "right" },
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-neutral-200 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-[1] bg-neutral-100 dark:bg-neutral-dark-200">
            <tr className="border-b border-neutral-200 dark:border-neutral-dark-200">
              {skeletonColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`h-12 border-r border-neutral-200 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 last:border-r-0 dark:border-neutral-dark-200 dark:text-neutral-dark-500 ${
                    col.pinned === "right" ? "sticky right-0 z-[2] bg-neutral-100 dark:bg-neutral-dark-200" : ""
                  }`}
                  style={{ minWidth: col.minWidth }}
                >
                  {col.label ? (
                    <span>{col.label}</span>
                  ) : (
                    <span className="sr-only">Select</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-dark-200">
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr
                key={rowIndex}
                className="bg-neutral-0 dark:bg-neutral-dark-100"
              >
                {skeletonColumns.map((col, colIndex) => (
                  <td
                    key={`${rowIndex}-${col.key}`}
                    className={`h-[42px] border-r border-neutral-200 px-3 align-middle last:border-r-0 dark:border-neutral-dark-200 ${
                      col.pinned === "right"
                        ? "sticky right-0 z-[1] bg-neutral-0 dark:bg-neutral-dark-100"
                        : ""
                    }`}
                  >
                    <SkeletonCell
                      variant={col.variant}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export function CommonTablePaginationSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-dark-200 ${className}`}
      aria-hidden
    >
      <div className={`h-4 w-48 ${skeletonBlockClass}`} />
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 ${skeletonBlockClass}`} />
        <div className={`h-8 w-8 ${skeletonBlockClass}`} />
        <div className={`h-8 w-20 ${skeletonBlockClass}`} />
        <div className={`h-8 w-8 ${skeletonBlockClass}`} />
        <div className={`h-8 w-8 ${skeletonBlockClass}`} />
      </div>
    </div>
  );
}

export default CommonTableSkeleton;
