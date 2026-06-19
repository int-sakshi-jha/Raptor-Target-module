import React from "react";

export type RowActionVariant = "neutral" | "brand" | "success" | "danger";

export interface RowActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  show?: boolean;
  disabled?: boolean;
  variant?: RowActionVariant;
}

const getActionClasses = (variant: RowActionVariant) => {
  switch (variant) {
    case "success":
      return "text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/40";
    case "danger":
      return "text-error-600 dark:text-error-400 hover:bg-error-200 dark:hover:bg-error-900/50";
    case "brand":
      return "text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/60";
    case "neutral":
    default:
      return "text-neutral-600 dark:text-neutral-dark-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300";
  }
};

interface TableRowActionsProps {
  items: RowActionItem[];
  className?: string;
}

const TableRowActions: React.FC<TableRowActionsProps> = ({ items, className = "" }) => {
  const visible = items.filter((i) => i.show !== false);
  if (visible.length === 0) return null;

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}
    >
      {visible.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.label}
          aria-label={action.label}
          className={`p-2 rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getActionClasses(action.variant || "neutral")}`}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
};

export default TableRowActions;
