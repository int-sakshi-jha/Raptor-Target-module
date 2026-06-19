import React, { useId } from "react";
 
interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fieldLabel?: string;
  className?: string;
  labelClassName?: string;
}
 
const Toggle: React.ForwardRefExoticComponent<ToggleProps & React.RefAttributes<HTMLInputElement>> = React.forwardRef(
  ({ label, fieldLabel, className = "", labelClassName = "", ...props }, ref) => {
    const id = props.id ?? (typeof props.name === "string" ? props.name : useId());
    const innerLabel = label;
 
    const input = (
      <label className={`flex items-center justify-between w-full cursor-pointer ${labelClassName}`}>
        {innerLabel && (
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-dark-700">{innerLabel}</span>
        )}
        <div className="relative">
          <input
            type="checkbox"
            id={id}
            className={`sr-only peer`}
            ref={ref}
            {...props}
          />
          <div className="block bg-neutral-300 dark:bg-neutral-dark-300 peer-checked:bg-brand-600 w-12 h-6 rounded-full transition-colors" />
          <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6 border border-neutral-200 shadow-sm" />
        </div>
      </label>
    );
    return (
      <div className={`flex flex-col w-full ${fieldLabel && "gap-1"} ${className}`}>
        <label className="font-medium text-neutral-800 dark:text-neutral-dark-900" htmlFor={id}>
        {fieldLabel}
        </label>
        <div className="input rounded-xs flex items-center px-2 py-1.5 bg-white dark:bg-neutral-dark-200">
          {input}
        </div>
      </div>
    );
  },
);
 
 
export default Toggle;
 
 