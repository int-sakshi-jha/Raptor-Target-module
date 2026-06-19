import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useGetPlantDetailsQuery,
  useDeletePlantMutation,
  useTogglePlantStatusMutation,
  useCommissionPlantMutation,
  useDecommissionPlantMutation,
} from "@/services/operations/plantAPI";
import PlantForm from "@/components/core/form/PlantForm";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
  DetailCodeBlock,
  DetailHeaderActionButton,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailMain,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  ArrowLeft, Factory, Edit, Trash2, Power, User, MapPin, Zap,
  DollarSign, Sun, TrendingUp, Layers, Calendar,
  Clock, Navigation, Phone, Mail, Box, Building2, Maximize2,
  CheckCircle2, XCircle,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { canPlantAdminLifecycleAction, PERMISSIONS } from "@/utils/permissions";
import { formateDateTime } from "@/utils/gridFormatters";




/* ─────────────────────────── tiny shared primitives ─────────────────────── */

const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-5">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400 whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-dark-200" />
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`rounded-xs border border-neutral-200 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  iconBg?: string;
  iconColor?: string;
}> = ({ icon: Icon, title, iconBg = "bg-brand-50 dark:bg-brand-900/20", iconColor = "text-brand-600 dark:text-brand-400" }) => (
  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-100 dark:border-neutral-dark-200">
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xs ${iconBg}`}>
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
    </div>
    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
      {title}
    </span>
  </div>
);

const FieldGrid: React.FC<{ children: React.ReactNode; cols?: 2 | 4 }> = ({ children, cols = 2 }) => (
  <div className={`grid gap-x-5 divide-y divide-neutral-100 dark:divide-neutral-dark-200 px-4 pb-1 ${cols === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
    {children}
  </div>
);

const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  fullRow?: boolean;
  hideWhenEmpty?: boolean;
}> = ({ label, value, mono = false, fullRow = false, hideWhenEmpty = true }) => {
  if (hideWhenEmpty && (value === null || value === undefined || value === "")) return null;
  return (
    <div className={`py-2.5 ${fullRow ? "col-span-full" : ""}`}>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400">
        {label}
      </p>
      <div className={`text-sm text-neutral-800 dark:text-neutral-dark-900 ${mono ? "font-mono text-[12px] text-brand-600 dark:text-brand-400" : ""}`}>
        {value ?? <span className="text-neutral-300 dark:text-neutral-dark-300">—</span>}
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ active: boolean; label?: string; inactiveLabel?: string }> = ({
  active,
  label = "Active",
  inactiveLabel = "Inactive",
}) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
    active
      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-dark-200 dark:text-neutral-dark-500"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success-500" : "bg-neutral-400"}`} />
    {active ? label : inactiveLabel}
  </span>
);

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  progress?: number;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  progressColor?: string;
}> = ({
  label, value, unit, progress, icon: Icon,
  iconBg = "bg-brand-50 dark:bg-brand-900/20",
  iconColor = "text-brand-600 dark:text-brand-400",
  progressColor = "bg-brand-500",
}) => (
  <Card>
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400">
          {label}
        </p>
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xs ${iconBg}`}>
          <Icon className={`h-3 w-3 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-dark-900">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-neutral-400 dark:text-neutral-dark-400">{unit}</span>
        )}
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-neutral-100 dark:bg-neutral-dark-200 overflow-hidden">
          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  </Card>
);

const formatDateInputValue = (value?: string | null): string => {
  if (!value) return "";
  return value.slice(0, 10);
};

const toCommissioningDateIso = (dateStr: string): string => {
  const trimmed = dateStr.trim();
  if (!trimmed) return new Date().toISOString();
  if (trimmed.includes("T")) return trimmed;
  return `${trimmed}T00:00:00.000Z`;
};

type PlantModuleDetails = {
  qty?: number;
  make?: string;
  model?: string;
  capacity_w?: number;
  technology?: string;
  efficiency_percent?: number;
  module_type?: string;
  module_brand?: string;
  module_count?: number;
  module_model?: string;
  string_count?: number;
  module_watt_peak?: number;
  module_tilt_angle?: number;
  bifaciality_factor?: number;
  modules_per_string?: number;
  module_azimuth_angle?: number;
};

const parsePlantJsonField = (value: unknown): unknown => {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const hasPlantJsonContent = (value: unknown): boolean => {
  const parsed = parsePlantJsonField(value);
  if (parsed == null) return false;
  if (Array.isArray(parsed)) return parsed.length > 0;
  if (typeof parsed === "object") return Object.keys(parsed as object).length > 0;
  return String(parsed).trim() !== "";
};

const renderPlantJson = (value: unknown) =>
  JSON.stringify(parsePlantJsonField(value) ?? null, null, 2);

const resolveBotLayerComponents = (plant: Record<string, unknown>) =>
  plant.bot_layer_components ??
  (typeof plant.metadata === "object" && plant.metadata != null
    ? (plant.metadata as Record<string, unknown>).bot_layer_components
    : null);

/* ─────────────────────────── main component ─────────────────────────────── */

const PlantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [decommissionConfirmOpen, setDecommissionConfirmOpen] = useState(false);
  const [commissionDate, setCommissionDate] = useState("");
  const navigate = useNavigate();

  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const canUpdatePlant = canPlantAdminLifecycleAction(userRole, userPermissions, PERMISSIONS.PLANT.UPDATE);
  const canDeletePlant = canPlantAdminLifecycleAction(userRole, userPermissions, PERMISSIONS.PLANT.DELETE);
  const canCommissionPlant = canPlantAdminLifecycleAction(userRole, userPermissions, PERMISSIONS.PLANT.COMMISSION);
  const canDecommissionPlant = canPlantAdminLifecycleAction(userRole, userPermissions, PERMISSIONS.PLANT.DECOMMISSION);
  const shouldShowTenant = userRole === "user" || userRole === "tenant";

  const {
    data: plantResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetPlantDetailsQuery(id);
  const deleteMutation = useDeletePlantMutation();
  const toggleStatusMutation = useTogglePlantStatusMutation();
  const commissionMutation = useCommissionPlantMutation();
  const decommissionMutation = useDecommissionPlantMutation();
  const isCommissionActionPending =
    commissionMutation.isPending || decommissionMutation.isPending;

  const plant = plantResponse?.data?.data ?? plantResponse?.data ?? plantResponse?.plant;
  const isStalePlant = Boolean(plant?.id && id && plant.id !== id);
  const showLoadingShell =
    Boolean(id) && (isLoading || isFetching) && (!plant || isStalePlant);

  const handleDelete = async () => {
    if (!id || plant?.is_commissioned) return;
    try {
      await deleteMutation.mutateAsync([id]);
      setConfirmOpen(false);
      navigate("/plants");
    } catch { /* handled by mutation */ }
  };

  const handleToggleStatus = () => {
    if (!id || !plant) return;
    toggleStatusMutation.mutate({ id });
  };

  const openCommissionModal = () => {
    const defaultDate =
      formatDateInputValue(plant?.commissioning_date) ||
      new Date().toISOString().slice(0, 10);
    setCommissionDate(defaultDate);
    setShowCommissionModal(true);
  };

  const handleCommission = async () => {
    if (!id || !commissionDate.trim()) return;
    try {
      await commissionMutation.mutateAsync({
        id,
        commissioning_date: toCommissioningDateIso(commissionDate),
      });
      setShowCommissionModal(false);
    } catch { /* handled by mutation */ }
  };

  const handleDecommission = async () => {
    if (!id) return;
    try {
      await decommissionMutation.mutateAsync({ id });
      setDecommissionConfirmOpen(false);
    } catch { /* handled by mutation */ }
  };

  if (showLoadingShell) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Plant Details"
        tabCount={4}
      />
    );
  }

  /* error */
  if (isError || !plant) {
    return (
      <DetailPageBackground className="min-h-0 overflow-hidden">
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xs bg-error-50 dark:bg-error-900/20">
              <Factory className="h-7 w-7 text-error-500" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-dark-900">Plant not found</h2>
            <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-dark-500">
              {error ? "Failed to load plant details. Please try again." : "The plant you're looking for doesn't exist."}
            </p>
            <Link to="/plants">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plants
              </Button>
            </Link>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  /* derived */
  const owner = plant.owner as { id?: string; name?: string } | null;
  const ownerId = owner?.id ?? null;
  const ownerName = owner?.name ?? null;
  const hasCoordinates = plant.latitude != null && plant.longitude != null;
  const mapQuery = hasCoordinates ? `${plant.latitude},${plant.longitude}` : "";
  const googleMapEmbedUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
    : null;
  const botLayerComponents = resolveBotLayerComponents(plant as Record<string, unknown>);

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailMain className="min-h-0 overflow-y-auto">

        {/* ═══════════════════════════════════════════
            HERO — image banner + identity + quick stats
        ═══════════════════════════════════════════ */}
        <Card className="mb-6">
          {/* image strip */}
          <div className="relative h-52 w-full overflow-hidden">
            {plant.plant_image ? (
              <>
                <img
                  src={plant.plant_image}
                  alt={plant.plant_name || "Plant"}
                  className="h-full w-full object-cover"
                  onDoubleClick={() => setShowImageModal(true)}
                  onError={(e) => {
                    const wrap = (e.target as HTMLImageElement).parentElement;
                    if (wrap) {
                      wrap.classList.add(
                        "bg-gradient-to-br",
                        "from-brand-50",
                        "to-neutral-100",
                        "dark:from-brand-900/20",
                        "dark:to-neutral-dark-200",
                      );
                    }
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <button
                  type="button"
                  aria-label="Expand plant image"
                  title="Expand"
                  className="absolute top-3 right-3 z-10 rounded-xs bg-neutral-200/15 border border-neutral-200/50 p-2 text-neutral-200 backdrop-blur-sm hover:bg-neutral-200/25"
                  onClick={() => setShowImageModal(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-50 to-neutral-100 dark:from-brand-900/20 dark:to-neutral-dark-200 flex items-center justify-center">
                <Sun className="h-16 w-16 text-brand-200 dark:text-brand-800" />
              </div>
            )}

            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* text + status pills over image */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h1 className="min-w-0 flex-1 text-xl font-semibold leading-snug text-white">
                  {plant.plant_name || "Plant"}
                </h1>
              
              </div>
              <div className="flex flex-wrap justify-between items-center gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                {plant.is_active != null && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm border ${
                    plant.is_active
                      ? "bg-success-900/50 text-success-300 border-success-700/50"
                      : "bg-neutral-900/50 text-neutral-300 border-neutral-600/50"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${plant.is_active ? "bg-success-400" : "bg-neutral-400"}`} />
                    {plant.is_active ? "Active" : "Inactive"}
                  </span>
                )}
                                {plant.plant_type && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm capitalize">
                    {plant.plant_type}
                    {plant.plant_category ? ` · ${plant.plant_category}` : ""}
                  </span>
                )}
                {plant.city && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    <MapPin className="h-3 w-3" />
                    {plant.city}, {plant.state}
                  </span>
                )}
                {plant.is_commissioned != null && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm border ${
                    plant.is_commissioned
                      ? "bg-success-900/50 text-success-400 border-success-900/50"
                      : "bg-warning-900/50 text-warning-400 border-warning-900/50"
                  }`}>
                    {plant.is_commissioned ? "Commissioned" : "Not commissioned"}
                  </span>
                )}
                {plant.net_metering && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-900/50 border border-brand-700/50 px-2.5 py-0.5 text-xs font-medium text-brand-300 backdrop-blur-sm">
                    Net metering
                  </span>
                )}
                 </div>
                 <div>
                    <div className="flex shrink-0 items-center gap-1">
                  {canCommissionPlant && !plant.is_commissioned && (
                    <DetailHeaderActionButton
                      title="Commission"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      onClick={openCommissionModal}
                      disabled={isCommissionActionPending}
                      tone="success"
                    />
                  )}
                  {canDecommissionPlant && plant.is_commissioned && (
                    <DetailHeaderActionButton
                      title="Decommission"
                      icon={<XCircle className="h-4 w-4" />}
                      onClick={() => setDecommissionConfirmOpen(true)}
                      disabled={isCommissionActionPending}
                      tone="neutral"
                    />
                  )}
                  {canUpdatePlant && (
                    <DetailHeaderActionButton
                      title={plant.is_active ? "Deactivate" : "Activate"}
                      icon={<Power className="h-4 w-4" />}
                      onClick={handleToggleStatus}
                      disabled={toggleStatusMutation.isPending}
                      tone={plant.is_active ? "success" : "neutral"}
                    />
                  )}
                  {canUpdatePlant && (
                    <DetailHeaderActionButton
                      title="Edit"
                      icon={<Edit className="h-4 w-4" />}
                      onClick={() => setShowEdit(true)}
                      tone="brand"
                    />
                    )}
                  {canDeletePlant && (
                    <DetailHeaderActionButton
                      title={plant.is_commissioned ? "Cannot delete commissioned plant" : "Delete"}
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => {
                        if (plant.is_commissioned) return;
                        setConfirmOpen(true);
                      }}
                      disabled={deleteMutation.isPending || Boolean(plant.is_commissioned)}
                      tone="danger"
                    />
                  )}
                </div>
                 </div>
              </div>
            </div>
          </div>

          {/* quick-stat strip below image */}
          <div className="grid grid-cols-2 divide-x divide-neutral-100 dark:divide-neutral-dark-200 sm:grid-cols-4">
            {(
              [
                { label: "DC Capacity", value: plant.dc_capacity_kw, unit: "kW" },
                { label: "AC Capacity", value: plant.ac_capacity_kw, unit: "kW" },
                { label: "PPA Rate", value: plant.ppa_rate ? `₹${plant.ppa_rate}` : null, unit: "/kWh" },
                { label: "PPA Duration", value: plant.ppa_duration_years, unit: "yrs" },
              ] as { label: string; value: string | number | null; unit: string }[]
            )
              .filter((s) => s.value != null)
              .map(({ label, value, unit }) => (
                <div key={label} className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-dark-200">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400 mb-1">
                    {label}
                  </p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-900">
                    {value}
                    <span className="ml-1 text-xs font-normal text-neutral-400 dark:text-neutral-dark-400">{unit}</span>
                  </p>
                </div>
              ))}
          </div>
        </Card>

        {/* ═══════════════════════════════════════════
            PERFORMANCE KPIs
        ═══════════════════════════════════════════ */}
        {(plant.expected_annual_generation_kwh ||
          plant.expected_cuf_percent ||
          plant.expected_pr_percent ||
          plant.expected_yield_kwh_kwp) && (
          <>
            <SectionDivider label="Performance Targets" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-2">
              {plant.expected_annual_generation_kwh && (
                <KpiCard
                  label="Annual Generation"
                  value={Number(plant.expected_annual_generation_kwh).toLocaleString()}
                  unit="kWh"
                  icon={TrendingUp}
                  iconBg="bg-brand-50 dark:bg-brand-900/20"
                  iconColor="text-brand-600 dark:text-brand-400"
                />
              )}
              {plant.expected_cuf_percent && (
                <KpiCard
                  label="Expected CUF"
                  value={plant.expected_cuf_percent}
                  unit="%"
                  progress={Number(plant.expected_cuf_percent)}
                  icon={Sun}
                  iconBg="bg-warning-50 dark:bg-warning-900/20"
                  iconColor="text-warning-600 dark:text-warning-400"
                  progressColor="bg-warning-500"
                />
              )}
              {plant.expected_pr_percent && (
                <KpiCard
                  label="Expected PR"
                  value={plant.expected_pr_percent}
                  unit="%"
                  progress={Number(plant.expected_pr_percent)}
                  icon={Zap}
                  iconBg="bg-success-50 dark:bg-success-900/20"
                  iconColor="text-success-600 dark:text-success-400"
                  progressColor="bg-success-500"
                />
              )}
              {plant.expected_yield_kwh_kwp && (
                <KpiCard
                  label="Yield"
                  value={Number(plant.expected_yield_kwh_kwp).toLocaleString()}
                  unit="kWh/kWp"
                  icon={Layers}
                  iconBg="bg-brand-50 dark:bg-brand-900/20"
                  iconColor="text-brand-600 dark:text-brand-400"
                />
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
            TWO-COLUMN LAYOUT
        ═══════════════════════════════════════════ */}
        <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── LEFT (2/3 width) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* IDENTITY */}
            <div>
              <SectionDivider label="Identity & Ownership" />
              <Card>
                <CardHeader
                  icon={Building2}
                  title="Overview"
                  iconBg="bg-brand-50 dark:bg-brand-900/20"
                  iconColor="text-brand-600 dark:text-brand-400"
                />
                <FieldGrid>
                  {!shouldShowTenant && (
                    <Field
                      label="Tenant"
                      value={
                        plant.tenant_id ? (
                          <Link to={`/tenant/${plant.tenant_id}`} className="font-medium text-brand-700 dark:text-brand-400 hover:underline">
                            {plant.tenant_name || plant.tenant_id}
                          </Link>
                        ) : plant.tenant_name
                      }
                    />
                  )}
                  <Field
                    label="Owner"
                    value={
                      ownerId ? (
                        <Link to={`/users/${ownerId}/profile`} className="font-medium text-brand-700 dark:text-brand-400 hover:underline">
                          {ownerName || ownerId}
                        </Link>
                      ) : (
                        ownerName
                      )
                    }
                    hideWhenEmpty={false}
                  />
                  <Field label="Organization" value={plant.organization_name} />
                  <Field label="Plant Type" value={plant.plant_type} />
                  <Field label="Plant Category" value={plant.plant_category} />
                  <Field
                    label="Forecast Enabled"
                    value={
                      plant.is_forecast != null ? (
                        <StatusPill active={plant.is_forecast} label="Yes" inactiveLabel="No" />
                      ) : null
                    }
                    hideWhenEmpty={false}
                  />
                  <Field label="Communication Status" value={plant.communication_status} hideWhenEmpty={false} />
                  <Field label="Meter Number" value={plant.meter_number} mono />
                  <Field label="Consumer Number" value={plant.consumer_number} mono />
                  <Field label="Connection Point" value={plant.connection_point} />
                  <Field label="DISCOM" value={plant.discom_name} />
                  <Field label="Feeder" value={plant.feeder_name} />
                  <Field label="Substation" value={plant.substation_name} />

                  <Field label="Tariff Type" value={plant.tariff_type} />
                  {Array.isArray(plant.notify_users) && plant.notify_users.length > 0 && (
                    <Field
                      label="Notify Users"
                      value={`${plant.notify_users.length} user${plant.notify_users.length !== 1 ? "s" : ""}`}
                    />
                  )}
                  {Array.isArray(plant.features) && plant.features.length > 0 && (
                    <Field
                      label="Features"
                      fullRow
                      value={
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {plant.features.map((feature: string) => (
                            <span
                              key={feature}
                              className="rounded-full border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:text-success-400"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      }
                    />
                  )}
                  {Array.isArray(plant.tags) && plant.tags.length > 0 && (
                    <Field
                      label="Tags"
                      fullRow
                      value={
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {plant.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      }
                    />
                  )}
                </FieldGrid>
              </Card>
            </div>

            {/* TECHNICAL */}
            <div>
              <SectionDivider label="Technical Parameters" />
              <Card>
                <CardHeader
                  icon={Zap}
                  title="Capacities, Grid & Geometry"
                  iconBg="bg-warning-50 dark:bg-warning-900/20"
                  iconColor="text-warning-600 dark:text-warning-400"
                />
                <FieldGrid cols={4}>
                  <Field label="DC Capacity" value={plant.dc_capacity_kw ? `${plant.dc_capacity_kw} kW` : null} />
                  <Field label="AC Capacity" value={plant.ac_capacity_kw ? `${plant.ac_capacity_kw} kW` : null} />
                  <Field label="Sanctioned Load" value={plant.sanctioned_load_kw ? `${plant.sanctioned_load_kw} kW` : null} />
                  <Field label="Connected Load" value={plant.connected_load_kw ? `${plant.connected_load_kw} kW` : null} />
                  <Field label="Grid Voltage" value={plant.grid_voltage_kv ? `${plant.grid_voltage_kv} kV` : null} />
                  <Field label="Transformer" value={plant.transformer_capacity_kva ? `${plant.transformer_capacity_kva} kVA` : null} />
                  <Field label="Grid Type" value={plant.grid_type} hideWhenEmpty={false} />
                  <Field label="Orientation" value={plant.orientation} />
                  <Field label="Tilt Angle" value={plant.tilt_angle_degrees != null ? `${plant.tilt_angle_degrees}°` : null} />
                  <Field label="Azimuth Angle" value={plant.azimuth_angle_degrees != null ? `${plant.azimuth_angle_degrees}°` : null} />
                  <Field
                    label="Commissioned"
                    value={
                      plant.is_commissioned != null ? (
                        <StatusPill
                          active={plant.is_commissioned}
                          label="Commissioned"
                          inactiveLabel="Not commissioned"
                        />
                      ) : null
                    }
                    hideWhenEmpty={false}
                  />
                  <Field
                    label="Commissioning Date"
                    value={
                      plant.commissioning_date
                        ? new Date(plant.commissioning_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : null
                    }
                  />
                  <Field
                    label="COD Date"
                    value={
                      plant.cod_date
                        ? new Date(plant.cod_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : null
                    }
                    hideWhenEmpty={false}
                  />
                </FieldGrid>
              </Card>
            </div>

            {/* MODULES */}
            {Array.isArray(plant.module_json) && plant.module_json.length > 0 && (
              <div>
                <SectionDivider label="Solar Modules" />
                <Card>
                  <CardHeader
                    icon={Box}
                    title="Module Details"
                    iconBg="bg-warning-50 dark:bg-warning-900/20"
                    iconColor="text-warning-600 dark:text-warning-400"
                  />
                  <div className="p-2 space-y-1">
                    {plant.module_json.map(
                      (rawModule: PlantModuleDetails, i: number) => {
                        const qty = rawModule.module_count ?? rawModule.qty;
                        const make = rawModule.module_brand ?? rawModule.make;
                        const model = rawModule.module_model ?? rawModule.model;
                        const capacityW = rawModule.module_watt_peak ?? rawModule.capacity_w;
                        const technology = rawModule.module_type ?? rawModule.technology;
                        const detailBits = [
                          capacityW ? `${capacityW} W per module` : null,
                          technology,
                          rawModule.string_count != null ? `${rawModule.string_count} strings` : null,
                          rawModule.modules_per_string != null ? `${rawModule.modules_per_string} modules/string` : null,
                          rawModule.bifaciality_factor != null ? `${rawModule.bifaciality_factor} bifaciality` : null,
                          rawModule.efficiency_percent != null ? `${rawModule.efficiency_percent}% eff.` : null,
                          rawModule.module_tilt_angle != null ? `Tilt ${rawModule.module_tilt_angle}°` : null,
                          rawModule.module_azimuth_angle != null ? `Azimuth ${rawModule.module_azimuth_angle}°` : null,
                        ].filter(Boolean);

                        return (
                          <div
                            key={i}
                            className="flex items-center gap-4 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-warning-50 dark:bg-warning-900/20 border border-neutral-300 dark:border-neutral-dark-300">
                              <Sun className="h-4 w-4 text-warning-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                                {[make, model].filter(Boolean).join(" · ") || "Solar Module"}
                              </p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-dark-400 mt-0.5">
                                {detailBits.length > 0 ? detailBits.join(" · ") : "—"}
                              </p>
                            </div>
                            <div className="text-right shrink-0 pr-4 border-r border-neutral-200 dark:border-neutral-dark-200">
                              <p className="text-[11px] text-neutral-400 dark:text-neutral-dark-400">qty</p>
                              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">{qty ?? "—"}</p>
                            </div>
                            {qty != null && capacityW != null && (
                              <div className="text-right shrink-0">
                                <p className="text-[11px] text-neutral-400 dark:text-neutral-dark-400">total</p>
                                <p className="text-sm font-semibold text-success-600 dark:text-success-400">
                                  {((qty * capacityW) / 1000).toFixed(2)} kWp
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </Card>
              </div>
            )}

            {hasPlantJsonContent(botLayerComponents) ? (
              <div>
                <SectionDivider label="Bot Layer" />
                <Card>
                  <CardHeader
                    icon={Layers}
                    title="Bot Layer Components"
                    iconBg="bg-brand-50 dark:bg-brand-900/20"
                    iconColor="text-brand-600 dark:text-brand-400"
                  />
                  <div className="p-4">
                    <DetailCodeBlock className="max-h-[min(32rem,70vh)]">
                      {renderPlantJson(botLayerComponents)}
                    </DetailCodeBlock>
                  </div>
                </Card>
              </div>
            ) : null}

          </div>

          {/* ── RIGHT (1/3 width) ── */}
          <div className="space-y-6">

            {/* LOCATION */}
            <div>
              <SectionDivider label="Location" />
              <Card>
                <CardHeader
                  icon={MapPin}
                  title="Site Location"
                  iconBg="bg-error-50 dark:bg-error-900/20"
                  iconColor="text-error-500 dark:text-error-400"
                />
                <div className="p-4 space-y-3">
                  {plant.location_name && (
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                      {plant.location_name}
                    </p>
                  )}
                  {plant.address && (
                    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-dark-500">
                      {plant.address}
                    </p>
                  )}
                  <div className="space-y-1">
                    {[
                      [plant.city, plant.taluka, plant.district].filter(Boolean).join(", "),
                      [plant.state, plant.country].filter(Boolean).join(", "),
                      plant.pincode,
                    ]
                      .filter(Boolean)
                      .map((line, i) => (
                        <p key={i} className="text-xs text-neutral-600 dark:text-neutral-dark-600">
                          {line}
                        </p>
                      ))}
                  </div>
                  {(plant.timezone || plant.elevation_m != null) && (
                    <div className="flex flex-wrap gap-3 pt-1 text-xs text-neutral-400 dark:text-neutral-dark-400">
                      {plant.timezone && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {plant.timezone}
                        </div>
                      )}
                      {plant.elevation_m != null && (
                        <p>Elevation: {plant.elevation_m} m</p>
                      )}
                    </div>
                  )}
                  {hasCoordinates && (
                    <div className="mt-1 flex items-center gap-2 rounded-xs bg-neutral-50 dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-200 px-3 py-2">
                      <Navigation className="h-3 w-3 text-brand-500 shrink-0" />
                      <span className="font-mono text-[11px] text-brand-700 dark:text-brand-400">
                        {plant.latitude}, {plant.longitude}
                      </span>
                    </div>
                  )}
                  {googleMapEmbedUrl && (
                    <div className="mt-2 relative overflow-hidden rounded-xs border border-neutral-200 dark:border-neutral-dark-200">
                      <button
                        type="button"
                        aria-label="Expand map"
                        title="Expand map"
                        className="absolute top-2 right-2 z-10 rounded-full bg-neutral-dark-200/15 border border-neutral-dark-200/50 p-2 text-neutral-dark-200 backdrop-blur-sm hover:bg-neutral-dark-200/25"
                        onClick={() => setShowMapModal(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <iframe
                        title="Plant location map"
                        src={googleMapEmbedUrl}
                        className="h-52 w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* CONTACT */}
            {(plant.contact_person_name ||
              plant.contact_person_email ||
              plant.contact_person_phone) && (
              <div>
                <SectionDivider label="Contact Person" />
                <Card>
                  <CardHeader
                    icon={User}
                    title="Site Contact"
                    iconBg="bg-brand-50 dark:bg-brand-900/20"
                    iconColor="text-brand-600 dark:text-brand-400"
                  />
                  <div className="p-4">
                    {plant.contact_person_name && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-sm font-semibold text-brand-700 dark:text-brand-400">
                          {plant.contact_person_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                            {plant.contact_person_name}
                          </p>
                          {plant.contact_person_designation && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-dark-400">
                              {plant.contact_person_designation}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {plant.contact_person_email && (
                        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-dark-600">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-dark-400" />
                          <a
                            href={`mailto:${plant.contact_person_email}`}
                            className="text-brand-700 dark:text-brand-400 hover:underline truncate"
                          >
                            {plant.contact_person_email}
                          </a>
                        </div>
                      )}
                      {plant.contact_person_phone && (
                        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-dark-600">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-dark-400" />
                          {plant.contact_person_phone}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div>
              <SectionDivider label="Commissioning" />
              <Card>
                <CardHeader
                  icon={CheckCircle2}
                  title="Plant Commissioning"
                  iconBg="bg-success-50 dark:bg-success-900/20"
                  iconColor="text-success-600 dark:text-success-400"
                />
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400 mb-1">
                        Status
                      </p>
                      <StatusPill
                        active={Boolean(plant.is_commissioned)}
                        label="Commissioned"
                        inactiveLabel="Not commissioned"
                      />
                    </div>
                    {plant.commissioning_date && (
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400 mb-1">
                          Date
                        </p>
                        <p className="text-sm text-neutral-800 dark:text-neutral-dark-900">
                          {new Date(plant.commissioning_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  {canCommissionPlant && !plant.is_commissioned && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={openCommissionModal}
                      disabled={isCommissionActionPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Commission plant
                    </Button>
                  )}
                  {canDecommissionPlant && plant.is_commissioned && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setDecommissionConfirmOpen(true)}
                      disabled={isCommissionActionPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decommission plant
                    </Button>
                  )}
                  {!canCommissionPlant && !canDecommissionPlant && !plant.is_commissioned && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-dark-500">
                      This plant has not been commissioned yet.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {!shouldShowTenant && (
              <div>
                <SectionDivider label="Audit Trail" />
                <Card>
                  <CardHeader
                    icon={Calendar}
                    title="History"
                    iconBg="bg-neutral-100 dark:bg-neutral-dark-200"
                    iconColor="text-neutral-500 dark:text-neutral-dark-500"
                  />
                  <div className="p-4 space-y-4">
                    {[
                      { label: "Created by", name: plant.created_by_name, userId: plant.created_by, date: plant.created_at },
                      { label: "Updated by", name: plant.updated_by_name, userId: plant.updated_by, date: plant.updated_at },
                    ].map(({ label, name, userId, date }) => (
                      <div key={label} className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400 mb-0.5">
                            {label}
                          </p>
                          {userId ? (
                            <Link
                              to={`/users/${userId}/profile`}
                              className="text-sm font-medium text-brand-700 dark:text-brand-400 hover:underline"
                            >
                              {name || userId}
                            </Link>
                          ) : (
                            <p className="text-sm text-neutral-300 dark:text-neutral-dark-300">—</p>
                          )}
                        </div>
                        {date && (
                          <div className="text-right mt-auto shrink-0">
                            <p className="font-mono text-[11px] text-neutral-400 dark:text-neutral-dark-400">
                              {formateDateTime(date)}
                            </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {plant.updated_at && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-200">
                    <Clock className="h-3 w-3 text-neutral-400 dark:text-neutral-dark-400 shrink-0" />
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-dark-400">
                      Last updated{" "}
                     {formateDateTime(plant.updated_at)}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

            {/* COMMERCIAL */}
            <div>
              <SectionDivider label="Commercial" />
              <Card>
                <CardHeader
                  icon={DollarSign}
                  title="PPA & Financial"
                  iconBg="bg-success-50 dark:bg-success-900/20"
                  iconColor="text-success-600 dark:text-success-400"
                />
                <FieldGrid>
                  <Field label="PPA Rate" value={plant.ppa_rate ? `₹${plant.ppa_rate} / kWh` : null} />
                  <Field label="PPA Escalation" value={plant.ppa_escalation_percent != null ? `${plant.ppa_escalation_percent}%` : null} />
                  <Field label="PPA Duration" value={plant.ppa_duration_years ? `${plant.ppa_duration_years} years` : null} />
                  <Field label="Revenue Type" value={plant.revenue_type?.toString()} />
                  <Field label="Tariff Type" value={plant.tariff_type} />
                  <Field
                    label="Net Metering"
                    value={
                      plant.net_metering != null ? (
                        <StatusPill active={plant.net_metering} label="Enabled" inactiveLabel="Disabled" />
                      ) : null
                    }
                  />
                </FieldGrid>
              </Card>
            </div>

          </div>
        </div>
      </DetailMain>

      {/* image expand modal */}
      <Modal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Plant Image"
        subtitle={plant?.plant_name || "Plant"}
        icon={Maximize2}
        maxWidth="max-w-4xl"
        centerModal
      >
        {plant?.plant_image ? (
          <div className="w-full">
            <img
              src={plant.plant_image}
              alt={plant.plant_name || "Plant"}
              className="max-h-[70vh] w-full rounded-xs object-contain border border-neutral-200 dark:border-neutral-dark-200"
            />
          </div>
        ) : (
          <div className="text-sm text-neutral-500 dark:text-neutral-dark-500">No image available.</div>
        )}
      </Modal>

      {/* map expand modal */}
      <Modal
        open={showMapModal}
        onClose={() => setShowMapModal(false)}
        title="Plant Location"
        subtitle={hasCoordinates ? `${plant.latitude}, ${plant.longitude}` : undefined}
        icon={MapPin}
        maxWidth="max-w-5xl"
        centerModal
      >
        {googleMapEmbedUrl ? (
          <div className="overflow-hidden rounded-xs border border-neutral-200 dark:border-neutral-dark-200">
            <iframe
              title="Plant location map expanded"
              src={googleMapEmbedUrl}
              className="h-[65vh] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="text-sm text-neutral-500 dark:text-neutral-dark-500">No coordinates available.</div>
        )}
      </Modal>

      {/* edit modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Plant"
        subtitle={plant?.plant_name || "Update plant details"}
        icon={Edit}
        maxWidth="max-w-4xl"
      >
        {plant && showEdit && (
          <PlantForm
            mode="edit"
            initialValues={plant}
            onSuccess={() => setShowEdit(false)}
            isOpen={showEdit}
          />
        )}
      </Modal>

      {/* commission modal */}
      <Modal
        open={showCommissionModal}
        onClose={() => {
          if (isCommissionActionPending) return;
          setShowCommissionModal(false);
        }}
        title="Commission Plant"
        subtitle={plant?.plant_name || "Set commissioning date"}
        icon={CheckCircle2}
        maxWidth="max-w-md"
        centerModal
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-dark-600">
            Mark this plant as commissioned. Commissioned plants cannot be deleted.
          </p>
          <Input
            label="Commissioning date"
            type="date"
            star
            value={commissionDate}
            onChange={(e) => setCommissionDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setShowCommissionModal(false)}
              disabled={isCommissionActionPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommission}
              disabled={isCommissionActionPending || !commissionDate.trim()}
            >
              {commissionMutation.isPending ? "Saving…" : "Commission"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* decommission confirm */}
      <ConfirmationDialog
        open={decommissionConfirmOpen}
        onClose={() => {
          if (isCommissionActionPending) return;
          setDecommissionConfirmOpen(false);
        }}
        onConfirm={handleDecommission}
        title="Decommission Plant"
        message="This will mark the plant as not commissioned. You can commission it again later with a new date."
        confirmText="Decommission"
        cancelText="Cancel"
        type="warning"
        isLoading={decommissionMutation.isPending}
      />

      {/* delete confirm */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Plant"
        message={
          plant?.is_commissioned
            ? "This plant is commissioned and cannot be deleted. Decommission it first if you need to remove it."
            : "Are you sure you want to delete this plant? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default PlantDetails;
