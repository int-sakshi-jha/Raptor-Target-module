import type { ComponentType } from "react";

type SectionSubHeaderProps = {
  title: string;
  description?: string;
  /** Optional small icon (lighter treatment than `SectionHeader`). */
  icon?: ComponentType<{ className?: string }>;
  /** Show a required-field asterisk after the title. */
  star?: boolean;
  className?: string;
};

const SectionSubHeader = ({
  title,
  description,
  icon: Icon,
  star = false,
  className = "",
}: SectionSubHeaderProps) => (
  <div className={`mb-2 py-2 border-b border-neutral-300 dark:border-neutral-dark-300  ${className}`}>
    <div className="flex items-center gap-2">
      {Icon ? (
        <div className="shrink-0 rounded-xs bg-brand-50 dark:bg-brand-500/20 p-1">
          <Icon className="h-3.5 w-3.5 text-brand-500" />
        </div>
      ) : null}
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-900">
          {title}
          {star ? (
            <sup className="ml-0.5 text-error-500 dark:text-error-dark-500">*</sup>
          ) : null}
        </h4>
        {description ? (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  </div>
);

export default SectionSubHeader;
