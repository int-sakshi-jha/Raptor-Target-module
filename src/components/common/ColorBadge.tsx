import React from "react";

const variantStyles = {
  green:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700/50",

  blue:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50",

  gray:
    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-500/50",

  orange:
    "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-700/50",

  yes:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700/50",

  no:
    "bg-error-100 dark:bg-error-dark-100 text-neutral-600 dark:text-error-dark-600 border border-error-200 dark:border-error-600",
} as const;

export type BadgeVariant = keyof typeof variantStyles;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  className = "",
  onClick,
}) => {
  const base =
    "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-xs transition-colors";

  const classes = `${base} ${variantStyles[variant]} ${className}`.trim();

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
};

export default Badge;