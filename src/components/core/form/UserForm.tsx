
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  Controller,
} from "react-hook-form";
import { useAppSelector } from "@/store/hooks";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Spinner from "@/components/common/Spinner";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import { type SingleValue, type MultiValue } from "react-select";
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserProfileQuery,
  type CreateUserInput,
  type UpdateUserInput,
  type UserRow,
} from "@/services/operations/userAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import {
  useGetPlantNamesQuery,
  type PlantOption,
} from "@/services/operations/plantAPI";
import { Settings, Factory, Shield, Info } from "lucide-react";
import { canGetAllTenantNames } from "@/utils/permissions";
import { applyBackendErrors, USERNAME_PATTERN, PHONE_PATTERN, sanitizePhoneInput } from "@/utils/formValidators";
import { USER_ROLE_OPTIONS } from "@/utils/selectOptions";
import Password from "@/components/common/Password";
import PermissionPicker from "@/components/common/PermissionPicker";
import Toggle from "@/components/common/Toggle";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import FormModeToggle from "@/components/common/FormModeToggle";

// ── Types ────────────────────────────────────────────────────────────────────

type UserFormMode = "create" | "edit";

type UserFormValues = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  password?: string | null;
  tenant_id?: string | null;
  plant_ids: string[];
  permissions: string[];

  web_max_login_number?: number | null;
  app_max_login_number?: number | null;
  web_login_enabled?: boolean;
  app_login_enabled?: boolean;
  enable_api_access?: boolean;
  is_password_login_enable?: boolean;
  is_otp_login_enable?: boolean;
  is_active: boolean;
};

type UserFormProps = {
  mode?: UserFormMode;
  initialValues?: Partial<UserRow>;
  editValues?: Partial<UserRow>;
  onSuccess?: () => void;
};

const ROLE_OPTIONS: Option[] = USER_ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));



const resolveEditUserPayload = (value: unknown): Partial<UserRow> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const nested = record?.data as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && "user" in nested) {
    return nested.user as Partial<UserRow>;
  }
  return record as Partial<UserRow>;
};

const toUserFormValues = (
  value: Partial<UserRow> | null | undefined,
): UserFormValues => ({
  first_name: value?.first_name ?? "",
  last_name: value?.last_name ?? "",
  username: value?.username ?? "",
  email: value?.email ?? "",
  phone: value?.phone ?? "",
  role: value?.role ?? "",
  password: "",
  tenant_id: value?.tenant_id ?? null,
  plant_ids: value?.plant_ids ?? [],
  permissions: value?.permissions ?? [],
  web_max_login_number: value?.web_max_login_number ?? null,
  app_max_login_number: value?.app_max_login_number ?? null,
  web_login_enabled: value?.web_login_enabled ?? true,
  app_login_enabled: value?.app_login_enabled ?? true,
  enable_api_access: value?.enable_api_access ?? false,
  is_password_login_enable: value?.is_password_login_enable ?? true,
  is_otp_login_enable: value?.is_otp_login_enable ?? false,
  is_active: value?.is_active ?? true,
});

// ── Component ─────────────────────────────────────────────────────────────────

const UserForm = ({
  mode = "create",
  initialValues,
  editValues: externalEditValues,
  onSuccess,
}: UserFormProps) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);

  // Fetch fresh user details when editing
  const editUserId = externalEditValues?.id ?? initialValues?.id ?? null;
  const { data: userProfileResp, isLoading: isLoadingProfile } =
    useGetUserProfileQuery(isEdit ? editUserId : null);

  const editValues = useMemo(() => {
    // userProfileResp is the freshest source; fall back to props
    return (
      resolveEditUserPayload(userProfileResp) ??
      resolveEditUserPayload(externalEditValues) ??
      resolveEditUserPayload(initialValues)
    );
  }, [externalEditValues, userProfileResp, initialValues]);

  const loggedInUser = useAppSelector((state) => state.auth.user);
  const userPermissions = useAppSelector((state) => state.auth.permissions);

  // Is the current logged-in user an admin or super_admin?
  const isCreatorAdmin =
    loggedInUser?.role === "admin" || loggedInUser?.role === "super_admin";
  const isCreatorTenant = loggedInUser?.role === "tenant";

  // Can the current user see all tenant names?
  const showTenantDropdown = canGetAllTenantNames(userPermissions);
  const roleOptions = useMemo(
    () =>
      loggedInUser?.role === "tenant"
        ? ROLE_OPTIONS.filter((option) => option.value === "user")
        : ROLE_OPTIONS,
    [loggedInUser?.role],
  );

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<UserFormValues>({

    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      phone: "",
      role: !isEdit && isCreatorTenant ? "user" : "",
      password: "",
      tenant_id: null,
      plant_ids: [],
      permissions: [],
      web_max_login_number: 5,
      app_max_login_number: 5,
      web_login_enabled: true,
      app_login_enabled: true,
      enable_api_access: false,
      // Default true so password field shows immediately on step 1
      is_password_login_enable: false,
      is_otp_login_enable: true,
      is_active: true,
    },
  });

  useEffect(() => {
    register("role", {
      validate: (value) => {
        if (isEdit || isCreatorTenant) return true;
        return String(value ?? "").trim() !== "" || "Role is required.";
      },
    });
  }, [isCreatorTenant, isEdit, register]);

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit && editValues) {
      reset(toUserFormValues(editValues));
    }
  }, [isEdit, editValues, reset]);

  const watchedRole = useWatch({ control, name: "role" });
  const watchedTenantId = useWatch({ control, name: "tenant_id" });
  const watchedPermissions = useWatch({ control, name: "permissions" }) ?? [];
  const effectiveRole = watchedRole || (!isEdit && isCreatorTenant ? "user" : "");
  // Watch is_password_login_enable so password field toggles reactively
  const watchedIsPasswordLogin = useWatch({ control, name: "is_password_login_enable" });
  const watchedOtpLoginEnabled = useWatch({ control, name: "is_otp_login_enable" });
  const watchedWebLoginEnabled = useWatch({ control, name: "web_login_enabled" });
  const watchedAppLoginEnabled = useWatch({ control, name: "app_login_enabled" });
  const watchedApiAccessEnabled = useWatch({ control, name: "enable_api_access" });
  const watchedIsActive = useWatch({ control, name: "is_active" });

  // Is the selected role "admin"? If so, hide Tenant & Plants section
  const isRoleAdmin = effectiveRole === "admin";
  const showAssignmentSection = effectiveRole === "user" || effectiveRole === "tenant";

  // ── Tenant options — loaded lazily inside AsyncSelect on open ──────────────
  // We remember the label so the selected chip shows a name, not a UUID.
  const [selectedTenantLabel, setSelectedTenantLabel] = useState<string>("");
  const resolvedTenantLabel =
    selectedTenantLabel || String(editValues?.tenant_name || "");

  // On edit mode, resolve the initial tenant_id → display name once.
  // fetchTenantNames is a plain async fn so we can call it inside useEffect.
  const tenantLabelFetchedRef = useRef(false);
  useEffect(() => {
    if (!isEdit || !editValues?.tenant_id) return;
    if (tenantLabelFetchedRef.current) return; // ref guard, no re-run
    tenantLabelFetchedRef.current = true; // mark before async to prevent race
    let cancelled = false;
    fetchTenantNames().then((opts) => {
      if (cancelled) return;
      const match = opts.find(
        (o) => o.value === String(editValues.tenant_id),
      );
      if (match) setSelectedTenantLabel(match.label);
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit, editValues?.tenant_id]);

  // ── Plant options ───────────────────────────────────────────────────────────
  const effectiveTenantId = watchedTenantId ?? (isEdit ? (editValues?.tenant_id ?? null) : null);
  const plantsEnabled =
    showAssignmentSection && (!showTenantDropdown || !!effectiveTenantId);

  const { data: plantsResp, isLoading: isLoadingPlants } =
    useGetPlantNamesQuery({
      tenant_id: effectiveTenantId,
      enabled: plantsEnabled,
    });

  const plantOptions: PlantOption[] = useMemo(() => {
    const raw = (plantsResp as { data?: { plants?: PlantOption[] } } | undefined)?.data?.plants ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [plantsResp]);

  // ── Plant label map ─────────────────────────────────────────────────────────
  const selectedPlantMap = useMemo(() => {
    return Object.fromEntries(
      plantOptions.map((p) => [
        String(p.id),
        String(p.display_name || p.name || p.plant_name || p.id),
      ]),
    );
  }, [plantOptions]);

  const plantsHaveData = plantOptions.length > 0;

  const loadPlantOptions = useCallback(async (): Promise<Option[]> => {
    return plantOptions.map((p) => ({
      value: String(p.id),
      label: String(p.display_name || p.name || p.plant_name || p.id),
    }));
  }, [plantOptions]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = (data: UserFormValues) => {
    const finalData: CreateUserInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username.trim() || null,
      email: data.email,
      phone: data.phone || null,
      role: data.role || null,
      tenant_id: isRoleAdmin ? null : data.tenant_id || null,
      plant_ids: isRoleAdmin
        ? null
        : data.plant_ids?.length
          ? data.plant_ids
          : null,
      permissions: data.permissions?.length ? data.permissions : null,
      is_active: data.is_active,
      is_password_login_enable: data.is_password_login_enable,
      is_otp_login_enable: data.is_otp_login_enable,
      web_login_enabled: data.web_login_enabled,
      app_login_enabled: data.app_login_enabled,
      web_max_login_number: data.web_max_login_number,
      app_max_login_number: data.app_max_login_number,
      enable_api_access: data.enable_api_access
    };

    // Only send password on create when password login is enabled
    if (!isEdit && data.is_password_login_enable && data.password) {
      finalData.password = data.password;
    }

    // Password updates are admin-only on the backend; send only when provided.
    if (isEdit && isCreatorAdmin && data.password) {
      finalData.password = data.password;
    }

    if (isEdit && editValues?.id) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { role: _omitRole, ...restFinalData } = finalData;
      const updatePayload: UpdateUserInput = {
        id: editValues.id,
        ...restFinalData,
      };
      updateMutation.mutate(updatePayload, {
        onSuccess: () => onSuccess?.(),
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    } else {
      createMutation.mutate(finalData, {
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isEdit && isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={3} />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex h-full flex-col gap-2"
      noValidate
    >
      <div>
        {/* ── Form Mode Toggle ── */}
        <FormModeToggle
          showAdvanced={showAdvanced}
          onToggle={() => setShowAdvanced((prev) => !prev)}
          className="!absolute right-14 top-5 z-10"
        />

        {/* ── Step 1: Basic Info ── */}
        <section className="space-y-2">
          <SectionSubHeader
            icon={Info}
            title="Basic Information"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              label="First Name"
              star
              {...register("first_name", { required: "First name is required." })}
              errors={errors.first_name}
              placeholder="First Name"
            />
            <Input
              label="Last Name"
              {...register("last_name")}
              errors={errors.last_name}
              placeholder="Last Name"
            />
            <Input
              label="Username"
              star
              {...register("username", {
                required: "Username is required.",
                pattern: {
                  value: USERNAME_PATTERN,
                  message:
                    "Username must start with a letter and contain 3-32 letters, numbers, or underscores.",
                },
              })}
              errors={errors.username}
              placeholder="Username"
              className="md:col-span-2"
            />
            <Input
              label="Email"
              star
              type="email"
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              })}
              errors={errors.email}
              placeholder="email"
              className="md:col-span-2"
            />

            {/* Role — read-only in edit mode */}
            <div className="flex flex-col gap-1 w-full">
              <AsyncSelect
                label="Role"
                star={!isEdit}
                isDisabled={isEdit}
                name="role"
                loadOptions={async () => roleOptions}
                isMulti={false}
                placeholder="Select role"
                value={
                  watchedRole
                    ? {
                      value: watchedRole,
                      label:
                        roleOptions.find((r) => r.value === watchedRole)
                          ?.label ?? watchedRole,
                    }
                    : null
                }
                onChange={(v: SingleValue<Option> | MultiValue<Option>) => {
                  const selected = v as SingleValue<Option>;
                  setValue("role", selected?.value ?? null, { shouldValidate: true });
                  setValue("plant_ids", [], { shouldValidate: true });
                }}
                errors={errors.role as { message?: string } | undefined}
              />
            </div>

            <Input
              label="Phone"
              star
              {...register("phone", {
                required: "Phone number is required.",
                validate: (value) =>
                  !value || PHONE_PATTERN.test(value) || "Phone number must be exactly 10 digits.",
              })}
              errors={errors.phone}
              placeholder="Phone Number"
              inputMode="numeric"
              maxLength={10}
              onInput={sanitizePhoneInput}
            />

            <Toggle
              label="Enable Password Login"
              className="mt-auto"
              {...register("is_password_login_enable")}
              checked={!!watchedIsPasswordLogin}
              id="is_password_login_enable_basic"
            />

            {isEdit && isCreatorAdmin && watchedIsPasswordLogin && (
              <Password
                label="New Password"
                {...register("password", {
                  minLength: { value: 8, message: "Password must be at least 8 characters." },
                  maxLength: { value: 255, message: "Password must not exceed 255 characters." },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                  },
                })}
                errors={errors.password as { message?: string } | undefined}
                placeholder="Leave blank to keep current password"
                className="md:col-span-2"
              />
            )}

            {/* Password — only visible when password login is enabled (create mode only) */}
            {!isEdit && watchedIsPasswordLogin && (
              <Password
                label="Password"
                star
                {...register("password", {
                  required: watchedIsPasswordLogin
                    ? "Password is required."
                    : false,
                  minLength: { value: 8, message: "Password must be at least 8 characters." },
                  maxLength: { value: 255, message: "Password must not exceed 255 characters." },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                  },
                })}
                errors={errors.password as { message?: string } | undefined}
                placeholder="Min 8 characters"
                className="md:col-span-2"
              />
            )}
          </div>
        </section>

        {/* ── Step 2: Plants & Tenant (hidden for admin role) ── */}
        {showAssignmentSection && (
          <section className="space-y-2">
            <SectionSubHeader
              icon={Factory}
              title="Tenant & Plants"
              description="Select tenant first, then choose plants."
            />

            {/* Tenant selector */}
            {(showTenantDropdown || isEdit) && (
              isEdit ? (
                <Input
                  label="Tenant"
                  star={effectiveRole === "user" || effectiveRole === "tenant"}
                  value={resolvedTenantLabel || editValues?.tenant_id || ""}
                  disabled
                  placeholder="Tenant"
                />
              ) : (
                <Controller
                  name="tenant_id"
                  control={control}
                  rules={{
                    validate: (value) => {
                      if ((effectiveRole !== "user" && effectiveRole !== "tenant") || !showTenantDropdown) return true;
                      return String(value ?? "").trim() !== "" || "Tenant is required.";
                    },
                  }}
                  render={({ field }) => (
                    <AsyncSelect
                      name="tenant_id"
                      label="Tenant"
                      star={effectiveRole === "user" || effectiveRole === "tenant"}
                      loadOptions={fetchTenantNames}
                      isMulti={false}
                      placeholder="Select tenant"
                      value={
                        (field.value ?? effectiveTenantId)
                          ? ({
                            value: String(field.value ?? effectiveTenantId),
                            label: resolvedTenantLabel || "Loading tenant...",
                          } as Option)
                          : null
                      }
                      onChange={(v: SingleValue<Option> | MultiValue<Option>) => {
                        const selected = v as SingleValue<Option>;
                        const next = selected?.value ?? null;
                        setSelectedTenantLabel(selected?.label ?? "");
                        field.onChange(next);
                        setValue("plant_ids", [], { shouldValidate: true });
                      }}
                      errors={errors.tenant_id as { message?: string } | undefined}
                      isClearable
                    />
                  )}
                />
              )
            )}

            {/* Plants selector — only for "user" role */}
            {effectiveRole === "user" && (
              <>
                {isLoadingPlants && watchedTenantId ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-neutral-500">
                    <Spinner size={1} /> Loading plants…
                  </div>
                ) : (
                  <Controller
                    name="plant_ids"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (effectiveRole !== "user") return true;
                        return (Array.isArray(value) && value.length > 0) || "At least one plant is required.";
                      },
                    }}
                    render={({ field }) => (
                      <AsyncSelect
                        name="plant_ids"
                        label="Plants"
                        star={effectiveRole === "user"}
                        loadOptions={loadPlantOptions}
                        isMulti
                        placeholder={
                          showTenantDropdown && !watchedTenantId
                            ? "Select a tenant first"
                            : plantsHaveData
                              ? "Select plants"
                              : "No plants available"
                        }
                        value={(field.value || []).map(
                          (pid): Option => ({
                            value: pid,
                            label: selectedPlantMap[pid] ?? pid,
                          }),
                        )}
                        onChange={(v: SingleValue<Option> | MultiValue<Option>) => {
                          const arr = Array.isArray(v) ? v : [];
                          field.onChange(arr.map((o: Option) => o.value));
                        }}
                        isDisabled={showTenantDropdown && !watchedTenantId}
                        errors={errors.plant_ids as { message?: string } | undefined}
                      />
                    )}
                  />
                )}
              </>
            )}
          </section>
        )}

        <section className="space-y-2">
          <SectionSubHeader
            icon={Settings}
            title="Permissions"
          />

          {effectiveRole ? (
            <PermissionPicker
              value={watchedPermissions}
              onChange={(next) =>
                setValue("permissions", next, { shouldValidate: true })
              }
              filterRole={effectiveRole}
              autoSelectDefaults={!isEdit}
              showAddDefaultsButton={isEdit}
            />
          ) : (
            <div className="rounded-xs border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-dark-100 px-6 py-8 flex flex-col items-center gap-2 text-center">
              <div className="p-2 rounded-xs bg-brand-500/10 dark:bg-brand-400/15">
                <Shield className="w-5 h-5 text-brand-500 dark:text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-dark-800">
                Select a role to configure permissions
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-dark-500 max-w-xs">
                Permissions are role-specific. Choose a role above and the available permissions will appear here.
              </p>
            </div>
          )}
        </section>

        {/* ── Step: Access & Status (admin / super_admin only) ── */}
        {isCreatorAdmin && showAdvanced && (
          <section className="space-y-2">
            <SectionSubHeader
              icon={Settings}
              title="Access & Status"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Toggle
                label="Enable OTP Login"
                name="is_otp_login_enable"
                checked={!!watchedOtpLoginEnabled}
                onChange={(e) => setValue("is_otp_login_enable", e.target.checked, { shouldValidate: true })}
              />
              <Toggle
                label="Enable Web Login"
                name="web_login_enabled"
                checked={!!watchedWebLoginEnabled}
                onChange={(e) => setValue("web_login_enabled", e.target.checked, { shouldValidate: true })}
              />
              <Toggle
                label="Enable App Login"
                name="app_login_enabled"
                checked={!!watchedAppLoginEnabled}
                onChange={(e) => setValue("app_login_enabled", e.target.checked, { shouldValidate: true })}
              />
              <Toggle
                label="Enable API Access"
                name="enable_api_access"
                checked={!!watchedApiAccessEnabled}
                onChange={(e) => setValue("enable_api_access", e.target.checked, { shouldValidate: true })}
              />
              <Input
                label="Web Max Login Number"
                type="number"
                min={0}
                {...register("web_max_login_number", { valueAsNumber: true })}
                errors={errors.web_max_login_number as { message?: string } | undefined}
                placeholder="e.g., 5"
              />
              <Input
                label="App Max Login Number"
                type="number"
                min={0}
                {...register("app_max_login_number", { valueAsNumber: true })}
                errors={errors.app_max_login_number as { message?: string } | undefined}
                placeholder="e.g., 5"
              />
              <Toggle
                label="Active"
                className="mt-auto"
                name="is_active"
                checked={!!watchedIsActive}
                onChange={(e) => setValue("is_active", e.target.checked, { shouldValidate: true })}
              />
            </div>
          </section>
        )}

      </div>

      {/* ── Footer Navigation ── */}
      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit && editValues) {
                reset(toUserFormValues(editValues));
              } else {
                reset({
                  role: isCreatorTenant ? "user" : "",
                });
              }
            }}
            disabled={isLoading}
          >
            Reset
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            onClick={() => {
              void handleSubmit(onSubmit)();
            }}
          >
            {isEdit ? "Update User" : "Create User"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;
