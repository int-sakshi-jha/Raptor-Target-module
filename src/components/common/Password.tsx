import React, { type ForwardRefExoticComponent, type RefAttributes, useState } from "react";
import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  star?: boolean;
  className?: string;
  labelClassName?: string;
  name?: string;
  $id?: string;
  errors?: { message?: string };
}

const Password: ForwardRefExoticComponent<PasswordProps & RefAttributes<HTMLInputElement>> = React.forwardRef(
  (
    {
      label = "",
      star,
      className = "",
      labelClassName = "",
      name = "",
      $id,
      errors,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            className={`text-neutral-700 dark:text-neutral-dark-900 text-sm font-medium ${labelClassName}`}
            htmlFor={$id || id}
          >
            {label}
            {star && <sup className="text-error-500 dark:text-error-dark-500 ml-1">*</sup>}
          </label>
        )}
        <div className="relative">
          <input
            name={name}
            className={`input rounded-xs px-3 py-2 pr-10 ${errors?.message ? "input-error" : ""} ${className}`}
            ref={ref}
            id={$id || id}
            {...props}
            type={showPassword ? "text" : "password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-dark-500 hover:text-brand-600 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
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

export default Password;
