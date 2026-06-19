import type {
  DashboardDocument,
  DashboardDocumentInput,
  DashboardStatus,
} from "../types/document";
import { DASHBOARD_SCHEMA_VERSION } from "./constants";

function normalizeStatus(status: DashboardStatus | undefined): DashboardStatus {
  return status ?? "draft";
}

/** Normalize in-memory document before save (client-side only). */
export function normalizeDocument(input: DashboardDocumentInput): DashboardDocument {
  const meta = input.meta ?? {};
  return {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    id: input.id,
    plantId: input.plantId,
    name: input.name,
    meta: {
      ...meta,
      status: normalizeStatus(meta.status),
      kind: meta.kind ?? "custom",
      version: meta.version ?? 1,
    },
    widgets: input.widgets ?? {},
  };
}

export function duplicateDashboardDocument(args: {
  source: DashboardDocument;
  newId: string;
  newName: string;
  status?: DashboardStatus;
}): DashboardDocument {
  const clone = structuredClone(args.source);
  clone.id = args.newId;
  clone.name = args.newName;
  clone.meta = {
    ...clone.meta,
    status: args.status ?? "draft",
    kind: "custom",
    version: 1,
  };
  return clone;
}

export interface DashboardSaveOptions {
  setActive?: boolean;
}

/** Persistence adapter — implemented by API layer. */
export interface DashboardPersistenceAdapter {
  list(plantId: string): Promise<import("../types/document").DashboardSummary[]>;
  get(plantId: string, dashboardId: string): Promise<DashboardDocument | null>;
  getActive(plantId: string): Promise<DashboardDocument | null>;
  setActive(plantId: string, dashboardId: string | null): Promise<void>;
  save(document: DashboardDocument, options?: DashboardSaveOptions): Promise<DashboardDocument>;
  duplicate(args: {
    source: DashboardDocument;
    newId: string;
    newName: string;
    status?: DashboardStatus;
  }): Promise<DashboardDocument>;
  remove(plantId: string, dashboardId: string): Promise<void>;
}
