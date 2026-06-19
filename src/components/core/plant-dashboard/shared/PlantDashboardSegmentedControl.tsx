import {
  PLANT_DASHBOARD_CONTROL_TRACK,
  PLANT_DASHBOARD_SEGMENT_ACTIVE,
  PLANT_DASHBOARD_SEGMENT_INACTIVE,
} from "./plantDashboardTheme";

export interface PlantDashboardSegmentOption<T extends string = string> {
  id: T;
  label: string;
}

interface PlantDashboardSegmentedControlProps<T extends string = string> {
  options: PlantDashboardSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function PlantDashboardSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
  size = "sm",
}: PlantDashboardSegmentedControlProps<T>) {
  const textSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  const padding = size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5";

  return (
    <div
      className={`flex flex-wrap gap-0.5 ${PLANT_DASHBOARD_CONTROL_TRACK} ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`rounded-xs ${padding} ${textSize} font-medium transition-all duration-150 ${
              active ? PLANT_DASHBOARD_SEGMENT_ACTIVE : PLANT_DASHBOARD_SEGMENT_INACTIVE
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
