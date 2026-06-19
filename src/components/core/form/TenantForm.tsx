import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMatch } from "react-router-dom";
import {
  type Tenant,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  type CreateTenantInput,
  useGetTenantDetailsQuery,
} from "@/services/operations/tenantAPI";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { MapPin, User, Settings, Palette, Info } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import Password from "@/components/common/Password";
import { TagMapBuilder } from "@/components/common/JsonFields";
import PermissionPicker from "@/components/common/PermissionPicker";
import Toggle from "@/components/common/Toggle";
import TagInput from "@/components/common/TagInput";
import FormModeToggle from "@/components/common/FormModeToggle";
import { validatePhone, toRHF, sanitizePhoneInput, applyBackendErrors } from "@/utils/formValidators";
import { cleanEmptyStrings } from "@/utils/requestQuery";
import { useGetPincodeDetailsQuery } from "@/services/operations/pincodeAPI";

// ── Types ─────────────────────────────────────────────────────────────────────

type TenantFormValues = {
  name: string;
  email: string;
  username: string;
  password?: string;
  permissions: string[];
  phone?: string;
  website?: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  city?: string;
  state?: string | null;
  country?: string;
  postal_code?: string | null;
  taluka?: string | null;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  contact_person_designation?: string;
  generation_table_name?: string;
  data_retention_days?: number;
  is_active?: boolean;
  is_password_login_enable?: boolean;
  settings?: Record<string, unknown>;
  tags?: string[];
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    logo_dark?: string | null;
    logo_light?: string | null;
    favicon?: string | null;
    custom_domain?: string | null;
  };
};

type TenantFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<Tenant>;
  editValues?: Partial<Tenant>;
  onSuccess?: () => void;
  isOpen?: boolean;
};

const TenantForm = ({
  mode = "create",
  initialValues,
  editValues: externalEditValues,
  onSuccess,
  isOpen = true,
}: TenantFormProps) => {
  const isEdit = mode === "edit";
  const isTenantDetailsPage = Boolean(useMatch("/tenant/:id"));
  // const userPermissions = useAppSelector((state) => state.auth.permissions);
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const editTenantId = isEdit
    ? (externalEditValues?.id ?? initialValues?.id ?? null)
    : null;

  const {
    control,
    register,
    reset,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<TenantFormValues>({

    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      permissions: [],
      phone: "",
      website: "",
      logo_url: "",
      address_line1: "",
      address_line2: "",
      district: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      taluka: "",
      contact_person_name: "",
      contact_person_email: "",
      contact_person_phone: "",
      contact_person_designation: "",
      generation_table_name: "",
      data_retention_days: 365,
      is_active: true,
      is_password_login_enable: false,
      settings: {} as Record<string, unknown>,
      tags: [] as string[],
      branding: {
        primary_color: "#1976D2",
        secondary_color: "#424242",
        logo_dark: null,
        logo_light: null,
        favicon: null,
        custom_domain: null,
      },
    },
  });

  const createMutation = useCreateTenantMutation();
  const updateMutation = useUpdateTenantMutation();
  const isLoading = createMutation.isPending;
  const updateLoading = updateMutation.isPending;

  const { data: tenantDetailsResponse, isLoading: isLoadingTenantDetails } =
    useGetTenantDetailsQuery(editTenantId, {
      staleTime: 0,
      enabled: isEdit && !!editTenantId,
    });

  const editValues = isEdit
    ? (tenantDetailsResponse?.data ?? externalEditValues ?? initialValues)
    : undefined;

  // ── Populate form for edit ────────────────────────────────────────────────

  useEffect(() => {
    if (isEdit && editValues) {
      reset({
        name: editValues.name || "",
        email: editValues.email || "",
        username: editValues.username || "",
        password: "",
        permissions: [],
        phone: editValues.phone || "",
        website: editValues.website || "",
        logo_url: editValues.logo_url || "",
        address_line1: editValues.address_line1 || "",
        address_line2: editValues.address_line2 || "",
        district: editValues.district || "",
        city: editValues.city || "",
        state: editValues.state || "",
        country: editValues.country || "",
        postal_code: editValues.postal_code || "",
        taluka: editValues.taluka || "",
        contact_person_name: editValues.contact_person || "",
        contact_person_email: editValues.contact_email || "",
        contact_person_phone: editValues.contact_phone || "",
        contact_person_designation:
          editValues.contact_person_designation || "",
        generation_table_name: editValues.generation_table_name || "",
        data_retention_days: editValues.data_retention_days ?? 365,
        is_active: editValues.is_active ?? true,
        settings: editValues.settings ?? {},
        tags: editValues.tags ?? [],
        branding: {
          primary_color:
            editValues.branding?.primary_color ?? "#1976D2",
          secondary_color:
            editValues.branding?.secondary_color ?? "#424242",
          logo_dark: editValues.branding?.logo_dark ?? null,
          logo_light: editValues.branding?.logo_light ?? null,
          favicon: editValues.branding?.favicon ?? null,
          custom_domain: editValues.branding?.custom_domain ?? null,
        },
      });
    }
  }, [isEdit, editValues, reset]);

  const watchedIsPasswordLogin = useWatch({
    control,
    name: "is_password_login_enable",
    defaultValue: false,
  });
  const watchedPermissions = useWatch({
    control,
    name: "permissions",
    defaultValue: [],
  }) ?? [];
  const watchedTags =
    useWatch({
      control,
      name: "tags",
      defaultValue: [],
    }) ?? [];
  const watchedSettings = useWatch({
    control,
    name: "settings",
    defaultValue: {},
  }) ?? {};

  const watchedPostalCode = useWatch({
    control,
    name: "postal_code",
    defaultValue: "",
  });

  const {
    data: pincodeDetails,
    isFetching: isFetchingPincode,
    isFetched: isPincodeFetched,
    isError: isPincodeLookupError,
  } = useGetPincodeDetailsQuery(watchedPostalCode as string);

  const pincodeLookupMessage =
    watchedPostalCode && watchedPostalCode.length === 6 && !isFetchingPincode
      ? isPincodeLookupError
        ? "Unable to fetch pincode details right now"
        : !pincodeDetails && isPincodeFetched
          ? "Pincode does not exist"
          : undefined
      : undefined;

  const showPincodeLookupMessage = !!pincodeLookupMessage && !errors.postal_code?.message;
  const hasValidPincodeLookup = !!watchedPostalCode && watchedPostalCode.length === 6 && !!pincodeDetails;

  useEffect(() => {
    if (isTenantDetailsPage) return;
    if (pincodeDetails) {
      clearErrors("postal_code");
      setValue("district", pincodeDetails.District, { shouldDirty: true, shouldValidate: true });
      setValue("taluka", pincodeDetails.Block, { shouldDirty: true, shouldValidate: true });
      setValue("country", "India", { shouldDirty: true, shouldValidate: true });
      setValue("state", pincodeDetails.State, { shouldDirty: true, shouldValidate: true });
    }
  }, [isTenantDetailsPage, pincodeDetails, setValue, clearErrors]);

  useEffect(() => {
    if (!watchedPostalCode || watchedPostalCode.length !== 6) {
      clearErrors("postal_code");
      return;
    }
    if (isFetchingPincode) return;
    if (isPincodeLookupError) {
      setError("postal_code", {
        type: "manual",
        message: "Unable to fetch pincode details right now",
      });
      return;
    }
    if (isPincodeFetched && !pincodeDetails) {
      setError("postal_code", {
        type: "manual",
        message: "Pincode does not exist",
      });
      setValue("district", "", { shouldDirty: true, shouldValidate: true });
      setValue("taluka", "", { shouldDirty: true, shouldValidate: true });
      setValue("state", "", { shouldDirty: true, shouldValidate: true });
      setValue("country", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedPostalCode, isFetchingPincode, isPincodeFetched, isPincodeLookupError, pincodeDetails, clearErrors, setError, setValue]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = (data: TenantFormValues) => {
    const cleaned = cleanEmptyStrings(data) as TenantFormValues;

    const commonData = {
      name: cleaned.name,
      email: cleaned.email,
      username: cleaned.username,
      is_active: cleaned.is_active ?? true,
      phone: cleaned.phone ?? null,
      website: cleaned.website ?? null,
      logo_url: cleaned.logo_url ?? null,
      address_line1: cleaned.address_line1 ?? null,
      address_line2: cleaned.address_line2 ?? null,
      district: cleaned.district ?? null,
      city: cleaned.city ?? null,
      state: cleaned.state ?? null,
      country: cleaned.country ?? null,
      postal_code: cleaned.postal_code ?? null,
      taluka: cleaned.taluka ?? null,
      contact_person: cleaned.contact_person_name ?? null,
      contact_email: cleaned.contact_person_email ?? null,
      contact_phone: cleaned.contact_person_phone ?? null,
      contact_person_designation: cleaned.contact_person_designation ?? null,
      data_retention_days: cleaned.data_retention_days
        ? Number(cleaned.data_retention_days)
        : 365,
      settings: cleaned.settings ?? {},
      tags: cleaned.tags?.length ? cleaned.tags : null,
      branding: {
        primary_color: cleaned.branding?.primary_color ?? null,
        secondary_color: cleaned.branding?.secondary_color ?? null,
        logo_dark: cleaned.branding?.logo_dark ?? null,
        logo_light: cleaned.branding?.logo_light ?? null,
        favicon: cleaned.branding?.favicon ?? null,
        custom_domain: cleaned.branding?.custom_domain ?? null,
      },
    };

    if (isEdit && initialValues?.id) {
      const updatePayload = {
        id: initialValues.id,
        ...commonData,
      };

      updateMutation.mutate(updatePayload, { 
        onSuccess: () => onSuccess?.(),
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    } else {
      const finalData: CreateTenantInput = {
        ...commonData,
        permissions: cleaned.permissions?.length ? cleaned.permissions : null,
        is_password_login_enable: cleaned.is_password_login_enable ?? false,
        ...(cleaned.password ? { password: cleaned.password } : {}),
      };

      createMutation.mutate(finalData, { 
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    }
  };

  // ── Loading state for edit ────────────────────────────────────────────────

  if (isEdit && editTenantId && isLoadingTenantDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size={3} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-dark-700">
          Loading tenant details...
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex h-full flex-col gap-2"
      noValidate
    >
      {/* ── Form Mode Toggle ── */}
      <FormModeToggle
        showAdvanced={showAdvanced}
        onToggle={() => setShowAdvanced((prev) => !prev)}
        className="!absolute right-14 top-5 z-10"
      />

      {/* ── Step 1 — Basic Information ── */}
      <section className="space-y-2">
        <SectionSubHeader
          icon={Info}
          title="Basic Information"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            label="Name"
            star
            {...register("name", { required: "Name is required" })}
            errors={errors.name}
            placeholder="Tenant Name"
          />
          <Input
            label="Email"
            star
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address",
              },
            })}
            errors={errors.email}
            placeholder="Email"
          />
          {!isEdit && (
          <Input
            label="Username"
            star
            {...register("username", {
              required: "Username is required",
            })}
            errors={errors.username}
            placeholder="Username"
          />
          )}
          {!isEdit && (
            <>
              <Toggle
                id="is_password_login_enable"
                label="Enable Password Login"
                className="sm:mt-6"
                {...register("is_password_login_enable")}
              />

              {!isEdit && watchedIsPasswordLogin && (
                <Password
                  label="Password"
                  star
                  type="password"
                  {...register("password", {
                    required: watchedIsPasswordLogin
                      ? "Password is required"
                      : false,
                    minLength: { value: 8, message: "Min 8 characters" },
                    maxLength: { value: 255, message: "Max 255 characters" },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                    },
                  })}
                  errors={errors.password}
                  placeholder="Min 8 characters"
                  className="md:col-span-2"
                />
              )}
            </>
          )}

          <Input
            label="Phone"
            star
            onInput={sanitizePhoneInput}
            {...register("phone", {
            validate: (value) =>
              toRHF(() => validatePhone(value, { required: true, strict10: true })),
          })}
          errors={errors.phone}
          placeholder="Phone Number"
        />
        <Input
          label="Website"
          {...register("website")}
          errors={errors.website}
          placeholder="Website Url"
          className="Website Url"
        />
        <Input
          label="Logo URL"
          {...register("logo_url")}
          errors={errors.logo_url}
          placeholder="Logo Url"
          className="Logo URL"
        />
         <Toggle id="is_active" label="Active" {...register("is_active")} className="sm:mt-6" />
      </div>
    </section>

    {/* ── Step 2 — Address ── */}
    <section className="space-y-2">
      <SectionSubHeader
        icon={MapPin}
        title="Address"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative">
          <Input
            label="Pincode"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
            {...register("postal_code", {
              pattern: { value: /^[0-9]{6}$/, message: "Invalid pincode" },
              maxLength: 6
            })}
            maxLength={6}
            errors={errors.postal_code}
            placeholder="Pincode number"
          />
          {isFetchingPincode && (
            <div className="absolute right-3 bottom-3 animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"></div>
          )}
          {showPincodeLookupMessage && (
            <span className="mt-1 block text-xs text-error-500 dark:text-error-dark-500">
              {pincodeLookupMessage}
            </span>
          )}
        </div>
        <Input
          label="Taluka"
          {...register("taluka")}
          placeholder="Taluka"
          errors={errors.taluka}
          disabled={hasValidPincodeLookup}
        />
        <Input
          label="Address Line 1"
          {...register("address_line1")}
          placeholder=""
          className="md:col-span-2"
          errors={errors.address_line1}
        />
        <Input
          label="Address Line 2"
          {...register("address_line2")}
          placeholder=""
          className="md:col-span-2"
          errors={errors.address_line2}
        />
        <Input
          label="District"
          disabled={hasValidPincodeLookup}
          {...register("district")}
          placeholder="District name"
          errors={errors.district}
        />
        <Input
          label="City"
          {...register("city")}
          placeholder="City name"
          errors={errors.city}
        />
        <Input
          label="State"
          {...register("state")}
          placeholder="Fetched from pincode"
          disabled={hasValidPincodeLookup}
        />
        <Input
          label="Country"
          {...register("country")}
          placeholder="Country name"
          errors={errors.country}
          disabled={hasValidPincodeLookup}
        />
      </div>
    </section>

      {showAdvanced && (
        <>
      {/* ── Step 3 — Contact Person ── */}
      <section className="space-y-2">
        <SectionSubHeader
          icon={User}
          title="Contact Person"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            label="Name"
            {...register("contact_person_name")}
            placeholder="Contact person's name"
            errors={errors.contact_person_name}
          />
          <Input
            label="Email"
            type="email"
            {...register("contact_person_email", {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address",
              },
            })}
            errors={errors.contact_person_email}
            placeholder="Contact person's email"
          />
          <Input
            label="Phone"
            onInput={sanitizePhoneInput}
            {...register("contact_person_phone", {
              validate: (value) => toRHF(() => validatePhone(value, { strict10: true }))
            })}
            errors={errors.contact_person_phone}
            placeholder="Contact person's phone"
          />
          <Input
            label="Designation"
            {...register("contact_person_designation")}
            placeholder="Contact person's designation"
            errors={errors.contact_person_designation}
          />
        </div>

      </section>
      </>)}

      {/* ── Step 4 — Settings ── */}

      {!isEdit && (
        <section className="space-y-2">
          <SectionSubHeader
            icon={Settings}
            title="Permissions"
          />
          <PermissionPicker
            value={watchedPermissions}
            onChange={(next) =>
              setValue("permissions", next, { shouldValidate: true })
            }
            filterRole="tenant"
            enabled={isOpen}
          />
        </section>
      )}

          {/* ── Step 5 — Branding ── */}
          <section className="space-y-2">
            <SectionSubHeader
              icon={Palette}
              title="Branding"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="form-label">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    {...register("branding.primary_color")}
                    className="w-10 h-9 rounded-xs border border-neutral-200 dark:border-neutral-700 cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    {...register("branding.primary_color")}
                    errors={errors.branding?.primary_color}
                    placeholder="#1976D2"
                    divClassName="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    {...register("branding.secondary_color")}
                    className="w-10 h-9 rounded-xs border border-neutral-200 dark:border-neutral-700 cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    {...register("branding.secondary_color")}
                    errors={errors.branding?.secondary_color}
                    placeholder="#424242"
                    divClassName="flex-1"
                  />
                </div>
              </div>
              <Input
                label="Logo (Dark)"
                {...register("branding.logo_dark")}
                errors={errors.branding?.logo_dark}
                placeholder="Logo Url"
              />
              <Input
                label="Logo (Light)"
                {...register("branding.logo_light")}
                errors={errors.branding?.logo_light}
                placeholder="Logo Url"
              />
              <Input
                label="Favicon"
                {...register("branding.favicon")}
                errors={errors.branding?.favicon}
                placeholder="Favicon Url"
              />
              <Input
                label="Custom Domain"
                {...register("branding.custom_domain")}
                errors={errors.branding?.custom_domain}
                placeholder="Custom Domain Url"
              />
            </div>
           </section>

      {/* ── Step 6 — Features & Settings ── */}
      {showAdvanced && (
        <>
          {/* ── Step 5 — Advanced Configuration ── */}
          <section className="space-y-2">
            <SectionSubHeader
              icon={Settings}
              title="Advanced Configuration"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* {canViewDeveloperFields && !isEdit && (
                <Input
                  label="Generation Table"
                  {...register("generation_table_name")}
                  readOnly
                  placeholder="No generation table assigned"
                  errors={errors.generation_table_name}
                />
              )} */}
              <Input
                label="Data Retention Days"
                type="number"
                min={90}
                {...register("data_retention_days", {
                  valueAsNumber: true,
                  min: { value: 1, message: "Minimum 1 day" },
                })}
                errors={errors.data_retention_days}
                placeholder="e.g., 365"
              />
            </div>

            <div className="space-y-2">
              <label className="form-label">Settings</label>
              <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-3">
                <TagMapBuilder
                  keyLabel="setting_key"
                  valueLabel="value"
                  initialConfig={watchedSettings}
                  onChange={(value) => {
                    setValue("settings", value, { shouldDirty: true });
                  }}
                />
              </div>
            </div>

            <TagInput
              className="mt-6"
              value={watchedTags}
              onChange={(next) => {
                setValue("tags", next, { shouldDirty: true });
              }}
            />
          </section>

      </>)}

      {/* ── Footer Navigation ── */}
      <div className="bottom-0 z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              isEdit && editValues
                ? reset({
                  name: editValues.name || "",
                  email: editValues.email || "",
                  username: editValues.username || "",
                  password: "",
                  permissions: [],
                  phone: editValues.phone || "",
                  website: editValues.website || "",
                  logo_url: editValues.logo_url || "",
                  address_line1: editValues.address_line1 || "",
                  address_line2: editValues.address_line2 || "",
                  district: editValues.district || "",
                  city: editValues.city || "",
                  state: editValues.state || "",
                  country: editValues.country || "",
                  postal_code: editValues.postal_code || "",
                  taluka: editValues.taluka || "",
                  contact_person_name:
                    editValues.contact_person || "",
                  contact_person_email:
                    editValues.contact_email || "",
                  contact_person_phone:
                    editValues.contact_phone || "",
                  contact_person_designation:
                    editValues.contact_person_designation || "",
                  generation_table_name:
                    editValues.generation_table_name || "",
                  data_retention_days:
                    editValues.data_retention_days ?? 365,
                  is_active: editValues.is_active ?? true,
                  settings: editValues.settings ?? {},
                  tags: editValues.tags ?? [],
                  branding: {
                    primary_color:
                      editValues.branding?.primary_color ?? "#1976D2",
                    secondary_color:
                      editValues.branding?.secondary_color ??
                      "#424242",
                    logo_dark: editValues.branding?.logo_dark ?? null,
                    logo_light:
                      editValues.branding?.logo_light ?? null,
                    favicon: editValues.branding?.favicon ?? null,
                    custom_domain:
                      editValues.branding?.custom_domain ?? null,
                  },
                })
                : reset()
            }
          >
            Reset
          </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isEdit ? updateLoading : isLoading}
              loading={isEdit ? updateLoading : isLoading}
            >
              {isEdit ? "Update Tenant" : "Create Tenant"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default TenantForm;
