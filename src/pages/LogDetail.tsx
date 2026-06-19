import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import {
  useLogDetailQuery,
  logsApiErrorMessage,
} from "@/services/operations/logsAPI";
import Button from "@/components/common/Button";
import {
  DetailField,
  DetailFieldFull,
  DetailFieldGrid,
  DetailHero,
  DetailKeyValueTable,
  DetailContentArea,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailPageShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailCodeBlock,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";
import { formateDateTime } from "@/utils/gridFormatters";
import {
  AlertCircle,
  FileJson,
  Globe,
  MessageSquareReply,
  Pointer,
  SquareArrowDown,
  Target,
  User,
} from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import ColorBadge from "@/components/common/ColorBadge";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function breadcrumbLabelForRoute(route: string | undefined, maxLen = 56): string {
  const t = route?.trim() ?? "";
  if (!t) return "-";
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function hasPresentPayload(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") {
    if (Array.isArray(v)) return v.some(hasPresentPayload);
    return Object.values(v as Record<string, unknown>).some(hasPresentPayload);
  }
  return true;
}

function isNonEmptyPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    v != null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as Record<string, unknown>).length > 0
  );
}

function getValidationParamsFromResponseBody(
  responseBody: unknown,
): Array<{ name: string; location: string; message: string }> {
  if (!isNonEmptyPlainObject(responseBody)) return [];
  const details = responseBody["details"];
  if (!isNonEmptyPlainObject(details)) return [];
  const parameters = details["parameters"];
  if (!Array.isArray(parameters)) return [];

  const out: Array<{ name: string; location: string; message: string }> = [];
  for (const p of parameters) {
    if (!isNonEmptyPlainObject(p)) continue;
    const name = typeof p["name"] === "string" ? p["name"] : "";
    const location = typeof p["location"] === "string" ? p["location"] : "";
    const message = typeof p["message"] === "string" ? p["message"] : "";
    if (name || location || message) out.push({ name, location, message });
  }
  return out;
}

function hasActorUser(u: { id?: string; value?: string } | null): boolean {
  if (!u) return false;
  return !!(u.id?.trim() || u.value?.trim());
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ code }: { code: number }) {
  const is2xx = code >= 200 && code < 300;
  const is3xx = code >= 300 && code < 400;
  const is4xx = code >= 400 && code < 500;

  const variant = is2xx ? "green" : is3xx ? "orange" : is4xx ? "gray" : "no";

  return (
    <ColorBadge
      variant={variant}
      className="font-mono text-[11px] font-semibold border"
    >
      {code}
    </ColorBadge>
  );
}


// ─── Method badge ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  const variant: React.ComponentProps<typeof ColorBadge>["variant"] =
    m === "GET"
      ? "gray"
      : m === "POST"
      ? "blue"
      : m === "PUT" || m === "PATCH"
      ? "orange"
      : m === "DELETE"
      ? "no"
      : "gray";

  return (
    <ColorBadge
      variant={variant}
      className="font-mono text-[11px] font-semibold border"
    >
      {m}
    </ColorBadge>
  );
}

// ─── Validation error rows ────────────────────────────────────────────────────

function ValidationParamRow({
  name,
  location,
  message,
}: {
  name: string;
  location: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xs border border-rose-200/70 bg-rose-50/60 px-3 py-2 dark:border-rose-800/40 dark:bg-rose-900/10">
      <span className="min-w-0 flex-1 break-all font-mono text-[12px] font-medium text-neutral-800 dark:text-neutral-dark-950">
        {name}
      </span>
      <span className="shrink-0 rounded-xs bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
        {location}
      </span>
      <span className="shrink-0 text-[11px] text-neutral-500 dark:text-neutral-dark-500">
        {message}
      </span>
    </div>
  );
}

// ─── Stack trace ──────────────────────────────────────────────────────────────

function StackTrace({ stack }: { stack: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = stack.split("\n");
  const visible = expanded ? lines : lines.slice(0, 4);

  return (
    <div>
      <DetailCodeBlock>
        {visible.map((line, i) => (
          <span
            key={i}
            className={`block ${
              i === 0
                ? "text-rose-500 dark:text-rose-400"
                : "text-neutral-500 dark:text-neutral-dark-500"
            }`}
          >
            {line}
          </span>
        ))}
      </DetailCodeBlock>
      {lines.length > 4 && (
        <button
          type="button"
          className="mt-1.5 text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : `Show ${lines.length - 4} more lines`}
        </button>
      )}
    </div>
  );
}

// ─── User value ───────────────────────────────────────────────────────────────

function UserFieldValue(u: { id?: string; value?: string } | null): React.ReactNode {
  if (!u) return null;
  const display = u.value ?? u.id;
  if (!display) return null;

  const avatar = (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
      {u.value ? getInitials(u.value) : "U"}
    </div>
  );

  if (u.id && u.value) {
    return (
      <div className="flex items-center gap-2">
        {avatar}
        <Link
          to={`/users/${u.id}/profile`}
          className="font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          {u.value}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {avatar}
      <span className="font-medium text-neutral-900 dark:text-neutral-dark-950">{display}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const LogDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeMainTab, setActiveMainTab] = useState<
    "request" | "response" | "payloads"
  >("request");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");

  const {
    data: log,
    isLoading,
    isError,
    error,
  } = useLogDetailQuery(id);
  const activeDetailTabLabel =
    activeMainTab === "request"
      ? "Request"
      : activeMainTab === "response"
        ? "Response"
        : "Payloads";
  useDetailBreadcrumb(
    log ? breadcrumbLabelForRoute(log.route) : null,
    activeDetailTabLabel,
  );

  const detailErrorMessage = error
    ? logsApiErrorMessage(error)
    : "This log entry was not found.";

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Log Details"
        tabCount={3}
      />
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !log) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Log not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/logs")}>
              Back to logs
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  // ── Data helpers ─────────────────────────────────────────────────────────
  const routeTitle = log.route?.trim() || "-";
  const userObj =
    log.user && typeof log.user === "object"
      ? (log.user as { id?: string; value?: string })
      : null;

  const hasRequestSection =
    isNonEmptyString(log.id) ||
    isNonEmptyString(log.request_id) ||
    isNonEmptyString(log.method) ||
    isNonEmptyString(log.route) ||
    log.status_code != null;

  const hasTargetSection =
    isNonEmptyString(log.target_type) ||
    isNonEmptyString(log.target_id) ||
    isNonEmptyString(log.action);

  const hasActorSection =
    hasActorUser(userObj) || isNonEmptyPlainObject(log.device_info);

  // Validation params nested inside response_body.details.parameters
  const validationParams: Array<{ name: string; location: string; message: string }> =
    getValidationParamsFromResponseBody(log.response_body);

  // Top-level response body fields, strip "details" since we render it separately
  const responseBodyTopLevel =
    isNonEmptyPlainObject(log.response_body)
      ? Object.fromEntries(
          Object.entries(log.response_body).filter(([k]) => k !== "details")
        )
      : null;

  const errObj = log.errors as
    | { message?: string; name?: string; stack?: string }
    | null
    | undefined;

  const requestBodyLike =
    log.body ?? log.request_body ?? log.request;

  // Hero stats
  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (log.created_at) {
    heroStats.push({ label: "Stored at", value: formateDateTime(log.created_at) });
  }
  if (typeof log.status_code === "number") {
    heroStats.push({ label: "Status", value: <StatusBadge code={log.status_code} /> });
  }
  if (isNonEmptyString(log.method)) {
    heroStats.push({ label: "Method", value: <MethodBadge method={log.method} /> });
  }
  const detailTabs: DetailSideNavItem[] = [
    { key: "request", label: "Request", icon: Pointer },
    { key: "response", label: "Response", icon: MessageSquareReply },
    { key: "payloads", label: "Payloads", icon: SquareArrowDown },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: navIcons.logs,
          title: routeTitle,
          subtitle: log.method || undefined,
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as "request" | "response" | "payloads")
            }
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Log Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as "request" | "response" | "payloads")
            }
          />
        }
        header={
          <DetailHero
            icon={navIcons.logs}
            title={routeTitle}
            titleClassName="break-words text-xs font-normal leading-relaxed text-neutral-600 dark:text-neutral-dark-600 sm:text-sm md:text-[13px]"
            subtitle={
              log.method ? (
                <span className="font-normal text-neutral-500 dark:text-neutral-dark-500">
                  {log.method}
                </span>
              ) : undefined
            }
            stats={heroStats}
            className="rounded-none border-x-0 border-t-0 shadow-none"
          />
        }
      >
        <DetailContentArea>
        {activeMainTab === "request" && (
        <DetailSectionsGrid maxColumns={2}>

          {/* ── Request ───────────────────────────────────────────────── */}
          {hasRequestSection && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={Globe}
                title="Request"
                description="Method, route, and identifiers"
              />
              <DetailFieldGrid>
                <DetailField
                  label="Log ID"
                  value={
                    isNonEmptyString(log.id) ? (
                      <span className="break-all font-mono text-xs">{log.id}</span>
                    ) : null
                  }
                />
                <DetailField
                  label="Request ID"
                  value={
                    isNonEmptyString(log.request_id) ? (
                      <span className="break-all font-mono text-xs">{log.request_id}</span>
                    ) : null
                  }
                />
                <DetailField
                  label="Method"
                  value={
                    isNonEmptyString(log.method) ? (
                      <MethodBadge method={log.method} />
                    ) : null
                  }
                />
                <DetailField
                  label="Route"
                  value={
                    isNonEmptyString(log.route) ? (
                      <span className="break-all font-mono text-xs">{log.route}</span>
                    ) : null
                  }
                />
                <DetailField
                  label="Status code"
                  value={
                    typeof log.status_code === "number" ? (
                      <StatusBadge code={log.status_code} />
                    ) : null
                  }
                />
              </DetailFieldGrid>
            </DetailSectionCard>
          )}

          {/* ── Target & action ───────────────────────────────────────── */}
          {hasTargetSection && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={Target}
                title="Target & action"
                description="Audit target and operation"
              />
              <DetailFieldGrid>
                <DetailField label="Target type" value={log.target_type} />
                <DetailField
                  label="Target ID"
                  value={
                    isNonEmptyString(log.target_id) ? (
                      <span className="break-all font-mono text-xs">{log.target_id}</span>
                    ) : null
                  }
                />
                <DetailField label="Action" value={log.action} />
              </DetailFieldGrid>
            </DetailSectionCard>
          )}

          {/* ── Actor ─────────────────────────────────────────────────── */}
          {hasActorSection && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={User}
                title="Actor"
                description="User and client device"
              />

              {hasActorUser(userObj) && (
                <DetailFieldGrid>
                  <DetailField label="User" value={UserFieldValue(userObj)} />
                </DetailFieldGrid>
              )}

              {isNonEmptyPlainObject(log.device_info) && (
                <div className={hasActorUser(userObj) ? "mt-3" : ""}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                    Device info
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(log.device_info).map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xs border-neutral-200/90 bg-neutral-50/80 px-2.5 py-2 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/20"
                      >
                        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-500">
                          {k.replace(/_/g, " ")}
                        </p>
                        <p className="break-all font-mono text-[11px] leading-snug text-neutral-800 dark:text-neutral-dark-950">
                          {String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DetailSectionCard>
          )}

          {/* ── Response body ─────────────────────────────────────────── */}
        </DetailSectionsGrid>
        )}

        {activeMainTab === "response" && (
        <DetailSectionsGrid maxColumns={2}>
          {hasPresentPayload(log.response_body) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Response body"
                description="Payload returned by the server"
              />

              {/* Top-level scalar fields */}
              {isNonEmptyPlainObject(responseBodyTopLevel) && (
                <DetailFieldGrid>
                  {Object.entries(responseBodyTopLevel).map(([k, v]) => (
                    <DetailField
                      key={k}
                      label={k.replace(/_/g, " ")}
                      value={
                        typeof v === "boolean" ? (
                          <span
                            className={
                              v
                                ? "font-medium text-emerald-700 dark:text-emerald-400"
                                : "font-medium text-rose-700 dark:text-rose-400"
                            }
                          >
                            {String(v)}
                          </span>
                        ) : typeof v === "number" ? (
                          <span className="font-mono text-xs">{v}</span>
                        ) : typeof v === "object" ? (
                          <DetailCodeBlock className="mt-1">
                            {JSON.stringify(v, null, 2)}
                          </DetailCodeBlock>
                        ) : (
                          String(v)
                        )
                      }
                    />
                  ))}
                </DetailFieldGrid>
              )}

              {/* Validation parameters */}
              {validationParams.length > 0 && (
                <div className={isNonEmptyPlainObject(responseBodyTopLevel) ? "mt-3" : ""}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                    Invalid parameters ({validationParams.length})
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {validationParams.map((p, i) => (
                      <ValidationParamRow
                        key={i}
                        name={p.name}
                        location={p.location}
                        message={p.message}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: completely unknown shape */}
              {validationParams.length === 0 &&
                !isNonEmptyPlainObject(responseBodyTopLevel) && (
                  <DetailCodeBlock>
                    {JSON.stringify(log.response_body, null, 2)}
                  </DetailCodeBlock>
                )}
            </DetailSectionCard>
          )}

          {/* ── Errors ────────────────────────────────────────────────── */}
          {hasPresentPayload(log.errors) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={AlertCircle}
                title="Error"
                description="Exception details"
              />

              {/* Message banner */}
              {errObj?.message && (
                <div className="mb-3 rounded-xs border border-rose-200/80 bg-rose-50/60 px-3 py-2.5 dark:border-rose-800/40 dark:bg-rose-900/10">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
                    <div className="min-w-0">
                      {errObj.name && (
                        <p className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                          {errObj.name}
                        </p>
                      )}
                      <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                        {errObj.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stack trace */}
              {errObj?.stack && (
                <DetailFieldFull
                  label="Stack trace"
                  value={<StackTrace stack={errObj.stack} />}
                />
              )}

              {/* Fallback: unknown error shape */}
              {!errObj?.message && !errObj?.stack && isNonEmptyPlainObject(log.errors) && (
                <DetailKeyValueTable data={log.errors as Record<string, unknown>} />
              )}
            </DetailSectionCard>
          )}

          {/* ── Old data ──────────────────────────────────────────────── */}
        </DetailSectionsGrid>
        )}

        {activeMainTab === "payloads" && (
        <DetailSectionsGrid maxColumns={1}>
          {hasPresentPayload(log.old_data) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Old data"
                description="State before the change"
              />
              {isNonEmptyPlainObject(log.old_data) ? (
                <DetailKeyValueTable data={log.old_data} />
              ) : (
                <DetailCodeBlock>{JSON.stringify(log.old_data, null, 2)}</DetailCodeBlock>
              )}
            </DetailSectionCard>
          )}

          {/* ── Modified properties ───────────────────────────────────── */}
          {hasPresentPayload(log.modified_properties) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Modified properties"
                description="Fields that changed"
              />
              {isNonEmptyPlainObject(log.modified_properties) ? (
                <DetailKeyValueTable data={log.modified_properties} />
              ) : (
                <DetailCodeBlock>
                  {JSON.stringify(log.modified_properties, null, 2)}
                </DetailCodeBlock>
              )}
            </DetailSectionCard>
          )}

          {/* ── Request body ──────────────────────────────────────────── */}
          {hasPresentPayload(requestBodyLike) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Request body"
                description="Payload sent with the request"
              />
              {isNonEmptyPlainObject(requestBodyLike) ? (
                <DetailKeyValueTable data={requestBodyLike as Record<string, unknown>} />
              ) : (
                <DetailCodeBlock>
                  {JSON.stringify(requestBodyLike, null, 2)}
                </DetailCodeBlock>
              )}
            </DetailSectionCard>
          )}

          {/* ── Params ──────────────────────────────────────────────── */}
          {hasPresentPayload(log.params) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Params"
                description="Route params sent with the request"
              />
              {isNonEmptyPlainObject(log.params) ? (
                <DetailKeyValueTable data={log.params as Record<string, unknown>} />
              ) : (
                <DetailCodeBlock>
                  {JSON.stringify(log.params, null, 2)}
                </DetailCodeBlock>
              )}
            </DetailSectionCard>
          )}

          {/* ── Query ──────────────────────────────────────────────── */}
          {hasPresentPayload(log.query) && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={FileJson}
                title="Query"
                description="Query parameters sent with the request"
              />
              {isNonEmptyPlainObject(log.query) ? (
                <DetailKeyValueTable data={log.query as Record<string, unknown>} />
              ) : (
                <DetailCodeBlock>
                  {JSON.stringify(log.query, null, 2)}
                </DetailCodeBlock>
              )}
            </DetailSectionCard>
          )}

        </DetailSectionsGrid>
        )}
        </DetailContentArea>
      </DetailPageShell>
    </DetailPageBackground>
  );
};

export default LogDetail;
