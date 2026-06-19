import { ChevronDown, LayoutDashboard, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DashboardSummary } from "../types/document";
import { DEFAULT_DASHBOARD_NAME } from "../core/defaultDashboard";

interface DashboardTemplatePickerProps {
  templates: DashboardSummary[];
  activeTemplateId: string | null;
  onSelect: (dashboardId: string | null) => void;
  onManage: () => void;
  disabled?: boolean;
}

export function DashboardTemplatePicker({
  templates,
  activeTemplateId,
  onSelect,
  onManage,
  disabled,
}: DashboardTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? null;
  const publishedTemplates = templates.filter((template) => template.status === "published");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-xs border border-neutral-200/80 bg-white px-2 py-1 text-xs font-medium shadow-sm transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100 dark:hover:border-neutral-dark-400 dark:hover:bg-neutral-dark-200/50"
      >
        <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
        <span className="truncate">
          {activeTemplate?.name ?? DEFAULT_DASHBOARD_NAME}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[220px] max-w-[min(100vw-2rem,320px)] rounded-sm border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
          <button
            type="button"
            onClick={() => {
              onManage();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:text-neutral-200 dark:hover:bg-neutral-dark-200/50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage templates…
          </button>
          <div className="my-1 border-t border-neutral-200 dark:border-neutral-dark-300" />
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-neutral-dark-200/50 ${
              !activeTemplateId
                ? "font-medium text-brand-700 dark:text-brand-400"
                : "text-neutral-700 dark:text-neutral-200"
            }`}
          >
            <span className="truncate">{DEFAULT_DASHBOARD_NAME}</span>
            {!activeTemplateId ? (
              <span className="shrink-0 text-[10px] text-brand-600 dark:text-brand-400">
                Active
              </span>
            ) : null}
          </button>
          {publishedTemplates.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-neutral-500 dark:text-neutral-dark-600">
              No published templates yet
            </p>
          ) : (
            publishedTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onSelect(template.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-neutral-dark-200/50 ${
                  template.id === activeTemplateId
                    ? "font-medium text-brand-700 dark:text-brand-400"
                    : "text-neutral-700 dark:text-neutral-200"
                }`}
              >
                <span className="truncate">{template.name}</span>
                {template.id === activeTemplateId ? (
                  <span className="shrink-0 text-[10px] text-brand-600 dark:text-brand-400">
                    Active
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
