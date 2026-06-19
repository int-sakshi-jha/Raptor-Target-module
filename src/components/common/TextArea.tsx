import React, { type ForwardRefExoticComponent, type RefAttributes } from "react";
import { useId } from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  star?: boolean;
  className?: string;
  labelClassName?: string;
  name?: string;
  $id?: string;
  errors?: { message?: string };
  divClassName?: string;
}

const TextArea: ForwardRefExoticComponent<TextAreaProps & RefAttributes<HTMLTextAreaElement>> = React.forwardRef(
  (
    {
      label = "",
      star,
      className = "",
      labelClassName = "",
      name = "",
      $id,
      errors,
      divClassName = "",
      ...props
    },
    ref
  ) => {
    const id = useId();

    return (
      <div className={`flex flex-col gap-1 w-full ${divClassName}`}>
        {label && (
          <label
            className={`text-neutral-700 dark:text-neutral-dark-900 text-sm font-medium ${labelClassName}`}
            htmlFor={$id || id}
          >
            {label}
            {star && <sup className="text-error-500 dark:text-error-dark-500 ml-1">*</sup>}
          </label>
        )}
        <textarea
          name={name}
          className={`input px-3 py-2 resize-none ${errors?.message ? "input-error" : ""} ${className}`}
          ref={ref}
          id={$id || id}
          {...props}
        />
        {errors?.message && (
          <span className="mt-1 text-xs text-error-500 dark:text-error-dark-500">
            {errors.message}
          </span>
        )}
      </div>
    );
  }
);

export default TextArea;