const SectionHeader = ({
  icon: Icon,
  title,
  description,
  compact = false,
  className=""
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  compact?: boolean;
  className?:string;
}) => (
  <div
    className={`
      ${compact
        ? "mb-2 flex items-center gap-2"
        : "mb-4 flex items-center gap-3"} ${className}
    `}
  >
    <div
      className={
        compact
          ? "rounded-xs bg-brand-500/10 p-1 dark:bg-brand-400/15"
          : "rounded-xs bg-brand-500/10 p-2 dark:bg-brand-400/15"
      }
    >
      <Icon
        className={
          compact
            ? "h-3.5 w-3.5 text-brand-600 dark:text-brand-400"
            : "h-4 w-4 text-brand-600 dark:text-brand-400"
        }
      />
    </div>
    <div className="min-w-0">
      <h3
        className={
          compact
            ? "text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950"
            : "font-semibold text-neutral-900 dark:text-neutral-dark-950"
        }
      >
        {title}
      </h3>
      {description ? (
        <p
          className={
            compact
              ? "mt-0 text-[11px] leading-tight text-neutral-400 dark:text-neutral-dark-500"
              : "mt-0.5 text-xs text-neutral-400 dark:text-neutral-dark-500"
          }
        >
          {description}
        </p>
      ) : null}
    </div>
  </div>
);

export default SectionHeader;