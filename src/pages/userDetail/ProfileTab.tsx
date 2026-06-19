/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Mail, Phone, Shield, Calendar, Edit2, Building2,
  RefreshCw, Camera, Upload, ImagePlus, Leaf, UserCheck,
  UserX, Globe, Smartphone, Pencil, Lock, Key, Zap,
  CheckCircle2, XCircle, ChevronRight,
  User,
} from "lucide-react";
import {
  avatarUploadCapability,
  useGetMyDetailProfileQuery,
  useGetUserDetailProfileQuery,
} from "@/services/operations/profileAPI";
import { useToggleUserStatusMutation } from "@/services/operations/userAPI";
import {
  useGetPlantNamesQuery,
  type PlantOption,
} from "@/services/operations/plantAPI";
import Spinner from "@/components/common/Spinner";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";
import UserForm from "@/components/core/form/UserForm";
import UserMeForm from "@/components/core/form/UserMeForm";
import ChangeMyContactForm from "@/components/core/form/ChangeMyContactForm";
import ChangeMyPasswordForm from "@/components/core/form/ChangeMyPasswordForm";
import { formateDateTime } from "@/utils/gridFormatters";
import Modal from "@/components/common/Modal";
import toast from "react-hot-toast";
import Avatar from "@/components/common/Avatar";

interface UserDetailProfilePageProps { context: "me" | "user" }
type ContactField = "email" | "phone" | null;

/* ─── tiny helpers ─── */

function parsePlants(raw: any): PlantOption[] {
  const list = raw?.data?.plants ?? raw?.data?.data?.plants ?? raw?.plants ?? raw?.data ?? [];
  return Array.isArray(list) ? list : [];
}
function plantName(p: PlantOption) {
  return p.display_name ?? p.name ?? p.plant_name ?? p.id;
}

/* ─── design primitives ─── */

/** Pill badge */
const RolePill: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string, string> = {
    super_admin: "bg-brand-600 text-white",
    admin: "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300",
    tenant: "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400",
    user: "bg-neutral-100 dark:bg-neutral-dark-200 text-neutral-600 dark:text-neutral-dark-600",
  };
  return (
    <span className={`inline-block rounded-xs px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest ${map[role] ?? map.user}`}>
      {role.replace("_", " ")}
    </span>
  );
};

/** Boolean indicator */
const BoolIndicator: React.FC<{ v: boolean; trueLabel?: string; falseLabel?: string }> = ({
  v, trueLabel = "Enabled", falseLabel = "Disabled",
}) => v ? (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-600 dark:text-success-400">
    <CheckCircle2 className="h-3.5 w-3.5" />{trueLabel}
  </span>
) : (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 dark:text-neutral-dark-400">
    <XCircle className="h-3.5 w-3.5" />{falseLabel}
  </span>
);

/** Empty state */
const Empty: React.FC<{ icon: React.ElementType; message: string }> = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center gap-2 py-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-xs bg-neutral-100 dark:bg-neutral-dark-200">
      <Icon className="h-5 w-5 text-neutral-300 dark:text-neutral-dark-400" />
    </div>
    <p className="text-sm text-neutral-400 dark:text-neutral-dark-400">{message}</p>
  </div>
);

/* ─── main component ─── */

const UserDetailProfilePage: React.FC<UserDetailProfilePageProps> = ({ context }) => {
  const { id } = useParams<{ id: string }>();

  const myProfileQuery = useGetMyDetailProfileQuery(context === "me");
  const userProfileQuery = useGetUserDetailProfileQuery(context === "user" ? id : null);
  const query = context === "me" ? myProfileQuery : userProfileQuery;

  const loggedUser = useAppSelector((s) => s.auth.user);
  const userPermissions = useAppSelector((s) => s.auth.permissions);
  const canEditUser = hasPermission(userPermissions, PERMISSIONS.USER.UPDATE as any);
  const canEditMyProfile = hasPermission(userPermissions, PERMISSIONS.USER.UPDATE_MY_PROFILE as any);
  const canChangeMyPassword = hasPermission(userPermissions, PERMISSIONS.USER.CHANGE_MY_PASSWORD as any);
  const isAdminOrSuperAdmin = loggedUser?.role === "admin" || loggedUser?.role === "super_admin";
  const toggleStatus = useToggleUserStatusMutation();

  const [showEdit, setShowEdit] = useState(false);
  const [activeContactForm, setActiveContactForm] = useState<ContactField>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarName, setPendingAvatarName] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const raw = (query.data as any)?.data;
  const profile = raw?.user ?? raw?.data?.user ?? raw ?? null;
  const permissions: string[] = raw?.permissions ?? profile?.permissions ?? [];
  const shouldShowPlants = profile?.role === "user" || profile?.role === "tenant";

  const plantsQuery = useGetPlantNamesQuery({
    enabled: shouldShowPlants,
    user_id: context === "user" && profile?.role === "user" ? (id ?? null) : null,
    tenant_id: context === "user" && profile?.role === "tenant" ? (profile?.tenant_id ?? null) : null,
  });
  const plants: PlantOption[] = parsePlants(plantsQuery?.data);

  useEffect(() => {
    return () => { if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl); };
  }, [pendingAvatarUrl]);

  /* loading */
  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={3} />
      </div>
    );
  }

  /* error */
  if (query.isError || !profile) {
    return (
      <div className="p-6">
        <div className="rounded-xs border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 p-4 text-sm text-error-700 dark:text-error-400">
          Failed to load profile data.
        </div>
      </div>
    );
  }

  const fullName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "-";
  const initials =
    [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const isSelf = context === "me";
  const canEditOtherUser = context === "user" && !isSelf && isAdminOrSuperAdmin && canEditUser;
  const canOpenEdit = (isSelf && canEditMyProfile) || canEditOtherUser;
  const canOpenChangePassword = isSelf && canChangeMyPassword && profile?.is_password_login_enable;
  const canToggleUserStatus = context === "user" && canEditOtherUser;
  const canShowActions = canOpenEdit || canOpenChangePassword || canToggleUserStatus;
  const shouldShowTenant = profile.role === "user" || profile.role === "tenant";
  const displayAvatarUrl = avatarPreviewUrl || profile.avatar_url || null;

  const resetPendingAvatar = () => {
    if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
    setPendingAvatarUrl(null); setPendingAvatarName(""); setAvatarError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };
  const closeAvatarModal = () => { resetPendingAvatar(); setShowAvatarModal(false); };
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) { setAvatarError("Please choose an image file."); e.target.value = ""; return; }
    const maxBytes = avatarUploadCapability.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) { setAvatarError(`Max ${avatarUploadCapability.maxFileSizeMb} MB.`); e.target.value = ""; return; }
    if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
    setPendingAvatarUrl(URL.createObjectURL(file));
    setPendingAvatarName(file.name);
  };
  const applyAvatarPreview = () => {
    if (!pendingAvatarUrl) { setAvatarError("Please choose a file first."); return; }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(pendingAvatarUrl);
    setPendingAvatarUrl(null); setPendingAvatarName(""); setAvatarError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    setShowAvatarModal(false);
    toast.success("Avatar updated for this session.");
  };

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-dark-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">

        {/* ══════════════════════════════════════════════════════
            HERO — split layout: left identity panel + right stats
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* LEFT — identity card */}
          <div className="lg:col-span-3 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 overflow-hidden">
            {/* top gradient strip */}
            <div className="relative h-24 bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 overflow-hidden">
              {/* decorative rings */}
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-xs border border-white/10" />
              <div className="absolute -right-2 -top-10 h-36 w-36 rounded-xs border border-white/10" />
              <div className="absolute right-4 top-4 h-14 w-14 rounded-xs border border-white/10" />
            </div>

            <div className="px-4 pb-5 pt-3 sm:px-5">
              {/* avatar + name */}
              <div className="relative -mt-10 sm:-mt-11 mb-5 flex min-w-0 items-start gap-3">
                <div className="h-14 w-14 shrink-0 group sm:h-16 sm:w-16">
                  <Avatar  label={fullName} src={displayAvatarUrl} size={64} className="h-full w-full !rounded-xs border border-white/70 bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-bold !text-white shadow-sm dark:border-neutral-dark-200"
                  />
                  {canOpenEdit && (
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute h-14 w-14 sm:h-16 sm:w-16 inset-0 rounded-xs bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Update avatar"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden pt-1">
                  <h1 className="truncate text-xl font-bold leading-tight text-neutral-100 sm:text-2xl" title={fullName}>
                    {fullName}
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-dark-500 mt-0.5 truncate">
                    {profile.username ? `@${profile.username}` : profile.email}
                  </p>
                </div>
              </div>

              {/* pills row */}
              <div className="flex items-center flex-wrap gap-2 mb-5">
                <RolePill role={profile.role ?? "user"} />
                <span className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-0.5 text-xs font-semibold border ${
                  profile.is_active
                    ? "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800"
                    : "bg-neutral-100 dark:bg-neutral-dark-200 text-neutral-500 dark:text-neutral-dark-500 border-neutral-200 dark:border-neutral-dark-300"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-xs ${profile.is_active ? "bg-success-500" : "bg-neutral-400"}`} />
                  {profile.is_active ? "Active" : "Inactive"}
                </span>
                {isSelf && (
                  <span className="inline-flex items-center gap-1 rounded-xs bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-400">
                    You
                  </span>
                )}
                {profile.tenant_name && !shouldShowTenant && (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-dark-500">
                    <Building2 className="h-3 w-3" /> {profile.tenant_name}
                  </span>
                )}
              </div>

              {/* quick contact */}
              <div className="space-y-2">
                {profile.email && (
                  <div className="flex items-center gap-2 rounded-xs bg-neutral-50 dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-200 px-3 py-2.5 group">
                    <Mail className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-dark-400 shrink-0" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-dark-800 truncate flex-1">{profile.email}</span>
                    {isSelf && (
                      <button
                        type="button"
                        onClick={() => setActiveContactForm("email")}
                        className="transition-opacity flex h-6 w-6 items-center justify-center rounded-xs bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                {(profile.phone || isSelf) && (
                  <div className="flex items-center gap-2 rounded-xs bg-neutral-50 dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-200 px-3 py-2.5 group">
                    <Phone className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-dark-400 shrink-0" />
                    <span className={`text-sm flex-1 truncate ${profile.phone ? "text-neutral-700 dark:text-neutral-dark-800" : "text-neutral-300 dark:text-neutral-dark-400 italic"}`}>
                      {profile.phone || "No phone set"}
                    </span>
                    {isSelf && (
                      <button
                        type="button"
                        onClick={() => setActiveContactForm("phone")}
                        className="transition-opacity flex h-6 w-6 items-center justify-center rounded-xs bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — action + meta stacked cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* action buttons */}
            {canShowActions && (
              <div className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400 mb-2">Actions</p>
                <div className="w-full flex gap-2">
                  {canOpenEdit && (
                    <button
                      onClick={() => setShowEdit(true)}
                      className="flex-1 flex items-center justify-between gap-1.5 px-2 py-3 rounded-xs border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors text-xs font-medium"
                    >
                      <span className="flex items-center gap-1.5"><Edit2 className="h-3 w-3" /> Edit profile</span>
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </button>
                  )}
                  {canOpenChangePassword && (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="flex-1 flex items-center justify-between gap-1.5 px-2 py-3 rounded-xs border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors text-xs font-medium"
                    >
                      <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Change password</span>
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </button>
                  )}
                  {canToggleUserStatus && (
                    <button
                      onClick={() => profile.id && toggleStatus.mutate(profile.id)}
                      disabled={toggleStatus.isPending}
                      className={`flex-1 flex items-center justify-between gap-2 px-2 py-2 rounded-xs border transition-colors text-xs font-medium disabled:opacity-50 ${
                        profile.is_active
                          ? "border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-900/30"
                          : "border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/30"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {toggleStatus.isPending
                          ? <RefreshCw className="h-3 w-3 animate-spin" />
                          : profile.is_active
                            ? <UserX className="h-3 w-3" />
                            : <UserCheck className="h-3 w-3" />}
                        {profile.is_active ? "Deactivate" : "Activate"}
                      </span>
                      <ChevronRight className="h-3 w-3  opacity-50" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* meta info */}
            <div className="flex-1 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-dark-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400">Account info</p>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-dark-200">
                {profile.created_at && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-neutral-100 dark:bg-neutral-dark-200 shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-dark-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400 mb-0.5">Joined</p>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-dark-800">{formateDateTime(profile.created_at)}</p>
                    </div>
                  </div>
                )}
                {!isSelf && loggedUser?.role !== "tenant" && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-neutral-100 dark:bg-neutral-dark-200 shrink-0">
                      <UserCheck className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-dark-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400 mb-0.5">Created by</p>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-dark-800">{profile.created_by_name}</p>
                    </div>
                  </div>
                 )}
                {loggedUser?.role !== "tenant" && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-neutral-100 dark:bg-neutral-dark-200 shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-dark-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400 mb-0.5">Tenant</p>
                      {profile.tenant_name && profile.tenant_id ? (
                        <Link to={`/tenant/${profile.tenant_id}`} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                          {profile.tenant_name}
                        </Link>
                      ) : (
                        <p className="text-xs text-neutral-300 dark:text-neutral-dark-400 italic">—</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ACCESS & LOGIN — horizontal card strip
        ══════════════════════════════════════════════════════ */}
        {(
          profile.web_login_enabled !== undefined ||
          profile.app_login_enabled !== undefined ||
          profile.is_password_login_enable !== undefined ||
          profile.is_otp_login_enable !== undefined ||
          profile.enable_api_access !== undefined
        ) && (
          <div className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-dark-200 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-warning-50 dark:bg-warning-900/20">
                <Shield className="h-3.5 w-3.5 text-warning-600 dark:text-warning-400" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-dark-500">
                Access & Login
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y divide-neutral-100 dark:divide-neutral-dark-200 [&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(n+4)]:border-t-0 md:[&>*]:border-t-0">
              {[
                { icon: Globe, label: "Web Login", value: profile.web_login_enabled },
                { icon: Smartphone, label: "App Login", value: profile.app_login_enabled },
                { icon: Lock, label: "Password", value: profile.is_password_login_enable },
                { icon: Key, label: "OTP Login", value: profile.is_otp_login_enable },
                { icon: Zap, label: "API Access", value: profile.enable_api_access },
              ].filter(({ value }) => value !== undefined).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center justify-center gap-2 px-4 py-5 text-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xs ${
                    value
                      ? "bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800"
                      : "bg-neutral-100 dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-300"
                  }`}>
                    <Icon className={`h-4 w-4 ${value ? "text-success-600 dark:text-success-400" : "text-neutral-400 dark:text-neutral-dark-400"}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-400 mb-0.5">{label}</p>
                    <BoolIndicator v={!!value} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PLANTS — masonry chip grid
        ══════════════════════════════════════════════════════ */}
        {shouldShowPlants && (
          <div className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-dark-200 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-success-50 dark:bg-success-900/20">
                <Leaf className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-dark-500">
                Assigned Plants
              </span>
              {plants.length > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-xs bg-success-100 dark:bg-success-900/30 px-1.5 text-[10px] font-bold text-success-700 dark:text-success-400">
                  {plants.length}
                </span>
              )}
            </div>
            <div className="p-5">
              {plantsQuery?.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-dark-400 py-2">
                  <Spinner size={1} /> Loading plants…
                </div>
              ) : plants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {plants.map((p) => (
                    <Link
                      key={p.id}
                      to={`/plants/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xs border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20 px-3 py-1.5 text-xs font-medium text-success-700 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/40 transition-colors"
                    >
                      <Leaf className="h-3 w-3 shrink-0" />
                      {plantName(p)}
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty icon={Leaf} message="No plants assigned." />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PERMISSIONS — compact tag wall
        ══════════════════════════════════════════════════════ */}
        {isAdminOrSuperAdmin &&permissions.length > 0 && (
          <div className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-0 dark:bg-neutral-dark-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-dark-200 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 dark:bg-brand-900/20">
                <Shield className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-dark-500">
                Permissions
              </span>
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-xs bg-brand-100 dark:bg-brand-900/30 px-1.5 text-[10px] font-bold text-brand-700 dark:text-brand-400">
                {permissions.length}
              </span>
            </div>
            <div className="p-5 flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-xs border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 text-[11px] font-mono font-medium text-brand-700 dark:text-brand-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODALS — logic completely unchanged
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={showEdit && canOpenEdit}
        onClose={() => setShowEdit(false)}
        title={isSelf ? "Edit My Profile" : "Edit User"}
        maxWidth={isSelf ? "max-w-xl" : "max-w-4xl"}
        icon={User}
      >
        {showEdit && canOpenEdit && isSelf ? (
          <UserMeForm initialValues={profile} onSuccess={() => setShowEdit(false)} close={() => setShowEdit(false)} />
        ) : showEdit && canOpenEdit ? (
          <UserForm mode="edit" initialValues={profile} onSuccess={() => setShowEdit(false)} />
        ) : null}
      </Modal>

      <Modal
        open={activeContactForm !== null}
        onClose={() => setActiveContactForm(null)}
        title={activeContactForm === "phone" ? "Change Phone" : "Change Email"}
        maxWidth="max-w-md"
        centerModal
      >
        {activeContactForm && (
          <ChangeMyContactForm
            mode={activeContactForm}
            currentValue={activeContactForm === "phone" ? (profile.phone ?? "") : (profile.email ?? "")}
            onSuccess={() => setActiveContactForm(null)}
            close={() => setActiveContactForm(null)}
          />
        )}
      </Modal>

      <Modal
        open={showChangePassword && canOpenChangePassword}
        onClose={() => setShowChangePassword(false)}
        title="Change Password"
        maxWidth="max-w-md"
        centerModal
      >
        {showChangePassword && canOpenChangePassword && (
          <ChangeMyPasswordForm
            onSuccess={() => setShowChangePassword(false)}
            close={() => setShowChangePassword(false)}
          />
        )}
      </Modal>

      <Modal
        open={showAvatarModal}
        onClose={closeAvatarModal}
        title="Update Avatar"
        subtitle="Manage the profile image for this account."
        maxWidth="max-w-md"
        centerModal
      >
        <div className="space-y-4">
          {/* preview */}
          <div className="flex items-center gap-4 rounded-xs bg-neutral-50 dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-200 p-4">
            {pendingAvatarUrl || displayAvatarUrl ? (
              <img
                src={pendingAvatarUrl || displayAvatarUrl || ""}
                alt={fullName}
                className="h-16 w-16 rounded-xs object-cover border border-neutral-200 dark:border-neutral-dark-300 shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-xs bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-950">{fullName}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-dark-400 break-all mt-0.5 font-mono">
                {pendingAvatarName || "no file chosen"}
              </p>
            </div>
          </div>

          {/* drop zone */}
          <div className="rounded-xs border-2 border-dashed border-neutral-200 dark:border-neutral-dark-300 bg-neutral-50 dark:bg-neutral-dark-200/40 p-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xs bg-brand-50 dark:bg-brand-900/20">
              <ImagePlus className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-950">Drop an image or browse</p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-dark-400">Preview before applying</p>
            <input ref={avatarInputRef} type="file" accept={avatarUploadCapability.acceptedFileTypes} className="hidden" onChange={handleAvatarFileChange} />
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xs bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Choose File
              </button>
              {pendingAvatarUrl && (
                <button
                  type="button"
                  onClick={resetPendingAvatar}
                  className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-dark-800 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {avatarError && <p className="mt-2 text-xs text-error-600 dark:text-error-400">{avatarError}</p>}
          </div>

          {/* constraints */}
          <div className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-dark-200">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-neutral-500 dark:text-neutral-dark-500">Accepted files</span>
              <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-dark-800">{avatarUploadCapability.acceptedFileTypes}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-neutral-500 dark:text-neutral-dark-500">Max size</span>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-dark-800">{avatarUploadCapability.maxFileSizeMb} MB</span>
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeAvatarModal}
              className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-dark-800 hover:bg-neutral-50 dark:hover:bg-neutral-dark-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyAvatarPreview}
              disabled={!pendingAvatarUrl}
              className="rounded-xs bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetailProfilePage;
