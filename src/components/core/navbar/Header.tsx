import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  Maximize2,
  Minimize2,
  Palette,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/authSlice";
import { type NavItem } from "./navItems";
import ThemeToggle from "../../common/ThemeToggle";
import { useLogoutMutation } from "@/services/operations/authAPI";
import NotificationBell from "@/components/notifications/NotificationBell";
import Avatar from "@/components/common/Avatar";
import Breadcrumb, { type BreadcrumbItem } from "@/components/common/Breadcrumb";
import { useBreadcrumbExtension } from "@/context/BreadcrumbContext";
import { buildBreadcrumbs } from "@/utils/breadcrumbBuilder";

function useHeaderBreadcrumbs(
  topNavItems: NavItem[],
  bottomNavItems: NavItem[],
): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const { extension } = useBreadcrumbExtension();
  return buildBreadcrumbs(pathname, [...topNavItems, ...bottomNavItems], extension);
}

interface HeaderProps {
  topNavItems: NavItem[];
  bottomNavItems: NavItem[];
  sidebarOpen: boolean;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  topNavItems,
  bottomNavItems,
  sidebarOpen,
  className,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  const breadcrumbs = useHeaderBreadcrumbs(topNavItems, bottomNavItems);
  
  const { pathname } = useLocation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const isBrowserFullscreen = () => {
      // Best-effort detection for browser (F11) fullscreen; not part of the Fullscreen API.
      return (
        window.innerHeight === window.screen.height &&
        window.innerWidth === window.screen.width
      );
    };

    const compute = () => {
      const apiFullscreen = !!document.fullscreenElement;
      setIsFullscreen(apiFullscreen || isBrowserFullscreen());
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11" || e.key === "Escape") {
        // Let the browser apply the UI change first.
        setTimeout(compute, 0);
      }
    };

    compute();
    document.addEventListener("fullscreenchange", compute);
    window.addEventListener("resize", compute);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", compute);
      window.removeEventListener("resize", compute);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = () => {
    console.log("handleLogout");
    if (logoutMutation.isPending) return;
    if (token) {
      logoutMutation.mutate();
      return;
    }
    dispatch(clearAuth());
    window.location.href = "/login";
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      // Some browsers / policies may block Fullscreen API; state will still sync via listeners.
    }
  };

  return (
    /* Desktop-only header — hidden on mobile (TopNavbar handles mobile) */
    <header
      className={`hidden w-full md:flex fixed top-0 right-0 z-30 py-1.5 items-center
        border-b border-neutral-200 dark:border-neutral-dark-200
        bg-neutral-0/80 dark:bg-neutral-dark-100/80 backdrop-blur-md shadow-sm
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "pl-52" : "pl-[72px]"}
        ${className || ""}`}
    >
      <div className="flex items-center justify-between w-full pl-6 pr-2 gap-4">
        {/* Left — Breadcrumb */}
        <div className="flex items-center min-w-0 flex-1">
          <Breadcrumb items={breadcrumbs} className="" />
        </div>

        {/* Right — Notifications + Divider + Profile */}
        <div className="flex items-center gap-1 shrink-0 overflow-visible">
          {bottomNavItems.map((item) =>
            item.name === "Profile" ? null : item.customRender === "notification-bell" ? (
              <NotificationBell key={`${item.name}-${pathname}`} item={item} />
            ) : (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `relative p-2 rounded-xs transition-all duration-200 ${isActive
                    ? "text-brand-600 dark:text-brand-400 bg-brand-500/10 dark:bg-brand-400/15"
                    : "text-neutral-600 dark:text-neutral-dark-700 hover:text-brand-600 dark:hover:text-brand-400"
                  }`
                }
                title={item.name}
              >
                {({ isActive }) => (
                  <item.icon
                    className={`w-[18px] h-[18px] ${isActive ? "text-brand-600 dark:text-brand-400" : item.color
                      }`}
                  />
                )}
              </NavLink>
            )
          )}

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="relative p-2 rounded-xs transition-all duration-200 text-neutral-600 dark:text-neutral-dark-700 hover:text-brand-600 dark:hover:text-brand-400"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-[18px] h-[18px]" />
            ) : (
              <Maximize2 className="w-[18px] h-[18px]" />
            )}
          </button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-dark-300 mx-1" />

          {/* Profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className="flex items-center rounded-full transition-all duration-200"
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

            {/* Dropdown */}
            <div
              className={`absolute -right-4 top-8 mt-2 w-60 rounded-xs z-[1000]
                border border-neutral-200 dark:border-neutral-dark-200
                bg-neutral-0 dark:bg-neutral-dark-100
                transition-all duration-200 origin-top-right
                ${isProfileMenuOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"}`}
            >
              {/* User info */}
              <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-dark-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate("/me/profile");
                  }}
                  className="flex items-center gap-3 w-full text-left group transition-all duration-200"
                  title="Go to profile"
                  aria-label="Go to profile"
                >
                  <div className="shrink-0 rounded-full transition-opacity duration-200 group-hover:opacity-80">
                    <Avatar
                      label={user?.displayName || user?.firstName || "User"}
                      src={user?.profilePicture}
                      size={28}
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
                </button>
              </div>

              {/* Menu items */}
              <div className="p-1.5">
                <div className="flex items-center w-full px-3 py-2 text-sm
                  text-neutral-900 dark:text-neutral-dark-950 rounded-none">
                  <Palette className="w-4 h-4 mr-3 shrink-0" />
                  <ThemeToggle />
                </div>

                <div className="my-1 border-t border-neutral-200 dark:border-neutral-dark-200" />

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm
                    text-error-600 dark:text-error-dark-600
                    hover:bg-error-500/10 dark:hover:bg-error-dark-500/15
                    transition-all duration-200 rounded-xs"
                >
                  <LogOut className="w-4 h-4 mr-3 shrink-0" />
                  <span>{logoutMutation.isPending ? "Logging out…" : "Logout"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
