import React from 'react';

interface SwitchProps {
  label?: string;
  star?: boolean;
  name: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: { message?: string };
  disabled?: boolean;
  className?: string;
  divClassName?: string;
  [key: string]: any; // For additional inputProps
}

const Switch: React.FC<SwitchProps> = ({
  label,
  star,
  name,
  checked,
  onChange,
  errors,
  disabled,
  className = '',
  divClassName = '',
  ...inputProps
}) => {
  return (
    <div className={`flex flex-col gap-1 ${divClassName}`}>
      {label && (
        <label
          className="text-sm font-medium text-neutral-700 dark:text-neutral-dark-900"
          htmlFor={name}
        >
          {label}
          {star && <sup className="text-error-500 ml-1 dark:text-error-dark-500">*</sup>}
        </label>
      )}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...inputProps}
        />
        <div
          className={`w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-600 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-neutral-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-neutral-100 after:border-neutral-300 dark:after:border-neutral-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-brand-600 ${className}`}
        ></div>
      </label>
      {errors?.message && (
        <span className="mt-1 text-xs text-error-500 dark:text-error-dark-500">
          {errors.message}
        </span>
      )}
    </div>
  );
};

export default Switch;