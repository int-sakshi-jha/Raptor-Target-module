import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
  DetailCodeBlock,
  DetailContentArea,
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailKeyValueTable,
  DetailLinkValue,
  DetailMetaBadge,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailPageShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailStatusBadge,
  DetailTopicColumns,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";

import DeviceForm from "@/components/core/form/DeviceForm";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { getErrorMessage } from "@/services/api";
import {
  useDeleteDeviceMutation,
  useGetDeviceDetailsQuery,
  useToggleDeviceStatusMutation,
  type Device,
} from "@/services/operations/deviceAPI";
import { useAppSelector } from "@/store/hooks";
import { formateDateTime } from "@/utils/gridFormatters";
import {
  hasPermission,
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
  PERMISSIONS,
} from "@/utils/permissions";
import {
  BadgeCheck,
  Building2,
  Component,
  Code2,
  Cpu,
  CodeXml,
  Edit,
  Fingerprint,
  KeyRound,
  ListTree,
  MapPin,
  MessageSquareQuote,
  Power,
  Radio,
  Server,
  SearchCheck,
  ShieldCheck,
  TextSearch,
  Trash2,
  Wifi,
  Info,
} from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { typeIcon } from "@/pages/plant/plant-components/shared";
import { DetailComponentCard } from "@/components/core/detail/DetailPagePrimitives";

const DEVICE_DETAIL_FIELD_KEYS = new Set([
  "id",
  "tenant_id",
  "plant_id",
  "device_type",
  "device_name",
  "serial_number",
  "mac_address",
  "imei",
  "model_code",
  "manufacturer",
  "client_id",
  "username",
  "password",
  "config_json",
  "topics",
  "data_interval_seconds",
  "external_client_id",
  "external_vd_tag_name",
  "external_username",
  "external_broker_url",
  "external_password",
  "last_seen_at",
  "last_data",
  "last_heartbeat_at",
  "ip_address",
  "is_active",
  "is_online",
  "is_default_config",
  "health_vd",
  "health_tag_template_name",
  "tag_map",
  "share_component_map",
  "dynamic_component_map",
  "tag_template_tag_map",
  "share_component_tag_template_tag_map",
  "warranty_start_date",
  "warranty_end_date",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

const canShowDetailField = (field: string) => DEVICE_DETAIL_FIELD_KEYS.has(field);

const renderJsonValue = (value: Record<string, unknown> | null | undefined) =>
  JSON.stringify(value ?? null, null, 2);

const EmptyDetailState: React.FC<{
  message: string;
  centered?: boolean;
  minHeightClassName?: string;
}> = ({ message, centered = false, minHeightClassName = "" }) => (
  <div
    className={`rounded-xs border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-dark-500 ${
      centered ? "flex items-center justify-center text-center" : ""
    } ${minHeightClassName}`.trim()}
  >
    {message}
  </div>
);

const DeviceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [activeMainTab, setActiveMainTab] = React.useState<
    "overview" | "topics" | "json" | "audit" | "components"
  >("overview");
  const [activeJsonTab, setActiveJsonTab] = React.useState<
    | "config_json"
    | "last_data"
    | "tag_map"
    | "share_component_map"
    | "dynamic_component_map"
  >("config_json");
  const [expandedComponentId, setExpandedComponentId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  
  const {
    data: deviceResponse,
    isLoading,
    isError,
    error,
    refetch: refetchDeviceDetails,
  } = useGetDeviceDetailsQuery(id);
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isTenantRole = isTenantOrUserRole(userRole);
  const deleteMutation = useDeleteDeviceMutation();
  const toggleStatusMutation = useToggleDeviceStatusMutation();

  const fallbackDevice = React.useMemo(
    () => ((location.state as { device?: Device } | null)?.device ?? null),
    [location.state],
  );
  const topicAliases = React.useMemo(
    () =>
      (deviceResponse?.data?.device?.topics ?? fallbackDevice?.topics ?? []).filter(
        (topic) => typeof topic.topic_name === "string" && topic.topic_name.trim().length > 0,
      ),
    [deviceResponse?.data?.device?.topics, fallbackDevice?.topics],
  );

  const device = deviceResponse?.data?.device ?? fallbackDevice;

  /** Label from device detail payload (`health_tag_template_name`); no separate tag-template request. */
  const healthTagTemplateLabel =
    device?.health_tag_template_name?.trim() ||
    device?.tag_template_name?.trim() ||
    null;
  const detailErrorMessage = error
    ? getErrorMessage(error)
    : "The device you are trying to view does not exist or you don’t have access.";

  const canToggleStatus = hasPermission(
    userPermissions,
    PERMISSIONS.DEVICE.UPDATE,
  );
  const canEdit = hasPermission(userPermissions, PERMISSIONS.DEVICE.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.DEVICE.DELETE);

  const actionButtons = [
    {
      key: "toggle",
      show: canToggleStatus,
      title: device?.is_active ? "Deactivate" : "Activate",
      tone: (device?.is_active ? "success" : "neutral") as
        | "success"
        | "neutral",
      icon: <Power className="w-4 h-4" />,
      onClick: () => {
        if (!device?.id) return;
        toggleStatusMutation.mutate({
          id: device.id,
          is_active: !device.is_active,
        });
      },
    },
    {
      key: "edit",
      show: canEdit,
      title: "Edit",
      tone: "brand" as const,
      icon: <Edit className="w-4 h-4" />,
      onClick: () => {
        setShowEdit(true);
      },
    },
    {
      key: "delete",
      show: canDelete,
      title: "Delete",
      tone: "danger" as const,
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        setConfirmOpen(true);
      },
    },
  ].filter((action) => action.show);

  const hasTopicsSection = canShowDetailField("topics");

  const availableJsonTabs = React.useMemo(
    () =>
      [
        {
          key: "config_json" as const,
          label: "Configuration",
          icon: Code2,
          value: device?.config_json,
        },
        {
          key: "last_data" as const,
          label: "Last Data",
          icon: Radio,
          value: device?.last_data,
        },
        {
          key: "tag_map" as const,
          label: "Tag Map",
          icon: KeyRound,
          value: device?.tag_map,
        },
        {
          key: "share_component_map" as const,
          label: "Shared Components",
          icon: Building2,
          value: device?.share_component_map,
        },
        {
          key: "dynamic_component_map" as const,
          label: "Dynamic Components",
          icon: ListTree,
          value: device?.dynamic_component_map,
        },
      ].filter((tab) => canShowDetailField(tab.key)),
    [
      device?.config_json,
      device?.last_data,
      device?.tag_map,
      device?.share_component_map,
      device?.dynamic_component_map,
    ],
  );

  const activeJsonSource = React.useMemo(
    () =>
      availableJsonTabs.find((tab) => tab.key === activeJsonTab) ??
      availableJsonTabs[0] ??
      null,
    [activeJsonTab, availableJsonTabs],
  );

  React.useEffect(() => {
    if (availableJsonTabs.length === 0) return;
    if (!availableJsonTabs.some((tab) => tab.key === activeJsonTab)) {
      setActiveJsonTab(availableJsonTabs[0].key);
    }
  }, [activeJsonTab, availableJsonTabs]);

  React.useEffect(() => {
    const allowedTabs: Array<"overview" | "topics" | "json" | "audit" | "components"> = [
      "overview",
      ...(hasTopicsSection ? ["topics" as const] : []),
      ...(availableJsonTabs.length > 0 ? ["json" as const] : []),
      "audit",
      "components",
    ];
    if (!allowedTabs.includes(activeMainTab)) {
      setActiveMainTab("overview");
    }
  }, [
    activeMainTab,
    availableJsonTabs.length,
    hasTopicsSection,
  ]);
  const activeDetailTabLabel =
    activeMainTab === "overview"
      ? "Overview"
      : activeMainTab === "topics"
        ? "Topics"
        : activeMainTab === "json"
          ? "JSON Explorer"
          : activeMainTab === "components"
            ? "Components"
            : "Audit Information";
  useDetailBreadcrumb(
    device?.device_name || device?.serial_number || null,
    activeDetailTabLabel,
  );

  if (isLoading && !device) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Device Details"
        tabCount={5}
      />
    );
  }

  if (isError && !device) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-sm border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Device not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/devices")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  if (!device) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Device not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              The device you are trying to view does not exist or you don’t have
              access.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/devices")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const heroTitle =
    device.device_name || device.serial_number || "Device";
  const heroSubtitle = [
    device.manufacturer,
    device.model_code,
  ]
    .filter(Boolean)
    .join(" · ");

  const heroBadges = (
    <>
      {device.device_type ? (
        <DetailMetaBadge>
          <Cpu className="mr-1.5 h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          {device.device_type}
        </DetailMetaBadge>
      ) : null}
      {device.serial_number ? (
        <DetailMetaBadge>
          <Fingerprint className="mr-1.5 h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          S/N {device.serial_number}
        </DetailMetaBadge>
      ) : null}
      {(device.plant_name || device.plant_id) ? (
        <DetailMetaBadge>
          <MapPin className="mr-1.5 h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          {device.plant_name || device.plant_id}
        </DetailMetaBadge>
      ) : null}
      {(device.tenant_name || device.tenant_id) ? (
        <DetailMetaBadge>
          <Building2 className="mr-1.5 h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          {device.tenant_name || device.tenant_id}
        </DetailMetaBadge>
      ) : null}
      {device.mac_address ? (
        <DetailMetaBadge>
          <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          MAC {device.mac_address}
        </DetailMetaBadge>
      ) : null}
    </>
  );

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (device.is_active != null) {
    heroStats.push({
      label: "Record status",
      value: (
        <DetailStatusBadge active={device.is_active} />
      ),
    });
  }
  if (device.is_online != null) {
    heroStats.push({
      label: "Connectivity",
      value: (
        <span
          className={
            device.is_online
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-neutral-400"
          }
        >
          {device.is_online ? "Online" : "Offline"}
        </span>
      ),
    });
  }
  if (device.last_seen_at) {
    heroStats.push({
      label: "Last seen",
      value: formateDateTime(device.last_seen_at),
    });
  }
  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: TextSearch },
    ...(hasTopicsSection
      ? [{ key: "topics", label: "Topics", icon: MessageSquareQuote }]
      : []),
    ...(availableJsonTabs.length > 0
      ? [{ key: "json", label: "JSON Explorer", icon: CodeXml }]
      : []),
    { key: "components", label: "Components", icon: Component },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  const setMainTab = (key: string) =>
    setActiveMainTab(
      key as "overview" | "topics" | "json" | "audit" | "components",
    );

  const heroHeader = (
    <DetailHero
      icon={Server}
      title={heroTitle}
      subtitle={heroSubtitle || null}
      badges={heroBadges}
      stats={heroStats.length > 0 ? heroStats : undefined}
      className="rounded-none border-x-0 border-t-0 shadow-none"
      mobileSummaryHandled
      actions={
        actionButtons.length > 0 ? (
          <>
            {actionButtons.map((action) => (
              <DetailHeaderActionButton
                key={action.key}
                title={action.title}
                icon={action.icon}
                onClick={action.onClick}
                tone={action.tone}
                disabled={
                  deleteMutation.isPending || toggleStatusMutation.isPending
                }
              />
            ))}
          </>
        ) : undefined
      }
    />
  );

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: Server,
          title: heroTitle,
          subtitle: heroSubtitle || undefined,
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={setMainTab}
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Device Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={setMainTab}
          />
        }
        header={heroHeader}
      >
        <DetailContentArea>
        {activeMainTab === "overview" && (
          <DetailSectionsGrid maxColumns={2}>
            <DetailSectionCard>
              <DetailSectionHeader
                icon={Info}
                title="Basic Information"
                description="Core identity, classification, and ownership details"
              />
              <DetailFieldGrid>
                <DetailField hideWhenEmpty={false} label="Device Name" value={device.device_name} />
                <DetailField hideWhenEmpty={false} label="Device Type" value={device.device_type} />
                <DetailField hideWhenEmpty={false} label="Serial Number" value={device.serial_number} />
                <DetailField hideWhenEmpty={false} label="IMEI" value={device.imei} />
                <DetailField hideWhenEmpty={false} label="MAC Address" value={device.mac_address} />
                <DetailField hideWhenEmpty={false} label="Model Code" value={device.model_code} />
                <DetailField hideWhenEmpty={false} label="Manufacturer" value={device.manufacturer} />
                <DetailField
                  hideWhenEmpty={false}
                  label="Plant"
                  value={
                    !isTenantRole && device.plant_id ? (
                      <Link
                        to={`/plants/${device.plant_id}`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {device.plant_name || device.plant_id}
                      </Link>
                    ) : (
                      device.plant_name || device.plant_id
                    )
                  }
                />
                <DetailField
                  hideWhenEmpty={false}
                  label="Tenant"
                  value={
                    !isTenantRole && device.tenant_id ? (
                      <Link
                        to={`/tenants/${device.tenant_id}`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {device.tenant_name || device.tenant_id}
                      </Link>
                    ) : (
                      device.tenant_name || device.tenant_id
                    )
                  }
                />
                <DetailField
                  hideWhenEmpty={false}
                  label="Status"
                  value={
                    device.is_active == null ? null : (
                      <DetailStatusBadge active={device.is_active} />
                    )
                  }
                />
              </DetailFieldGrid>
            </DetailSectionCard>
            {isAdminOrSuperAdminRole(userRole) && (

            <DetailSectionCard>
              <DetailSectionHeader
                icon={Wifi}
                title="Access & Network"
                description="Connectivity parameters and security credentials"
              />
              <DetailFieldGrid>
                <DetailField hideWhenEmpty={false} label="Client ID" value={device.client_id} />
                <DetailField hideWhenEmpty={false} label="Username" value={device.username} />
                <DetailField hideWhenEmpty={false} label="Password" value={device.password} />
                <DetailField hideWhenEmpty={false} label="IP Address" value={device.ip_address} />
                <DetailField
                  hideWhenEmpty={false}
                  label="Data Interval"
                  value={device.data_interval_seconds != null ? `${device.data_interval_seconds} sec` : null}
                />
                <DetailField hideWhenEmpty={false} label="External Client ID" value={device.external_client_id} />
                <DetailField hideWhenEmpty={false} label="External Username" value={device.external_username} />
                <DetailField hideWhenEmpty={false} label="External Password" value={device.external_password} />
                <DetailField hideWhenEmpty={false} label="External VD Tag" value={device.external_vd_tag_name} />
                <DetailField
                  hideWhenEmpty={false}
                  label="External URL"
                  value={<DetailLinkValue href={device.external_broker_url} />}
                />
              </DetailFieldGrid>
            </DetailSectionCard>
            )}

            <DetailSectionCard span="full">
              <DetailSectionHeader
                icon={ShieldCheck}
                title="Health & Connectivity"
                description="Operational status and heartbeat diagnostics"
              />
              <DetailFieldGrid>

                <DetailField hideWhenEmpty={false} label="Connectivity" value={device.is_online ? "Online" : "Offline"} />
                <DetailField hideWhenEmpty={false} label="Default Config" value={device.is_default_config ? "Yes" : "No"} />
                <DetailField hideWhenEmpty={false} label="Last Seen" value={device.last_seen_at ? formateDateTime(device.last_seen_at) : null} />
                <DetailField hideWhenEmpty={false} label="Health VD" value={device.health_vd != null ? String(device.health_vd) : null} />
                <DetailField
                  hideWhenEmpty={false}
                  label="Health Template"
                  value={
                    healthTagTemplateLabel != null
                      ? (device.health_tag_template_id ? (
                          <Link
                            to={`/tag-templates/${device.health_tag_template_id}`}
                            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                          >
                            {healthTagTemplateLabel}
                          </Link>
                        ) : (
                          healthTagTemplateLabel
                        ))
                      : null
                  }
                />
              </DetailFieldGrid>
            </DetailSectionCard>
          </DetailSectionsGrid>
        )}



        {activeMainTab === "topics" && hasTopicsSection && (
          <DetailSectionsGrid maxColumns={2}>
            <DetailSectionCard>
              <DetailSectionHeader icon={Radio} title="Topic Routes" description="MQTT messaging paths and data routing" />
              {(device.topics?.length ?? 0) > 0 ? (
                <DetailTopicColumns topics={device.topics ?? []} />
              ) : (
                <EmptyDetailState
                  message="No topics available."
                  centered
                  minHeightClassName="min-h-[9rem]"
                />
              )}
            </DetailSectionCard>
            <DetailSectionCard>
              <DetailSectionHeader icon={ListTree} title="Topic Aliases" description="Human-readable labels for MQTT data points" />
              {topicAliases.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topicAliases.map((topic) => (
                    <DetailMetaBadge key={`${topic.topic_name}-${topic.topic}`}>
                      {topic.topic_name}
                    </DetailMetaBadge>
                  ))}
                </div>
              ) : (
                <EmptyDetailState
                  message="No topic aliases found."
                  centered
                  minHeightClassName="min-h-[9rem]"
                />
              )}
            </DetailSectionCard>
            <DetailSectionCard span="full">
              <DetailSectionHeader icon={Radio} title="External Topics" description="Public-facing MQTT messaging channels" />
              {(device.external_topics?.length ?? 0) > 0 ? (
                <DetailTopicColumns topics={device.external_topics ?? []} />
              ) : (
                <EmptyDetailState
                  message="No external topics available."
                  centered
                  minHeightClassName="min-h-[9rem]"
                />
              )}
            </DetailSectionCard>
          </DetailSectionsGrid>
        )}

        {activeMainTab === "json" && availableJsonTabs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[15rem_minmax(0,1fr)]">
            <DetailSectionCard className="xl:sticky xl:top-3 xl:self-start">
              <DetailSectionHeader icon={Code2} title="JSON Sources" description="Available structured data payload categories" />
              <div className="flex flex-col gap-2">
                {availableJsonTabs.map((tab) => {
                  const active = activeJsonTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveJsonTab(tab.key)}
                      className={`rounded-xs border px-3 py-2 text-left transition-all ${
                        active
                          ? "border-brand-500/35 bg-brand-500/10 text-brand-700 shadow-sm dark:border-brand-400/35 dark:bg-brand-500/16 dark:text-brand-300"
                          : "border-neutral-200/70 bg-neutral-0 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-dark-300/45 dark:bg-neutral-dark-100 dark:text-neutral-dark-900 dark:hover:bg-neutral-dark-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {tab.label}
                        </span>
                        {active ? (
                          <span className="rounded-xs bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-500/16 dark:text-brand-300">
                            Open
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </DetailSectionCard>

            <DetailSectionCard className="min-h-[26rem]">
              <DetailSectionHeader icon={activeJsonSource?.icon ?? Code2} title="JSON Inspector" description="Live structured record payload explorer" />
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-3 rounded-xs border border-neutral-200/90 bg-neutral-50/80 px-3 py-2 dark:border-neutral-dark-300/55 dark:bg-neutral-dark-200/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                      {activeJsonSource?.label ?? "JSON Source"}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-dark-500">
                      Structured device payload
                    </p>
                  </div>
                </div>

                <DetailCodeBlock className="min-h-[22rem] max-h-[min(36rem,72vh)] flex-1 bg-neutral-50/70 text-neutral-800 dark:bg-neutral-dark-200/35 dark:text-neutral-dark-900">
                  {renderJsonValue(
                    activeJsonSource?.value as
                      | Record<string, unknown>
                      | null
                      | undefined,
                  )}
                </DetailCodeBlock>
              </div>
            </DetailSectionCard>
          </div>
        )}

        {activeMainTab === "audit" && (
          <DetailSectionsGrid maxColumns={1}>
            <DetailSectionCard>
              <DetailSectionHeader
                icon={SearchCheck}
                title="Audit Information"
                description="Authorship, timeline, and record lifecycle details"
              />
              <DetailFieldGrid>
                {isAdminOrSuperAdminRole(userRole) && (
                  <>
                <DetailField
                  hideWhenEmpty={false}
                  label="Created By"
                  value={
                    device.created_by ? (
                      <Link
                        to={`/users/${device.created_by}/profile`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {device.created_by_name || device.created_by}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
               
                <DetailField
                  hideWhenEmpty={false}
                  label="Updated By"
                  value={
                    device.updated_by ? (
                      <Link
                        to={`/users/${device.updated_by}/profile`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {device.updated_by_name || device.updated_by}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />         
                </>
                 )}
                <DetailField
                  hideWhenEmpty={false}
                  label="Created At"
                  value={device.created_at ? formateDateTime(device.created_at) : null}
                />
                {isAdminOrSuperAdminRole(userRole) && (
                  <DetailField
                    hideWhenEmpty={false}
                    label="Updated At"
                    value={device.updated_at ? formateDateTime(device.updated_at) : null}
                  />
                )}
              </DetailFieldGrid>
            </DetailSectionCard>
          </DetailSectionsGrid>
        )}

        {activeMainTab === "components" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {(deviceResponse?.data?.components ?? []).map((comp) => (
                <DetailComponentCard
                  key={comp.id}
                  name={comp.component_name}
                  type={comp.component_type}
                  code={comp.component_code}
                  status={comp.is_active != null ? comp.is_active : comp.status}
                  icon={typeIcon(comp.component_type, "h-5 w-5")}
                  expanded={expandedComponentId === comp.id}
                  onToggle={() =>
                    setExpandedComponentId(
                      expandedComponentId === comp.id ? null : comp.id,
                    )
                  }
                  onViewDetails={() => navigate(`/components/${comp.id}`)}
                >
                  <DetailFieldGrid>
                    <DetailField centered label="Serial Number" value={comp.serial_number} />
                    <DetailField
                      centered
                      label="Parent Component"
                      value={comp.parent_component_name || comp.parent_component_code}
                    />
                    <DetailField
                      centered
                      label="Inverter Type"
                      value={comp.inverter_type_name || comp.inverter_type_code}
                    />
                    <DetailField
                      centered
                      label="AC Capacity"
                      value={comp.ac_capacity_kw ? `${comp.ac_capacity_kw} kW` : null}
                    />
                    <DetailField
                      centered
                      label="DC Capacity"
                      value={comp.dc_capacity_kw ? `${comp.dc_capacity_kw} kW` : null}
                    />
                    <DetailField centered label="Meter Type" value={comp.meter_type} />
                    <DetailField centered label="VD Number" value={comp.vd_number} />
                  </DetailFieldGrid>

                  {comp.tag_template_tag_map && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                        Tag Map
                      </h5>
                      <DetailKeyValueTable data={comp.tag_template_tag_map} />
                    </div>
                  )}

                  {comp.share_component_tag_template_tag_map && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                        Shared Tag Map
                      </h5>
                      <DetailKeyValueTable data={comp.share_component_tag_template_tag_map} />
                    </div>
                  )}
                </DetailComponentCard>
              ))}
              {(deviceResponse?.data?.components ?? []).length === 0 && (
                <div className="col-span-full">
                  <EmptyDetailState
                    message="No components associated with this device."
                    centered
                    minHeightClassName="min-h-[12rem]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        </DetailContentArea>
      </DetailPageShell>

      {/* Only mount while editing so the portaled slide Modal is not left in the DOM when closed (avoids invisible hit targets). */}
      {showEdit && (
        <Modal
          open
          onClose={() => {
            setShowEdit(false);
          }}
          title="Edit Device"
          subtitle={device?.device_name || "Update device details"}
          icon={navIcons.devices}
          maxWidth="max-w-4xl"
        >
          {device && canEdit && (
            <DeviceForm
              mode="edit"
              initialValues={device}
              editValues={deviceResponse?.data?.device}
              onSuccess={async () => {
                try {
                  await refetchDeviceDetails();
                } finally {
                  setShowEdit(false);
                }
              }}
            />
          )}
        </Modal>
      )}

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!device?.id) return;
          try {
            await deleteMutation.mutateAsync([device.id]);
            setConfirmOpen(false);
            navigate("/devices");
          } catch {
            // handled by mutation
          }
        }}
        title="Delete Device"
        message="Are you sure you want to delete this device? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default DeviceDetails;
