/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  type ForwardRefExoticComponent,
  type RefAttributes,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { useId } from "react";
import Select, { type MultiValue, type SingleValue } from "react-select";

export interface Option {
  value: string;
  label: string;
}

interface AsyncSelectProps {
  label?: string;
  star?: boolean;
  className?: string;
  labelClassName?: string;
  name?: string;
  $id?: string;
  errors?: { message?: string };
  divClassName?: string;
  loadOptions: (search?: string) => Promise<Option[]>;
  apiSearch?: boolean;
  isMulti?: boolean;
  placeholder?: string;
  defaultValue?: Option | Option[] | null;
  value?: Option | Option[] | null;
  isClearable?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  menuPlacement?: "auto" | "top" | "bottom";
  menuPosition?: "absolute" | "fixed";
  menuPortalTarget?: HTMLElement | null;
  onChange?: (value: SingleValue<Option> | MultiValue<Option>) => void;
  onBlur?: () => void;
  styles?: Record<string, any>;
  closeMenuOnSelect?: boolean;
  blurInputOnSelect?: boolean;
  hideSelectedOptions?: boolean;
}

const AsyncSelect: ForwardRefExoticComponent<
  AsyncSelectProps & RefAttributes<Select>
> = React.forwardRef(
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
      loadOptions,
      apiSearch = false,
      isMulti = false,
      placeholder = "Select...",
      defaultValue = null,
      value,
      isClearable = true,
      isLoading = false,
      isDisabled = false,
      menuPlacement = "auto",
      menuPosition = "absolute",
      menuPortalTarget,
      onChange,
      styles: stylesOverride,
      ...props
    }
  ) => {
    const id = useId();

    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchedOnce = useRef(false);
    const lastSearch = useRef<string | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchOptions = useCallback(
      async (search = "") => {
        setLoading(true);
        try {
          const data = await loadOptions(search);
          setOptions(data);
          lastSearch.current = search;
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      },
      [loadOptions],
    );

    const handleMenuOpen = useCallback(() => {
      if (!fetchedOnce.current) {
        fetchedOnce.current = true;
        void fetchOptions("");
      }
    }, [fetchOptions]);

    const handleInputChange = useCallback(
      (inputValue: string) => {
        if (!apiSearch) return;
        if (inputValue === lastSearch.current) return;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          void fetchOptions(inputValue);
        }, 300);
      },
      [apiSearch, fetchOptions],
    );

    const customStyles = {
      container: (provided: any) => ({
        ...provided,
        width: "100%",
        minWidth: 0,
      }),
      control: (provided: any, state: any) => ({
        ...provided,
        minHeight: "36px",
        borderRadius: "0.325rem",
        backgroundColor: "#FFFFFF",
        borderColor: errors?.message ? "#EF4444" : state.isFocused ? "#F9B98E" : "#E5E7EB",
        boxShadow: state.isFocused
          ? "0 0 0 2px rgba(233, 113, 36, 0.15)"
          : "none",
        "&:hover": {
          borderColor: errors?.message ? "#EF4444" : "#D1D5DB",
        },
        fontSize: "0.875rem",
        fontWeight: 500,
        opacity: state.isDisabled ? 0.6 : 1,
      }),
      valueContainer: (provided: any) => ({
        ...provided,
        paddingLeft: "0.875rem",
        paddingRight: "0.875rem",
        paddingTop: 0,
        paddingBottom: 0,
      }),
      input: (provided: any) => ({
        ...provided,
        margin: 0,
        padding: 0,
        color: "#111827",
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: "#9CA3AF",
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: "#111827",
      }),
      menu: (provided: any) => ({
        ...provided,
        borderRadius: "0.125rem",
        border: "1px solid #E5E7EB",
        zIndex: 9999,
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "#FFE9D6"
          : state.isFocused
            ? "#FFF7ED"
            : "#FFFFFF",
        color: "#111827",
        "&:active": { backgroundColor: "#FFF7ED" },
      }),
      multiValue: (provided: any) => ({
        ...provided,
        backgroundColor: "#E5E7EB",
      }),
      multiValueLabel: (provided: any) => ({
        ...provided,
        color: "#111827",
      }),
      multiValueRemove: (provided: any) => ({
        ...provided,
        "&:hover": { backgroundColor: "#D1D5DB" },
      }),
      menuPortal: (provided: any) => ({
        ...provided,
        zIndex: 9999,
      }),
    };

    const darkStyles = {
      control: (provided: any, state: any) => ({
        ...provided,
        minHeight: "38px",
        borderRadius: "0.375rem",
        backgroundColor: "#27292A",
        borderColor: errors?.message ? "#EF4444" : state.isFocused ? "#F9B98E" : "#434344",
        boxShadow: state.isFocused
          ? "0 0 0 2px rgba(233, 113, 36, 0.2)"
          : "none",
        "&:hover": {
          borderColor: errors?.message ? "#EF4444" : "#515253",
        },
        fontSize: "0.875rem",
        fontWeight: 500,
        opacity: state.isDisabled ? 0.6 : 1,
      }),
      input: (provided: any) => ({
        ...provided,
        margin: 0,
        padding: 0,
        color: "#D3D3D3",
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: "#6B7280",
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: "#D3D3D3",
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: "#1E1F20",
        border: "1px solid #434344",
        zIndex: 9999,
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "rgba(233, 113, 36, 0.25)"
          : state.isFocused
            ? "rgba(233, 113, 36, 0.18)"
            : "transparent",
        color: "#D3D3D3",
        "&:active": { backgroundColor: "rgba(233, 113, 36, 0.18)" },
      }),
      multiValue: (provided: any) => ({
        ...provided,
        backgroundColor: "#434344",
      }),
      multiValueLabel: (provided: any) => ({
        ...provided,
        color: "#D3D3D3",
      }),
      multiValueRemove: (provided: any) => ({
        ...provided,
        "&:hover": { backgroundColor: "#515253" },
      }),
      menuPortal: (provided: any) => ({
        ...provided,
        zIndex: 9999,
      }),
    };

    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

    useEffect(() => {
      const update = () => setIsDark(document.documentElement.classList.contains("dark"));
      update();

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && m.attributeName === "class") {
            update();
            break;
          }
        }
      });

      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    return (
      <div className={`flex flex-col gap-1 w-full ${divClassName}`}>
        {label && (
          <label
            className={`text-neutral-700 dark:text-neutral-200 text-sm font-medium ${labelClassName}`}
            htmlFor={$id || id}
          >
            {label}
            {star && (
              <sup className="text-error-500 ml-1 dark:text-error-400">*</sup>
            )}
          </label>
        )}
        <Select
          inputId={$id || id}
          name={name}
          options={options}
          isMulti={isMulti}
          classNamePrefix="react-select"
          className={`react-select-container ${errors?.message ? "[&_.react-select__control]:input-error" : ""} ${className}`}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
          isClearable={isClearable}
          isDisabled={isDisabled}
          menuPlacement={menuPlacement}
          menuPosition={menuPortalTarget ? "fixed" : menuPosition}
          menuPortalTarget={
            menuPortalTarget ??
            (typeof document !== "undefined" ? document.body : undefined)
          }
          // ref={ref}
          onChange={onChange}
          isLoading={loading || isLoading}
          onMenuOpen={handleMenuOpen}
          onInputChange={handleInputChange}
          filterOption={apiSearch ? () => true : undefined}
          noOptionsMessage={({ inputValue }) =>
            loading
              ? "Loading…"
              : apiSearch && !inputValue && options.length === 0
                ? "Type to search…"
                : "No options"
          }
          styles={{
            ...customStyles,
            ...(isDark ? darkStyles : {}),
            ...stylesOverride,
          }}
          {...props}
        />

        {errors?.message && (
          <span className="mt-1 text-xs text-error-500 dark:text-error-400">
            {errors.message}
          </span>
        )}
      </div>
    );
  },
);

AsyncSelect.displayName = "AsyncSelect";

export default AsyncSelect;
