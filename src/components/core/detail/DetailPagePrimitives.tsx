import React, { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

/** Section title row for detail cards — bordered from generic form sections. */
export function DetailSectionHeader({
  icon: Icon,
  title,
  description,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Extra classes on the header row (e.g. tighter spacing). */
  className?: string;
}) {
  return (
    <div
      className={`mb-3 flex gap-3 border-b border-neutral-200/90 pb-3 dark:border-neutral-dark-300/60 ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.14] ring-1 ring-brand-500/20 dark:bg-brand-500/20 dark:ring-brand-400/25">
        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
      </div>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-[13px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-dark-950">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-dark-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DetailPageBackground({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[calc(100dvh-40px)] w-full flex-col bg-neutral-100/90 dark:bg-neutral-dark-50 ${className}`}
    >
      {children}
    </div>
  );
}

export function DetailPageShell({
  sidebarOpen,
  header,
  mobileNav,
  desktopSidebar,
  children,
  isLargeScreen,
  mobileHeaderSummary,
  onBack,
}: {
  sidebarOpen: boolean;
  header: React.ReactNode;
  mobileNav: React.ReactNode;
  desktopSidebar: React.ReactNode;
  children: React.ReactNode;
  isLargeScreen: boolean;
  mobileHeaderSummary?: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle?: React.ReactNode;
  };
  onBack?: () => void;
}) {
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = React.useState(false);
  const mobileHeaderBodyRef = React.useRef<HTMLDivElement | null>(null);
  const [mobileHeaderBodyHeight, setMobileHeaderBodyHeight] = React.useState(0);

  React.useEffect(() => {
    if (isLargeScreen || !mobileHeaderSummary) return;

    const node = mobileHeaderBodyRef.current;
    if (!node) return;

    const measure = () => {
      setMobileHeaderBodyHeight(node.scrollHeight);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [header, isLargeScreen, mobileHeaderSummary, mobileHeaderExpanded]);

  if (!isLargeScreen) {
    const MobileHeaderIcon = mobileHeaderSummary?.icon;

    return (
      <div className="flex h-[calc(100vh-40px)] min-h-0 flex-col">
        {mobileNav}
        <div className="flex min-h-0 flex-1 flex-col">
          {mobileHeaderSummary ? (
            <div className="shrink-0 border-b border-neutral-200/90 bg-neutral-0/95 px-3 py-2 backdrop-blur-sm dark:border-neutral-dark-300/55 dark:bg-neutral-dark-100/95">
              <div className="overflow-hidden rounded-xs border border-neutral-200/90 bg-neutral-0 shadow-sm dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100">
                <div className="flex items-center gap-0 bg-gradient-to-r from-neutral-0 to-brand-50/35 dark:from-neutral-dark-100 dark:to-brand-500/10">
                  {onBack && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBack();
                      }}
                      className="flex h-12 w-10 shrink-0 items-center justify-center text-neutral-500 transition-colors hover:text-brand-600 dark:text-neutral-dark-500 dark:hover:text-brand-400"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileHeaderExpanded((value) => !value)}
                    aria-expanded={mobileHeaderExpanded}
                    className={`flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/10 ${
                      onBack ? "pl-0 pr-3" : "px-3"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {MobileHeaderIcon ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.12] ring-1 ring-brand-500/15 dark:bg-brand-500/18 dark:ring-brand-400/20">
                          <MobileHeaderIcon className="h-[18px] w-[18px] text-brand-600 dark:text-brand-400" />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-dark-950">
                          {mobileHeaderSummary.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-dark-500">
                          {mobileHeaderSummary.subtitle ||
                            (mobileHeaderExpanded
                              ? "Tap to collapse details"
                              : "Tap to expand details")}
                        </p>
                      </div>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-0 text-neutral-500 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200 dark:text-neutral-dark-500">
                      {mobileHeaderExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </div>
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    maxHeight: mobileHeaderExpanded ? mobileHeaderBodyHeight : 0,
                    opacity: mobileHeaderExpanded ? 1 : 0,
                  }}
                >
                  <div ref={mobileHeaderBodyRef} className="border-t border-neutral-200/90 dark:border-neutral-dark-300/55">
                    {header}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="shrink-0">{header}</div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  const detailSidebarMarginClass = sidebarOpen ? "ml-52" : "ml-[60px]";
  const detailSidebarMotionClass =
    "transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[margin]";

  return (
    <div className="relative flex h-[calc(100vh-40px)] min-h-0">
      {desktopSidebar}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${detailSidebarMarginClass} ${detailSidebarMotionClass}`}
      >
        <div className="shrink-0">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function DetailContentArea({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 p-3 ${className}`}>{children}</div>
  );
}

export function DetailHeaderCard({ children }: { children: React.ReactNode }) {
  return (
    <header className="shrink-0 border-b border-neutral-200/90 backdrop-blur-sm dark:border-neutral-dark-300/55">
      {/* Padding matches {@link DetailMain} so breadcrumb and body share the same inset */}
      <div className="p-2">
        <div className="rounded-lg border border-neutral-200/95 bg-neutral-0 px-3 py-2.5 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
          {children}
        </div>
      </div>
    </header>
  );
}

export function DetailMain({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`w-full flex-1 space-y-3.5 p-3 ${className}`}
    >
      {children}
    </main>
  );
}

/**
 * Responsive section tiles: 2 cols from `md`, 3 from `xl`.
 * Cards in the same row stretch to equal height; use {@link DetailSectionCard} `span="full"` for wide blocks.
 */
export function DetailSectionsGrid({
  children,
  maxColumns = 3,
}: {
  children: React.ReactNode;
  maxColumns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={`grid grid-cols-1 items-stretch gap-3 [grid-auto-rows:minmax(0,auto)] ${
        maxColumns === 1
          ? ""
          : maxColumns === 2
            ? "md:grid-cols-2 xl:grid-cols-2"
            : "md:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {children}
    </div>
  );
}

const DETAIL_HERO_TITLE_DEFAULT_CLASS =
  "break-words text-xl font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-dark-950 md:text-[1.7rem]";

export function DetailHero({
  icon: Icon,
  title,
  titleClassName,
  subtitle,
  badges,
  badgesAlign = "below",
  badgesCaption,
  badgesAriaLabel,
  stats,
  actions,
  className = "",
  mobileSummaryHandled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleClassName?: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  badgesAlign?: "below" | "beside";
  badgesCaption?: React.ReactNode;
  badgesAriaLabel?: string;
  stats?: Array<{ label: string; value: React.ReactNode }>;
  actions?: React.ReactNode;
  className?: string;
  mobileSummaryHandled?: boolean;
}) {
  const hasStats = stats != null && stats.length > 0;
  const resolvedTitleClass =
    titleClassName?.trim() || DETAIL_HERO_TITLE_DEFAULT_CLASS;

  const titleBlock =
    badgesAlign === "beside" && badges ? (
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1 lg:max-w-[min(100%,36rem)]">
          <h1 className={resolvedTitleClass}>
            {title}
          </h1>
          {subtitle != null && subtitle !== false ? (
            <div className="mt-1 text-xs leading-snug text-neutral-500 dark:text-neutral-dark-500">
              {subtitle}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-[min(100%,28rem)]">
          {badgesCaption ? <div className="w-full shrink-0">{badgesCaption}</div> : null}
          <div
            role={badgesAriaLabel ? "group" : undefined}
            aria-label={badgesAriaLabel}
            className="flex flex-wrap gap-1.5"
          >
            {badges}
          </div>
        </div>
      </div>
    ) : (
      <div className="min-w-0 pt-0.5">
        <h1 className={resolvedTitleClass}>
          {title}
        </h1>
        {subtitle != null && subtitle !== false ? (
          <div className="mt-1.5 text-sm leading-snug text-neutral-500 dark:text-neutral-dark-500">
            {subtitle}
          </div>
        ) : null}
        {badges ? (
          <div className="mt-3 flex flex-wrap gap-2">{badges}</div>
        ) : null}
      </div>
    );

  return (
    <div
      className={`relative flex flex-col gap-3 overflow-hidden border border-neutral-200/70 bg-neutral-0 py-4 pl-4 pr-4 shadow-sm dark:border-neutral-dark-200/70 dark:bg-neutral-dark-100 md:pl-5 md:pr-5 xl:flex-row xl:justify-between xl:gap-6 ${
        badgesAlign === "beside" && badges
          ? "xl:items-start"
          : "xl:items-center"
      } ${className}`}
    >
      <div className="pointer-events-none absolute -top-12 right-24 h-36 w-36 rounded-full bg-brand-500/8 blur-2xl dark:bg-brand-500/15" />
      <div className="pointer-events-none absolute -top-10 right-8 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl dark:bg-brand-500/18" />
      <div className="pointer-events-none absolute -top-8 left-14 h-32 w-32 rounded-full bg-brand-500/7 blur-2xl dark:bg-brand-500/12" />
      {/* <div
        className="absolute bottom-0 left-0 top-0 w-[3px] bg-brand-600 dark:bg-brand-500"
        aria-hidden
      /> */}
      <div
        className={`relative min-w-0 flex-1 items-start gap-3.5 ${
          mobileSummaryHandled ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.1] ring-1 ring-brand-500/15 dark:bg-brand-500/18 dark:ring-brand-400/20">
          <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        {titleBlock}
      </div>
      {(hasStats || actions) ? (
        <div className="relative flex w-full shrink-0 flex-col gap-2 xl:mt-0 xl:w-auto xl:ml-auto xl:items-end">
          {actions ? (
            <div className="flex items-center justify-start gap-1.5 xl:justify-end">
              {actions}
            </div>
          ) : null}
          {hasStats ? (
            <div className="w-full overflow-x-auto xl:w-auto xl:ml-auto">
              <div className="flex w-max items-stretch gap-2 xl:justify-end">
              {stats.map((s) => (
                <div
                  key={String(s.label)}
                  className="inline-flex min-w-[8.5rem] max-w-full flex-col items-start rounded-xs border border-neutral-200/75 bg-neutral-50/80 px-2.5 py-2 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-200/70"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-500">
                    {s.label}
                  </span>
                  <span className="mt-1 text-sm font-semibold leading-none">
                    {s.value}
                  </span>
                </div>
              ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DetailHeaderActionButton({
  title,
  icon,
  onClick,
  disabled,
  tone = "neutral",
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "brand" | "success" | "danger";
}) {
  const toneClass =
    tone === "brand"
      ? "text-brand-700 hover:bg-brand-600/10 dark:text-brand-400 dark:hover:bg-brand-600/15"
      : tone === "success"
        ? "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        : tone === "danger"
          ? "text-error-600 hover:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-dark-500 dark:hover:bg-neutral-dark-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xs border border-neutral-200/70 bg-neutral-50/80 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-200/75 ${toneClass}`}
      aria-label={title}
    >
      {icon}
    </button>
  );
}

export function DetailSectionCard({
  children,
  className = "",
  span = "default",
  title,
  description,
  icon: SectionIcon,
  collapsible = false,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  className?: string;
  span?: "default" | "full";
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const spanClass = span === "full" ? "col-span-full" : "";
  const CardIcon = SectionIcon;
  const hasCardHeader = Boolean(title && CardIcon);

  return (
    <section
      className={`group relative flex h-auto min-h-0 min-w-0 flex-col overflow-hidden rounded-xs border border-neutral-200/95 bg-neutral-0 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-dark-200 dark:bg-neutral-dark-100 ${spanClass} ${className}`}
    >
      {hasCardHeader && CardIcon ? (
        <>
          <button
            type="button"
            onClick={() => collapsible && setOpen((v) => !v)}
            aria-expanded={open}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
              collapsible ? "hover:bg-neutral-50/80 dark:hover:bg-neutral-dark-200/50" : "cursor-default"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.14] ring-1 ring-brand-500/20 dark:bg-brand-500/20 dark:ring-brand-400/25">
              <CardIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-dark-950">
                {title}
              </h3>
            </div>
            {collapsible ? (
              open ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-dark-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-dark-500" />
              )
            ) : null}
          </button>
          {open ? (
            <>
              <div className="mx-4 border-t border-neutral-200/90 dark:border-neutral-dark-300/60" />
              <div className="relative flex min-h-0 flex-1 flex-col px-4 py-3">
                {description ? (
                  <p className="mb-3 text-xs leading-snug text-neutral-500 dark:text-neutral-dark-500">
                    {description}
                  </p>
                ) : null}
                {children}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col px-4 py-3">{children}</div>
      )}
    </section>
  );
}

export function DetailMetaBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-xs border border-neutral-200/75 bg-neutral-50/80 px-2.5 py-1 text-[11px] font-medium leading-none text-neutral-700 dark:border-neutral-dark-300/65 dark:bg-neutral-dark-200/75 dark:text-neutral-dark-900">
      {children}
    </span>
  );
}

export function DetailLinkValue({
  href,
  children,
}: {
  href?: string | null;
  children?: React.ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-700 break-all hover:underline dark:text-brand-400"
    >
      {children ?? href}
    </a>
  );
}

function isEmptyValue(value: React.ReactNode): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/**
 * Stacked rows (label | value) — avoids empty grid cells inside cards.
 */
export function DetailFieldGrid({
  children,
  variant = "balanced",
}: {
  children: React.ReactNode;
  variant?: "balanced" | "dense";
}) {
  const denseFieldRows =
    variant === "dense"
      ? "[&>div]:!py-2 [&>div]:last:!pb-0 [&>div]:first:!pt-0 sm:[&>div]:!py-1.5"
      : "";
  return (
    <div
      className={`flex flex-col divide-y divide-neutral-200/90 dark:divide-neutral-dark-300/55 ${denseFieldRows}`}
      data-field-grid={variant}
    >
      {children}
    </div>
  );
}

export function DetailField({
  label,
  value,
  span = 1,
  fullRow = false,
  hideWhenEmpty = true,
  emptyDisplay = "-",
  className = "",
  centered = false,
}: {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
  fullRow?: boolean;
  hideWhenEmpty?: boolean;
  emptyDisplay?: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  const empty = isEmptyValue(value);
  if (hideWhenEmpty && empty) return null;
  const display = empty ? emptyDisplay : value;
  void span;
  void fullRow;
  return (
    <div
      className={`py-1.5 first:pt-0 last:pb-0 sm:py-2.5 ${className}`}
    >
      <div className={`flex flex-col gap-0.5 sm:flex-row sm:gap-x-3 ${centered ? "sm:items-center" : "sm:items-start"}`}>
        <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500 sm:w-[38%] sm:max-w-[11rem]">
          {label}
        </dt>
        <dd className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-neutral-900 dark:text-neutral-dark-950">
          {display}
        </dd>
      </div>
    </div>
  );
}

export function DetailFieldFull({
  label,
  value,
  hideWhenEmpty = true,
  emptyDisplay = "-",
}: {
  label: string;
  value: React.ReactNode;
  hideWhenEmpty?: boolean;
  emptyDisplay?: React.ReactNode;
}) {
  const empty = isEmptyValue(value);
  if (hideWhenEmpty && empty) return null;
  const display = empty ? emptyDisplay : value;
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 sm:py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
        {label}
      </dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900 dark:text-neutral-dark-950">
        {display}
      </dd>
    </div>
  );
}

export function DetailCodeBlock({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={`max-h-[min(26rem,55vh)] overflow-auto rounded-xs border border-neutral-200/95 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-neutral-800 shadow-inner dark:border-neutral-dark-300 dark:bg-neutral-dark-300/50 dark:text-neutral-dark-900 ${className}`}
    >
      {children}
    </pre>
  );
}

/**
 * Flattens nested plain objects into dot-notation keys (e.g. `alerts.email`).
 */
function flattenRecordEntries(
  obj: Record<string, unknown> | null | undefined,
  prefix = "",
): Array<{ key: string; value: unknown }> {
  const out: Array<{ key: string; value: unknown }> = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  const keys = Object.keys(obj).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  for (const k of keys) {
    const v = obj[k];
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const nested = v as Record<string, unknown>;
      if (Object.keys(nested).length === 0) {
        out.push({ key: path, value: {} });
      } else {
        out.push(...flattenRecordEntries(nested, path));
      }
    } else {
      out.push({ key: path, value: v });
    }
  }
  return out;
}

const KV_STRING_COLLAPSE_CHARS = 800;

function JsonValueBlock({ text }: { text: string }) {
  return (
    <pre
      className="max-h-[min(18rem,42vh)] overflow-auto overscroll-contain rounded-xs border border-neutral-200/90 bg-neutral-0/95 p-2.5 font-mono text-[11px] leading-relaxed text-neutral-800 shadow-inner [scrollbar-gutter:stable] dark:border-neutral-dark-400/60 dark:bg-neutral-dark-300/25 dark:text-neutral-dark-950"
    >
      {text}
    </pre>
  );
}

function CollapsibleLongString({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const needsToggle = text.length > KV_STRING_COLLAPSE_CHARS;
  const displayText =
    !needsToggle || expanded
      ? text
      : `${text.slice(0, KV_STRING_COLLAPSE_CHARS)}…`;

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="max-h-[min(24rem,45vh)] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]">
        <span className="block whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-900 dark:text-neutral-dark-950">
          {displayText}
        </span>
      </div>
      {needsToggle ? (
        <button
          type="button"
          className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show full text"}
        </button>
      ) : null}
    </div>
  );
}

function formatDetailKvValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return (
      <span className="text-neutral-400 italic dark:text-neutral-dark-500">
        —
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={
          value
            ? "font-medium text-emerald-700 dark:text-emerald-400"
            : "text-neutral-500 dark:text-neutral-dark-500"
        }
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono text-[13px] tabular-nums tracking-tight text-neutral-900 dark:text-neutral-dark-950">
        {String(value)}
      </span>
    );
  }
  if (typeof value === "string") {
    return <CollapsibleLongString text={value} />;
  }
  if (Array.isArray(value)) {
    return (
      <JsonValueBlock text={JSON.stringify(value, null, 2)} />
    );
  }
  if (typeof value === "object") {
    return (
      <JsonValueBlock text={JSON.stringify(value, null, 2)} />
    );
  }
  return String(value);
}

/**
 * Read-only key / value rows for JSON-like config objects (features, settings, metadata).
 * Uses a scroll-contained table with sticky headers and key column for large datasets.
 */
export function DetailKeyValueTable({
  data,
  emptyMessage = "No entries configured.",
}: {
  data: Record<string, unknown> | null | undefined;
  emptyMessage?: string;
}) {
  const entries = React.useMemo(() => flattenRecordEntries(data), [data]);
  const count = entries.length;

  if (count === 0) {
    return (
      <div className="rounded-xs border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/25 dark:text-neutral-dark-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xs border border-neutral-200/95 bg-neutral-0 shadow-sm dark:border-neutral-dark-300 dark:bg-neutral-dark-200">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200/90 bg-neutral-50 px-3 py-2 dark:border-neutral-dark-300/70 dark:bg-neutral-dark-300/40">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
          Configuration entries
        </span>
        <span className="rounded-xs border border-neutral-200/80 bg-neutral-100/90 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-neutral-700 dark:border-neutral-dark-300/50 dark:bg-neutral-dark-300/50 dark:text-neutral-dark-900">
          {count}
        </span>
      </div>
      <div className="max-h-[min(36rem,72vh)] overflow-auto overscroll-contain">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[68%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-200/95 dark:border-neutral-dark-300/80">
              <th
                scope="col"
                className="sticky left-0 top-0 z-[3] border-r border-neutral-200/90 bg-neutral-50 px-3 py-2.5 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-neutral-500 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] dark:border-neutral-dark-300/60 dark:bg-neutral-dark-300/40 dark:text-neutral-dark-500 dark:shadow-[1px_0_0_0_rgba(255,255,255,0.04)]"
              >
                Key
              </th>
              <th
                scope="col"
                className="sticky top-0 z-[2] bg-neutral-50 px-3 py-2.5 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-dark-300 dark:text-neutral-dark-500"
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/90 dark:divide-neutral-dark-300/55">
            {entries.map(({ key, value }) => (
              <tr key={key} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] border-r border-neutral-200/85 bg-neutral-0 px-3 py-2.5 text-left align-top font-mono text-[11px] font-semibold leading-snug tracking-tight text-neutral-600 break-all shadow-[1px_0_0_0_rgba(0,0,0,0.04)] transition-colors group-hover:bg-neutral-50/90 dark:border-neutral-dark-300/55 dark:bg-neutral-dark-200 dark:text-neutral-dark-900 dark:shadow-[1px_0_0_0_rgba(255,255,255,0.03)] dark:group-hover:bg-neutral-dark-300/25"
                >
                  {key}
                </th>
                <td className="min-w-0 bg-neutral-0 align-top px-3 py-2.5 transition-colors group-hover:bg-neutral-50/90 dark:bg-neutral-dark-200 dark:group-hover:bg-neutral-dark-300/25">
                  <div className="min-w-0">{formatDetailKvValue(value)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DetailStatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active
          ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30"
          : "bg-neutral-200/90 text-neutral-600 ring-1 ring-neutral-300/60 dark:bg-neutral-dark-300 dark:text-neutral-dark-900 dark:ring-neutral-dark-400/40"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

const detailSkeletonClass =
  "animate-pulse rounded-sm bg-neutral-200/90 dark:bg-neutral-dark-300/80";

function DetailSkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`${detailSkeletonClass} ${className}`.trim()} aria-hidden />;
}

function DetailHeroSkeleton() {
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-sm border border-neutral-200/70 bg-neutral-0 py-4 pl-4 pr-4 shadow-sm dark:border-neutral-dark-200/70 dark:bg-neutral-dark-100 md:pl-5 md:pr-5 xl:flex-row xl:items-start xl:justify-between xl:gap-6"
      aria-hidden
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <DetailSkeletonBlock className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1 space-y-3 pt-0.5">
          <DetailSkeletonBlock className="h-7 w-56 max-w-full" />
          <DetailSkeletonBlock className="h-4 w-72 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <DetailSkeletonBlock className="h-6 w-20 rounded-full" />
            <DetailSkeletonBlock className="h-6 w-36 rounded-full" />
            <DetailSkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 xl:w-auto xl:min-w-[16rem]">
        <div className="flex items-center justify-start gap-1.5 xl:justify-end">
          {[0, 1, 2, 3].map((i) => (
            <DetailSkeletonBlock key={i} className="h-9 w-9" />
          ))}
        </div>
        <div className="flex w-max min-w-full items-stretch gap-2 xl:min-w-0 xl:justify-end">
          {[0, 1, 2].map((i) => (
            <DetailSkeletonBlock key={i} className="h-[3.25rem] min-w-[8.5rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailSectionCardSkeleton({
  fieldRows = 6,
  className = "",
}: {
  fieldRows?: number;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col overflow-hidden rounded-sm border border-neutral-200/95 bg-neutral-0 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100 ${className}`}
      aria-hidden
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <DetailSkeletonBlock className="h-9 w-9 shrink-0" />
        <DetailSkeletonBlock className="h-4 w-36" />
      </div>
      <div className="mx-4 border-t border-neutral-200/90 dark:border-neutral-dark-300/60" />
      <div className="space-y-0 px-4 py-3">
        {Array.from({ length: fieldRows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-x-3"
          >
            <DetailSkeletonBlock className="h-3 w-24 shrink-0 sm:mt-0.5 sm:w-[38%] sm:max-w-[11rem]" />
            <DetailSkeletonBlock
              className={`h-4 sm:flex-1 ${
                rowIndex % 3 === 0 ? "w-[78%]" : rowIndex % 3 === 1 ? "w-[52%]" : "w-[64%]"
              }`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailDesktopSidebarSkeleton({
  sidebarLabel,
  tabCount,
}: {
  sidebarLabel: string;
  tabCount: number;
}) {
  return (
    <aside
      className="fixed z-20 flex h-[calc(100vh-40px)] w-52 shrink-0 flex-col overflow-visible border-r border-neutral-200 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-dark-200">
        <DetailSkeletonBlock className="h-7 w-7 shrink-0" />
        <span className="sr-only">{sidebarLabel}</span>
        <DetailSkeletonBlock className="h-3 w-24" />
      </div>
      <nav className="space-y-0.5 py-1">
        {Array.from({ length: tabCount }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-2.5">
            <DetailSkeletonBlock className="h-5 w-5 shrink-0" />
            <DetailSkeletonBlock className={`h-4 ${index === 0 ? "w-24" : "w-28"}`} />
          </div>
        ))}
      </nav>
    </aside>
  );
}

function DetailMobileNavSkeleton({ tabCount }: { tabCount: number }) {
  return (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-0 px-2 py-2 dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
      aria-hidden
    >
      {Array.from({ length: tabCount }, (_, index) => (
        <DetailSkeletonBlock
          key={index}
          className={`h-8 shrink-0 ${index === 0 ? "w-24" : "w-28"}`}
        />
      ))}
    </div>
  );
}

/** Non-blocking loading shell — mirrors detail layout (sidebar, hero, cards). */
export function DetailPageLoadingShell({
  sidebarLabel = "Details",
  tabCount = 4,
  className = "",
}: {
  sidebarLabel?: string;
  tabCount?: number;
  className?: string;
}) {
  return (
    <DetailPageBackground className={`min-h-0 overflow-hidden ${className}`}>
      <div className="relative flex h-[calc(100vh-40px)] min-h-0">
        <div className="hidden md:block">
          <DetailDesktopSidebarSkeleton
            sidebarLabel={sidebarLabel}
            tabCount={tabCount}
          />
        </div>
        <div className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col md:ml-52">
          <div className="md:hidden">
            <DetailMobileNavSkeleton tabCount={tabCount} />
          </div>
          <div className="shrink-0 border-b border-neutral-200/90 backdrop-blur-sm dark:border-neutral-dark-300/55">
            <div className="p-2">
              <DetailHeroSkeleton />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DetailContentArea>
              <DetailSectionsGrid maxColumns={2}>
                <DetailSectionCardSkeleton fieldRows={8} />
                <DetailSectionCardSkeleton fieldRows={6} />
                <DetailSectionCardSkeleton fieldRows={5} className="col-span-full" />
              </DetailSectionsGrid>
            </DetailContentArea>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading details</span>
    </DetailPageBackground>
  );
}

export function DetailTopicColumns({
  topics,
}: {
  topics: { topic: string; topic_name: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xs border border-neutral-200/95 bg-neutral-50/80 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/30">
      <div className="grid grid-cols-[120px_1fr] gap-2 px-2.5 py-1.5 border-b border-neutral-200/90 dark:border-neutral-dark-300/55 bg-neutral-100/70 dark:bg-neutral-dark-200/40">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
          Topic Name
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
          Topic
        </span>
      </div>
      <div className="divide-y divide-neutral-200/90 dark:divide-neutral-dark-300/55">
        {topics.map((t, index) => (
          <div
            key={`${t.topic_name}-${t.topic}-${index}`}
            className="grid grid-cols-[120px_1fr] gap-2 px-2.5 py-2 items-start"
          >
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-dark-500 truncate">
              {t.topic_name || "—"}
            </span>
            <span className="break-all font-mono text-[11px] text-neutral-800 dark:text-neutral-dark-950">
              {t.topic}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailComponentCard({
  name,
  type,
  code,
  status,
  icon,
  children,
  expanded: defaultExpanded = false,
  onViewDetails,
}: {
  name: string;
  type: string;
  code: string;
  status?: string | boolean | null;
  icon?: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
  onViewDetails?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div className="overflow-hidden rounded-xs border border-neutral-200/95 bg-neutral-0 shadow-sm transition-all hover:shadow-md dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
      <div
        className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors ${
          isExpanded ? "bg-neutral-50/40 dark:bg-neutral-dark-200/30" : "hover:bg-neutral-50/60 dark:hover:bg-neutral-dark-200/50"
        }`}
      >
        <div 
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5"
          onClick={() => toggle()}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.08] ring-1 ring-brand-500/15 dark:bg-brand-500/12 dark:ring-brand-400/20">
            {icon || <ChevronDown className="h-5 w-5 text-brand-600 dark:text-brand-400" />}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-dark-950">
              {name}
            </h4>
            <div className="mt-0.5 flex items-center gap-2.5">
              <span className="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-dark-500">
                {code}
              </span>
              <div className="h-2.5 w-[1px] bg-neutral-200 dark:bg-neutral-dark-700" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {status !== undefined && (
            <div className="hidden sm:block">
              {typeof status === "boolean" ? (
                <DetailStatusBadge active={status} />
              ) : (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-600 dark:bg-neutral-dark-300 dark:text-neutral-dark-900">
                  {status}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => toggle()}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-dark-300 dark:hover:text-neutral-dark-800 ${
              isExpanded ? "rotate-180" : "rotate-0"
            }`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100">
          <div className="px-4 py-3">{children}</div>
          {onViewDetails && (
            <div className="flex justify-end border-t border-neutral-200/60 bg-neutral-50/50 px-4 py-2.5 dark:border-neutral-dark-300/40 dark:bg-neutral-dark-200/30">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="text-[12px] font-bold text-brand-700 transition-colors hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
              >
                View Full Details →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
