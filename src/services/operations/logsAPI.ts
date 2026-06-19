import { useQuery } from "@tanstack/react-query";
import { logsApi } from "../logsApi";
import { getErrorMessage } from "../api";
import type { AxiosError } from "axios";

const LOGS_PATH = "/api/v1/logs";

/** Audit log document as returned by the logs service (flat fields). */
export interface AuditLog {
  id: string;
  created_at: string;
  request_id: string;
  device_info?: Record<string, unknown>;
  user?: { id?: string; value?: string } | Record<string, unknown>;
  method?: string;
  route?: string;
  status_code?: number;
  target_type?: string;
  target_id?: string;
  action?: string;
  old_data?: unknown;
  modified_properties?: unknown;
  body?: unknown;
  params?: unknown;
  query?: unknown;
  request_body?: unknown;
  /** Backward compatibility: older producers stored request under `request`. */
  request?: unknown;
  response_body?: unknown;
  errors?: unknown;
}

export interface LogsListResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface LogsListFilters {
  user_id?: string;
  method?: string;
  route?: string;
  status_code?: number;
  target_type?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: string;
}

function buildListParams(
  filters: LogsListFilters,
  limit: number,
  offset: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = { limit, offset };
  const f = filters;
  if (f.user_id?.trim()) params.user_id = f.user_id.trim();
  if (f.method?.trim()) params.method = f.method.trim();
  if (f.route?.trim()) params.route = f.route.trim();
  if (f.status_code != null && f.status_code > 0) params.status_code = f.status_code;
  if (f.target_type?.trim()) params.target_type = f.target_type.trim();
  if (f.action?.trim()) params.action = f.action.trim();
  if (f.start_date?.trim()) params.start_date = f.start_date.trim();
  if (f.end_date?.trim()) params.end_date = f.end_date.trim();
  if (f.sort_by?.trim()) params.sort_by = f.sort_by.trim();
  if (f.sort_order?.trim()) params.sort_order = f.sort_order.trim();
  return params;
}

/** Convert yyyy-MM-dd from filter panel to RFC3339 bounds for the Go API. */
export function dateRangeToRFC3339(start?: string, end?: string) {
  let start_date: string | undefined;
  let end_date: string | undefined;
  if (start?.trim()) start_date = `${start.trim()}T00:00:00.000Z`;
  if (end?.trim()) end_date = `${end.trim()}T23:59:59.999Z`;
  return { start_date, end_date };
}

export function logsApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as AxiosError<{ error?: string; message?: string }>;
    const d = ax.response?.data;
    if (d && typeof d === "object") {
      if (typeof d.error === "string") return d.error;
      if (typeof d.message === "string") return d.message;
    }
  }
  return getErrorMessage(err);
}

export async function fetchLogsList(args: {
  filters: LogsListFilters;
  page: number;
  pageSize: number;
  routeSearch?: string;
}): Promise<LogsListResponse> {
  const offset = (args.page - 1) * args.pageSize;
  const merged: LogsListFilters = {
    ...args.filters,
    route:
      args.filters.route?.trim() ||
      args.routeSearch?.trim() ||
      undefined,
  };
  const params = buildListParams(merged, args.pageSize, offset);
  const { data } = await logsApi.get<LogsListResponse>(LOGS_PATH, { params });
  return data;
}

export async function fetchLogById(id: string): Promise<AuditLog> {
  const { data } = await logsApi.get<AuditLog>(`${LOGS_PATH}/${encodeURIComponent(id)}`);
  return data;
}

export function useLogsListQuery(args: {
  filters: LogsListFilters;
  page: number;
  pageSize: number;
  routeSearch?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "logs",
      "list",
      args.page,
      args.pageSize,
      args.filters,
      args.routeSearch ?? "",
    ],
    queryFn: () => fetchLogsList(args),
    enabled: args.enabled !== false,
  });
}

export function useLogDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["logs", "detail", id],
    queryFn: () => fetchLogById(id!),
    enabled: !!id && id.length > 0,
  });
}
