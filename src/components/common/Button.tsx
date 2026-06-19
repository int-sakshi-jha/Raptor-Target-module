import React from "react";
import Spinner from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
  iconOnly?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      type = "button",
      className = "",
      iconOnly = false,
      loading = false,
      variant = "primary",
      size = "md",
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "btn focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-80 rounded-xs";
    const variantStyles = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      outline:
        "bg-transparent border border-brand-500 text-brand-700 dark:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30",
      success: "btn-success",
      danger:
        "bg-red-600 text-white hover:bg-red-700 border-red-700 disabled:bg-red-300 disabled:border-red-300 disabled:text-white disabled:hover:bg-red-300 dark:disabled:bg-red-dark-200 dark:disabled:border-red-dark-200 dark:disabled:text-red-dark-900",
      ghost:
        "bg-transparent border-0 text-inherit shadow-none",
    };
    const sizeStyles = {
      sm: "btn-sm",
      md: "btn-md",
      lg: "btn-lg",
    };
    const iconOnlyStyles = {
      sm: "w-8 px-0 py-0",
      md: "w-9 px-0 py-0",
      lg: "w-10 px-0 py-0",
    };

    return (
      <button
        type={type}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
          iconOnly ? iconOnlyStyles[size] : ""
        } ${className}`}
        ref={ref}
        {...props}
        disabled={loading || disabled}
      >
        {loading ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Spinner
              size="1.25"
              color={variant === "outline" || variant === "ghost" ? "brand-600" : "white"}
            />
            <span>Loading</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
