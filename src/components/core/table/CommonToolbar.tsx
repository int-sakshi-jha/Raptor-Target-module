/* eslint-disable react-refresh/only-export-components */
import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import Button from '../../common/Button';
import { MoreVertical, Power, PowerOff, ChevronDown, Plus, Trash2, Filter as FilterIcon, Columns2, Download, FileText, Sheet, RefreshCw, Upload } from 'lucide-react';
import Tabs from '../../common/Tabs';
import Dropdown from '../../common/Dropdown';
import toast from 'react-hot-toast';
import DebouncedSearchInput from './DebouncedSearchInput';
import type { CommonTableHandle } from './CommonTable';
 
type PanelRef = React.RefObject<{ openPanel: () => void } | null>;
type TableRef = React.RefObject<CommonTableHandle | null>;

export interface ToolbarStatusActionConfig {
  selectedIds: string[];
  rows: Array<{ id: string; is_active?: boolean | null }>;
  onChange: (payload: { ids: string[]; is_active: boolean }) => void | Promise<void>;
  show?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  entityLabel?: string;
}

export interface ToolbarActionConfig {
  key: string;
  label: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'secondary' | 'danger';
  disabled?: boolean;
  show?: boolean;
  renderAsLabel?: boolean;
  menuContent?: React.ReactNode;
  statusConfig?: ToolbarStatusActionConfig;
  subItems?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }[];
  isExportAction?: boolean;
  isImportAction?:boolean;
  isFiltersAction?: boolean;
  isColumnsAction?: boolean;
  excel?: boolean;
  fileName?: string;
  onlySelected?: boolean;
  onImport?: (file: File) => void;
}

export interface ToolbarTabConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CommonToolbarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  entityKey?: string;
  placeholder?: string;
  actions: ToolbarActionConfig[];
  className?: string;
  tabs?: ToolbarTabConfig[];
  selectedTab?: string;
  onTabChange?: (key: string) => void;
  filterPanelRef?: PanelRef;
  columnPanelRef?: PanelRef;
  tableRef?: TableRef;
}

type OverflowCandidate =
  | {
    type: 'action';
    key: string;
  }
  | {
    type: 'tabs';
    key: '__tabs__';
  };

const OVERFLOW_FIT_BUFFER_PX = 8;
const FALLBACK_TOOLBAR_GAP_PX = 24;

type ToolbarDropdownItem = {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

interface ToolbarInlineActionProps {
  action: ToolbarActionConfig;
  measureOnly?: boolean;
  getDropdownItems: (action: ToolbarActionConfig) => ToolbarDropdownItem[];
  isCustomAction: (action: ToolbarActionConfig) => boolean;
  renderActionContent: (
    action: ToolbarActionConfig,
    options?: { hideLabelOnSmallScreens?: boolean }
  ) => React.ReactNode;
  handleActionClick: (action: ToolbarActionConfig) => void;
}

const ToolbarInlineAction: React.FC<ToolbarInlineActionProps> = ({
  action,
  measureOnly = false,
  getDropdownItems,
  isCustomAction,
  renderActionContent,
  handleActionClick,
}) => {
  if (isCustomAction(action)) {
    return <div>{action.label}</div>;
  }

  const dropdownItems = getDropdownItems(action);
  if (dropdownItems.length > 0) {
    return (
      <Dropdown
        label={<span className="hidden lg:inline text-xs">{action.label}</span>}
        icon={action.icon}
        items={dropdownItems}
        align="right"
        disabled={action.disabled}
        hideChevron={false}
        triggerClassName={[
          'btn btn-sm rounded-xs',
          action.variant === 'primary'
            ? 'btn-primary'
            : 'bg-transparent border border-brand-500 text-brand-700 dark:text-brand-600 hover:bg-brand-500/10',
          measureOnly ? 'pointer-events-none' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    );
  }

  return (
    <Button
      variant={action.variant || 'outline'}
      size="sm"
      onClick={() => handleActionClick(action)}
      disabled={action.disabled}
    >
      {renderActionContent(action, { hideLabelOnSmallScreens: true })}
    </Button>
  );
};

interface ToolbarMenuActionProps {
  action: ToolbarActionConfig;
  openSubMenuKey: string | null;
  setOpenSubMenuKey: React.Dispatch<React.SetStateAction<string | null>>;
  getDropdownItems: (action: ToolbarActionConfig) => ToolbarDropdownItem[];
  isCustomAction: (action: ToolbarActionConfig) => boolean;
  handleActionClick: (action: ToolbarActionConfig) => void;
}

const ToolbarMenuAction: React.FC<ToolbarMenuActionProps> = ({
  action,
  openSubMenuKey,
  setOpenSubMenuKey,
  getDropdownItems,
  isCustomAction,
  handleActionClick,
}) => {
  const customAction = isCustomAction(action);
  const dropdownItems = getDropdownItems(action);

  if (dropdownItems.length > 0) {
    const isOpen = openSubMenuKey === action.key;
    return (
      <div>
        <button
          onClick={() => setOpenSubMenuKey(isOpen ? null : action.key)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-sm font-medium text-neutral-700 dark:text-neutral-dark-950 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors"
        >
          <span className="shrink-0 text-neutral-500 dark:text-neutral-dark-500">
            {action.icon}
          </span>
          <span className="flex-1 text-left">{action.label}</span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {isOpen && (
          <div>
            {dropdownItems.map((sub) => (
              <button
                key={sub.label}
                onClick={sub.onClick}
                disabled={sub.disabled}
                className="w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-xs text-sm font-medium text-neutral-600 dark:text-neutral-dark-900 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sub.icon && (
                  <span className="shrink-0 text-neutral-500 dark:text-neutral-dark-500">
                    {sub.icon}
                  </span>
                )}
                <span className="text-left">{sub.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (customAction) {
    return (
      <div className="rounded-xs text-sm font-medium text-neutral-700 dark:text-neutral-dark-950 [&_*]:text-sm [&_svg]:w-4 [&_svg]:h-4">
        {action.menuContent ?? action.label}
      </div>
    );
  }

  return (
    <button
      onClick={() => handleActionClick(action)}
      disabled={action.disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${action.variant === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/15'
          : 'text-neutral-700 dark:text-neutral-dark-950 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="shrink-0 text-neutral-500 dark:text-neutral-dark-500">
        {action.icon}
      </span>
      <span className="text-left">{action.label}</span>
    </button>
  );
};

const CommonToolbarInner: React.FC<CommonToolbarProps> = ({
  search,
  onSearchChange,
  entityKey,
  placeholder = 'Search...',
  actions,
  className = '',
  tabs,
  selectedTab,
  onTabChange,
  filterPanelRef: propFilterPanelRef,
  columnPanelRef: propColumnPanelRef,
  tableRef: propTableRef,
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [overflowActionKeys, setOverflowActionKeys] = useState<string[]>([]);
  const [showTabsInMenu, setShowTabsInMenu] = useState(false);
  const [openSubMenuKey, setOpenSubMenuKey] = useState<string | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);

  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const measuringContainerRef = useRef<HTMLDivElement>(null);
  
  const actionWidthsRef = useRef<Map<string, number>>(new Map());
  const tabsWidthRef = useRef<number>(0);
  const menuWidthRef = useRef<number>(0);
  const hasHydratedFromUrlRef = useRef(false);
  const layoutFrameRef = useRef<number | null>(null);
  const searchQueryParamKey = useMemo(
    () => (entityKey ? `q_${entityKey}` : 'search'),
    [entityKey]
  );

  const writeSearchToUrl = useCallback(
    (value: string) => {
      if (typeof window === 'undefined') return;
      const currentUrl = new URL(window.location.href);
      const trimmed = value.trim();
      if (trimmed) currentUrl.searchParams.set(searchQueryParamKey, trimmed);
      else currentUrl.searchParams.delete(searchQueryParamKey);
      const nextSearch = currentUrl.searchParams.toString();
      const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${currentUrl.hash}`;
      window.history.replaceState(null, '', nextUrl);
    },
    [searchQueryParamKey]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!onSearchChange) return;
    if (hasHydratedFromUrlRef.current) return;
    hasHydratedFromUrlRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get(searchQueryParamKey);
    if (urlSearch == null) return;
    onSearchChange(urlSearch);
  }, [onSearchChange, searchQueryParamKey]);

  const statusAction = useMemo<ToolbarStatusActionConfig | null>(
    () => actions.find((action) => action.statusConfig)?.statusConfig ?? null,
    [actions]
  );

  const handleBulkStatusChange = useCallback(
    async (is_active: boolean) => {
      if (!statusAction) return;

      const entityLabel = statusAction.entityLabel?.trim() || 'item';
      const pluralEntityLabel = entityLabel.endsWith('s') ? entityLabel : `${entityLabel}s`;

      if (statusAction.selectedIds.length === 0) {
        toast.error(`Select at least one ${entityLabel} first.`);
        return;
      }

      const selectedIdSet = new Set(statusAction.selectedIds);
      const eligibleIds = statusAction.rows
        .filter((row) => selectedIdSet.has(row.id))
        .filter((row) => (is_active ? !row.is_active : Boolean(row.is_active)))
        .map((row) => row.id);

      if (eligibleIds.length === 0) {
        toast.error(
          is_active
            ? `All selected ${pluralEntityLabel} are already active.`
            : `All selected ${pluralEntityLabel} are already deactive.`
        );
        return;
      }

      await statusAction.onChange({ ids: eligibleIds, is_active });
    },
    [statusAction]
  );

  const buildStatusToolbarAction = useCallback(
    (action: ToolbarActionConfig): ToolbarActionConfig => {
      const nextStatusAction = action.statusConfig;
      if (!nextStatusAction) return action;

      const isDisabled =
        nextStatusAction.disabled === true ||
        nextStatusAction.isLoading === true ||
        nextStatusAction.selectedIds.length === 0;

      const items = [
        {
          label: 'Active',
          icon: <Power className="w-4 h-4" />,
          onClick: () => {
            void handleBulkStatusChange(true);
          },
        },
        {
          label: 'Deactive',
          icon: <PowerOff className="w-4 h-4" />,
          onClick: () => {
            void handleBulkStatusChange(false);
          },
        },
      ];

      return {
        ...action,
        label: (
          <Dropdown
            label={<span className="hidden text-xs lg:inline">Active</span>}
            icon={<Power className="w-4 h-4" />}
            disabled={isDisabled}
            hideChevron
            disabledTitle="Select row(s) first"
            align="right"
            triggerClassName="btn btn-sm btn-success gap-2"
            items={items}
          />
        ),
        menuContent: (
          <Dropdown
            label="Active"
            icon={<Power className="w-4 h-4" />}
            disabled={isDisabled}
            hideChevron
            disabledTitle="Select row(s) first"
            align="right"
            triggerClassName="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-dark-950 dark:hover:bg-neutral-dark-200"
            items={items}
          />
        ),
        icon: null,
        onClick: () => { },
        variant: action.variant || 'outline',
        disabled: isDisabled,
        show: nextStatusAction.show ?? action.show ?? true,
        renderAsLabel: true,
      };
    },
    [handleBulkStatusChange]
  );

  const mergedActions = useMemo(
    () => actions.map((action) => (action.statusConfig ? buildStatusToolbarAction(action) : action)),
    [actions, buildStatusToolbarAction]
  );
  
  // ── Stable ref-invokers to satisfy React Compiler (refs should not be read during render) ──

  const invokeFilters = useCallback(() => {
    propFilterPanelRef?.current?.openPanel();
  }, [propFilterPanelRef]);

  const invokeColumns = useCallback(() => {
    propColumnPanelRef?.current?.openPanel();
  }, [propColumnPanelRef]);

  const onExportCsv = useCallback(
    (action: ToolbarActionConfig) => {
      const t = propTableRef?.current;
      const onlySelected = action.onlySelected ?? (t?.getSelectedRowCount() ?? 0) > 0;
      t?.exportCsv({
        onlySelected,
        fileName: action.fileName,
      });
    },
    [propTableRef]
  );

  const onExportExcel = useCallback(
    (action: ToolbarActionConfig) => {
      const t = propTableRef?.current;
      const onlySelected = action.onlySelected ?? (t?.getSelectedRowCount() ?? 0) > 0;
      t?.exportExcel({
        onlySelected,
        fileName: action.fileName,
      });
    },
    [propTableRef]
  );

  const normalizedActions = useMemo(
    () =>
      mergedActions.map((action) => {
        let finalAction = action;
        if (action.key === 'delete' && statusAction) {
          finalAction = {
            ...action,
            disabled: action.disabled === true || statusAction.selectedIds.length === 0,
          };
        }
        return finalAction;
      }),
    [mergedActions, statusAction]
  );

  const visibleActions = normalizedActions.filter((action) => action.show !== false);
  const primaryActions = visibleActions.filter(
    (action) => action.variant === 'primary' || action.key === 'add'
  );
  const otherActions = visibleActions.filter(
    (action) => action.variant !== 'primary' && action.key !== 'add'
  );
  const primaryMeasureGroupRef = useRef<HTMLDivElement>(null);

  const requestLayoutRecalculation = useCallback(() => {
    if (layoutFrameRef.current !== null) {
      cancelAnimationFrame(layoutFrameRef.current);
    }

    layoutFrameRef.current = requestAnimationFrame(() => {
      layoutFrameRef.current = null;
      setLayoutRevision((value) => value + 1);
    });
  }, []);

  const renderActionContent = useCallback(
    (
      action: ToolbarActionConfig,
      options?: {
        hideLabelOnSmallScreens?: boolean;
      }
    ) => {
      const hideLabelOnSmallScreens = options?.hideLabelOnSmallScreens ?? false;
      const isCustomAction = !action.icon && React.isValidElement(action.label);

      if (isCustomAction) {
        return action.label;
      }

      return (
        <>
          {action.icon}
          <span className={hideLabelOnSmallScreens ? 'hidden lg:inline text-xs' : 'text-xs'}>
            {action.label}
          </span>
        </>
      );
    },
    []
  );

  const getDropdownItems = useCallback(
    (action: ToolbarActionConfig) => {
      const items = (action.subItems ?? []).map((subItem) => ({
        label: subItem.label,
        icon: subItem.icon,
        disabled: subItem.disabled,
        onClick: () => {
          subItem.onClick();
          setShowMobileMenu(false);
          setOpenSubMenuKey(null);
        },
      }));

      // Inject standard export items if applicable
      if (action.isExportAction) {
        items.push({
          label: 'Export CSV',
          icon: <FileText className="w-4 h-4" />,
          disabled: action.disabled,
          onClick: () => {
            onExportCsv(action);
            setShowMobileMenu(false);
            setOpenSubMenuKey(null);
          },
        });

        if (action.excel !== false) {
          items.push({
            label: 'Export Excel',
            icon: <Sheet className="w-4 h-4" />,
            disabled: action.disabled,
            onClick: () => {
              onExportExcel(action);
              setShowMobileMenu(false);
              setOpenSubMenuKey(null);
            },
          });
        }
      }

      return items;
    },
    [onExportCsv, onExportExcel]
  );

  const isCustomAction = useCallback(
    (action: ToolbarActionConfig) =>
      action.renderAsLabel === true && !action.icon && React.isValidElement(action.label),
    []
  );

  const handleActionClick = useCallback((action: ToolbarActionConfig) => {
    // ── Handle standard ref-based actions first ──
    
    if (action.isFiltersAction || action.key === "filters") {
      invokeFilters();
      setShowMobileMenu(false);
      return;
    }
    if (action.isColumnsAction || action.key === "columns") {
      invokeColumns();
      setShowMobileMenu(false);
      return;
    }

    action.onClick();
    setShowMobileMenu(false);
    setOpenSubMenuKey(null);
  }, [invokeFilters, invokeColumns]);

  const overflowCandidates = useMemo<OverflowCandidate[]>(
    () => [
      ...otherActions.map((action) => ({
        type: 'action' as const,
        key: action.key,
      })),
      ...(tabs && tabs.length > 0
        ? [
          {
            type: 'tabs' as const,
            key: '__tabs__' as const,
          },
        ]
        : []),
    ],
    [otherActions, tabs]
  );

  useEffect(() => {
    const maybeObservedElements: Array<Element | null> = [
      toolbarRowRef.current,
      searchContainerRef.current,
      primaryMeasureGroupRef.current,
    ];
    const observedElements = maybeObservedElements.filter(
      (element): element is Element => element !== null
    );

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', requestLayoutRecalculation);
      return () => {
        window.removeEventListener('resize', requestLayoutRecalculation);
        if (layoutFrameRef.current !== null) {
          cancelAnimationFrame(layoutFrameRef.current);
          layoutFrameRef.current = null;
        }
      };
    }

    const observer = new ResizeObserver(requestLayoutRecalculation);
    observedElements.forEach((element) => observer.observe(element));
    window.addEventListener('resize', requestLayoutRecalculation);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', requestLayoutRecalculation);
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current);
        layoutFrameRef.current = null;
      }
    };
  }, [
    requestLayoutRecalculation,
    onSearchChange,
    primaryActions.length,
    otherActions.length,
    tabs?.length,
  ]);



  useLayoutEffect(() => {
    const container = measuringContainerRef.current;
    if (!container) return;

    // Measure tabs
    const tabsEl = container.querySelector('[data-measure-tabs]');
    if (tabsEl) {
      tabsWidthRef.current = tabsEl.getBoundingClientRect().width;
    }

    // Measure menu button
    const menuEl = container.querySelector('[data-measure-menu]');
    if (menuEl) {
      menuWidthRef.current = menuEl.getBoundingClientRect().width;
    }

    // Measure each action
    const nextWidths = new Map<string, number>();
    const actionEls = container.querySelectorAll('[data-measure-action]');
    actionEls.forEach((el) => {
      const key = el.getAttribute('data-measure-action');
      if (key) {
        nextWidths.set(key, el.getBoundingClientRect().width);
      }
    });

    actionWidthsRef.current = nextWidths;

    // After measuring, trigger layout recalculation
    const row = toolbarRowRef.current;
    if (!row) return;

    // ─── Internal Width Calculation (stable) ───
    const getCandidateWidth = (cand: OverflowCandidate) => {
      if (cand.type === 'tabs') return tabsWidthRef.current + 16;
      return (nextWidths.get(cand.key) ?? 0) + 8;
    };

    const calculateTotalWidth = (count: number, showOverflow: boolean) => {
      let total = 0;
      const primaryWidth = primaryMeasureGroupRef.current?.offsetWidth ?? 0;
      if (primaryActions.length > 0 && primaryWidth > 0) total += primaryWidth + 8;

      for (let i = 0; i < count; i++) {
        total += getCandidateWidth(overflowCandidates[i]);
      }

      if (showOverflow) {
        total += (menuWidthRef.current || 40) + 8;
      }
      return total;
    };

    const rowGap = Number.parseFloat(window.getComputedStyle(row).columnGap);
    const toolbarGap = Number.isFinite(rowGap) ? rowGap : FALLBACK_TOOLBAR_GAP_PX;
    const searchWidth = searchContainerRef.current?.getBoundingClientRect().width ?? 0;
    const availableWidth = row.clientWidth - searchWidth - toolbarGap;
    if (availableWidth <= 0) return;

    const fitWidth = Math.max(0, availableWidth - OVERFLOW_FIT_BUFFER_PX);
    let visibleCount = overflowCandidates.length;
    while (
      visibleCount > 0 &&
      calculateTotalWidth(visibleCount, visibleCount < overflowCandidates.length) > fitWidth
    ) {
      visibleCount--;
    }

    const nextKeys = overflowCandidates
      .slice(visibleCount)
      .filter((c) => c.type === 'action')
      .map((c) => (c as { key: string }).key);

    const nextTabsInMenu = overflowCandidates.slice(visibleCount).some((c) => c.type === 'tabs');

    // ─── Atomic Guarded State Updates ───
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverflowActionKeys((prev) => {
      const isSame =
        prev.length === nextKeys.length && prev.every((k, i) => k === nextKeys[i]);
      return isSame ? prev : nextKeys;
    });

    setShowTabsInMenu((prev) => (prev === nextTabsInMenu ? prev : nextTabsInMenu));
  }, [overflowCandidates, tabs, primaryActions.length, layoutRevision]);

  const inlineActions = otherActions.filter((action) => !overflowActionKeys.includes(action.key));
  const menuActions = otherActions.filter((action) => overflowActionKeys.includes(action.key));
  const hasOverflowMenu = menuActions.length > 0 || showTabsInMenu;
  const isMenuOpen = hasOverflowMenu && showMobileMenu;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
        setOpenSubMenuKey(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(false);
        setOpenSubMenuKey(null);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isMenuOpen]);

  return (
    <div
      className={`relative w-full border-b border-neutral-200 dark:border-neutral-dark-200 py-2 mb-2 ${className}`}
    >
      <div ref={toolbarRowRef} className="flex flex-row items-center justify-between gap-3 md:gap-4">
        {onSearchChange && (
          <div ref={searchContainerRef} className="w-72">
            <DebouncedSearchInput
              value={search ?? ''}
              onChange={(trimmed) => {
                onSearchChange?.(trimmed);
                writeSearchToUrl(trimmed);
              }}
              placeholder={placeholder}
              className="relative"
              inputClassName="text-xs font-normal min-w-60 max-w-72"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {primaryActions.length > 0 && (
            <div className="flex items-center gap-2">
              {primaryActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant || 'primary'}
                  size="sm"
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                >
                  {renderActionContent(action, { hideLabelOnSmallScreens: true })}
                </Button>
              ))}
            </div>
          )}

          {inlineActions.length > 0 && (
            <div className="flex items-center gap-2">
              {inlineActions.map((action) => (
                <ToolbarInlineAction
                  key={action.key}
                  action={action}
                  getDropdownItems={getDropdownItems}
                  isCustomAction={isCustomAction}
                  renderActionContent={renderActionContent}
                  handleActionClick={handleActionClick}
                />
              ))}
            </div>
          )}

          {hasOverflowMenu && (
            <div className="relative">
              <Button
                ref={menuButtonRef}
                onClick={() => setShowMobileMenu((value) => !value)}
                variant="outline"
                size="sm"
                iconOnly
                aria-label="More options"
                type="button"
              >
                <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-dark-500" />
              </Button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowMobileMenu(false)}
                  />
                  <div
                    ref={mobileMenuRef}
                    className="absolute right-0 mt-2 bg-white dark:bg-neutral-dark-100 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 min-w-[220px] z-[101] overflow-hidden"
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500 bg-neutral-50 dark:bg-neutral-dark-50 border-b border-neutral-200 dark:border-neutral-dark-200">
                      Actions
                    </div>

                    <div className="p-2">
                      {menuActions.map((action) => (
                        <ToolbarMenuAction
                          key={action.key}
                          action={action}
                          openSubMenuKey={openSubMenuKey}
                          setOpenSubMenuKey={setOpenSubMenuKey}
                          getDropdownItems={getDropdownItems}
                          isCustomAction={isCustomAction}
                          handleActionClick={handleActionClick}
                        />
                      ))}
                    </div>

                    {showTabsInMenu && tabs && tabs.length > 0 && (
                      <>
                        {menuActions.length > 0 && (
                          <div className="border-t border-neutral-200 dark:border-neutral-dark-200" />
                        )}
                        <div className="p-2">
                          <div className="flex border border-neutral-200 dark:border-neutral-dark-200 rounded-xs items-center overflow-hidden">
                            {tabs.map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => {
                                  onTabChange?.(tab.key);
                                  setShowMobileMenu(false);
                                }}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${selectedTab === tab.key
                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                                    : 'text-neutral-700 dark:text-neutral-dark-950 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200'
                                  }`}
                              >
                                {tab.icon && <span className="text-base">{tab.icon}</span>}
                                <span>{tab.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!showTabsInMenu && tabs && tabs.length > 0 && (
            <Tabs
              tabs={tabs}
              selected={selectedTab || ''}
              onChange={onTabChange || (() => { })}
              size="sm"
              iconOnly={tabs.every(tab => !tab.label)}
            />
          )}
        </div>
      </div>

      <div ref={measuringContainerRef} className="absolute left-0 top-0 pointer-events-none opacity-0 -z-10">
        <div className="flex items-center gap-2">
          {primaryActions.length > 0 && (
            <div ref={primaryMeasureGroupRef} className="flex items-center gap-2">
              {primaryActions.map((action) => (
                <Button key={action.key} variant={action.variant || 'primary'} size="sm">
                  {renderActionContent(action, { hideLabelOnSmallScreens: true })}
                </Button>
              ))}
            </div>
          )}

          {otherActions.map((action) => (
            <div
              key={action.key}
              data-measure-action={action.key}
            >
              <ToolbarInlineAction
                action={action}
                measureOnly
                getDropdownItems={getDropdownItems}
                isCustomAction={isCustomAction}
                renderActionContent={renderActionContent}
                handleActionClick={handleActionClick}
              />
            </div>
          ))}

          {tabs && tabs.length > 0 && (
            <div data-measure-tabs>
              <Tabs
                tabs={tabs}
                selected={selectedTab || ''}
                onChange={() => { }}
                size="sm"
                iconOnly={tabs.every(tab => !tab.label)}
              />
            </div>
          )}

          <div data-measure-menu>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommonToolbar = React.memo(CommonToolbarInner);
export default CommonToolbar;

// ─── Toolbar Action Builders ─────────────────────────────────────────────────
// Concise one-liner factories that mirror the filter/column builder pattern.
// Icons are imported at the top of this file so consumers don't need to.

/** Primary "Add" button. */
export function buildAddAction(
  onClick: () => void,
  show?: boolean,
): ToolbarActionConfig {
  return {
    key: "add",
    label: "Add",
    icon: <Plus className="w-4 h-4" />,
    onClick,
    variant: "primary",
    show,
  };
}

/** Danger "Delete" button (disabled when nothing selected). */
export function buildDeleteAction(
  onClick: () => void,
  opts: { disabled?: boolean; show?: boolean } = {},
): ToolbarActionConfig {
  return {
    key: "delete",
    label: "Delete",
    icon: <Trash2 className="w-4 h-4" />,
    onClick,
    disabled: opts.disabled,
    variant: "danger",
    show: opts.show,
  };
}

/** Outline "Filters" button that opens the filter panel. */
export function buildFiltersAction(opts: { show?: boolean } = {}): ToolbarActionConfig {
  return {
    key: "filters",
    label: "Filters",
    icon: <FilterIcon className="w-4 h-4" />,
    onClick: () => { }, // Handled by CommonToolbar via props
    variant: "outline",
    show: opts.show,
    isFiltersAction: true,
  };
}

/** Outline "Columns" button that opens the column selector. */
export function buildColumnsAction(opts: { show?: boolean } = {}): ToolbarActionConfig {
  return {
    key: "columns",
    label: "Columns",
    icon: <Columns2 className="w-4 h-4" />,
    onClick: () => { }, // Handled by CommonToolbar via props
    variant: "outline",
    show: opts.show,
    isColumnsAction: true,
  };
}

/** Outline "Export" dropdown with CSV (+ optional Excel) sub-items. */
export function buildExportAction(
  opts: {
    excel?: boolean;
    show?: boolean;
    fileName?: string;
    onlySelected?: boolean;
  } = {},
): ToolbarActionConfig {
  const includeExcel = opts.excel ?? true;

  // We still need subItems but they will be handled by CommonToolbar's propTableRef
  return {
    key: "export",
    label: "Export",
    icon: <Download className="w-4 h-4" />,
    onClick: () => { },
    variant: "outline",
    show: opts.show,
    subItems: [], // Populated by CommonToolbar if tableRef is present
    isExportAction: true,
    excel: includeExcel,
    fileName: opts.fileName,
    onlySelected: opts.onlySelected,
  };
}

export function buildImportAction(
  opts: {
    show?: boolean;
    onImport?: (file: File) => void;
  } = {},
): ToolbarActionConfig {
  return {
    key: "import",
    label: "Import",
    icon: <Upload className="w-4 h-4" />,
    onClick: () => {},
    variant: "outline",
    show: opts.show,
    isImportAction: true,
    onImport: opts.onImport,
  };
}

/** Outline "Status" toggle (Active / Deactive). */
export function buildStatusAction(
  statusConfig: ToolbarStatusActionConfig,
): ToolbarActionConfig {
  return {
    key: "status",
    label: "",
    icon: null,
    onClick: () => { },
    variant: "outline",
    statusConfig,
  };
}

/** Outline "Refresh" button. */
export function buildRefreshAction(
  onClick: () => void,
  show?: boolean,
): ToolbarActionConfig {
  return {
    key: "refresh",
    label: "Refresh",
    icon: <RefreshCw className="w-4 h-4" />,
    onClick,
    variant: "outline",
    show,
  };
}
