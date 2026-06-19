import React from "react";
import { Link } from "react-router-dom";

interface CTAButtonProps {
  text: string;
  link: string;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

const CTAButton: React.FC<CTAButtonProps> = ({
  text,
  link,
  className = "",
  variant = "primary",
  size = "md",
}) => {
  const baseStyles =
    "btn focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none";
  const variantStyles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
  };
  const sizeStyles = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  };

  return (
    <Link
      to={link}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {text}
    </Link>
  );
};

export default CTAButton;