/** Display name for the built-in dashboard (not stored in the database). */
export const DEFAULT_DASHBOARD_NAME = "Default dashboard";

/**
 * The default dashboard is virtual: `user_plant_dashboard_preferences.active_dashboard_id`
 * is NULL. Layout is derived at runtime from plant equipment config.
 * Custom templates are rows in `plant_dashboard_templates`.
 */
