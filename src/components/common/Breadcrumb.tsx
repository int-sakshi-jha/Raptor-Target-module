import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = "" }) => {
  return (
    <nav
      className={`flex min-w-0 items-center gap-1.5 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <Link
        to="/dashboard"
        className="flex items-center text-neutral-500 dark:text-neutral-dark-500 hover:text-neutral-700 dark:hover:text-neutral-dark-700 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-dark-500" />
            {isLast ? (
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-dark-950">
                {item.icon && <span className="text-brand-600">{item.icon}</span>}
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
            ) : item.path ? (
              <Link
                to={item.path}
                className="flex min-w-0 items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-dark-500 dark:hover:text-neutral-dark-700"
              >
                {item.icon && <span>{item.icon}</span>}
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-neutral-500 dark:text-neutral-dark-500">
                {item.icon && <span>{item.icon}</span>}
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
