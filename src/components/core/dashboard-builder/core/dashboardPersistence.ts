import { createApiDashboardPersistence } from "./apiDashboardPersistence";
import type { DashboardPersistenceAdapter } from "./persistence";

let persistence: DashboardPersistenceAdapter = createApiDashboardPersistence();

export function getDashboardPersistence(): DashboardPersistenceAdapter {
  return persistence;
}

export const dashboardPersistence = persistence;
