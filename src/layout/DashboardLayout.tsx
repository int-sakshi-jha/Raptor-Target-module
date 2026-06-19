import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import Sidebar from "../components/core/navbar/Sidebar";
import TopNavbar from "../components/core/navbar/TopNavbar";
import Header from "../components/core/navbar/Header";
import { topNavItems, bottomNavItems, type NavItem } from "../components/core/navbar/navItems";
import { useAppSelector } from "@/store/hooks";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";

const DashboardLayout: React.FC = () => {
  const { permissions } = useAppSelector((state) => state.auth);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");

  const filterNavItemsByPermissions = (items: NavItem[]): NavItem[] => {
    return items.filter((item: NavItem) => {
      const itemPermissions = item.permissions;
      if (!itemPermissions || itemPermissions.length === 0) return true;
      if (!permissions || permissions.length === 0) return false;
      return itemPermissions.some(
        (p: string) =>
          permissions.includes("super-admin") || permissions.includes(p)
      );
    });
  };

  const filteredTopNavItems = filterNavItemsByPermissions(topNavItems);
  const filteredBottomNavItems = filterNavItemsByPermissions(bottomNavItems);

  return (
    <BreadcrumbProvider>
      <div className="min-h-dvh sm:min-h-dvh sm:h-dvh sm:overflow-hidden bg-neutral-50 dark:bg-neutral-dark-50">
        {isLargeScreen ? (
          <>
            <Sidebar
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              topNavItems={filteredTopNavItems}
              bottomNavItems={filteredBottomNavItems}
            />

            <Header
              sidebarOpen={isSidebarOpen}
              topNavItems={filteredTopNavItems}
              bottomNavItems={filteredBottomNavItems}
            />

            <main
              className={`h-[calc(100dvh-40px)] overflow-y-auto mt-[46px] transition-all duration-300 ease-in-out
              ${isSidebarOpen ? "ml-52" : "ml-[72px]"}`}
            >
              <Outlet />
            </main>
          </>
        ) : (
          <>
            <TopNavbar
              topNavItems={filteredTopNavItems}
              bottomNavItems={filteredBottomNavItems}
            />

            <main className="h-full overflow-hidden pt-14">
              <Outlet />
            </main>
          </>
        )}
      </div>
    </BreadcrumbProvider>
  );
};

export default DashboardLayout;
