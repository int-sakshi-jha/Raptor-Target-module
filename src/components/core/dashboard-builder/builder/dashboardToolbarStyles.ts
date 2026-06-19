type ToolbarButtonVariant = "default" | "active" | "primary" | "danger";

const BASE =
  "inline-flex cursor-pointer items-center gap-1 rounded-xs border px-2 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

const VARIANTS: Record<ToolbarButtonVariant, string> = {
  default:
    "border-neutral-200/80 bg-white text-neutral-700 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 hover:shadow dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100 dark:text-neutral-dark-900 dark:hover:border-neutral-dark-400 dark:hover:bg-neutral-dark-200/60",
  active:
    "border-brand-500/50 bg-brand-500/10 text-brand-700 shadow-sm hover:border-brand-500/60 hover:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500/20",
  primary:
    "border-brand-600 bg-brand-600 text-white shadow-sm hover:border-brand-700 hover:bg-brand-700 hover:shadow-md dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500",
  danger:
    "border-red-200/80 bg-white text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30",
};

export function dashboardToolbarButtonClass(variant: ToolbarButtonVariant = "default"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}

export const DASHBOARD_TOOLBAR_PRIMARY_ACTION = `${BASE} ${VARIANTS.primary} px-2.5 sm:px-3`;
