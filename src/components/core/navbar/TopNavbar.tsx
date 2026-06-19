import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/authSlice";
import { type NavItem } from "./navItems";
import favicon from "@/assets/favicon.svg";
import ThemeToggle from "../../common/ThemeToggle";
import { useLogoutMutation } from "@/services/operations/authAPI";
import NotificationBell from "@/components/notifications/NotificationBell";
import Avatar from "@/components/common/Avatar";

interface TopNavbarProps {
  topNavItems: NavItem[];
  bottomNavItems: NavItem[];
  className?: string;
}

/** Mobile-only top navbar — hidden on md+ screens */
const TopNavbar: React.FC<TopNavbarProps> = ({
  topNavItems,
  bottomNavItems,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const { pathname } = useLocation();
  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const logoutMutation = useLogoutMutation();

  const handleItemClick = (itemName: string) =>
    setActiveItem(activeItem === itemName ? "" : itemName);

  const handleNavLinkClick = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen((open) => !open);
  };

  const toggleMobileMenu = () => {
    setIsProfileMenuOpen(false);
    setIsMenuOpen((open) => !open);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        profileMenuRef.current?.contains(target) ||
        profileMenuButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const handleLogout = () => {
    if (logoutMutation.isPending) return;
    if (token) {
      logoutMutation.mutate();
      return;
    }
    dispatch(clearAuth());
    window.location.href = "/login";
  };

  // Matches desktop Sidebar active/hover styles exactly
  const renderNavItems = (items: NavItem[]) => (
    <>
      {items.map((item) => (
        <div key={item.name}>
          {item.children ? (
            <>
              <button
                onClick={() => handleItemClick(item.name)}
                className="flex items-center justify-between w-full p-3 rounded-full text-sm text-neutral-700 dark:text-neutral-dark-900 hover:bg-brand-500/10 dark:hover:bg-brand-400/15 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-200"
              >
                <div className="flex items-center">
                  <item.icon className={`w-5 h-5 mr-3 shrink-0 ${item.color}`} />
                  <span>{item.name}</span>
                </div>
                {activeItem === item.name ? (
                  <ChevronUp className="w-4 h-4 shrink-0 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0 text-neutral-400" />
                )}
              </button>
              {activeItem === item.name && (
                <div className="ml-3 my-1 flex flex-col gap-0.5 border-l-2 border-brand-500/20 dark:border-brand-400/20 pl-3">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.name}
                      to={child.path}
                      onClick={handleNavLinkClick}
                      className={({ isActive }) =>
                        `flex items-center w-full px-2.5 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isActive
                            ? "bg-brand-500/15 dark:bg-brand-400/20 text-brand-700 dark:text-brand-300 font-medium"
                            : "text-neutral-600 dark:text-neutral-dark-700 hover:bg-brand-100 dark:hover:bg-brand-400/15"
                        }`
                      }
                    >
                      <child.icon className={`w-4 h-4 mr-2.5 shrink-0 ${child.color || item.color}`} />
                      <span className="truncate">{child.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          ) : (
            <NavLink
              to={item.path}
              onClick={handleNavLinkClick}
              className={({ isActive }) =>
                `flex items-center w-full px-3 py-2.5 text-sm transition-colors duration-200 ${
                  isActive
                    ? "border-l-4 border-brand-400 bg-brand-100 dark:bg-neutral-dark-200 text-neutral-900 dark:text-neutral-dark-950 font-medium hover:bg-brand-100 dark:hover:bg-neutral-dark-200"
                    : "text-neutral-900 dark:text-neutral-dark-950 hover:bg-brand-100 dark:hover:bg-neutral-dark-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 mr-3 shrink-0 ${
                      isActive ? "text-brand-600 dark:text-brand-400" : item.color
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          )}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile top bar — visible only below md */}
      <nav
        className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14
          flex items-center overflow-visible
          border-b border-neutral-200 dark:border-neutral-dark-200
          bg-neutral-0/95 dark:bg-neutral-dark-100/95 backdrop-blur
          px-2
          ${className || ""}`}
      >
        <div className="flex items-center flex-1 min-w-0 mx-0">
          <img src={favicon} alt="Logo" className="h-12 sm:h-9 w-12 sm:w-9 shrink-0 object-contain" />
        </div>

        {/* Right icons — notification  */}
        <div className="flex items-center gap-1 shrink-0 overflow-visible">
          {bottomNavItems.map((item) =>
            item.name === "Profile" ? null :
            item.customRender === "notification-bell" ? (
              <NotificationBell key={`${item.name}-${pathname}`} item={item} />
            ) : (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `relative p-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-neutral-600 dark:text-neutral-dark-700"
                  }`
                }
                title={item.name}
              >
                {({ isActive }) => (
                  <item.icon
                    className={`w-[18px] h-[18px] ${
                      isActive ? "text-brand-600 dark:text-brand-400" : item.color
                    }`}
                  />
                )}
              </NavLink>
            )
          )}

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-dark-300 mx-1" />

          {/* Profile avatar */}
          <button
            ref={profileMenuButtonRef}
            type="button"
            onClick={toggleProfileMenu}
            className="flex items-center p-1 rounded-lg hover:bg-brand-500/10 dark:hover:bg-brand-400/15 transition-all duration-200"
            title={isProfileMenuOpen ? "Close profile menu" : "Open profile menu"}
            aria-label={isProfileMenuOpen ? "Close profile menu" : "Open profile menu"}
            aria-expanded={isProfileMenuOpen}
          >
            <Avatar
              label={user?.displayName || user?.firstName || "User"}
              src={user?.profilePicture}
              size={28}
              alt="User Avatar"
              className="border border-brand-500/30 dark:border-brand-400/30"
            />
          </button>
        </div>

        {/* Hamburger */}
        <button
          onClick={toggleMobileMenu}
          className="shrink-0 py-2 pl-2 rounded-lg text-neutral-500
            hover:text-brand-600
            dark:hover:text-brand-400
            transition-all duration-200"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile slide-down menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-50
          bg-neutral-0 dark:bg-neutral-dark-100
          border-b border-neutral-200 dark:border-neutral-dark-200
          shadow-lg">
          <div className="pb-2 space-y-0.5 max-h-[70vh] overflow-y-auto">
            {renderNavItems(topNavItems)}
          </div>
        </div>
      )}
      {/* Mobile profile dropdown */}
      {isProfileMenuOpen && (
        <div
          ref={profileMenuRef}
          className="md:hidden fixed top-14 right-2 z-[60]
          w-60 rounded-xs
          border border-neutral-200 dark:border-neutral-dark-200
          bg-neutral-0 dark:bg-neutral-dark-100"
        >
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-dark-200">
            <NavLink
              to="/me/profile"
              onClick={() => setIsProfileMenuOpen(false)}
              className="flex items-center gap-3 w-full text-left group transition-all duration-200"
              title="Go to profile"
              aria-label="Go to profile"
            >
              <div className="shrink-0 rounded-full transition-opacity duration-200 group-hover:opacity-80">
                <Avatar
                  label={user?.displayName || user?.firstName || "User"}
                  src={user?.profilePicture}
                  size={36}
                  alt="Avatar"
                  className="border border-brand-500/30 dark:border-brand-400/30"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-neutral-900 dark:text-neutral-dark-950 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200">
                  {user?.displayName || user?.firstName || "User"}
                </div>
                <div className="text-xs text-brand-600 dark:text-brand-400 truncate mt-0.5">
                  {user?.email || ""}
                </div>
              </div>
            </NavLink>
          </div>
          <div className="p-1.5">
            <div className="flex items-center w-full px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-dark-950 rounded-none">
              <Palette className="w-4 h-4 mr-3 shrink-0" />
              <ThemeToggle />
            </div>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-dark-200" />
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 text-sm text-error-600 dark:text-error-dark-600 hover:bg-error-500/10 dark:hover:bg-error-dark-500/15 transition-all rounded-xs"
            >
              <LogOut className="w-4 h-4 mr-3 shrink-0" />
              <span>{logoutMutation.isPending ? "Logging out…" : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavbar;
