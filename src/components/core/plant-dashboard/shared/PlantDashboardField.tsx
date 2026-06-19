import {
  PLANT_DASHBOARD_FIELD_LABEL,
  PLANT_DASHBOARD_FIELD_UNIT,
  PLANT_DASHBOARD_FIELD_VALUE_PROMINENT,
} from "./plantDashboardTheme";

interface PlantDashboardFieldProps {
  label: string;
  value: string;
  unit?: string;
  valueClassName?: string;
}

export function PlantDashboardField({
  label,
  value,
  unit,
  valueClassName = "",
}: PlantDashboardFieldProps) {
  return (
    <div className="min-w-0">
      <p className={PLANT_DASHBOARD_FIELD_LABEL}>{label}</p>
      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        <span className={`truncate ${PLANT_DASHBOARD_FIELD_VALUE_PROMINENT} ${valueClassName}`}>
          {value}
        </span>
        {unit ? <span className={PLANT_DASHBOARD_FIELD_UNIT}>{unit}</span> : null}
      </div>
    </div>
  );
}
