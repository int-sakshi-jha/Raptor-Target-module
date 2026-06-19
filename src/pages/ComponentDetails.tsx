import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import BoolBadge from "@/components/common/BoolBadge";
import ColorBadge from "@/components/common/ColorBadge";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailContentArea,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailPageShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailStatusBadge,
  DetailCodeBlock,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";

import ComponentForm from "@/components/core/form/ComponentForm";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { getErrorMessage } from "@/services/api";
import {
  isComponentDeleteChildrenConflict,
  isComponentStatusChildrenConflict,
  useDeleteComponentMutation,
  useGetComponentDetailsQuery,
  useToggleComponentStatusMutation,
  type ComponentRow,
} from "@/services/operations/componentAPI";
import {
  formatComponentTypeLabel,
} from "@/utils/componentFormatters";
import { useAppSelector } from "@/store/hooks";
import { formateDateTime } from "@/utils/gridFormatters";
import {
  hasPermission,
  isAdminOrSuperAdminRole,
  isTenantOrUserRole,
  PERMISSIONS,
} from "@/utils/permissions";
import {
  Edit,
  FolderCog,
  Info,
  Power,
  SearchCheck,
  Settings,
  TextSearch,
  Trash2,
  Braces,
  Code2,
  CodeXml,
  ShieldCheck,
} from "lucide-react";
import { createHeroIcon } from "./plant/plant-components/shared";

const renderJsonValue = (value: Record<string, unknown> | null | undefined) =>
  JSON.stringify(value ?? null, null, 2);

const ComponentDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [activeMainTab, setActiveMainTab] = React.useState<
    "overview" | "technical" | "relations" | "json"
  >("overview");
  const [activeJsonTab, setActiveJsonTab] = React.useState<
    "tag_template_tag_map" | "alarm_tag_template_tag_map" | "share_component_tag_template_tag_map"
  >("tag_template_tag_map");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const [deleteNeedsSubtreeConfirm, setDeleteNeedsSubtreeConfirm] =
    React.useState(false);
  const [statusSubtreePrompt, setStatusSubtreePrompt] = React.useState<{
    id: string;
    is_active: boolean;
  } | null>(null);

  const {
    data: componentResponse,
    isLoading,
    isError,
    error,
  } = useGetComponentDetailsQuery(id);
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isTenantOrUser = isTenantOrUserRole(userRole);
  const hidesScopedTagTemplateName = isTenantOrUserRole(userRole);

  const deleteMutation = useDeleteComponentMutation();
  const toggleStatusMutation = useToggleComponentStatusMutation();

  const fallbackComponent = React.useMemo(
    () =>
      ((location.state as { component?: ComponentRow } | null)?.component ?? null),
    [location.state],
  );


  const component = componentResponse?.data ?? fallbackComponent;

  const ComponentIcon = React.useMemo(
    () => createHeroIcon(component?.component_type ?? ""),
    [component?.component_type]
  );

  const parentLabel =
    component?.parent_name ??
    component?.parent_component_name ??
    component?.parent_component_code ??
    null;
  const inverterTypeLabel = (() => {
    const name = component?.inverter_type_name;
    const code = component?.inverter_type_code;
    if (name && code) return `${name} (${code})`;
    if (name) return name;
    if (code) return code;
    return null;
  })();
  const tagTemplateLabel =
    (hidesScopedTagTemplateName ? null : component?.tag_template_name) ?? null;
  const sharedComponentId =
    component?.share_component_id ?? component?.shared_component_id ?? null;
  const sharedComponentType =
    component?.share_component_type ?? component?.shared_component_type ?? null;
  const sharedComponentName =
    component?.share_component_name ?? component?.shared_component_name ?? null;
  const sharedComponentPlantId =
    component?.share_component_plant_id ?? component?.shared_component_plant_id ?? null;
  const sharedComponentPlantName =
    component?.share_component_plant_name ?? component?.shared_component_plant_name ?? null;

  const detailLinkClass =
    "font-medium text-brand-700 hover:underline dark:text-brand-400";

  const detailErrorMessage = error
    ? getErrorMessage(error)
    : "The component you are trying to view does not exist or you don’t have access.";

  const canToggleStatus = hasPermission(
    userPermissions,
    PERMISSIONS.COMPONENT.UPDATE,
  );
  const canEdit = hasPermission(userPermissions, PERMISSIONS.COMPONENT.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.COMPONENT.DELETE);

  const handleToggleStatus = async () => {
    if (!component?.id) return;
    const is_active = !component.is_active;
    try {
      await toggleStatusMutation.mutateAsync({ id: component.id, is_active });
    } catch (e) {
      if (isComponentStatusChildrenConflict(e)) {
        setStatusSubtreePrompt({ id: component.id, is_active });
      }
    }
  };

  const actionButtons = [
    {
      key: "toggle",
      show: canToggleStatus,
      title: component?.is_active ? "Deactivate" : "Activate",
      className: component?.is_active
        ? "p-2 rounded-xs text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
        : "p-2 rounded-xs text-neutral-600 dark:text-neutral-dark-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300 transition-colors",
      icon: <Power className="w-4 h-4" />,
      onClick: () => {
        void handleToggleStatus();
      },
    },
    {
      key: "edit",
      show: canEdit,
      title: "Edit",
      className:
        "p-2 rounded-xs text-brand-700 dark:text-brand-400 hover:bg-brand-600/10 dark:hover:bg-brand-600/15 transition-colors",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => {
        setShowEdit(true);
      },
    },
    {
      key: "delete",
      show: canDelete,
      title: "Delete",
      className:
        "p-2 rounded-xs text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        setDeleteNeedsSubtreeConfirm(false);
        setConfirmOpen(true);
      },
    },
  ].filter((action) => action.show);

  const hasTechnicalDetails =
    component?.identifier != null ||
    component?.meter_type != null ||
    component?.vd_number != null ||
    component?.ac_capacity_kw != null ||
    component?.dc_capacity_kw != null ||
    component?.is_bot_layer_process != null;
  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: TextSearch },
    ...(hasTechnicalDetails
      ? [{ key: "technical", label: "Technical", icon: FolderCog }]
      : []),
    { key: "relations", label: "Audit", icon: SearchCheck },
    ...(isAdminOrSuperAdminRole(userRole) &&
  component &&
  (component.tag_template_tag_map !== undefined ||
    component.share_component_tag_template_tag_map !== undefined)
    ? [{ key: "json" as const, label: "JSON Explorer", icon: CodeXml }]
    : []),

  ];

  const availableJsonTabs = React.useMemo(
    () =>
      [
        {
          key: "tag_template_tag_map" as const,
          label: "Template Tag Map",
          icon: Braces,
          value: component?.tag_template_tag_map,
          show: !hidesScopedTagTemplateName,
        },
        {
          key: "alarm_tag_template_tag_map" as const,
          label: "Alarm Template Tag Map",
          icon: Braces,
          value: component?.alarm_tag_template_tag_map,
          show: true,
        },
        {
          key: "share_component_tag_template_tag_map" as const,
          label: "Shared Template Tag Map",
          icon: ShieldCheck,
          value: component?.share_component_tag_template_tag_map,
          show: true,
        },
      ].filter((tab) => tab.show),
    [
      component?.tag_template_tag_map,
      component?.share_component_tag_template_tag_map,
      hidesScopedTagTemplateName,
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
  const activeDetailTab = detailTabs.find((tab) => tab.key === activeMainTab);

  useDetailBreadcrumb(
    component?.component_name || component?.component_code || null,
    activeDetailTab?.label,
  );

  if (isLoading && !component) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Component Details"
        tabCount={3}
      />
    );
  }

  if (isError && !component) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Component not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/components")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  if (!component) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Component not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              The component you are trying to view does not exist or you don’t have
              access.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/components")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }


  


  const heroTitle =
    component.component_name || component.component_code || "Component";
  
  const TypeBadge = (
    <ColorBadge variant="orange" className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none">
      {formatComponentTypeLabel(component.component_type)}
    </ColorBadge>
  );

  const heroSubtitle = component.plant_name;

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (component.is_active != null) {
    heroStats.push({
      label: "Record status",
      value: <DetailStatusBadge active={component.is_active} />,
    });
  }
 
  if (component.updated_at) {
    heroStats.push({
      label: "Last updated",
      value: formateDateTime(component.updated_at),
    });
  }

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: ComponentIcon,
          title: heroTitle,
          subtitle: (
            <div className="flex items-center gap-2">
              <span className="truncate">{heroSubtitle}</span>
              {TypeBadge}
            </div>
          ),
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as any)
            }
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Component Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as any)
            }
          />
        }
        header={
          <DetailHero
            icon={ComponentIcon}
            title={heroTitle}
            subtitle={heroSubtitle || null}
            badges={TypeBadge}
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
                      tone={
                        action.key === "delete"
                          ? "danger"
                          : action.key === "toggle" && component.is_active
                            ? "success"
                            : action.key === "edit"
                              ? "brand"
                              : "neutral"
                      }
                      disabled={
                        deleteMutation.isPending || toggleStatusMutation.isPending
                      }
                    />
                  ))}
                </>
              ) : undefined
            }
          />
        }
      >
        <DetailContentArea>
        {activeMainTab === "overview" && (
          <DetailSectionsGrid maxColumns={1}>
            <DetailSectionCard>
            <DetailSectionHeader
              icon={Info}
              title="Basic Information"
              description="Core identity, classification, and ownership details"
            />
            <DetailFieldGrid>
              <DetailField
                hideWhenEmpty={false}
                label="Component Name"
                value={component.component_name}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Component Code"
                value={component.component_code}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Identifier"
                value={component.identifier != null ? String(component.identifier) : null}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Component Type"
                value={formatComponentTypeLabel(component.component_type)}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Serial Number"
                value={component.serial_number}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Life Cycle Status"
                value={component.status ? String(component.status).toUpperCase() : null}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Device"
                value={
                  component.device_id ? (
                    <Link
                      to={`/devices/${component.device_id}`}
                      className={detailLinkClass}
                    >
                      {component.device_name || component.device_id}
                    </Link>
                  ) : (
                    component.device_name
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Inverter Type"
                value={
                  component.inverter_type_id ? (
                    <Link
                      to={`/inverter-type/${component.inverter_type_id}`}
                      className={detailLinkClass}
                    >
                      {inverterTypeLabel || component.inverter_type_id}
                    </Link>
                  ) : (
                    inverterTypeLabel
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Tag Template"
                value={
                  hidesScopedTagTemplateName
                    ? null
                    : component.tag_template_id ? (
                        <Link
                          to={`/tag-templates/${component.tag_template_id}`}
                          className={detailLinkClass}
                        >
                          {tagTemplateLabel || component.tag_template_id}
                        </Link>
                      ) : (
                        tagTemplateLabel
                      )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="VD Number"
                value={
                  component.vd_number != null ? String(component.vd_number) : null
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Tenant"
                value={
                  component.tenant_id ? (
                    <Link
                      to={`/tenant/${component.tenant_id}`}
                      className={detailLinkClass}
                    >
                      {component.tenant_name || component.tenant_id}
                    </Link>
                  ) : (
                    component.tenant_name
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Plant"
                value={
                  component.plant_id ? (
                    <Link to={`/plants/${component.plant_id}`} className={detailLinkClass}>
                      {component.plant_name || component.plant_id}
                    </Link>
                  ) : (
                    component.plant_name
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Parent"
                value={
                  component.parent_id ? (
                    <Link
                      to={`/components/${component.parent_id}`}
                      className={detailLinkClass}
                    >
                      {parentLabel || component.parent_id}
                    </Link>
                  ) : (
                    parentLabel
                  )
                }
              />
              <DetailField
                label="Parent component code"
                value={component.parent_component_code}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Shared Component"
                value={
                  sharedComponentId ? (
                    <Link
                      to={`/components/${sharedComponentId}`}
                      className={detailLinkClass}
                    >
                      {sharedComponentName || sharedComponentId}
                    </Link>
                  ) : (
                    sharedComponentName
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Shared Component Type"
                value={sharedComponentType ? formatComponentTypeLabel(sharedComponentType) : null}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Shared Component Plant"
                value={
                  sharedComponentPlantId ? (
                    <Link
                      to={`/plants/${sharedComponentPlantId}`}
                      className={detailLinkClass}
                    >
                      {sharedComponentPlantName || sharedComponentPlantId}
                    </Link>
                  ) : (
                    sharedComponentPlantName
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Shared Component Tag Template"
                value={
                  component.share_component_tag_template_id ? (
                    <Link
                      to={`/tag-templates/${component.share_component_tag_template_id}`}
                      className={detailLinkClass}
                    >
                      {component.share_component_tag_template_name || component.share_component_tag_template_id}
                    </Link>
                  ) : (
                    component.share_component_tag_template_name
                  )
                }
              />
             
              <DetailField
                hideWhenEmpty={false}
                label="Record status"
                value={
                  component.is_active == null ? null : (
                    <DetailStatusBadge active={component.is_active} />
                  )
                }
              />
            </DetailFieldGrid>
          </DetailSectionCard>
          </DetailSectionsGrid>
        )}

        {activeMainTab === "technical" && hasTechnicalDetails && (
          <DetailSectionsGrid maxColumns={1}>
            <DetailSectionCard>
              <DetailSectionHeader
                icon={Settings}
                title="Technical Attributes"
                description="Electrical, sizing, and equipment characteristics"
              />
              <DetailFieldGrid>
                <DetailField
                  hideWhenEmpty={false}
                  label="Meter Type"
                  value={component.meter_type}
                />
                <DetailField
                  hideWhenEmpty={false}
                  label="AC Capacity"
                  value={
                    component.ac_capacity_kw != null
                      ? `${component.ac_capacity_kw} kW`
                      : null
                  }
                />
                <DetailField
                  hideWhenEmpty={false}
                  label="DC Capacity"
                  value={
                    component.dc_capacity_kw != null
                      ? `${component.dc_capacity_kw} kW`
                      : null
                  }
                />
                <DetailField
                  hideWhenEmpty={false}
                  label="Bot Layer Process"
                  value={
                    component.is_bot_layer_process != null ? (
                      <BoolBadge value={component.is_bot_layer_process} />
                    ) : null
                  }
                />
              </DetailFieldGrid>
            </DetailSectionCard>
            
            {component.metadata?.dc_channel && component.metadata.dc_channel.length > 0 && (
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Settings}
                  title="Metadata"
                  description={`Detailed configuration for all ${component.metadata.dc_channel.length} DC channels`}
                />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {component.metadata.dc_channel.map((chan, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col gap-1 p-3 rounded-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-dark-300/20"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">Channel {chan.index}</span>
                        <DetailStatusBadge active={chan.is_active} />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-dark-900">{chan.dc_capacity}</span>
                        <span className="text-[10px] font-medium text-neutral-500">W</span>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSectionCard>
            )}
          </DetailSectionsGrid>
        )}

        {activeMainTab === "relations" && (
          <DetailSectionsGrid maxColumns={1}>
            <DetailSectionCard>
            <DetailSectionHeader
              icon={SearchCheck}
              title="Audit Information"
              description="Authorship, timeline, and record lifecycle details"
            />
            <DetailFieldGrid>
              {(!isTenantOrUser || component.created_by) && (
                <DetailField
                  hideWhenEmpty={false}
                  label="Created By"
                  value={
                    component.created_by ? (
                      <Link
                        to={`/users/${component.created_by}/profile`}
                        className={detailLinkClass}
                      >
                        {component.created_by_name || component.created_by}
                      </Link>
                    ) : null
                  }
                />
              )}
              {(!isTenantOrUser || component.updated_by) && (
                <DetailField
                  hideWhenEmpty={false}
                  label="Updated By"
                  value={
                    component.updated_by ? (
                      <Link
                        to={`/users/${component.updated_by}/profile`}
                        className={detailLinkClass}
                      >
                        {component.updated_by_name || component.updated_by}
                      </Link>
                    ) : null
                  }
                />
              )}
              <DetailField
                hideWhenEmpty={false}
                label="Created At"
                value={
                  component.created_at
                    ? formateDateTime(component.created_at)
                    : null
                }
              />
              {(!isTenantOrUser || component.updated_at) && (
                <DetailField
                  hideWhenEmpty={false}
                  label="Updated At"
                  value={
                    component.updated_at
                      ? formateDateTime(component.updated_at)
                      : null
                  }
                />
              )}
            </DetailFieldGrid>
          </DetailSectionCard>
          </DetailSectionsGrid>
        )}
        {activeMainTab === "json" && availableJsonTabs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[15rem_minmax(0,1fr)]">
            <DetailSectionCard className="xl:sticky xl:top-3 xl:self-start">
              <DetailSectionHeader icon={Code2} title="JSON Sources" description="Available tag map data payload categories" />
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
              <DetailSectionHeader icon={activeJsonSource?.icon ?? Code2} title="JSON Inspector" description="Structured tag map payload explorer" />
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-3 rounded-xs border border-neutral-200/90 bg-neutral-50/80 px-3 py-2 dark:border-neutral-dark-300/55 dark:bg-neutral-dark-200/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                      {activeJsonSource?.label ?? "JSON Source"}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-dark-500">
                      Structured component tag map
                    </p>
                  </div>
                </div>

                <DetailCodeBlock className="min-h-[22rem] max-h-[min(36rem,72vh)] flex-1 bg-neutral-50/70 text-neutral-800 dark:bg-neutral-dark-200/35 dark:text-neutral-dark-900">
                  {renderJsonValue(
                    activeJsonSource?.value as any
                  )}
                </DetailCodeBlock>
              </div>
            </DetailSectionCard>
          </div>
        )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
          open={!!showEdit}
          onClose={() => {
            setShowEdit(false);
          }}
          title="Edit Component"
          subtitle={component.component_name || "Update component details"}
          icon={ComponentIcon}
          maxWidth="max-w-4xl"
        >
          {showEdit && (
            <ComponentForm
              mode="edit"
              initialValues={component}
              editValues={componentResponse?.data ?? component}
              onSuccess={() => {
                setShowEdit(false);
              }}
            />
          )}
        </Modal>

      <ConfirmationDialog
          open={confirmOpen}
          onClose={() => {
            if (deleteMutation.isPending) return;
            setConfirmOpen(false);
            setDeleteNeedsSubtreeConfirm(false);
          }}
          onConfirm={async () => {
            if (!component?.id) return;
            try {
              await deleteMutation.mutateAsync({
                id: component.id,
                is_delete_child: deleteNeedsSubtreeConfirm,
              });
              setConfirmOpen(false);
              setDeleteNeedsSubtreeConfirm(false);
              navigate("/components");
            } catch (e) {
              if (
                !deleteNeedsSubtreeConfirm &&
                isComponentDeleteChildrenConflict(e)
              ) {
                setDeleteNeedsSubtreeConfirm(true);
              }
            }
          }}
          title={
            deleteNeedsSubtreeConfirm
              ? "Delete entire subtree?"
              : "Delete component"
          }
          message={
            deleteNeedsSubtreeConfirm
              ? "This component has child components. Proceeding will permanently delete this component and all nested child components. This cannot be undone."
              : "Are you sure you want to delete this component? This action cannot be undone."
          }
          confirmText={deleteNeedsSubtreeConfirm ? "Delete subtree" : "Delete"}
          cancelText="Cancel"
          type={deleteNeedsSubtreeConfirm ? "warning" : "danger"}
          isLoading={deleteMutation.isPending}
        />

      <ConfirmationDialog
          open={statusSubtreePrompt !== null}
          onClose={() => {
            if (toggleStatusMutation.isPending) return;
            setStatusSubtreePrompt(null);
          }}
          onConfirm={async () => {
            if (!statusSubtreePrompt) return;
            try {
              await toggleStatusMutation.mutateAsync({
                id: statusSubtreePrompt.id,
                is_active: statusSubtreePrompt.is_active,
                is_children_status: true,
              });
              setStatusSubtreePrompt(null);
            } catch {
              // handled by mutation
            }
          }}
          title={
            statusSubtreePrompt?.is_active
              ? "Activate child components?"
              : "Deactivate child components?"
          }
          message={
            statusSubtreePrompt?.is_active
              ? "This component has child components. Activating will set this component and all nested child components to active."
              : "This component has child components. Deactivating will set this component and all nested child components to inactive."
          }
          confirmText={
            statusSubtreePrompt?.is_active ? "Activate all" : "Deactivate all"
          }
          cancelText="Cancel"
          type="warning"
          isLoading={toggleStatusMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default ComponentDetails;
