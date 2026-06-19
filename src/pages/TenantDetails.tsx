import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import ColorBadge from "@/components/common/ColorBadge";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailKeyValueTable,
  DetailContentArea,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailPageShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailStatusBadge,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";

import TenantForm from "@/components/core/form/TenantForm";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { getErrorMessage } from "@/services/api";
import {
  useDeleteTenantMutation,
  useCreateTenantGenerationTableMutation,
  useGetTenantDetailsQuery,
  useRestoreTenantGenerationTableMutation,
  useToggleTenantStatusMutation,
} from "@/services/operations/tenantAPI";
import { useAppSelector } from "@/store/hooks";
import { formateDateTime } from "@/utils/gridFormatters";
import {
  hasPermission,
  PERMISSIONS,
} from "@/utils/permissions";
import {
  Edit,
  Info,
  MapPin,
  MonitorCog,
  Palette,
  Power,
  RefreshCcw,
  SearchCheck,
  Settings,
  Table2,
  TextSearch,
  Trash2,
  User,
} from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";

const TENANT_TAG_CHIP_CLASS =
  "group inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-brand-200/80 bg-gradient-to-b from-white to-brand-50/90 px-2.5 text-left text-xs font-medium leading-snug text-brand-900 shadow-sm transition-colors hover:border-brand-300 hover:shadow dark:border-brand-500/40 dark:from-brand-950/40 dark:to-brand-900/25 dark:text-brand-100 dark:hover:border-brand-400/50";

const TENANT_TAG_DOT_CLASS =
  "h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 opacity-90 dark:bg-brand-400";

const clampBatchSize = (value: number) => Math.min(1000, Math.max(500, value));

const hasPresentValue = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasPresentValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasPresentValue);
  }
  return true;
};

const TenantDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false);
  const [restoreBatchSize, setRestoreBatchSize] = React.useState("500");
  const [activeMainTab, setActiveMainTab] = React.useState<
      "overview" | "configuration" | "audit"
  >("overview");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");

  const {
    data: tenantResponse,
    isLoading,
    isError,
    error,
  } = useGetTenantDetailsQuery(id);
  const userPermissions = useAppSelector((state) => state.auth.permissions);

  const deleteMutation = useDeleteTenantMutation();
  const createGenerationTableMutation = useCreateTenantGenerationTableMutation();
  const restoreGenerationTableMutation = useRestoreTenantGenerationTableMutation();
  const toggleStatusMutation = useToggleTenantStatusMutation();

  const tenant = tenantResponse?.data;
  const tenantFeatures = (tenant as { features?: Record<string, unknown> } | undefined)?.features;
  const activeDetailTabLabel =
    activeMainTab === "overview"
      ? "Overview"
      : activeMainTab === "configuration"
        ? "Configuration"
        : "Audit";
  useDetailBreadcrumb(tenant?.name, activeDetailTabLabel);

  const generationTableName = tenant?.generation_table_name?.trim() || "";
  const hasGenerationTable = Boolean(generationTableName || tenant?.create_generation_table);
  const detailErrorMessage = error
    ? getErrorMessage(error)
    : "The tenant you are trying to view does not exist or you don’t have access.";

  const canToggleStatus = hasPermission(
    userPermissions,
    PERMISSIONS.TENANT.UPDATE,
  );
  const canEdit = hasPermission(userPermissions, PERMISSIONS.TENANT.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.TENANT.DELETE);
  const canViewDeveloperFields = (userPermissions ?? []).some(
    (permission) =>
      String(permission).toLowerCase() ===
      String(PERMISSIONS.DEVELOPER).toLowerCase(),
  );

  const actionButtons = [
    {
      key: "toggle",
      show: canToggleStatus,
      title: tenant?.is_active ? "Deactivate" : "Activate",
      className: tenant?.is_active
        ? "p-2 rounded-xs text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
        : "p-2 rounded-xs text-neutral-600 dark:text-neutral-dark-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300 transition-colors",
      icon: <Power className="w-4 h-4" />,
      onClick: () => {
        if (!tenant?.id) return;
        toggleStatusMutation.mutate({
          id: tenant.id,
          is_active: !tenant.is_active,
        });
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
        setConfirmOpen(true);
      },
    },
  ].filter((action) => action.show);

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Tenant Details"
        tabCount={3}
      />
    );
  }

  if (isError || !tenant) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Tenant not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/tenant")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (tenant.is_active !== undefined) {
    heroStats.push({
      label: "Status",
      value: <DetailStatusBadge active={tenant.is_active} />,
    });
  }
  if (tenant.email && !tenant.name) {
    heroStats.push({
      label: "Email",
      value: tenant.email,
    });
  }
  if (tenant.phone) {
    heroStats.push({
      label: "Phone",
      value: tenant.phone,
    });
  }

  const hasBasicInformationSection = [
    tenant.name,
    tenant.email,
    tenant.phone,
    tenant.website,
    tenant.logo_url,
    tenant.tags,
    tenant.is_active,
  ].some(hasPresentValue);

  const hasAddressSection = [
    tenant.address_line1,
    tenant.address_line2,
    tenant.taluka,
    tenant.district,
    tenant.city,
    tenant.state,
    tenant.country,
    tenant.postal_code,
  ].some(hasPresentValue);

  const hasContactPersonSection = [
    tenant.contact_person,
    tenant.contact_person_designation,
    tenant.contact_email,
    tenant.contact_phone,
  ].some(hasPresentValue);

  const hasSettingsSection = [
    canViewDeveloperFields ? hasGenerationTable : null,
    canViewDeveloperFields ? generationTableName : null,
    tenant.data_retention_days,
  ].some(hasPresentValue);

  const hasBrandingSection = [
    tenant.branding?.primary_color,
    tenant.branding?.secondary_color,
    tenant.branding?.logo_dark,
    tenant.branding?.logo_light,
    tenant.branding?.favicon,
    tenant.branding?.custom_domain,
  ].some(hasPresentValue);

  const hasAuditInformationSection = [
    tenant.created_by,
    tenant.created_by_name,
    tenant.updated_by,
    tenant.updated_by_name,
    tenant.created_at,
    tenant.updated_at,
  ].some(hasPresentValue);

  const hasFeaturesSection = hasPresentValue(tenantFeatures);
  const hasSystemSettingsSection = hasPresentValue(tenant.settings);
  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: TextSearch },
    { key: "configuration", label: "Configuration", icon: MonitorCog },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  const handleCreateGenerationTable = async () => {
    if (!tenant?.id) return;
    await createGenerationTableMutation.mutateAsync({ tenant_id: tenant.id });
  };

  const handleRestoreGenerationTable = async () => {
    if (!generationTableName || !tenant?.id) return;

    await restoreGenerationTableMutation.mutateAsync({
      tenant_id: tenant.id,
      table_name: generationTableName,
      batch_size: clampBatchSize(Number(restoreBatchSize) || 500),
    });

    setRestoreModalOpen(false);
    setRestoreBatchSize("500");
  };

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: navIcons.tenant,
          title: tenant.name || tenant.email || "Tenant",
          subtitle: tenant.email && tenant.name ? tenant.email : undefined,
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(
                key as "overview" | "configuration" | "audit",
              )
            }
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Tenant Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(
                key as "overview" | "configuration" | "audit",
              )
            }
          />
        }
        header={
          <DetailHero
            icon={navIcons.tenant}
            title={tenant.name || tenant.email || "Tenant"}
            subtitle={tenant.email && tenant.name ? tenant.email : null}
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
                          : action.key === "toggle" && tenant.is_active
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
        <DetailSectionsGrid maxColumns={2}>
        {hasBasicInformationSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Info}
            title="Basic Information"
            description="Core identity, classification, and ownership details"
          />
          <DetailFieldGrid>
            <DetailField hideWhenEmpty={false} label="Name" value={tenant.name} />
            <DetailField
              hideWhenEmpty={false}
              label="Email"
              value={tenant.email}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Phone"
              value={tenant.phone}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Website"
              value={
                tenant.website ? (
                  <a
                    href={tenant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 break-all hover:underline dark:text-brand-400"
                  >
                    {tenant.website}
                  </a>
                ) : null
              }
            />
            <DetailField
              hideWhenEmpty={false}
              label="Logo URL"
              value={
                tenant.logo_url ? (
                  <a
                    href={tenant.logo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 break-all hover:underline dark:text-brand-400"
                  >
                    {tenant.logo_url}
                  </a>
                ) : null
              }
            />
            <DetailField
              hideWhenEmpty={false}
              label="Tags"
              value={
                tenant.tags && tenant.tags.length > 0 ? (
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                    {tenant.tags.map((tag) => (
                      <span key={tag} className={TENANT_TAG_CHIP_CLASS} title={tag}>
                        <span className={TENANT_TAG_DOT_CLASS} aria-hidden />
                        <span className="min-w-0 max-w-full break-words">{tag}</span>
                      </span>
                    ))}
                  </div>
                ) : null
              }
            />
              <DetailField
              hideWhenEmpty={false}
              label="Data Retention"
              value={
                tenant.data_retention_days != null
                  ? `${tenant.data_retention_days} days`
                  : null
              }
            />
            
            <DetailField
              hideWhenEmpty={false}
              label="Status"
              value={
                tenant.is_active === undefined ? null : (
                  <ColorBadge variant={tenant.is_active ? "green" : "gray"}>
                    {tenant.is_active ? "Active" : "Inactive"}
                  </ColorBadge>
                )
              }
            />
          
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasAddressSection && (
        <DetailSectionCard>
          <DetailSectionHeader icon={MapPin} title="Physical Address" description="Official location and geographic details" />
          <DetailFieldGrid>
            <DetailField
              hideWhenEmpty={false}
              label="Address Line 1"
              value={tenant.address_line1}
              fullRow
            />
            <DetailField
              hideWhenEmpty={false}
              label="Address Line 2"
              value={tenant.address_line2}
              fullRow
            />
            <DetailField hideWhenEmpty={false} label="Taluka" value={tenant.taluka} />
            <DetailField hideWhenEmpty={false} label="District" value={tenant.district} />
            <DetailField hideWhenEmpty={false} label="City" value={tenant.city} />
            <DetailField
              hideWhenEmpty={false}
              label="State"
              value={tenant.state}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Country"
              value={tenant.country}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Postal Code"
              value={tenant.postal_code}
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasContactPersonSection && (
        <DetailSectionCard>
          <DetailSectionHeader icon={User} title="Contact Person" description="Primary point of contact for administrative matters" />
          <DetailFieldGrid>
            <DetailField
              hideWhenEmpty={false}
              label="Name"
              value={tenant.contact_person}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Designation"
              value={tenant.contact_person_designation}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Email"
              value={tenant.contact_email}
            />
            <DetailField
              hideWhenEmpty={false}
              label="Phone"
              value={tenant.contact_phone}
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        </DetailSectionsGrid>
        )}



        {activeMainTab === "audit" && (
        <DetailSectionsGrid maxColumns={1}>
        {hasAuditInformationSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={SearchCheck}
            title="Audit Information"
            description="Authorship, timeline, and record lifecycle details"
          />
          <DetailFieldGrid>
            <DetailField
              hideWhenEmpty={false}
              label="Created By"
              value={
                tenant.created_by ? (
                  <Link
                    to={`/users/${tenant.created_by}/profile`}
                    className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    {tenant.created_by_name || tenant.created_by}
                  </Link>
                ) : null
              }
            />
            <DetailField
              hideWhenEmpty={false}
              label="Updated By"
              value={
                tenant.updated_by ? (
                  <Link
                    to={`/users/${tenant.updated_by}/profile`}
                    className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    {tenant.updated_by_name || tenant.updated_by}
                  </Link>
                ) : null
              }
            />
            <DetailField
              hideWhenEmpty={false}
              label="Created At"
              value={
                tenant.created_at ? formateDateTime(tenant.created_at) : null
              }
            />
            <DetailField
              hideWhenEmpty={false}
              label="Updated At"
              value={
                tenant.updated_at ? formateDateTime(tenant.updated_at) : null
              }
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        </DetailSectionsGrid>
        )}

        {activeMainTab === "configuration" && (
        <DetailSectionsGrid maxColumns={2}>
        {(hasSettingsSection || hasBrandingSection) && (
          <>
            {canViewDeveloperFields && (
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Settings}
                  title="System Configuration"
                  description="Backend parameters and generation table management"
                />
                <DetailFieldGrid>
                  <DetailField
                    hideWhenEmpty={false}
                    label="Generation Table"
                    value={
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <ColorBadge variant={hasGenerationTable ? "green" : "gray"}>
                            {hasGenerationTable ? "Available" : "Not created"}
                          </ColorBadge>
                          {generationTableName ? (
                            <ColorBadge variant="orange" className="font-mono text-xs">
                              {generationTableName}
                            </ColorBadge>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {hasGenerationTable ? (
                            <ColorBadge
                              variant="blue"
                              className={`gap-2 px-3 py-1.5 font-semibold ${
                                restoreGenerationTableMutation.isPending
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                              onClick={
                                restoreGenerationTableMutation.isPending
                                  ? undefined
                                  : () => {
                                      setRestoreBatchSize("500");
                                      setRestoreModalOpen(true);
                                    }}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              {restoreGenerationTableMutation.isPending ? "Restoring..." : "Restore Table"}
                            </ColorBadge>
                          ) : (
                            <ColorBadge
                              variant="green"
                              className={`gap-2 px-3 py-1.5 font-semibold ${
                                createGenerationTableMutation.isPending
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                              onClick={
                                createGenerationTableMutation.isPending
                                  ? undefined
                                  : () => {
                                      void handleCreateGenerationTable();
                                    }
                              }
                            >
                              <Table2 className="h-4 w-4" />
                              {createGenerationTableMutation.isPending
                                ? "Creating..."
                                : "Create Generation Table"}
                            </ColorBadge>
                          )}
                        </div>
                      </div>
                    }
                  />
                </DetailFieldGrid>
              </DetailSectionCard>
            )}

            {hasBrandingSection && (
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Palette}
                  title="Branding & Identity"
                  description="Visual customization, logos, and custom domain settings"
                />
                <DetailFieldGrid>
                  <DetailField
                    hideWhenEmpty={false}
                    label="Primary Color"
                    value={
                      tenant.branding?.primary_color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-5 w-5 rounded-xs border border-neutral-300 dark:border-neutral-dark-300"
                            style={{
                              backgroundColor: tenant.branding.primary_color,
                            }}
                          />
                          <span>{tenant.branding.primary_color}</span>
                        </span>
                      ) : null
                    }
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Secondary Color"
                    value={
                      tenant.branding?.secondary_color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-5 w-5 rounded-xs border border-neutral-300 dark:border-neutral-dark-300"
                            style={{
                              backgroundColor: tenant.branding.secondary_color,
                            }}
                          />
                          <span>{tenant.branding.secondary_color}</span>
                        </span>
                      ) : null
                    }
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Logo (Dark)"
                    value={renderExternalLink(tenant.branding?.logo_dark)}
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Logo (Light)"
                    value={renderExternalLink(tenant.branding?.logo_light)}
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Favicon"
                    value={renderExternalLink(tenant.branding?.favicon)}
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Custom Domain"
                    value={renderExternalLink(tenant.branding?.custom_domain)}
                  />
                </DetailFieldGrid>
              </DetailSectionCard>
            )}
          </>
        )}
        {hasFeaturesSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Settings}
            title="Feature Flags"
            description="Enabled system features and capability toggles"
          />
          <DetailKeyValueTable
            data={tenantFeatures ?? {}}
            emptyMessage="No feature flags configured."
          />
        </DetailSectionCard>
        )}

        {hasSystemSettingsSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Settings}
            title="System Settings"
            description="Operational parameters and system-level config"
          />
          <DetailKeyValueTable
            data={tenant.settings ?? {}}
            emptyMessage="No system settings configured."
          />
        </DetailSectionCard>
        )}

        </DetailSectionsGrid>
        )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
        open={restoreModalOpen}
        onClose={() => {
          if (restoreGenerationTableMutation.isPending) return;
          setRestoreModalOpen(false);
        }}
        title="Restore Generation Table"
        subtitle={tenant?.name || "Restore tenant generation data"}
        icon={RefreshCcw}
        centerModal
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          <div className="rounded-xs border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-700/50 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Restore data from this tenant generation table into history.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Table Name"
              value={generationTableName}
              readOnly
              className="font-mono"
            />
            <Input
              label="Batch Size"
              type="number"
              min={500}
              max={1000}
              step={50}
              value={restoreBatchSize}
              onChange={(event) => {
                setRestoreBatchSize(event.target.value);
              }}
              onBlur={() => {
                setRestoreBatchSize(String(clampBatchSize(Number(restoreBatchSize) || 500)));
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRestoreModalOpen(false)}
              disabled={restoreGenerationTableMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={!generationTableName}
              onClick={handleRestoreGenerationTable}
            >
              {restoreGenerationTableMutation.isPending ? "Restoring..." : "Restore Table"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!showEdit}
        onClose={() => {
          setShowEdit(false);
        }}
        title="Edit Tenant"
        subtitle={tenant?.name || "Update tenant details"}
        icon={Edit}
        maxWidth="max-w-4xl"
      >
        {tenant && canEdit && (
          <TenantForm
            mode="edit"
            initialValues={tenant}
            editValues={tenant}
            onSuccess={() => {
              setShowEdit(false);
            }}
            isOpen={showEdit}
          />
        )}
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!tenant?.id) return;
          try {
            await deleteMutation.mutateAsync(tenant.id);
            setConfirmOpen(false);
            navigate("/tenant");
          } catch {
            // handled by mutation
          }
        }}
        title="Delete Tenant"
        message="Are you sure you want to delete this tenant? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

const renderExternalLink = (href?: string | null) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-700 break-all hover:underline dark:text-brand-400"
    >
      {href}
    </a>
  ) : null;

export default TenantDetails;
