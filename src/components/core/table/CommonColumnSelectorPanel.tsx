/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { X, Columns2, RotateCcw, GripVertical } from 'lucide-react';
import Button from '../../common/Button';
import Toggle from '../../common/Toggle';
import DebouncedSearchInput from './DebouncedSearchInput';

export interface CommonColumnConfig {
  field: string;
  headerName: string;
  visible: boolean;
  cellRenderer?: (params: any) => React.ReactNode;
  valueGetter?: (params: any) => any;
  valueFormatter?: (params: any) => string;
  editable?: boolean;
  cellEditor?: any;
  cellEditorParams?: any;
  cellEditorPopup?: boolean;
  cellEditorPopupPosition?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  resizable?: boolean;
  pinned?: "left" | "right";
  filter?: string | boolean;
  filterParams?: any;
  filterValueGetter?: any;
  sortable?: boolean;
  suppressMenu?: boolean;
  cellClass?: boolean | string;
}

type CommonColumnSelectorPanelProps = {
  open: boolean;
  onClose: () => void;
  columns: CommonColumnConfig[];
  onColumnsChange: (columns: CommonColumnConfig[]) => void;
  onResetColumns: () => void;
  title?: string;
  entityKey: string;
  defaultColumns: CommonColumnConfig[];
  /** Fields omitted from the panel and from column search (e.g. actions column). */
  excludedFields?: string[];
  className?: string;
};

const CommonColumnSelectorPanel: React.FC<CommonColumnSelectorPanelProps> = ({
  open,
  onClose,
  columns,
  onColumnsChange,
  onResetColumns,
  title = 'Columns',
  excludedFields = ['id'],
  className = '',
}) => {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [columnSearch, setColumnSearch] = useState('');

  const handleClose = () => {
    setColumnSearch('');
    onClose();
  };

  const excludedFieldSet = useMemo(
    () => new Set(excludedFields),
    [excludedFields],
  );

  const internalColumns = useMemo(
    () => columns.filter((col) => !excludedFieldSet.has(col.field)),
    [columns, excludedFieldSet],
  );

  const externalColumns = useMemo(
    () => columns.filter((col) => excludedFieldSet.has(col.field)),
    [columns, excludedFieldSet],
  );

  const filteredInternalColumns = useMemo(() => {
    const query = columnSearch.trim().toLowerCase();
    if (!query) return internalColumns;
    return internalColumns.filter(
      (col) =>
        col.headerName.toLowerCase().includes(query) ||
        col.field.toLowerCase().includes(query),
    );
  }, [internalColumns, columnSearch]);

  const isSearching = columnSearch.trim().length > 0;

  const mergeWithExternal = (updatedInternal: CommonColumnConfig[]) => [
    ...updatedInternal,
    ...externalColumns,
  ];

  const handleColumnToggle = (field: string) => {
    const newInternal = internalColumns.map((col) =>
      col.field === field ? { ...col, visible: !col.visible } : col,
    );
    onColumnsChange(mergeWithExternal(newInternal));
  };

  const handleReset = () => {
    onResetColumns();
  };

  const handleDragStart = (e: React.DragEvent, field: string) => {
    setDraggedColumn(field);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    if (!draggedColumn || isSearching) return;

    const draggedIndex = internalColumns.findIndex(
      (col) => col.field === draggedColumn,
    );
    if (draggedIndex === dropIndex) return;

    const newInternal = [...internalColumns];
    const [removed] = newInternal.splice(draggedIndex, 1);
    newInternal.splice(dropIndex, 0, removed);

    onColumnsChange(mergeWithExternal(newInternal));
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverIndex(null);
  };

  const panelContent = (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden
      />
      {/* Outer wrapper: fixed only so position is never overridden by glass-morphism-card */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[101] flex h-full w-[min(22rem,100vw)] max-w-full flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="columns-panel-title"
      >
        <div className={`h-full w-full flex flex-col border-l  border-neutral-200 dark:border-neutral-dark-200 bg-white/90 dark:bg-neutral-dark-100/95 backdrop-blur-md overflow-hidden`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2 rounded-xs bg-brand-50 dark:bg-brand-600/10">
              <Columns2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="min-w-0">
              <h2 id="columns-panel-title" className="font-semibold text-base text-neutral-900 dark:text-neutral-dark-950 truncate">
                {title}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-dark-500 mt-0.5">
                Show, hide, or drag to reorder columns
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 p-2 rounded-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-dark-900 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors"
            aria-label="Close column selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar min-h-0">
          <DebouncedSearchInput
            value={columnSearch}
            onChange={setColumnSearch}
            debounceMs={0}
            trimOnCommit={false}
            placeholder="Search columns..."
            className="mb-4"
            inputClassName="w-full text-xs font-normal"
          />
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500 uppercase tracking-wider mb-3">
            Columns
            {isSearching && (
              <span className="normal-case font-normal ml-1">
                ({filteredInternalColumns.length} of {internalColumns.length})
              </span>
            )}
          </p>
          <div className="space-y-1.5">
            {filteredInternalColumns.length > 0 ? (
              filteredInternalColumns.map((column) => {
                const index = internalColumns.findIndex(
                  (col) => col.field === column.field,
                );
                const canDrag = !isSearching;

                return (
                  <div
                    key={column.field}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, column.field)}
                    onDragOver={(e) => canDrag && handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => canDrag && handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      group relative transition-all duration-200
                      ${
                        draggedColumn === column.field
                          ? 'opacity-50 scale-95 border-brand-300 dark:border-brand-600'
                          : 'border-neutral-200 dark:border-neutral-dark-200 hover:border-neutral-300 dark:hover:border-neutral-dark-300'
                      }
                      ${
                        canDrag &&
                        dragOverIndex === index &&
                        draggedColumn !== column.field
                          ? 'border-brand-400 dark:border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                          : 'bg-white dark:bg-neutral-dark-100'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className={`shrink-0 p-2 rounded-xs border border-neutral-300 dark:border-neutral-dark-300 transition-opacity ${
                          canDrag
                            ? 'cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100'
                            : 'opacity-30 cursor-default'
                        }`}
                      >
                        <GripVertical className="w-5 h-5 text-neutral-500 dark:text-neutral-dark-500" />
                      </div>
                      <div className="flex-1">
                        <Toggle
                          name={`col-toggle-${column.field}`}
                          label={column.headerName}
                          checked={column.visible}
                          onChange={() => handleColumnToggle(column.field)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-dark-500 py-6 text-center">
                No columns match your search
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 px-5 py-4 border-t border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100/50">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset columns
          </Button>
        </div>
        </div>
      </div>
    </>
  );

  return createPortal(
    <RemoveScroll enabled={open}>{panelContent}</RemoveScroll>,
    document.body,
  );
};

export default CommonColumnSelectorPanel;
