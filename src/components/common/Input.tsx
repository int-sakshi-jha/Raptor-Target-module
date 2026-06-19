import React, { type ForwardRefExoticComponent, type RefAttributes } from "react";
import { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  star?: boolean;
  className?: string;
  labelClassName?: string;
  name?: string;
  $id?: string;
  errors?: { message?: string };
  divClassName?: string;
  startIcon?: React.ReactNode;
  disabled?: boolean;
  /** Block wheel / touchpad from changing value when `type="number"`. Default: true. */
  disableNumberScroll?: boolean;
}

const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>> = React.forwardRef(
  (
    {
      label = "",
      star,
      type = "text",
      className = "",
      labelClassName = "",
      name = "",
      $id,
      errors,
      divClassName = "",
      startIcon,
      disabled = false,
      disableNumberScroll = true,
      onWheel,
      ...props
    },
    ref
  ) => {
    const id = useId();

    const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
      if (
        disableNumberScroll &&
        type === "number" &&
        document.activeElement === event.currentTarget
      ) {
        event.preventDefault();
        event.currentTarget.blur();
      }
      onWheel?.(event);
    };

    return (
      <div className={`flex flex-col gap-1 w-full ${divClassName}`}>
        {label && (
          <label
            className={`text-neutral-800 dark:text-neutral-dark-900 text-sm font-medium ${labelClassName}`}
            htmlFor={$id || id}
          >
            {label}
            {star && <sup className="text-error-500 dark:text-error-dark-500 ml-1">*</sup>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-800 dark:!text-neutral-dark-900 z-[1]">
              {startIcon}
            </div>
          )}
          <input
            name={name}
            type={type}
            className={`input rounded-xs ${startIcon ? "pl-10 pr-3" : "px-3"} ${errors?.message ? "input-error" : ""} ${disabled ? "":""} ${className}`}
            ref={ref}
            id={$id || id}
            disabled={disabled}
            {...props}
            onWheel={handleWheel}
          />
        </div>
        {errors?.message && (
          <span className="mt-1 text-xs text-error-500 dark:text-error-dark-500">
            {errors.message}
          </span>
        )}
      </div>
    );
  }
);

export default Input;
