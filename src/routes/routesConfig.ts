import DashboardLayout from "@/layout/DashboardLayout";
import HomeLayout from "@/layout/HomeLayout";
import ActiveSessions from "@/pages/ActiveSessions";
import Dashboard from "@/pages/Dashboard";
import { InverterType } from "@/pages/InverterType";
import ForgotPassword from "@/pages/ForgotPassword";
import Login from "@/pages/Login";
import Permissions from "@/pages/Permissions";
import PermissionDetail from "@/pages/PermissionDetail";
import Announcements from "@/pages/Announcements";
import AnnouncementDetail from "@/pages/AnnouncementDetail";
import Logs from "@/pages/Logs";
import LogDetail from "@/pages/LogDetail";
import Users from "@/pages/Users";
import ResetPassword from "@/pages/ResetPassword";
import React from "react";
import InverterTypeDetails from "@/pages/InverterTypeDetails";
import PlantTickets from "@/pages/Ticket";
import TicketDetails from "@/pages/TicketDetail";
import {
  // /me/* wrappers
  MeLayout,
  MeRedirect,
  MeProfilePage,
  MeSessionsPage,
  MeApiAccessPage,
  MeSettingsPage,
  MeNotificationsPage,
  // /users/:id/* wrappers
  UserDetailLayoutWrapper,
  UserProfileTabPage,
  UserSessionsTabPage,
  UserApiAccessTabPage,
  UserSettingsTabPage,
  UserNotificationsTabPage,
} from "@/pages/UserDetailWrappers";
import Tenant from "@/pages/Tenant";
import TenantDetails from "@/pages/TenantDetails";
import Device from "@/pages/Device";
import DeviceDetails from "@/pages/DeviceDetails";
import Plants from "@/pages/Plants";
import PlantDetails from "@/pages/PlantDetails";
import PlantLayout from "@/layout/PlantLayout";
import PlantDashboard from "@/pages/plant/PlantDashboard";
import PlantLiveDashboard from "@/pages/plant/PlantLiveDashboard";
import PlantAssets from "@/pages/plant/PlantAssets";
import AssetDetails from "@/pages/plant/PlantAssetDetails";
import PlantComponents from "@/pages/plant/PlantComponents";
import PlantAlarms from "@/pages/plant/PlantAlarms";
import PlantEquipmentDashboard from "@/pages/plant/PlantEquipmentDashboard";
import PlantDetailDashboard from "@/pages/plant/PlantDetailDashboard";
import PlantHistory from "@/pages/plant/PlantHistory";
import PlantTracker from "@/pages/plant/PlantTracker";
import PlantRootRedirect from "@/pages/plant/PlantRootRedirect";
import TagTemplates from "@/pages/TagTemplates";
import Components from "@/pages/Components";
import SmartPlantCreate from "@/pages/smartPlantCreate/SmartPlantCreate";
import ComponentDetails from "@/pages/ComponentDetails";
import TagTemplateDetails from "@/pages/TagTemplateDetails";
import Notifications from "@/pages/Notifications";
import PlantFeatures from "@/pages/PlantFeatures";
import PlantFeatureDetails from "@/pages/PlantFeatureDetails";
import TagGroups from "@/pages/TagGroups";
import TagGroupDetails from "@/pages/TagGroupDetails";

export interface RouteConfig {
  path: string;
  element: React.ComponentType | string;
  isNeutral?: boolean;
  isPublic?: boolean;
  permissionsRequired?: string[];
  children?: RouteConfig[];
}

export const routesConfig: RouteConfig[] = [
  // ── Public / Auth ──────────────────────────────────────────────────────────
  {
    path: "/",
    element: HomeLayout,
    isNeutral: false,
    isPublic: true,
    permissionsRequired: [],
    children: [
      {
        path: "/login",
        element: Login,
        isPublic: true,
        permissionsRequired: [],
      },
      {
        path: "/forgot-password",
        element: ForgotPassword,
        isPublic: true,
        permissionsRequired: [],
      },
      {
        path: "/reset-password",
        element: ResetPassword,
        isPublic: true,
        permissionsRequired: [],
      },
      {
        path: "/sessions",
        element: ActiveSessions,
        isPublic: true,
        permissionsRequired: [],
      },
    ],
  },

  // ── Dashboard (private) ────────────────────────────────────────────────────
  {
    path: "",
    element: DashboardLayout,
    isNeutral: false,
    isPublic: false,
    permissionsRequired: [],
    children: [
      {
        path: "/dashboard",
        element: Dashboard,
        isPublic: false,
        permissionsRequired: ["view-dashboard-tab"],
      },
      {
        path: "/permissions",
        element: Permissions,
        isPublic: false,
        permissionsRequired: ["view-permission-tab"],
      },
      {
        path: "/permissions/:id",
        element: PermissionDetail,
        isPublic: false,
        permissionsRequired: ["view-permission-detail"],
      },
      {
        path: "/announcements",
        element: Announcements,
        isPublic: false,
        permissionsRequired: ["view-announcement-tab"],
      },
      {
        path: "/announcements/:id",
        element: AnnouncementDetail,
        isPublic: false,
        permissionsRequired: ["get-specific-announcement"],
      },
      {
        path: "/logs",
        element: Logs,
        isPublic: false,
        permissionsRequired: ["view-log-tab"],
      },
      {
        path: "/logs/:id",
        element: LogDetail,
        isPublic: false,
        permissionsRequired: ["view-log-detail"],
      },
      {
        path: "/users",
        element: Users,
        isPublic: false,
        permissionsRequired: ["view-user-tab"],
      },
      {
        path: "/inverter-type",
        element: InverterType,
        isPublic: false,
        permissionsRequired: ["view-inverter-type-tab"],
      },
      {
        path: "/inverter-type/:id",
        element: InverterTypeDetails,
        isPublic: false,
        permissionsRequired: ["view-inverter-type-detail"],
      },
      {
        path: "/tenant",
        element: Tenant,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tenant-tab"],
        children: undefined,
      },
      {
        path: "/tenant/:id",
        element: TenantDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tenant-detail"],
        children: undefined,
      },
      {
        path: "/devices",
        element: Device,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-device-tab"],
        children: undefined,
      },
      {
        path: "/devices/:id",
        element: DeviceDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["get-specific-device"],
        children: undefined,
      },
      {
        path: "/components/:id",
        element: ComponentDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-component-tab"],
        children: undefined,
      },
      {
        path: "/plants",
        element: Plants,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-plant-tab"],
        children: undefined,
      },
      {
        path: "/plants/:id",
        element: PlantLayout,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["get-specific-plant"],
        children: [
          {
            path: "",
            element: PlantRootRedirect,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "plant-dashboard",
            element: PlantDashboard,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "dashboard",
            element: PlantLiveDashboard,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "details",
            element: PlantDetails,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "components",
            element: PlantComponents,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "equipment-dashboard",
            element: PlantEquipmentDashboard,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "detail-dashboard",
            element: PlantDetailDashboard,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "alarms",
            element: PlantAlarms,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "assets",
            element: PlantAssets,
            isPublic: false,
            permissionsRequired: ["view-plant-detail"],
          },
          {
            path: "asset/:id",
            element: AssetDetails,
            isPublic: false,
            permissionsRequired: ["view-plant-detail"],
          },

          {
            path: "history",
            element: PlantHistory,
            isPublic: false,
            permissionsRequired: [],
          },
          {
            path: "tracker",
            element: PlantTracker,
            isPublic: false,
            permissionsRequired: [],
          },
        ],
      },
      {
        path: "/tag-templates",
        element: TagTemplates,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tag-template-tab"],
        children: undefined,
      },
      {
        path: "/tag-templates/:id",
        element: TagTemplateDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tag-template-detail"],
        children: undefined,
      },
      {
        path: "/components",
        element: Components,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-component-tab"],
        children: undefined,
      },
      {
        path: "/smart-plant-create",
        element: SmartPlantCreate,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-smart-plant-tab"],
        children: undefined,
      },
      {
        path: "/plant-feature/:id",
        element: PlantFeatureDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-plant-feature-tab"],
        children: undefined,
      },
      {
        path: "/notifications",
        element: Notifications,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-notification-tab"],
        children: undefined,
      },
      {
        path: "/plant-feature",
        element: PlantFeatures,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-plant-feature-tab"],
        children: undefined,
      },
      {
        path: "/tag-groups",
        element: TagGroups,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tag-group-tab"],
        children: undefined,
      },
      {
        path: "/tag-groups/:id",
        element: TagGroupDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: ["view-tag-group-detail"],
        children: undefined,
      },

      {
        path: "/ticket",
        element: PlantTickets,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: [],
        children: undefined,
      },
      {
        path: "/ticket/:id",
        element: TicketDetails,
        isNeutral: false,
        isPublic: false,
        permissionsRequired: [],
        children: undefined,
      },

      // ── /users/:id/* ─ admin viewing another user ─────────────────────────
      {
        path: "/users/:id",
        element: UserDetailLayoutWrapper,
        isPublic: false,
        permissionsRequired: [],
        children: [
          { path: "profile", element: UserProfileTabPage, isPublic: false, permissionsRequired: [] },
          { path: "sessions", element: UserSessionsTabPage, isPublic: false, permissionsRequired: ["view-user-sessions-tab"] },
          { path: "api-access", element: UserApiAccessTabPage, isPublic: false, permissionsRequired: ["view-user-api-access-tab"] },
          { path: "settings", element: UserSettingsTabPage, isPublic: false, permissionsRequired: ["view-user-setting-tab"] },
          { path: "notifications", element: UserNotificationsTabPage, isPublic: false, permissionsRequired: ["view-user-notification-tab"] },
        ],
      },

      // ── /me/* ─ logged-in user's own profile ──────────────────────────────
      {
        path: "/me",
        element: MeLayout,
        isPublic: false,
        permissionsRequired: [],
        children: [
          { path: "", element: MeRedirect, isNeutral: true, isPublic: false, permissionsRequired: [] },
          { path: "profile", element: MeProfilePage, isPublic: false, permissionsRequired: [] },
          { path: "sessions", element: MeSessionsPage, isPublic: false, permissionsRequired: ["view-my-sessions-tab"] },
          { path: "api-access", element: MeApiAccessPage, isPublic: false, permissionsRequired: ["view-my-api-access-tab"] },
          { path: "settings", element: MeSettingsPage, isPublic: false, permissionsRequired: ["view-my-setting-tab"] },
          { path: "notifications", element: MeNotificationsPage, isPublic: false, permissionsRequired: ["view-my-notification-tab"] },
        ],
      },
    ],
  },
];
