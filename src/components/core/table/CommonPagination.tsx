import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface CommonPaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  onPageChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageJump?: boolean;
  className?: string;
}

const CommonPagination: React.FC<CommonPaginationProps> = ({
  page,
  pageSize,
  total,
  totalPages = 1,
  onPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showPageJump = true,
  className = "",
}) => {
  const [jumpPage, setJumpPage] = useState<string>("");

  // Calculate page numbers to display (optimized for mobile, works well on desktop too)
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Maximum number of page buttons to show (works well on both mobile and desktop)
    const sidePages = 1; // Number of pages to show on each side of current page

    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let startPage = Math.max(2, page - sidePages);
      let endPage = Math.min(totalPages - 1, page + sidePages);

      // Adjust if we're near the start (show more pages at the beginning)
      if (page <= sidePages + 2) {
        endPage = Math.min(maxVisible - 1, totalPages - 1);
        startPage = 2;
      } else if (page >= totalPages - sidePages - 1) {
        // Adjust if we're near the end (show more pages at the end)
        startPage = Math.max(2, totalPages - maxVisible + 2);
        endPage = totalPages - 1;
      }

      // Add ellipsis after first page if there's a gap
      if (startPage > 2) {
        pages.push("ellipsis-start");
      }

      // Add page numbers around current page
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if there's a gap
      if (endPage < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      // Always show last page (if it's not already included in the range)
      if (totalPages > 1 && endPage < totalPages) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [page, totalPages]);

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = parseInt(jumpPage, 10);
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      onPageChange(targetPage, pageSize);
      setJumpPage("");
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    // Calculate which item should be first visible after page size change
    const firstItemIndex = (page - 1) * pageSize;
    const newPage = Math.floor(firstItemIndex / newPageSize) + 1;
    onPageChange(newPage, newPageSize);
  };

  const startRecord = total == null || total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = total == null || total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className={`ag-pagination-wrapper px-2 py-1.5 bg-white dark:bg-neutral-dark-100 border-t border-neutral-200 dark:border-neutral-dark-200 rounded-t-none overflow-x-auto ${className}`}>
      <div className="flex min-w-max items-center justify-between gap-3 sm:w-full">
        {/* Info section */}
        <div className="ag-pagination-info flex items-center gap-x-2 gap-y-1 whitespace-nowrap text-xs sm:text-sm">
          <span className="ag-pagination-text hidden sm:block">
            Showing{" "}
            {total == null || total === 0
              ? "0 to 0 of 0"
              : `${startRecord} to ${endRecord} of ${total}`}{" "}
            records
          </span>
          <span className="hidden sm:inline ag-pagination-text">•</span>
          <span className="ag-pagination-text">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Controls section */}
        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
          {/* Navigation buttons with page numbers */}
          <div className="ag-pagination-buttons flex items-center gap-1 justify-center sm:justify-start">
            {/* First page button */}
            <button
              onClick={() => onPageChange(1, pageSize)}
              disabled={page <= 1}
              className="ag-pagination-button p-1.5 sm:p-2"
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Previous page button */}
            <button
              onClick={() => onPageChange(Math.max(1, page - 1), pageSize)}
              disabled={page <= 1}
              className="ag-pagination-button p-1.5 sm:p-2"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Page number buttons - show on all screens, fewer on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {pageNumbers.map((pageNum, index) => {
                if (pageNum === "ellipsis-start" || pageNum === "ellipsis-end") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="ag-pagination-text px-1 sm:px-2 text-xs sm:text-sm"
                    >
                      ...
                    </span>
                  );
                }
                const pageNumValue = pageNum as number;
                return (
                  <button
                    key={pageNumValue}
                    onClick={() => onPageChange(pageNumValue, pageSize)}
                    className={`ag-pagination-button min-w-[2rem] sm:min-w-[2.5rem] px-1.5 sm:px-2 text-xs sm:text-sm ${
                      pageNumValue === page ? "bg-brand-600 text-white border-brand-600" : ""
                    }`}
                    aria-label={`Page ${pageNumValue}`}
                    aria-current={pageNumValue === page ? "page" : undefined}
                  >
                    {pageNumValue}
                  </button>
                );
              })}
            </div>

            {/* Next page button */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1), pageSize)}
              disabled={page >= totalPages}
              className="ag-pagination-button p-1.5 sm:p-2"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Last page button */}
            <button
              onClick={() => onPageChange(totalPages, pageSize)}
              disabled={page >= totalPages}
              className="ag-pagination-button p-1.5 sm:p-2"
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Right side controls - Page jump and Page size */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Page jump input - only show on larger screens */}
            {showPageJump && totalPages > 10 && (
              <form onSubmit={handlePageJump} className="hidden md:flex items-center gap-2">
                <span className="ag-pagination-text text-sm whitespace-nowrap">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  placeholder={String(page)}
                  className="ag-pagination-select w-16 text-center"
                  aria-label="Jump to page"
                />
                <button
                  type="submit"
                  className="ag-pagination-button px-3 py-1 text-sm"
                  disabled={!jumpPage || parseInt(jumpPage, 10) === page}
                >
                  Go
                </button>
              </form>
            )}

            {/* Page size selector */}
            {showPageSizeSelector && (
              <div className="flex items-center gap-2 justify-center sm:justify-start whitespace-nowrap">
                <span className="ag-pagination-text text-xs sm:text-sm whitespace-nowrap">Page size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="ag-pagination-select min-w- text-xs sm:text-sm"
                  aria-label="Page size"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonPagination;
