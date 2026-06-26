export const authEndpoints = {
  SEND_OTP: "/auth/send-otp",
  VERIFY_OTP: "/auth/verify-otp",
  LOGIN: "/auth/login",
  EXPIRE_SESSIONS: (token: string) => `/auth/end-sessions/${token}`,
  GET_ALL_SESSIONS: (token: string) => `/auth/get-all-sessions/${token}`,
  LOGOUT: "/auth/logout",
  GET_MY_PROFILE: "/user/me",
  FORGOT_PASSWORD: "/auth/password/forgot",
  VERIFY_RESET_PASSWORD_OTP: "/auth/password/verify/reset",
  RESET_PASSWORD: "/auth/password/reset",
} as const;


// export const epcEndpoints = {
//   CREATE_EPC: "/epc",
//   GET_EPC_LIST: "/epc",
//   GET_EPC_BY_ID: (id: string) => `/epc/${id}`,
//   UPDATE_EPC: (id: string) => `/epc/${id}`,
//   DELETE_EPC: (id: string) => `/epc/${id}`,
//   TOGGLE_STATUS: (id: string) => `/epc/${id}/status`,
// } as const;

export const permissionEndpoints = {
  CREATE_PERMISSION: "/permission",
  GET_PERMISSION_LIST: "/permissions",
  GET_PERMISSION_BY_ID: (id: string) => `/permission/${id}`,
  UPDATE_PERMISSION: (id: string) => `/permission/${id}`,
  TOGGLE_STATUS: (id: string) => `/permission/${id}/status`,
  DELETE_PERMISSION: "/permission/delete",
  GET_ASSIGNABLE_PERMISSION_NAMES: (role: string) => `/permissions/${role}/assignable`,
} as const;

export const announcementEndpoints = {
  CREATE_ANNOUNCEMENT: "/announcement",
  /** Admin list — do not use for user login modal prompts. */
  GET_ANNOUNCEMENT_LIST: "/announcements",
  /** get-specific-announcement */
  GET_ANNOUNCEMENT_BY_ID: (id: string) => `/announcement/${id}`,
  UPDATE_ANNOUNCEMENT: (id: string) => `/announcement/${id}`,
  CHANGE_STATUS: "/announcement/status",
  DELETE_ANNOUNCEMENTS: "/announcement/delete",
  GET_ANNOUNCEMENT_TYPES: "/announcement-types",
} as const;

export const deviceEndpoints = {
  CREATE_DEVICE: "/device/create",
  GET_DEVICE_LIST: "/devices",
  GET_MY_DEVICE_LIST: "/devices/me",
  GET_DEVICE_NAMES: "/devices/name",
  GET_MY_DEVICE_NAMES: "/devices/me/name",
  GET_DEVICE_TYPES: "/device-types",
  GET_PLANT_UTILITY_TYPES: "/plant-utility-types",
  GET_DEVICE_BY_ID: (id: string) => `/device/${id}`,
  UPDATE_DEVICE: (id: string) => `/device/${id}`,
  DELETE_DEVICE: "/device/delete",
  TOGGLE_DEVICE_STATUS: "/device/status",
} as const;

// export const plantEndpoints = {
//   CREATE_PLANT: "/plant",
//   GET_PLANT_LIST: "/plant",
//   GET_PLANT_BY_ID: (id: string) => `/plant/${id}`,
//   UPDATE_PLANT: (id: string) => `/plant/${id}`,
//   DELETE_PLANT: (id: string) => `/plant/${id}`,
//   TOGGLE_STATUS: (id: string) => `/plant/${id}/status`,
//   GET_PLANT_COMPONENTS: (id: string) => `/plant/${id}/components`,
// } as const;

// export const inverterEndpoints = {
//   CREATE_INVERTER: "/inverter",
//   GET_INVERTER_LIST: "/inverter",
//   GET_INVERTER_BY_ID: (id: string) => `/inverter/${id}`,
//   UPDATE_INVERTER: (id: string) => `/inverter/${id}`,
//   DELETE_INVERTER: (id: string) => `/inverter/${id}`,
//   TOGGLE_STATUS: (id: string) => `/inverter/${id}/status`,
// } as const;

// export const plantInverterEndpoints = {
//   CREATE_PLANT_INVERTER: "/plant-inverter",
//   GET_PLANT_INVERTER_LIST: "/plant-inverter",
//   GET_PLANT_INVERTER_BY_ID: (id: string) => `/plant-inverter/${id}`,
//   UPDATE_PLANT_INVERTER: (id: string) => `/plant-inverter/${id}`,
//   DELETE_PLANT_INVERTER: (id: string) => `/plant-inverter/${id}`,
//   TOGGLE_STATUS: (id: string) => `/plant-inverter/${id}/status`,
// } as const;

// export const userEndpoints = {
//   CREATE_USER: "/create-user",
//   GET_USER_LIST: "/users",
//   GET_USER_BY_ID: (id: string) => `/user/${id}`,
//   UPDATE_USER: (id: string) => `/user/${id}`,
//   DELETE_USER: "/users/remove",
//   TOGGLE_STATUS: (id: string) => `/user/${id}/status`,
//   GET_ALL_SESSIONS: (id: string) => `/get-all-user-sessions/${id}`,
//   END_USER_SESSION: "/end-user-sessions",
//   CREATE_API_KEY: "/create-api-key",
//   GET_API_KEY: "/get-api-key",
//   DELETE_API_KEY: "/delete-api-key",
// } as const;

export const inverterTypeEndpoints = {
  GET_ALL_INVERTER_TYPES: "/inverters",
  GET_INVERTER_TYPE_NAMES: "/inverter-type/name",
  GET_INVERTER_BY_ID: (id: string) => `/inverter-type/${id}`,
  CREATE_INVERTER: "/inverter",
  UPDATE_INVERTER: (id: string) => `/inverter-type/${id}`,
  DELETE_INVERTER: "/inverter-type/delete",
  TOGGLE_STATUS: "/inverter-type/status",
} as const;

export const tenantEndpoints = {
  GET_ALL_TENANTS: "/tenants",
  GET_TENANT_BY_ID: (id: string) => `/tenant/${id}`,
  CREATE_TENANT: "/tenant/create",
  UPDATE_TENANT: (id: string) => `/tenant/${id}`,
  TOGGLE_TENANT_STATUS: "/tenant/status",
  DELETE_TENANT: (id: string) => `/tenant/${id}`,
  GET_ALL_TENANT_NAME: "/tenants/name",
  CREATE_TENANT_GENERATION_TABLE: "/tenant-generation-table",
  RESTORE_TENANT_GENERATION_TABLE: "/tenant-generation-table/restore",
} as const;

export const organizationEndpoints = {
  GET_ALL_ORGANIZATIONS: "/organizations",
} as const;

export const userEndpoints = {
  GET_ALL_USERS: "/users",
  GET_MY_USERS: "/users/me",
  GET_USER_NAMES: "/users/name",
  CREATE_USER: "/user/create",
  UPDATE_USER: (id: string) => `/user/${id}`,
  UPDATE_USER_SETTINGS: (id: string) => `/user/${id}/settings`,
  UPDATE_MY_SETTINGS: "/user/me/settings",
  DELETE_USER: "/users/delete",
  TOGGLE_STATUS: (id: string) => `/user/${id}/status`,
  GET_USER_PROFILE: (id: string) => `/user/profile/${id}`,
} as const;

// Plant endpoints
export const plantEndpoints = {
  GET_ALL_PLANTS: "/plants",
  GET_MY_PLANTS: "/plants/me",
  GET_PLANT_NAMES: "/plants/name",
  GET_PLANT_TYPES: "/plant-types",
  GET_PLANT_CATEGORIES: "/plant-categories",
  GET_PLANT_BY_ID: (id: string) => `/plant/${id}`,
  /** Minimal or full component rows for one plant (`?full_details=true`). */
  GET_PLANT_COMPONENTS: (id: string) => `/plant-components/${id}`,
  GET_PLANT_EQUIPMENT_DASHBOARD: (id: string) => `/plant/${id}/equipment-dashboard`,
  CREATE_PLANT: "/plant",
  UPDATE_PLANT: (id: string) => `/plant/${id}`,
  DELETE_PLANT: (id: string) => `/plant/${id}`,
  TOGGLE_PLANT_STATUS: (id: string) => `/plant/${id}/status`,
  COMMISSION_PLANT: (id: string) => `/plant/${id}/commission`,
  DECOMMISSION_PLANT: (id: string) => `/plant/${id}/decommission`,
  GET_REVENUES: "/revenues",
  GET_MAIN_DASHBOARD_CONFIG: "/dashboard/config",
} as const;

export const tagTemplateEndpoints = {
  GET_ALL: "/tag-templates",
  GET_BY_ID: (id: string) => `/tag-template/${id}`,
  CREATE: "/tag-template",
  BULK_CREATE: "/tag-templates/bulk",
  UPDATE: (id: string) => `/tag-template/${id}`,
  DELETE: "/tag-template/delete",
  TOGGLE_STATUS: "/tag-template/change/status",
  GET_NAMES: "/tag-templates/name",
} as const;

export const tagTemplateCategoryEndpoints = {
  GET_ALL: "/tag-template-categories",
} as const;

export const tagGroupCategoryEndpoints = {
  GET_ALL: "/tag-group-categories",
} as const;

export const assetEndpoints={
  CREATE_ASSET:"/asset",
  UPDATE_ASSET:(id:String)=>`/asset/${id}`,
  DELETE_ASSET:(id:String)=>`/asset/${id}/delete`,
  GET_ALL_ASSETS:"/assets",
  GET_ASSET_BY_ID:(id:String)=>`/asset/${id}`,
  GET_ASSET_STATISTICS:"/asset/statistics",
  UPDATE_STATUS:(id:String)=>`/asset/${id}/status`,
  REPLACE_ASSET:(id:String)=>`/asset/${id}/replace`,
  GET_ASSET_HISTORY:(id:String)=>`/asset/${id}/status-history`,
  GET_REPLACEMENT_HISTORY:(id:String)=>`/asset/${id}/replacement-history`,
  BULK_DELETE:"/assets/delete",
  IMPORT_ASSETS:"/assets/import",
  EXPORT_ASSETS:"/assets/export",
  GET_ASSET_TYPES:"/asset-types",
  UPLOAD_ASSET_IMAGE:"/assets/scan"
}as const;

export const ticketEndpoints={
  CREATE_TICKET:"/ticket",
  GET_TICKET_BY_ID:(id:String)=>`/ticket/${id}`,
  GET_MY_TICKETS:"/tickets/me",
  GET_ALL_TICKETS:"/tickets",
  UPDATE_TICKET:(id:String)=>`/ticket/${id}`,
  DELETE_TICKET:(id:String)=>`/ticket/${id}`,
  ASSIGN_TICKET:"",
  REASSIGN_TICKET:"",
  GET_TICKET_HISTORY:"",
  GET_TICKET_STATISTICS:""
}

export const commentsEndpoints = {
    CREATE_COMMENT:(entityId: string|Number)=> `/comment/${entityId}`,
    GET_COMMENTS_BY_TICKET_ID: (entityId: string|Number) => `/comments/${entityId}`,
    UPDATE_COMMENT: (entityId: string|Number,commentId: string|Number) => `/comment/${entityId}/${commentId}`,
} as const;

export const targetEndpoints={
  CREATE_TARGET:"/target",
  GET_TARGET_BY_ID:(id:String)=>`/target/${id}`,
  GET_ALL_TARGETS:"/targets",
  GET_MY_TARGETS:(id:String)=>`/target/${id}`,
  UPDATE_TARGET:(id:String)=>`/target/${id}`,
  UPDATE_STATUS:"",
  DELETE_TARGET:`/targets`,

}

export const componentEndpoints = {
  GET_ALL: "/components",
  GET_MY_LIST: "/components/me",
  GET_COMPONENT_TYPES: "/component-types",
  GET_BY_ID: (id: string) => `/component/${id}`,
  GET_BY_PLANT: (plantId: string) => `/plant/${plantId}/component`,
  /** Single component create (form UI). Body must include `parent_id` when not plant. */
  CREATE: (plantId: string) => `/component/${plantId}`,
  /** Nested tree create: body `{ data: [ rootTree ] }` — no `parent_id`; backend assigns. */
  SMART_PLANT_CREATE: (plantId: string) => `/smart-plant-create/${plantId}`,
  UPDATE: (id: string) => `/component/${id}`,
  DELETE: (id: string) => `/component/${id}/delete`,
  TOGGLE_STATUS: (id: string) => `/component/${id}/status`,
  GET_NAMES: "/components/name",
  GET_MY_NAMES: "/components/me/name",
  GET_TAG_MAP_KEYS: "/components/tag-map-keys",
} as const;

export const smartPlantEndpoints = {
  CREATE: (plantId: string) => `/smart-plant/${plantId}`,
} as const;

/** In-app notifications (see DB `notifications` table). Backend routes may be added incrementally. */
export const notificationEndpoints = {
  LIST_MINE: "/notification",
  COUNT: "/notification/count",
  UPDATE_MANY: "/notification/update-many",
  /** Body: `{ fcm_device_token: string }` — FCM token from Firebase `getToken()` (web). */
  REGISTER_DEVICE_TOKEN: "/user/me/register-device-token",
  /** Body: `{ ids: string[] }` — bulk delete notification rows. */
  DELETE_NOTIFICATIONS: "/notification/delete-notifications",
} as const;

export const pushNotificationPlantPreferenceEndpoints = {
  GET_MY: "/plant/me/notify",
  GET_USER: (id: string) => `/plants/notify/${id}`,
  UPDATE_MY: "/plants/me/notify",
  UPDATE_USER: (plantId: string) => `/plants/notify/${plantId}`,
} as const;

export const plantFeatureEndpoints = {
  GET_ALL_PLANT_FEATURES: "/plant-features",
  GET_PLANT_FEATURE_BY_ID: (id: string) => `/plant-feature/${id}`,
  CREATE_PLANT_FEATURE: "/plant-feature",
  UPDATE_PLANT_FEATURE: (id: string) => `/plant-feature/${id}`,
  TOGGLE_PLANT_FEATURE_STATUS: (id: string) => `/plant-feature/${id}/status`,
  REMOVE_PLANT_FEATURE: "/plant-feature/delete",
} as const;

export const profileEndpoints = {
  GET_MY_PROFILE: "/user/me",
  UPDATE_MY_PROFILE: "/user/me/update-profile",
  CHANGE_MY_EMAIL: "/user/me/change-email",
  VERIFY_MY_NEW_EMAIL: "/user/me/verify/new-email",
  CHANGE_MY_PASSWORD: "/user/me/password/change",
  CHANGE_MY_PHONE: "/user/me/phone/change",
  VERIFY_MY_NEW_PHONE: "/user/me/verify/new-phone-number",
  // ── Other user profile ───────────────────────────────────────────────────
  GET_USER_PROFILE: (id: string) => `/user/profile/${id}`,
  UPDATE_USER_PROFILE: (id: string) => `/user/${id}`,

  // ── Sessions ─────────────────────────────────────────────────────────────
  /** Sessions for logged-in user — also used for terminate (PUT with body) */
  MY_SESSIONS: "/user/me/sessions",
  TERMINATE_MY_SESSION: "/user/me/sessions/remove",
  /** Sessions for any user — also used for terminate by admin */
  USER_SESSIONS: (id: string) => `/user/${id}/sessions`,
  TERMINATE_USER_SESSION: (id: string) => `/user/${id}/sessions/remove`,

  // ── API Key (singular — one key per user) ────────────────────────────────
  MY_API_KEY: "/user/me/api-key",
  USER_API_KEY: (uid: string) => `/user/${uid}/api-key`,
  DELETE_MY_API_KEY: "/user/me/api-key",
  DELETE_USER_API_KEY: (uid: string) => `/user/${uid}/api-key`,
} as const;

export const alarmEndpoints = {
  GET_PLANT_ALARMS: (plantId: string) => `/plant/${plantId}/alarms`,
} as const;

export const tagGroupEndpoints = {
  GET_ALL: "/tag-groups",
  GET_NAMES: "/tag-groups/name",
  GET_BY_ID: (id: string) => `/tag-group/${id}`,
  CREATE: "/tag-group",
  UPDATE: (id: string) => `/tag-group/${id}`,
  DELETE: "/tag-group/delete",
  TOGGLE_STATUS: "/tag-group/status",
} as const;

export const plantDashboardEndpoints = {
  GET_ALL: (plantId: string) => `/plant/${plantId}/dashboards`,
  GET_ACTIVE: (plantId: string) => `/plant/${plantId}/dashboards/active`,
  GET_BY_ID: (plantId: string, dashboardId: string) =>
    `/plant/${plantId}/dashboards/${dashboardId}`,
  CREATE: (plantId: string) => `/plant/${plantId}/dashboards`,
  UPDATE: (plantId: string, dashboardId: string) =>
    `/plant/${plantId}/dashboards/${dashboardId}`,
  SET_ACTIVE: (plantId: string) => `/plant/${plantId}/dashboards/active`,
  DUPLICATE: (plantId: string, dashboardId: string) =>
    `/plant/${plantId}/dashboards/${dashboardId}/duplicate`,
  DELETE: (plantId: string, dashboardId: string) =>
    `/plant/${plantId}/dashboards/${dashboardId}`,
} as const;

export const historyEndpoints = {
  GET_PLANT_HISTORY: (plantId: string) => `/history-data/${plantId}`,
  GET_MY_PLANT_HISTORY: (plantId: string) => `/history-data/me/${plantId}`,
} as const;

export const pincodeEndpoints = {
  GET_DETAILS: (pincode: string) => [
    `https://api.postalpincode.in/pincode/${pincode}`,
    `http://api.postalpincode.in/pincode/${pincode}`,
  ],
} as const;