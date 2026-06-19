import React from "react";
import logoLight from "@/assets/logo.svg";
import logoDark from "@/assets/logo-dark.svg";

interface LogoProps {
  className?: string;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "", alt = "App Logo" }) => {
  return (
    <>
      <img
        src={logoLight}
        alt={alt}
        className={`dark:hidden ${className}`}
        loading="lazy"
      />
      <img
        src={logoDark}
        alt={alt}
        className={`hidden dark:block ${className}`}
        loading="lazy"
      />
    </>
  );
};

export default Logo;
