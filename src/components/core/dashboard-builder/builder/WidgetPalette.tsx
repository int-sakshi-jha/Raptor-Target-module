import { useMemo, useState } from "react";
import { Gauge, Plus, Search, X } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import type { WidgetDefinition } from "../registry/widgetLibrary";
import { WIDGET_CATEGORIES } from "../registry/widgetLibrary";
import { WIDGET_CATEGORY_THEME, WIDGET_LIBRARY_ICONS } from "./widgetPaletteTheme";

interface WidgetPaletteProps {
  widgets: WidgetDefinition[];
  onAdd: (type: WidgetDefinition["type"]) => void;
  variant?: "sidebar" | "drawer";
  onClose?: () => void;
  className?: string;
}

function WidgetLibraryCard({
  widget,
  onAdd,
}: {
  widget: WidgetDefinition;
  onAdd: () => void;
}) {
  const theme = WIDGET_CATEGORY_THEME[widget.category];
  const Icon = WIDGET_LIBRARY_ICONS[widget.icon] ?? Gauge;

  return (
    <button
      type="button"
      onClick={onAdd}
      className={`group flex w-full items-start gap-1.5 rounded-sm border border-neutral-200/80 bg-white p-1.5 text-left shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100 ${theme.cardHover} ${theme.cardRing}`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm ${theme.iconBg}`}
      >
        <Icon className={`h-3 w-3 ${theme.iconText}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="min-w-0 truncate text-[11px] font-semibold leading-tight text-neutral-900 dark:text-neutral-dark-950">
            {widget.label}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
            <Plus className="h-3 w-3" />
            Add
          </span>
        </div>
        <span className="mt-px line-clamp-1 text-[10px] leading-snug text-neutral-500 dark:text-neutral-dark-600">
          {widget.description}
        </span>
      </div>
    </button>
  );
}

export function WidgetPalette({
  widgets,
  onAdd,
  variant = "sidebar",
  onClose,
  className = "",
}: WidgetPaletteProps) {
  const [query, setQuery] = useState("");
  const isWideDrawer = useMediaQuery("(min-width: 480px)");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return widgets;
    return widgets.filter(
      (widget) =>
        widget.label.toLowerCase().includes(q) ||
        widget.description.toLowerCase().includes(q) ||
        widget.type.toLowerCase().includes(q) ||
        widget.category.toLowerCase().includes(q),
    );
  }, [query, widgets]);

  const gridClass =
    variant === "drawer" && isWideDrawer
      ? "grid grid-cols-1 gap-1.5 sm:grid-cols-2"
      : "grid grid-cols-1 gap-1.5";

  return (
    <aside
      className={`dashboard-widget-palette flex h-full flex-col border-neutral-200/80 bg-white dark:border-neutral-dark-300/70 dark:bg-neutral-dark-100 ${
        variant === "sidebar"
          ? "w-full shrink-0 border-r sm:w-72 lg:w-80"
          : "w-full border-r shadow-xl"
      } ${className}`}
    >
      <div className="shrink-0 border-b border-neutral-200/80 bg-gradient-to-br from-brand-500/8 via-white to-white px-2 py-2 dark:border-neutral-dark-300/60 dark:from-brand-500/10 dark:via-neutral-dark-100 dark:to-neutral-dark-100">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-dark-800">
              Widget Library
            </h3>
            <p className="mt-0.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-dark-600">
              Tap to add · drag top bar to move
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close widget library"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-neutral-200/80 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search widgets…"
            className="w-full rounded-sm border border-neutral-200/80 bg-white py-1.5 pl-7 pr-2 text-xs focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/20 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-50"
          />
        </div>
        <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-dark-500">
          {filtered.length} widget{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {WIDGET_CATEGORIES.map((category) => {
          const categoryWidgets = filtered.filter((widget) => widget.category === category.id);
          if (categoryWidgets.length === 0) return null;

          const theme = WIDGET_CATEGORY_THEME[category.id];

          return (
            <section key={category.id} className="mb-2.5 last:mb-0">
              <div
                className={`mb-1.5 overflow-hidden rounded-sm border bg-gradient-to-r ${theme.gradient} ${theme.border}`}
              >
                <div className="flex items-center gap-1.5 bg-white/85 px-2 py-1 dark:bg-neutral-dark-100/90">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-dark-800">
                    {category.label}
                  </span>
                  <span className="ml-auto rounded-sm bg-neutral-100 px-1 py-px text-[9px] font-semibold text-neutral-500 dark:bg-neutral-dark-200/60 dark:text-neutral-dark-600">
                    {categoryWidgets.length}
                  </span>
                </div>
              </div>

              <div className={gridClass}>
                {categoryWidgets.map((widget) => (
                  <WidgetLibraryCard
                    key={widget.type}
                    widget={widget}
                    onAdd={() => onAdd(widget.type)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-neutral-200/80 px-3 py-6 text-center dark:border-neutral-dark-300/60">
            <Search className="mb-1.5 h-6 w-6 text-neutral-300 dark:text-neutral-dark-400" />
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-dark-700">
              No widgets match your search
            </p>
            <p className="mt-1 text-[10px] text-neutral-400">Try a different keyword or category</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
