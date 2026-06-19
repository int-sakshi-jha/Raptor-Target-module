import React, { useMemo, useState } from "react";
import {
  Outlet,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import {
  Bell,
  KeyRound,
  MonitorSmartphone,
  User,
  Settings,
} from "lucide-react";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";
import { type BreadcrumbItem } from "@/components/common/Breadcrumb";
import { useBreadcrumbTrail } from "@/context/BreadcrumbContext";
import {
  useGetMyDetailProfileQuery,
  useGetUserDetailProfileQuery,
} from "@/services/operations/profileAPI";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";

interface TabItem extends DetailSideNavItem {
  permissions: string[];
}

interface UserDetailLayoutProps {
  context: "me" | "user";
}

const getTabsForContext = (context: UserDetailLayoutProps["context"]): TabItem[] => {
  if (context === "me") {
    return [
      // My Profile should always be visible (no permission)
      { key: "profile", label: "Profile", icon: User, permissions: [] },
      {
        key: "sessions",
        label: "My Sessions",
        icon: MonitorSmartphone,
        permissions: ["view-my-sessions-tab"],
      },
      {
        key: "api-access",
        label: "My API Access",
        icon: KeyRound,
        permissions: ["view-my-api-access-tab"],
      },
      {
        key: "settings",
        label: "My Settings",
        icon: Settings,
        permissions: ["view-my-setting-tab"],
      },
      {
        key: "notifications",
        label: "My Notifications",
        icon: Bell,
        permissions: ["view-my-notification-tab"],
      },
    ];
  }

  return [
    {
      key: "profile",
      label: "User Profile",
      icon: User,
      permissions: [],
    },
    {
      key: "sessions",
      label: "User Sessions",
      icon: MonitorSmartphone,
      permissions: ["view-user-sessions-tab"],
    },
    {
      key: "api-access",
      label: "User API Access",
      icon: KeyRound,
      permissions: ["view-user-api-access-tab"],
    },
    {
      key: "settings",
      label: "User Settings",
      icon: Settings,
      permissions: ["view-user-setting-tab"],
    },
    {
      key: "notifications",
      label: "User Notifications",
      icon: Bell,
      permissions: ["view-user-notification-tab"],
    },
  ];
};

function resolveProfileFromQueryData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;

  const raw = (data as { data?: Record<string, unknown> }).data;
  if (!raw || typeof raw !== "object") return null;

  const nestedUser = raw.user;
  if (nestedUser && typeof nestedUser === "object") {
    return nestedUser as Record<string, unknown>;
  }

  const doubleNestedUser =
    "data" in raw
      ? (raw.data as { user?: Record<string, unknown> } | undefined)?.user
      : undefined;
  if (doubleNestedUser && typeof doubleNestedUser === "object") {
    return doubleNestedUser;
  }

  return raw;
}

function resolveUserDisplayName(
  profile: Record<string, unknown> | null,
  context: UserDetailLayoutProps["context"],
) {
  const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  if (fullName) return fullName;

  const firstName = typeof profile?.first_name === "string" ? profile.first_name.trim() : "";
  const lastName = typeof profile?.last_name === "string" ? profile.last_name.trim() : "";
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (combinedName) return combinedName;

  const username = typeof profile?.username === "string" ? profile.username.trim() : "";
  if (username) return username;

  return context === "me" ? "My Account" : "...";
}

const UserDetailLayout: React.FC<UserDetailLayoutProps> = ({ context }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const basePath = context === "me" ? "/me" : id ? `/users/${id}` : "/users";
  const tabs = useMemo(() => getTabsForContext(context), [context]);
  const myProfileQuery = useGetMyDetailProfileQuery(context === "me");
  const userProfileQuery = useGetUserDetailProfileQuery(context === "user" ? id : null);
  const activeProfileQuery = context === "me" ? myProfileQuery : userProfileQuery;

  const profile = useMemo(
    () => resolveProfileFromQueryData(activeProfileQuery.data),
    [activeProfileQuery.data],
  );

  const currentUserName = useMemo(
    () => resolveUserDisplayName(profile, context),
    [context, profile],
  );

  const visibleTabs = useMemo(
    () =>
      tabs.filter(
        (t) =>
          t.permissions.length === 0 ||
          t.permissions.some((p) =>
            hasPermission(userPermissions, p as keyof typeof PERMISSIONS),
          ),
      ),
    [tabs, userPermissions],
  );

  const activeTab = useMemo(() => {
    const currentSegment = location.pathname.split("/").filter(Boolean).at(-1);
    if (!currentSegment) return null;

    return tabs.find((tab) => tab.key === currentSegment) ?? null;
  }, [location.pathname, tabs]);

  const breadcrumbs = useMemo(() => {
    if (context === "user" && !id) return [];

    const baseItems: BreadcrumbItem[] =
      context === "me"
        ? [{ label: "My Account", path: "/me/profile" }]
        : [
            { label: "Users", path: "/users" },
            { label: currentUserName },
          ];

    if (!activeTab) return baseItems;

    return [
      ...baseItems,
      {
        label: activeTab.label,
        path: `${basePath}/${activeTab.key}`,
      },
    ];
  }, [activeTab, basePath, context, currentUserName, id]);

  const handleBack = () => {
    navigate(-1);
  };

  const headerLabel = context === "me" ? "My Account" : "User Details";
  const mobileBackLabel = context === "me" ? "My Account" : "Users";

  useBreadcrumbTrail(breadcrumbs.length > 0 ? breadcrumbs : null);

  if (!isLargeScreen) {
    return (
      <div className="flex flex-col min-h-full">
        <DetailMobileNav
          onBack={handleBack}
          backLabel={mobileBackLabel}
          items={visibleTabs}
          mode="route"
          basePath={basePath}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  const detailSidebarMarginClass = sidebarOpen ? "ml-52" : "ml-[60px]";
  const detailSidebarMotionClass =
    "transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[margin]";

  return (
    <div className="flex min-h-full">
      <DetailDesktopSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onBack={handleBack}
        headerLabel={headerLabel}
        items={visibleTabs}
        mode="route"
        basePath={basePath}
      />
      <main
        className={`flex-1 overflow-y-auto min-w-0 ${detailSidebarMarginClass} ${detailSidebarMotionClass}`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default UserDetailLayout;
