import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";

type FormModeToggleProps = {
  /** Whether advanced fields are currently visible */
  showAdvanced: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Label for the basic mode – default "Required Fields" */
  basicLabel?: string;
  /** Label for advanced mode – default "All Fields" */
  advancedLabel?: string;
  className?: string;
};

const FormModeToggle = ({
  showAdvanced,
  onToggle,
  basicLabel = "Required Fields",
  advancedLabel = "All Fields",
  className = "",
}: FormModeToggleProps) => {
  const label = showAdvanced ? advancedLabel : basicLabel;
  const actionText = showAdvanced ? "Show required fields only" : "Show all fields";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${actionText} (${label})`}
      aria-label={`${actionText} (${label})`}
      className={`p-2 flex items-center justify-center gap-2 rounded-xs text-neutral-500 dark:text-neutral-dark-500 hover:bg-neutral-300 dark:hover:bg-neutral-dark-300 ${className}`}
    >
      <span className="sr-only">{actionText}</span>
      <Settings2 className="h-4 w-4" />
      {showAdvanced ? (
        <ChevronUp className="h-3 w-3 -ml-1 -mr-0.5" />
      ) : (
        <ChevronDown className="h-3 w-3 -ml-1 -mr-0.5" />
      )}
    </button>
  );
};

export default FormModeToggle;
