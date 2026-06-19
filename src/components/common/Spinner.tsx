import React from "react";

interface SpinnerProps {
  className?: string;
  size?: string | number;
  color?: "brand" | "brand-600" | "brand-500" | "white";
}

const Spinner: React.FC<SpinnerProps> = ({ className = "", size = "5", color = "brand" }) => {
  const borderColorClass =
    color === "white"
      ? "border-t-white dark:border-t-neutral-dark-200"
      : color === "brand-500"
        ? "border-t-brand-500"
        : "border-t-brand-600";
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: `${size}rem`, height: `${size}rem` }}
      aria-label="Loading"
    > 
      <div
        className={`animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-dark-400 absolute inset-0 ${borderColorClass}`}
        style={{ borderWidth: "0.1rem" }}
      />
    </div>
  );
};

export default Spinner;