export const PERMISSIONS = {
  PERMISSION: {
    CREATE: "create-permission",
    UPDATE: "update-permission",
    DELETE: "delete-permissions",
    GET_ALL: "get-all-permissions",
    GET_SPECIFIC: "get-specific-permission",
  },
  TENANT: {
    GET_ALL_NAMES: "get-all-tenant-name",
    CREATE: "create-tenant",
    UPDATE: "update-tenant",
    DELETE: "delete-tenant",
    GET_ALL: "get-all-tenant",
    GET_SPECIFIC: "get-specific-tenant",
  },
  PLANT: {
    CREATE: "create-plant",
    UPDATE: "update-plant",
    DELETE: "delete-plant",
    COMMISSION: "commission-plant",
    DECOMMISSION: "decommission-plant",
    GET_ALL: "get-all-plants",
    GET_MY: "get-my-plants",
    GET_SPECIFIC: "get-specific-plant",
  },
  ASSET: {
    CREATE: "create-asset",
    UPDATE: "update-asset",
    DELETE: "delete-asset",
    GET_ALL: "get-all-asset",
    GET_SPECIFIC: "get-specific-asset",
    REPLACE:"replace-asset",
    EXPORT:"export-asset",
    IMPORT:"import-asset"
  },
  TICKET:{
    CREATE: "create-ticket",
    UPDATE:"update-ticket",
    GET_ALL:"get-all-ticket",
    GET_MY:"get-my-ticket",
    GET_SPECIFIC:"get-specific-ticket",
  },
  TARGET:{
    CREATE:"create-target",
    UPDATE:"update-target",
    DELETE:"delete-target",
    GET_ALL:"get-all-target",
    GET_SPECIFIC:"get-specific-target"

  },
  INVERTER_TYPE: {
    CREATE: "create-inverter-type",
    UPDATE: "update-inverter-type",
    DELETE: "delete-inverter-type",
    GET_ALL: "get-all-inverter",
    GET_ALL_INVERTER_TYPE_NAME: "get-all-inverter-type-name",
    GET_SPECIFIC: "get-specific-inverter-type",
  },
  USER: {
    CREATE_MY_API_KEY: "create-my-api-key",
    CREATE: "create-user",
    CREATE_USER_API_KEY: "create-user-api-key",
    UPDATE: "update-user",
    UPDATE_USER_SETTINGS: "update-user-settings",
    UPDATE_MY_PROFILE: "update-my-profile",
    UPDATE_MY_SETTINGS: "update-my-settings",
    DELETE_MY_API_KEY: "delete-my-api-key",
    DELETE: "delete-users",
    DELETE_USER_API_KEY: "delete-user-api-key",
    END_USER_SESSIONS: "end-user-sessions",
    END_MY_SESSIONS: "end-my-sessions",
    GET_ALL: "get-all-users",
    GET_MY_SESSIONS: "get-my-sessions",
    GET_USER_SESSIONS: "get-user-sessions",
    GET_MY_API_KEY: "get-my-api-key",
    GET_USER_API_KEY: "get-user-api-key",
    GET_PROFILE: "get-user-profile",
    GET_MY: "get-my-users",
    GET_MY_PROFILE: "get-my-profile",
    GET_USERS_NAME: "get-users-name",
    CHANGE_MY_EMAIL: "change-my-email",
    VERIFY_MY_NEW_EMAIL: "verify-my-new-email",
    VERIFY_MY_NEW_PHONE_NUMBER: "verify-my-new-phone-number",
    CHANGE_MY_PASSWORD: "change-my-password",
    CHANGE_MY_PHONE_NUMBER: "change-my-phone-number",
    REGISTER_DEVICE_TOKEN: "register-device-token",
  },
  DEVICE: {
    CREATE: "create-device",
    UPDATE: "update-device",
    DELETE: "delete-device",
    GET_ALL: "get-all-device",
    GET_ALL_DEVICE_NAME: "get-all-device-name",
    GET_ALL_MY_DEVICE_NAME: "get-all-my-device-name",
    GET_MY: "get-all-my-device",
    GET_SPECIFIC: "get-specific-device",
  },
  COMPONENT: {
    CREATE: "create-component",
    UPDATE: "update-component",
    DELETE: "delete-component",
    GET_ALL: "get-all-component",
    GET_MY: "get-all-my-component",
    GET_ALL_NAMES: "get-all-component-name",
    GET_MY_NAMES: "get-all-my-component-name",
    GET_SPECIFIC: "get-specific-component",
    GET_PLANT_COMPONENTS: "get-plant-components",
  },
  Tag_TEMPLATE: {
    CREATE: "create-tag-template",
    UPDATE: "update-tag-template",
    DELETE: "delete-tag-template",
    GET_ALL: "get-all-tag-template",
    GET_SPECIFIC: "get-specific-tag-template",
    GET_ALL_TAG_TEMPLATE_NAME: "get-all-tag-template-name",
  },
  PLANT_FEATURE: {
    CREATE: "create-plant-feature",
    UPDATE: "update-plant-feature",
    DELETE: "delete-plant-features",
    GET_ALL: "get-all-plant-features",
    GET_SPECIFIC: "get-specific-plant-feature",
  },
  ANNOUNCEMENT: {
    CREATE: "create-announcement",
    UPDATE: "update-announcement",
    DELETE: "delete-announcements",
    GET_ALL: "get-all-announcements",
    GET_SPECIFIC: "get-specific-announcement",
  },
  SMART_PLANT: {
    CREATE: "create-smart-plant",
  },
  TAG_GROUP: {
    CREATE: "create-tag-group",
    UPDATE: "update-tag-group",
    DELETE: "delete-tag-group",
    GET_ALL: "get-all-tag-groups",
    GET_ALL_NAMES: "get-all-tag-group-name",
    GET_SPECIFIC: "get-specific-tag-group",
  },
  PLANT_NOTIFICATION: {
    GET_MY: "get-all-my-notify-plant",
    GET_USER: "get-all-user-notify-plant",
    UPDATE_MY: "notify-my-plant",
    UPDATE_USER: "notify-user-plant",
  },
INVERTER_ALARM: {
  GET_INVERTER_ALARMS: "get-inverter-alarms",
},
  ALARM: {
    GET_PLANT_ALARMS: "get-plant-alarms",
    GET_TODAY_ALARMS: "get-today-alarms",
  },
ORGANIZATION : {
  GET_ALL_ORGANIZATIONS: "get-all-organizations",
},

  DEVELOPER: "developer"
} as const;

export type PermissionKey =
  | (typeof PERMISSIONS)["PERMISSION"][keyof (typeof PERMISSIONS)["PERMISSION"]]
  | "super-admin";

export type AppUserRole = "super_admin" | "admin" | "tenant" | "user";

export const normalizeUserRole = (
  role: string | null | undefined,
): AppUserRole | null => {
  const normalizedRole = role?.trim().toLowerCase().replaceAll("-", "_");
  if (normalizedRole === "superadmin") return "super_admin";
  if (
    normalizedRole === "super_admin" ||
    normalizedRole === "admin" ||
    normalizedRole === "tenant" ||
    normalizedRole === "user"
  ) {
    return normalizedRole;
  }

  return null;
};

export const hasPermission = (
  userPermissions: string[] | null | undefined,
  required: string | string[] | null | undefined,
): boolean => {
  if (!required) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  const normalized = userPermissions.map((p) => String(p).toLowerCase());
  if (
    normalized.includes("super-admin") ||
    normalized.includes("super_admin") ||
    normalized.includes("superadmin")
  )
    return true;

  if (Array.isArray(required)) {
    return required.every((p) => userPermissions.includes(p));
  }
  return userPermissions.includes(required);
};

export const canGetAllTenantNames = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.TENANT.GET_ALL_NAMES);

export const isTenantOrUserRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole === "tenant" || normalizedRole === "user";
};

export const isAdminOrSuperAdminRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole === "admin" || normalizedRole === "super_admin";
};

export const canOpenOwnerProfileByRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeUserRole(role);
  return (
    normalizedRole === "tenant" ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin"
  );
};


export const canPlantAdminLifecycleAction = (
  role: string | null | undefined,
  userPermissions: string[] | null | undefined,
  requiredPermission: string,
) => {
  if (!isAdminOrSuperAdminRole(role)) return false;
  if (normalizeUserRole(role) === "super_admin") return true;
  return hasPermission(userPermissions, requiredPermission);
};

export const canGetAllUsers = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.USER.GET_ALL);

export const canGetMyUsers = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.USER.GET_MY);

export const canGetAllPlants = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.PLANT.GET_ALL);

export const canGetMyPlants = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.PLANT.GET_MY);

export const canGetAllDevices = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.DEVICE.GET_ALL);

export const canGetMyDevices = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.DEVICE.GET_MY);

export const canGetAllComponents = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.COMPONENT.GET_ALL);

export const canGetMyComponents = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.COMPONENT.GET_MY);

export const canGetAllComponentNames = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.COMPONENT.GET_ALL_NAMES);

export const canGetMyComponentNames = (userPermissions: string[] | null | undefined) =>
  hasPermission(userPermissions, PERMISSIONS.COMPONENT.GET_MY_NAMES);

export const usesScopedComponentListAccess = (
  userPermissions: string[] | null | undefined,
  role: string | null | undefined,
) =>
  isTenantOrUserRole(role) ||
  (!canGetAllComponents(userPermissions) && canGetMyComponents(userPermissions));

export const usesScopedDeviceListAccess = (
  userPermissions: string[] | null | undefined,
  role: string | null | undefined,
) => {
  if (isTenantOrUserRole(role)) return true;
  return !canGetAllDevices(userPermissions) && canGetMyDevices(userPermissions);
};

export function formatPermissionText(value?: string | null) {
  if (!value) return "Unnamed";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatModuleName(value?: string | null) {
  const base = formatPermissionText(value);
  if (!base || base === "Unnamed") return base;

  return base
    .split(" ")
    .map((word) =>
      word.length === 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
