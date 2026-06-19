import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type NavItem } from "./navItems";
import Logo from "../../common/Logo";
import favicon from "@/assets/favicon.svg";
import hoverFavicon from "@/assets/RaptorLogoAnimation.gif";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  topNavItems: NavItem[];
  bottomNavItems: NavItem[];
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  topNavItems,
  className,
}) => {
  const [activeItem, setActiveItem] = useState("");

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleItemClick = (itemName: string) => {
    setActiveItem(activeItem === itemName ? "" : itemName);
  };

  const renderNavItems = (items: NavItem[]) => {
    const groupedItems = items.reduce(
      (acc, item) => {
        const group = (item as NavItem & { group?: string }).group || "default";
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
      },
      {} as Record<string, NavItem[]>,
    );

    return (
      <>
        {Object.entries(groupedItems).map(([groupName, groupItems]) => (
          <div key={groupName} className="space-y-0.5">
            {groupName !== "default" && isOpen && (
              <div className="px-3 py-2 mt-3 first:mt-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-500">
                  {groupName}
                </span>
              </div>
            )}
            {groupItems.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => handleItemClick(item.name)}
                      className={`relative flex items-center w-full group
                        ${isOpen ? "px-6 py-2.5" : "py-2.5 justify-center px-0"}
                        text-neutral-600 dark:text-neutral-dark-700 rounded-sm
                        hover:bg-brand-500/10 dark:hover:bg-brand-400/15
                        hover:text-brand-600 dark:hover:text-brand-400
                        transition-all duration-200`}
                    >
                      <item.icon
                        className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                          isOpen ? "mr-3" : "mx-auto"
                        } ${item.color}`}
                      />
                      {isOpen ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-sm">{item.name}</span>
                          {activeItem === item.name ? (
                            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </div>
                      ) : (
                        /* Tooltip for collapsed sidebar */
                        <div
                          className="absolute left-full ml-1 px-2.5 py-1.5 z-60
                            bg-neutral-100 dark:bg-neutral-dark-200
                            text-sm font-medium
                            rounded-xs shadow-lg whitespace-nowrap
                            border border-neutral-200 dark:border-neutralDark-300
                            opacity-0 group-hover:opacity-100
                            -translate-x-1 group-hover:translate-x-0
                            transition-all duration-200 pointer-events-none"
                        >
                          {item.name}
                        </div>
                      )}
                    </button>
                    {isOpen && activeItem === item.name && (
                      <div className="ml-3 my-1 flex flex-col gap-0.5 border-l-2 border-brand-500/20 dark:border-brand-400/20 pl-3">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.path}
                            className={({ isActive }) =>
                              `flex items-center w-full px-2.5 py-2 rounded-xs text-sm transition-all duration-200 ${
                                isActive
                                  ? "bg-brand-500/15 dark:bg-brand-400/20 text-brand-700 dark:text-brand-300"
                                  : "text-neutral-600 dark:text-neutral-dark-700 hover:bg-brand-100 dark:hover:bg-brand-400/15"
                              }`
                            }
                          >
                            <child.icon
                              className={`w-4 h-4 mr-2.5 shrink-0 ${
                                child.color || item.color
                              }`}
                            />
                            <span className="truncate">{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center !w-full group
                        ${isOpen ? "px-6 py-2.5" : "py-2.5 justify-center px-6"}
                        text-sm transition-colors duration-200
                        ${
                          isActive
                            ? "border-l-4 border-brand-400 text-neutral-900 dark:text-neutral-dark-950 hover:bg-brand-100 dark:hover:bg-neutral-dark-200 bg-brand-100 dark:bg-neutral-dark-200"
                            : "border-l-4 border-neutral-0 hover:border-brand-100 dark:hover:border-neutral-dark-200  text-neutral-900 dark:text-neutral-dark-950 hover:bg-brand-100 dark:border-neutral-dark-100 dark:hover:bg-neutral-dark-200"
                        }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`w-5 h-5 shrink-0 transition-all duration-200 ${
                            isOpen ? "mr-3" : "mx-auto"
                          } ${isActive ? "text-brand-600 dark:text-brand-400" : item.color}`}
                        />
                        {isOpen && (
                          <span className="truncate">{item.name}</span>
                        )}

                        {!isOpen && (
                          <div
                            className="absolute left-full ml-2 px-2.5 py-1.5 z-[999]
                bg-neutral-900 dark:bg-neutral-dark-100 text-white dark:text-neutral-dark-950 text-xs rounded-xs
                whitespace-nowrap shadow-lg
                opacity-0 group-hover:opacity-100 pointer-events-none
                -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
                          >
                            {item.name}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            ))}
          </div>
        ))}
      </>
    );
  };

  return (
    <div
      className={`fixed z-40 left-0 top-0 h-dvh flex flex-col transition-all duration-300 ease-in-out
        border-r border-neutral-200 dark:border-neutral-dark-200
        bg-neutral-0 dark:bg-neutral-dark-100
        ${isOpen ? "w-52" : "w-[72px]"}
        ${className || ""}`}
    >
      {/* Logo area */}
      <div
        className={`flex items-center p-[11px] shrink-0 border-b border-neutral-200 dark:border-neutral-dark-200 ${
          isOpen ? "justify-between" : "justify-center"
        }`}
      >
        {isOpen ? (
          <Logo className="h-6 w-24 pl-4" alt="Logo" />
        ) : (
          <div className="relative h-6 w-24 group">
            <img
              src={favicon}
              alt="Favicon"
              className="h-6 w-24 object-cover absolute inset-0 opacity-100 group-hover:opacity-0 transition-all duration-200"
            />
            <img
              src={hoverFavicon}
              alt="Favicon Hover"
              className="h-6 w-24 object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            />
          </div>
        )}

<button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-2.5 top-3.5 z-10 p-0.5 rounded-full
          bg-neutral-100 dark:bg-neutral-dark-50
          border border-neutral-300 dark:border-neutral-dark-200
          text-neutral-400 dark:text-neutral-dark-500
          hover:border-brand-600 hover:bg-brand-100 dark:hover:bg-brand-400/15
          hover:text-brand-500 transition-all duration-200"
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <span
          className={`block transition-transform${
            isOpen ? "rotate-0" : "rotate-180"
          }`}
        >
          <ChevronLeft size={14} />
        </span>
      </button>
      </div>

      {/* Nav items — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] flex flex-col justify-between">
        <nav
          className={`flex flex-col gap-0.5`}
        >
          {renderNavItems(topNavItems)}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
