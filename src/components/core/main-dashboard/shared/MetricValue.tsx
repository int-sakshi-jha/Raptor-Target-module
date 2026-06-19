import type { ReactNode } from "react";

interface MetricValueProps {
  label: string;
  value: ReactNode;
  subLabel?: string;
  align?: "left" | "center";
}

export function MetricValue({
  label,
  value,
  subLabel,
  align = "left",
}: MetricValueProps) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-dark-600">
        {label}
      </p>
      <div className="mt-0.5 text-lg font-bold leading-none text-neutral-900 dark:text-neutral-dark-950 sm:text-xl">
        {value}
      </div>
      {subLabel ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-dark-600">{subLabel}</p>
      ) : null}
    </div>
  );
}
