import { ChevronDown } from "lucide-react";
import React from "react";

interface DropdownItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

interface DropdownProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  items: DropdownItem[];
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  disabledTitle?: string;
  align?: "left" | "right";
  hideChevron?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon,
  items,
  triggerClassName = "",
  menuClassName = "",
  disabled = false,
  disabledTitle,
  align = "left",
  hideChevron = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <span
        title={disabled ? disabledTitle : undefined}
        className={`flex items-center gap-2 rounded-xs  ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${triggerClassName}`}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        {icon}
        {label}
        {!hideChevron ? <ChevronDown className="w-3 h-3" /> : null}
      </span>

      {open && (
        <div
          className={`absolute top-full mt-1 ${align === "right" ? "right-0" : "left-0"} min-w-[140px] max-w-[90vw] z-50 shadow-lg overflow-hidden whitespace-nowrap bg-neutral-50 dark:bg-neutral-dark-50 border border-neutral-200 dark:border-neutral-dark-200 rounded-xs ${menuClassName}`}
        >
          {items.map((item, index) => (
            <div
              key={index}
              role="button"
              tabIndex={item.disabled ? -1 : 0}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-dark-100 ${
                item.disabled
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : ""
              }`}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onClick();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick();
                }
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
