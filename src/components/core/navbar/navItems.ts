import { createElement, type ComponentType } from "react";
import {
  Bell,
  Settings,
  Gauge,
  User,
  Users,
  ShieldUser,
  Server,
  Factory,
  Component,
  FileCode,
  Logs,
  HandCoins,
  LayoutTemplate,
  Megaphone,
  Ticket,
} from "lucide-react";
import tenantIconRaw from "@/assets/Tenant 1.svg?raw";
import smartPlantIconRaw from "@/assets/Smart Plant.svg?raw";
import inverterTypesIconRaw from "@/assets/Inverter Types.svg?raw";

const svgMarkupToCurrentColor = (svg: string) =>
  svg
    .replaceAll(/stroke="white"/g, 'stroke="currentColor"')
    .replaceAll(/fill="white"/g, 'fill="currentColor"');

const createAssetIcon = (svgMarkup: string): ComponentType<{ className?: string }> => {
  const normalizedMarkup = svgMarkupToCurrentColor(svgMarkup);

  return function AssetIcon({ className = "" }) {
    return createElement("span", {
      "aria-hidden": "true",
      className:
        `inline-flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full ${className}`.trim(),
      dangerouslySetInnerHTML: { __html: normalizedMarkup },
    });
  };
};

export const TenantAssetIcon = createAssetIcon(tenantIconRaw);
export const SmartPlantAssetIcon = createAssetIcon(smartPlantIconRaw);
export const InverterTypesAssetIcon = createAssetIcon(inverterTypesIconRaw);

/** Entity icons shared with list pages, forms, and detail views (matches sidebar nav). */
export const navIcons = {
  dashboard: Gauge,
  plants: Factory,
  tenant: TenantAssetIcon,
  devices: Server,
  components: Component,
  smartPlant: SmartPlantAssetIcon,
  tagTemplates: FileCode,
  inverterTypes: InverterTypesAssetIcon,
  permissions: ShieldUser,
  announcements: Megaphone,
  logs: Logs,
  plantFeature: HandCoins,
  tagGroups: LayoutTemplate,
  users: Users,
} as const;

export interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  permissions?: string[];
  children?: NavItem[];
  /** Renders an interactive control (e.g. bell + popover) instead of a plain nav link. */
  customRender?: "notification-bell";
}

export const topNavItems: NavItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: Gauge,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-dashboard-tab"],
  },
  {
    name: "Plants",
    path: "/plants",
    icon: Factory,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-plant-tab"],
    // children: [
    //   { name: "Plant Dashboard", path: "/plants/:id/dashboard", icon: LayoutDashboard, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Plant Info", path: "/plants/:id/info", icon: Info, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Plant Components", path: "/plants/:id/components", icon: Boxes, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Plant Equipment", path: "/plants/:id/equipment", icon: Cpu, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Plant History", path: "/plants/:id/history", icon: History, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Plant Analytics", path: "/plants/:id/analytics", icon: BarChart3, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    // ],
  },
  {
    name: "Tenant",
    path: "/tenant",
    icon: TenantAssetIcon,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-tenant-tab"],
  },
  {
    name: "Devices",
    path: "/devices",
    icon: Server,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-device-tab"],
  },
  {
    name: "Components",
    path: "/components",
    icon: Component,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-component-tab"],
  },
  {
    name: "Smart Plant",
    path: "/smart-plant-create",
    icon: SmartPlantAssetIcon,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-smart-plant-tab"],
  },
  {
    name: "Tag Templates",
    path: "/tag-templates",
    icon: FileCode,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-tag-template-tab"],
  },
  {
    name: "Inverter Types",
    path: "/inverter-type",
    icon: InverterTypesAssetIcon,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-inverter-type-tab"],
  },
  {
    name: "Permissions",
    path: "/permissions",
    icon: ShieldUser,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-permission-tab"],
  },
  {
    name: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-announcement-tab"],
  },
  {
    name: "Logs",
    path: "/logs",
    icon: Logs,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-log-tab"],
  },
  {
    name: "Plant Feature",
    path: "/plant-feature",
    icon: HandCoins,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-plant-feature-tab"],
  },
  {
    name: "Tag Groups",
    path: "/tag-groups",
    icon: LayoutTemplate,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-tag-group-tab"],
  },
  {
    name: "Tickets",
    path: "/ticket",
    icon: Ticket,
    color: "text-brand-500 dark:text-brand-400",
    permissions: [],
  },
  {
    name: "Users",
    path: "/users",
    icon: Users,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-user-tab"],
    // children: [
    //   { name: "Profile", path: "/users/:id/profile", icon: User, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Sessions", path: "/users/:id/sessions", icon: MonitorSmartphone, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "API Access", path: "/users/:id/api-access", icon: KeyRound, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Settings", path: "/users/:id/settings", icon: Settings, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    //   { name: "Notifications", path: "/users/:id/notifications", icon: Bell, color: "text-brand-500 dark:text-brand-400", permissions: [] },
    // ],
  },

  // {
  //   name: "Weather",
  //   path: "/weather",
  //   icon: CloudSun,
  //   color: "text-brand-500 dark:text-brand-400",
  //   permissions: ["view_weather_tab"],
  // },

];

export const bottomNavItems: NavItem[] = [
  {
    name: "Notifications",
    path: "/notifications",
    icon: Bell,
    color: "text-brand-500 dark:text-brand-400",
    customRender: "notification-bell",
    permissions: ["view-notification-tab"],
  },
  {
    name: "Profile",
    path: "/me/profile",
    icon: User,
    color: "text-brand-500 dark:text-brand-400",
    permissions: [],
  },
  {
    name: "Settings",
    path: "/me/settings",
    icon: Settings,
    color: "text-brand-500 dark:text-brand-400",
    permissions: ["view-setting-tab"],
  },
];
