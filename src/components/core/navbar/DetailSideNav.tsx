import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowLeft, ChevronLeft } from "lucide-react";

const DETAIL_SIDEBAR_EXPANDED_WIDTH = "w-52";
const DETAIL_SIDEBAR_COLLAPSED_WIDTH = "w-[60px]";
const DETAIL_SIDEBAR_MOTION_CLASS =
  "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

export interface DetailSideNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function SideNavItemContent({
  item,
  collapse,
  isActive,
}: {
  item: DetailSideNavItem;
  collapse: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <div className="flex min-w-0 items-center">
      <Icon
        className={`w-5 h-5 shrink-0 transition-colors ${
          isActive
            ? "text-brand-600 dark:text-brand-400"
            : "text-neutral-400 dark:text-neutral-dark-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-dark-700"
        }`}
      />
      <span
        className={`overflow-hidden whitespace-nowrap text-left transition-all ${DETAIL_SIDEBAR_MOTION_CLASS} ${
          collapse
            ? "ml-0 max-w-0 translate-x-1 opacity-0"
            : "ml-3 max-w-[10rem] translate-x-0 opacity-100"
        }`}
      >
        {item.label}
      </span>
    </div>
  );
}

const activeItemClass =
  "bg-brand-500/10 dark:bg-brand-400/15 text-brand-700 dark:text-brand-300 border-l-2 border-brand-500";
const inactiveItemClass =
  "text-neutral-600 dark:text-neutral-dark-700 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 hover:text-neutral-900 dark:hover:text-neutral-dark-950 border-l-2 border-neutral-0 hover:border-neutral-100 dark:hover:border-neutral-dark-0 dark:border-neutral-dark-100 dark:hover:border-neutral-dark-200";

export interface DetailDesktopSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onBack: () => void;
  headerLabel: string;
  items: DetailSideNavItem[];
  mode?: "route" | "state";
  basePath?: string;
  activeKey?: string;
  onSelect?: (key: string) => void;
  topOffsetClass?: string;
}

export function DetailDesktopSidebar({
  sidebarOpen,
  setSidebarOpen,
  onBack,
  headerLabel,
  items,
  mode = "route",
  basePath = "",
  activeKey,
  onSelect,
  topOffsetClass = "h-[calc(100vh-40px)]",
}: DetailDesktopSidebarProps) {
  const [hoveredTooltip, setHoveredTooltip] = React.useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);

  const showCollapsedTooltip = (
    currentTarget: HTMLButtonElement | HTMLAnchorElement,
    label: string,
  ) => {
    if (sidebarOpen) return;
    const rect = currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const hideCollapsedTooltip = () => {
    setHoveredTooltip(null);
  };

  return (
    <aside
      className={`fixed z-20 shrink-0 flex flex-col ${topOffsetClass} border-r border-neutral-200 dark:border-neutral-dark-200
        bg-neutral-0 dark:bg-neutral-dark-100 overflow-visible transition-[width] will-change-[width] ${DETAIL_SIDEBAR_MOTION_CLASS}
        ${sidebarOpen ? DETAIL_SIDEBAR_EXPANDED_WIDTH : DETAIL_SIDEBAR_COLLAPSED_WIDTH}`}
    >
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute -right-2.5 top-4 z-10 p-0.5 rounded-full
          bg-neutral-100 dark:bg-neutral-dark-50
          border border-neutral-300 dark:border-neutral-dark-200
          text-neutral-400 dark:text-neutral-dark-500
          hover:border-brand-600 hover:bg-brand-100 dark:hover:bg-brand-400/15
          hover:text-brand-500 transition-all duration-200"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <span
          className={`block transition-transform ${DETAIL_SIDEBAR_MOTION_CLASS} ${
            sidebarOpen ? "rotate-0" : "rotate-180"
          }`}
        >
          <ChevronLeft size={14} />
        </span>
      </button>

      <div
        className={`flex items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-dark-200 shrink-0 transition-all ${DETAIL_SIDEBAR_MOTION_CLASS}
          ${sidebarOpen ? "justify-start" : "justify-center"}`}
      >
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-xs hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 text-neutral-500 dark:text-neutral-dark-600 hover:text-neutral-700 dark:hover:text-neutral-dark-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span
          className={`overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500 transition-all ${DETAIL_SIDEBAR_MOTION_CLASS} ${
            sidebarOpen
              ? "max-w-[10rem] translate-x-0 opacity-100"
              : "max-w-0 -translate-x-1 opacity-0"
          }`}
        >
          {headerLabel}
        </span>
      </div>

      <div className="relative flex-1 overflow-visible">
        <nav className="h-full space-y-0.5 overflow-y-auto py-1">
          {items.map((item) => {
            const collapse = !sidebarOpen;
            const itemClass = `group relative flex items-center overflow-hidden text-sm font-medium transition-all ${DETAIL_SIDEBAR_MOTION_CLASS}
              ${collapse ? "justify-center px-0 py-2.5" : "justify-start px-4 py-2.5"}`;

            if (mode === "state") {
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect?.(item.key)}
                  onMouseEnter={(event) => showCollapsedTooltip(event.currentTarget, item.label)}
                  onMouseLeave={hideCollapsedTooltip}
                  onFocus={(event) => showCollapsedTooltip(event.currentTarget, item.label)}
                  onBlur={hideCollapsedTooltip}
                  aria-label={collapse ? item.label : undefined}
                  className={`w-full text-left ${itemClass} ${isActive ? activeItemClass : inactiveItemClass}`}
                >
                  <SideNavItemContent item={item} collapse={collapse} isActive={isActive} />
                </button>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={`${basePath}/${item.key}`}
                onMouseEnter={(event) => showCollapsedTooltip(event.currentTarget, item.label)}
                onMouseLeave={hideCollapsedTooltip}
                onFocus={(event) => showCollapsedTooltip(event.currentTarget, item.label)}
                onBlur={hideCollapsedTooltip}
                aria-label={collapse ? item.label : undefined}
                className={({ isActive }) =>
                  `${itemClass} ${isActive ? activeItemClass : inactiveItemClass}`
                }
              >
                {({ isActive }) => (
                  <SideNavItemContent item={item} collapse={collapse} isActive={isActive} />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {!sidebarOpen && hoveredTooltip ? (
        <div
          className="pointer-events-none fixed z-[120] -translate-y-1/2 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow-lg ring-1 ring-black/5 dark:bg-neutral-dark-100 dark:text-neutral-dark-950"
          style={{
            top: hoveredTooltip.top,
            left: hoveredTooltip.left,
          }}
        >
          {hoveredTooltip.label}
        </div>
      ) : null}
    </aside>
  );
}

export interface DetailMobileNavProps {
  onBack?: () => void;
  backLabel?: string;
  items: DetailSideNavItem[];
  mode?: "route" | "state";
  basePath?: string;
  activeKey?: string;
  onSelect?: (key: string) => void;
}

export function DetailMobileNav({
  onBack,
  backLabel,
  items,
  mode = "route",
  basePath = "",
  activeKey,
  onSelect,
}: DetailMobileNavProps) {
  const activeTabClass =
    "relative border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/20";
  const inactiveTabClass =
    "border-neutral-200/80 bg-neutral-50/90 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/80 dark:text-neutral-dark-700 dark:hover:border-neutral-dark-400 dark:hover:bg-neutral-dark-300";

  return (
    <div className="shrink-0 border-b border-neutral-200/90 bg-neutral-0/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-neutral-dark-300/55 dark:bg-neutral-dark-100/95">
      {onBack && (
        <div className="px-2.5 pb-1.5 pt-1.5">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 rounded-none border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-neutral-700 transition-colors hover:bg-brand-50/80 hover:text-brand-700 dark:text-neutral-dark-900 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-none bg-neutral-0 text-neutral-500 shadow-sm ring-1 ring-neutral-200/80 transition-colors group-hover:text-brand-600 dark:bg-neutral-dark-100 dark:text-neutral-dark-500 dark:ring-neutral-dark-300/60 dark:group-hover:text-brand-300">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span className="leading-none tracking-tight">{backLabel}</span>
          </button>
        </div>
      )}

      <div className="relative border-t border-neutral-200/70 bg-neutral-0/70 px-3 pb-2 pt-2 dark:border-neutral-dark-300/45 dark:bg-neutral-dark-100/70">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-neutral-0/95 to-transparent dark:from-neutral-dark-100/95" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-neutral-0/95 to-transparent dark:from-neutral-dark-100/95" />
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          if (mode === "state") {
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect?.(item.key)}
                className={`flex items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all
                  ${
                    isActive
                      ? activeTabClass
                      : inactiveTabClass
                  }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            );
          }

          return (
            <NavLink
              key={item.key}
              to={`${basePath}/${item.key}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all
                ${
                  isActive
                    ? activeTabClass
                    : inactiveTabClass
                }`
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
        </div>
      </div>
    </div>
  );
}
