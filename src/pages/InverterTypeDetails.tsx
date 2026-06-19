import React, { useState, type ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import {
  useGetInverterDetailsQuery,
  useDeleteInverterMutation,
  useToggleInverterStatusMutation,
} from "@/services/operations/inverterTypeAPI";
import { getErrorMessage } from "@/services/api";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import {
  ArrowLeft,
  Cpu,
  Database,
  Edit,
  HardDrive,
  Info,
  Map,
  MonitorCog,
  PlugZap,
  Power,
SearchCheck,
  TextSearch,
  Thermometer,
  Wifi,
  DollarSign,
  FileText,
  Trash2,
  Zap,
} from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import Modal from "@/components/common/Modal";
import BoolBadge from "@/components/common/BoolBadge";
import { formatArrayAsCommaSeparated } from "@/utils/agGridCellRenderers";
import CreateInverterTypeForm from "@/components/core/form/InverterTypeForm";
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

import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { useAppSelector } from "@/store/hooks";
import { formateDateTime } from "@/utils/gridFormatters";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";

const COMMUNICATION_INTERFACE_LABELS: Record<string, string> = {
  wifi: "WiFi",
  ethernet: "Ethernet",
  rs485: "RS485",
  can_bus: "CAN bus",
  display: "Display",
};

function hasPresentValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasPresentValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasPresentValue);
  }
  return true;
}

function toCommunicationInterfacesTableData(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw == null) return null;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      const value = raw.trim();
      return value ? { value } : null;
    }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null;
    return parsed.reduce<Record<string, unknown>>((acc, item, index) => {
      if (item == null) return acc;
      if (typeof item === "string") {
        acc[`item_${index + 1}`] = COMMUNICATION_INTERFACE_LABELS[item] ?? item;
        return acc;
      }
      acc[`item_${index + 1}`] = item;
      return acc;
    }, {});
  }

  if (parsed && typeof parsed === "object") {
    return parsed as Record<string, unknown>;
  }

  return { value: String(parsed) };
}

const InverterTypeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<
    "overview" | "electrical" | "hardware" | "configuration" | "audit"
  >("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const navigate = useNavigate();

  const {
    data: inverterResponse,
    isLoading,
    isError,
    error,
  } = useGetInverterDetailsQuery(id);

  const deleteMutation = useDeleteInverterMutation();
  const toggleStatusMutation = useToggleInverterStatusMutation();
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const canEdit = hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.INVERTER_TYPE.DELETE);

  const inverter = inverterResponse?.data;
  const activeDetailTabLabel =
    activeMainTab === "overview"
      ? "Overview"
      : activeMainTab === "electrical"
        ? "Electrical"
        : activeMainTab === "hardware"
          ? "Hardware"
          : activeMainTab === "configuration"
            ? "Configuration"
            : "Audit";
  useDetailBreadcrumb(
    inverter?.model || inverter?.brand || null,
    activeDetailTabLabel,
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync([id]);
      setConfirmOpen(false);
      navigate("/inverter-type");
    } catch {
      /* mutation toasts */
    }
  };

  const handleToggleStatus = () => {
    if (!id || !inverter) return;
    toggleStatusMutation.mutate({
      id,
      is_active: !(inverter.is_active ?? false),
    });
  };

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Inverter Details"
        tabCount={4}
      />
    );
  }

  if (isError || !inverter) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block rounded-xs bg-error-500/10 p-4 dark:bg-error-500/20">
              <Zap className="h-12 w-12 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Inverter Not Found
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              {error
                ? getErrorMessage(error)
                : "The inverter you're looking for doesn't exist."}
            </p>
            <Link to="/inverter-type">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Inverter List
              </Button>
            </Link>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const boolDetail = (v: boolean | null | undefined) =>
    v == null ? null : <BoolBadge value={v} />;

  const communicationInterfacesTableData = toCommunicationInterfacesTableData(
    inverter.communication_interfaces,
  );

  const heroBadges = inverter.phase_type ? (
    <span className="rounded-xs bg-brand-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">
      {inverter.phase_type}
    </span>
  ) : undefined;

  const heroStats: Array<{ label: string; value: ReactNode }> = [];
  if (inverter.is_active != null) {
    heroStats.push({
      label: "Status",
      value: <DetailStatusBadge active={inverter.is_active} />,
    });
  }
  if (inverter.capacity_kw != null) {
    heroStats.push({
      label: "Rated capacity",
      value: `${inverter.capacity_kw} kW`,
    });
  }
  if (inverter.max_efficiency_percent != null) {
    heroStats.push({
      label: "Peak efficiency",
      value: `${inverter.max_efficiency_percent}%`,
    });
  }

  const hasBasicInformationSection = [
    inverter.brand,
    inverter.model,
    inverter.model_number,
    inverter.manufacturer,
    inverter.country_of_origin,
    inverter.is_active,
    inverter.alarm_tag_template_id,
    inverter.alarm_tag_template_name,
    inverter.tags,
  ].some(hasPresentValue);

  const hasAuditInformationSection = [
    inverter.created_by,
    inverter.created_by_name,
    inverter.updated_by,
    inverter.updated_by_name,
    inverter.created_at,
    inverter.updated_at,
  ].some(hasPresentValue);

  const hasCoreSpecificationsSection = [
    inverter.capacity_kw,
    inverter.max_ac_power_kw,
    inverter.max_dc_power_kw,
    inverter.nominal_power_kw,
    inverter.max_efficiency_percent,
    inverter.phase_type,
    inverter.phase_count,
    inverter.mppt_count,
    inverter.strings_per_mppt,
    inverter.max_string_count,
  ].some(hasPresentValue);

  const hasDcParametersSection = [
    inverter.max_dc_voltage,
    inverter.min_dc_voltage,
    inverter.mppt_voltage_range_min,
    inverter.mppt_voltage_range_max,
    inverter.max_dc_current_per_mppt,
    inverter.max_short_circuit_current,
  ].some(hasPresentValue);

  const hasAcParametersSection = [
    inverter.ac_voltage_nominal,
    inverter.ac_voltage_range_min,
    inverter.ac_voltage_range_max,
    inverter.ac_frequency_nominal,
    inverter.ac_frequency_range_min,
    inverter.ac_frequency_range_max,
    inverter.max_ac_current,
    inverter.power_factor_range_min,
    inverter.power_factor_range_max,
  ].some(hasPresentValue);

  const hasPhysicalSection = [
    inverter.weight_kg,
    inverter.cooling_method,
    inverter.protection_rating,
    inverter.noise_level_db,
    inverter.operating_temp_min,
    inverter.operating_temp_max,
  ].some(hasPresentValue);

  const hasCommunicationSection = [
    inverter.has_wifi,
    inverter.has_ethernet,
    inverter.has_rs485,
    inverter.has_display,
    inverter.protocols_supported,
  ].some(hasPresentValue);

  const hasComplianceSection = [
    inverter.certifications,
    inverter.warranty_years,
    inverter.list_price,
    inverter.currency,
    inverter.datasheet_url,
    inverter.manual_url,
  ].some(hasPresentValue);

  const hasCommunicationConfigSection = hasPresentValue(
    communicationInterfacesTableData,
  );
  const hasAdditionalSpecificationsSection = hasPresentValue(
    inverter.specifications,
  );
  const hasRegisterMapSection = hasPresentValue(inverter.register_map);
  const hasDataPointsSection = hasPresentValue(inverter.data_points);
  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: TextSearch },
    { key: "electrical", label: "Electrical", icon: PlugZap },
    { key: "hardware", label: "Hardware", icon: HardDrive },
    { key: "configuration", label: "Configuration", icon: MonitorCog },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: navIcons.inverterTypes,
          title: [inverter.brand, inverter.model].filter(Boolean).join(" ") || "Inverter",
          subtitle:
            [inverter.manufacturer, inverter.model_number]
              .filter(Boolean)
              .join(" · ") || undefined,
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(
                key as "overview" | "electrical" | "hardware" | "configuration" | "audit",
              )
            }
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Inverter Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(
                key as "overview" | "electrical" | "hardware" | "configuration" | "audit",
              )
            }
          />
        }
        header={
          <DetailHero
            icon={navIcons.inverterTypes}
            title={[inverter.brand, inverter.model].filter(Boolean).join(" ") || "Inverter"}
            subtitle={
              [inverter.manufacturer, inverter.model_number]
                .filter(Boolean)
                .join(" · ") || null
            }
            badges={heroBadges}
            stats={heroStats.length > 0 ? heroStats : undefined}
            className="rounded-none border-x-0 border-t-0 shadow-none"
            mobileSummaryHandled
            actions={
              <>
                {canEdit && (
                  <DetailHeaderActionButton
                    title={inverter.is_active ? "Deactivate" : "Activate"}
                    icon={<Power className="h-4 w-4" />}
                    onClick={handleToggleStatus}
                    tone={inverter.is_active ? "success" : "neutral"}
                    disabled={toggleStatusMutation.isPending}
                  />
                )}
                {canEdit && (
                  <DetailHeaderActionButton
                    title="Edit"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => setShowEdit(true)}
                    tone="brand"
                  />
                )}
                {canDelete && (
                  <DetailHeaderActionButton
                    title="Delete"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setConfirmOpen(true)}
                    tone="danger"
                    disabled={deleteMutation.isPending}
                  />
                )}
              </>
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
              description="Core identity, model, and classification"
            />
            <DetailFieldGrid>
              <DetailField hideWhenEmpty={false} label="Brand" value={inverter.brand} />
              <DetailField hideWhenEmpty={false} label="Model" value={inverter.model} />
              <DetailField
                hideWhenEmpty={false}
                label="Model Number"
                value={inverter.model_number}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Manufacturer"
                value={inverter.manufacturer}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Country of Origin"
                value={inverter.country_of_origin}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Status"
                value={
                  inverter.is_active == null
                    ? null
                    : inverter.is_active
                      ? "Active"
                      : "Inactive"
                }
              />
              <DetailField
                label="Alarm tag template"
                fullRow
                hideWhenEmpty={false}
                value={
                  inverter.alarm_tag_template_id ? (
                    <span className="flex flex-col gap-1">
                      <Link
                        to={`/tag-templates/${inverter.alarm_tag_template_id}`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {inverter.alarm_tag_template_name?.trim()
                          ? inverter.alarm_tag_template_name
                          : "View template"}
                      </Link>
                    </span>
                  ) : inverter.alarm_tag_template_name ? (
                    inverter.alarm_tag_template_name
                  ) : (
                    "—"
                  )
                }
              />
              <DetailField
                label="Tags"
                fullRow
                hideWhenEmpty={false}
                emptyDisplay="—"
                value={formatArrayAsCommaSeparated(inverter.tags)}
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
                label="Created By"
                hideWhenEmpty={false}
                value={
                  inverter.created_by ? (
                    <Link
                      to={`/users/${inverter.created_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {inverter.created_by_name || inverter.created_by}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailField
                label="Updated By"
                hideWhenEmpty={false}
                value={
                  inverter.updated_by ? (
                    <Link
                      to={`/users/${inverter.updated_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {inverter.updated_by_name || inverter.updated_by}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailField
                label="Created At"
                hideWhenEmpty={false}
                value={
                  inverter.created_at
                    ? formateDateTime(inverter.created_at)
                    : null
                }
              />
              <DetailField
                label="Updated At"
                hideWhenEmpty={false}
                value={
                  inverter.updated_at
                    ? formateDateTime(inverter.updated_at)
                    : null
                }
              />
            </DetailFieldGrid>
          </DetailSectionCard>
          )}
        </DetailSectionsGrid>
        )}

        {activeMainTab === "electrical" && (
        <DetailSectionsGrid maxColumns={2}>
        {hasCoreSpecificationsSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Cpu}
            title="Core Specifications"
            description="Fundamental electrical design and power ratings"
          />
          <DetailFieldGrid>
            <DetailField
              label="Capacity"
              value={
                inverter.capacity_kw != null ? `${inverter.capacity_kw} kW` : null
              }
            />
            <DetailField
              label="Max AC Power"
              value={
                inverter.max_ac_power_kw != null
                  ? `${inverter.max_ac_power_kw} kW`
                  : null
              }
            />
            <DetailField
              label="Max DC Power"
              value={
                inverter.max_dc_power_kw != null
                  ? `${inverter.max_dc_power_kw} kW`
                  : null
              }
            />
            <DetailField
              label="Nominal Power"
              value={
                inverter.nominal_power_kw != null
                  ? `${inverter.nominal_power_kw} kW`
                  : null
              }
            />
            <DetailField
              label="Max Efficiency"
              value={
                inverter.max_efficiency_percent != null
                  ? `${inverter.max_efficiency_percent}%`
                  : null
              }
            />
            <DetailField label="Phase Type" value={inverter.phase_type} />
            <DetailField
              label="Phase Count"
              value={inverter.phase_count?.toString()}
            />
            <DetailField
              label="MPPT Count"
              value={inverter.mppt_count?.toString()}
            />
            <DetailField
              label="Strings per MPPT"
              value={inverter.strings_per_mppt?.toString()}
            />
            <DetailField
              label="Max String Count"
              value={inverter.max_string_count?.toString()}
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasDcParametersSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Zap}
            title="DC Parameters"
            description="Direct current input constraints and ranges"
          />
          <DetailFieldGrid>
            <DetailField
              label="Max DC Voltage"
              value={
                inverter.max_dc_voltage != null
                  ? `${inverter.max_dc_voltage} V`
                  : null
              }
            />
            <DetailField
              label="Min DC Voltage"
              value={
                inverter.min_dc_voltage != null
                  ? `${inverter.min_dc_voltage} V`
                  : null
              }
            />
            <DetailField
              label="MPPT Voltage Min"
              value={
                inverter.mppt_voltage_range_min != null
                  ? `${inverter.mppt_voltage_range_min} V`
                  : null
              }
            />
            <DetailField
              label="MPPT Voltage Max"
              value={
                inverter.mppt_voltage_range_max != null
                  ? `${inverter.mppt_voltage_range_max} V`
                  : null
              }
            />
            <DetailField
              label="Max DC Current / MPPT"
              value={
                inverter.max_dc_current_per_mppt != null
                  ? `${inverter.max_dc_current_per_mppt} A`
                  : null
              }
            />
            <DetailField
              label="Max Short Circuit Current"
              value={
                inverter.max_short_circuit_current != null
                  ? `${inverter.max_short_circuit_current} A`
                  : null
              }
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasAcParametersSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Zap}
            title="AC Parameters"
            description="Alternating current output and frequency limits"
          />
          <DetailFieldGrid>
            <DetailField
              label="AC Voltage Nominal"
              value={
                inverter.ac_voltage_nominal != null
                  ? `${inverter.ac_voltage_nominal} V`
                  : null
              }
            />
            <DetailField
              label="AC Voltage Range Min"
              value={
                inverter.ac_voltage_range_min != null
                  ? `${inverter.ac_voltage_range_min} V`
                  : null
              }
            />
            <DetailField
              label="AC Voltage Range Max"
              value={
                inverter.ac_voltage_range_max != null
                  ? `${inverter.ac_voltage_range_max} V`
                  : null
              }
            />
            <DetailField
              label="AC Frequency Nominal"
              value={
                inverter.ac_frequency_nominal != null
                  ? `${inverter.ac_frequency_nominal} Hz`
                  : null
              }
            />
            <DetailField
              label="AC Frequency Range Min"
              value={
                inverter.ac_frequency_range_min != null
                  ? `${inverter.ac_frequency_range_min} Hz`
                  : null
              }
            />
            <DetailField
              label="AC Frequency Range Max"
              value={
                inverter.ac_frequency_range_max != null
                  ? `${inverter.ac_frequency_range_max} Hz`
                  : null
              }
            />
            <DetailField
              label="Max AC Current"
              value={
                inverter.max_ac_current != null
                  ? `${inverter.max_ac_current} A`
                  : null
              }
            />
            <DetailField
              label="Power Factor Min"
              value={inverter.power_factor_range_min?.toString()}
            />
            <DetailField
              label="Power Factor Max"
              value={inverter.power_factor_range_max?.toString()}
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}
        </DetailSectionsGrid>
        )}

        {activeMainTab === "hardware" && (
        <DetailSectionsGrid maxColumns={2}>
        {hasPhysicalSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Thermometer}
            title="Physical & Environmental"
            description="Hardware dimensions, weight, and operating conditions"
          />
          <DetailFieldGrid>
            <DetailField
              label="Weight"
              value={
                inverter.weight_kg != null ? `${inverter.weight_kg} kg` : null
              }
            />
            <DetailField label="Cooling Method" value={inverter.cooling_method} />
            <DetailField
              label="Protection Rating"
              value={inverter.protection_rating}
            />
            <DetailField
              label="Noise Level"
              value={
                inverter.noise_level_db != null
                  ? `${inverter.noise_level_db} dB`
                  : null
              }
            />
            <DetailField
              label="Operating Temp Min"
              value={
                inverter.operating_temp_min != null
                  ? `${inverter.operating_temp_min} °C`
                  : null
              }
            />
            <DetailField
              label="Operating Temp Max"
              value={
                inverter.operating_temp_max != null
                  ? `${inverter.operating_temp_max} °C`
                  : null
              }
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasCommunicationSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Wifi}
            title="Communication Interfaces"
            description="Available connectivity protocols and hardware ports"
          />
          <DetailFieldGrid>
            <DetailField label="WiFi" value={boolDetail(inverter.has_wifi)} />
            <DetailField
              label="Ethernet"
              value={boolDetail(inverter.has_ethernet)}
            />
            <DetailField label="RS485" value={boolDetail(inverter.has_rs485)} />
            <DetailField label="Display" value={boolDetail(inverter.has_display)} />
            <DetailField
              label="Protocols supported"
              value={formatArrayAsCommaSeparated(inverter.protocols_supported)}
              fullRow
              hideWhenEmpty={false}
              emptyDisplay="—"
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}

        {hasComplianceSection && (
        <DetailSectionCard>
          <DetailSectionHeader
            icon={DollarSign}
            title="Compliance & Pricing"
            description="Certification standards and commercial details"
          />
          <DetailFieldGrid>
            <DetailField
              label="Certifications"
              value={formatArrayAsCommaSeparated(inverter.certifications)}
              fullRow
              hideWhenEmpty={false}
              emptyDisplay="—"
            />
            <DetailField
              label="Warranty"
              value={
                inverter.warranty_years != null
                  ? `${inverter.warranty_years} years`
                  : null
              }
            />
            <DetailField
              label="List Price"
              value={
                inverter.list_price != null ? `${inverter.list_price}` : null
              }
            />
            <DetailField label="Currency" value={inverter.currency} />
            <DetailField
              label="Datasheet"
              value={
                inverter.datasheet_url ? (
                  <a
                    href={inverter.datasheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    View ↗
                  </a>
                ) : null
              }
            />
            <DetailField
              label="Manual"
              value={
                inverter.manual_url ? (
                  <a
                    href={inverter.manual_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    View ↗
                  </a>
                ) : null
              }
            />
          </DetailFieldGrid>
        </DetailSectionCard>
        )}
        </DetailSectionsGrid>
        )}

        {activeMainTab === "configuration" && (
        <DetailSectionsGrid maxColumns={2}>
        {hasCommunicationConfigSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Wifi}
            title="Communication Configuration"
            description="Structured port settings and connectivity metadata"
          />
          <DetailKeyValueTable
            data={communicationInterfacesTableData ?? {}}
            emptyMessage="No communication interface data."
          />
        </DetailSectionCard>
        )}

        {hasAdditionalSpecificationsSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={FileText}
            title="Additional Specifications"
            description="Dynamic technical attributes and extended metadata"
          />
          <DetailKeyValueTable
            data={
              (inverter.specifications ?? {}) as Record<string, unknown>
            }
            emptyMessage="No additional specifications."
          />
        </DetailSectionCard>
        )}

        {hasRegisterMapSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Map}
            title="Register Mapping"
            description="System field to Modbus register address assignments"
          />
          <DetailKeyValueTable
            data={(inverter.register_map ?? {}) as Record<string, unknown>}
            emptyMessage="No register map configured."
          />
        </DetailSectionCard>
        )}

        {hasDataPointsSection && (
        <DetailSectionCard span="full">
          <DetailSectionHeader
            icon={Database}
            title="Data Points"
            description="Telemetry definitions and sensor reading identifiers"
          />
          <DetailKeyValueTable
            data={(inverter.data_points ?? {}) as Record<string, unknown>}
            emptyMessage="No data points configured."
          />
        </DetailSectionCard>
        )}
        </DetailSectionsGrid>
        )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
        open={!!showEdit}
        onClose={() => { setShowEdit(false); }}
        title="Edit Inverter"
        subtitle={inverter?.brand || "Update inverter details"}
        icon={navIcons.inverterTypes}
        maxWidth="max-w-4xl"
      >
        {inverter && (
          <CreateInverterTypeForm
            mode="edit"
            initialValues={inverter}
            onSuccess={() => { setShowEdit(false); }}
          />
        )}
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Inverter Type"
        message="Are you sure you want to delete this inverter type? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default InverterTypeDetails;
