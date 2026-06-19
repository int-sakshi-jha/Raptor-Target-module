/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Password from "@/components/common/Password";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import PermissionPicker from "@/components/common/PermissionPicker";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import Tabs from "@/components/common/Tabs";
import {
  fetchPlantCategoryOptions,
  fetchPlantTypeOptions,
  fetchRevenueOptions,
  useCreatePlantMutation,
  useUpdatePlantMutation,
  useGetPlantDetailsQuery,
  type CreatePlantInput,
  type PlantRow,
  type UpdatePlantInput,
} from "@/services/operations/plantAPI";
import { fetchOrganizationNames } from "@/services/operations/organizationAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchUserNamesByTenant } from "@/services/operations/userAPI";
import { useGetPincodeDetailsQuery } from "@/services/operations/pincodeAPI";
import { useAppSelector } from "@/store/hooks";
import { canGetAllTenantNames } from "@/utils/permissions";
import { MapPin, DollarSign, Settings, User, UserCheck, Info } from "lucide-react";
import {
  validatePhone,
  toRHF,
  validateEmail,
  sanitizePhoneInput,
  applyBackendErrors,
} from "@/utils/formValidators";
import {
  GRID_TYPE_OPTIONS,
} from "@/utils/selectOptions";
import ModuleTableEditor, { type ModuleColumnConfig } from "@/components/core/form/ModuleTableEditor";
import TagInput from "@/components/common/TagInput";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlantFormMode = "create" | "edit";

type PlantFormValues = {
  tenant_id: string | null;
  organization_id: string | null;
  use_existing_user: boolean;
  existing_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  is_password_login_enable: boolean;
  plant_name: string;
  plant_type: Option | null;
  plant_category: Option | null;
  grid_type: Option | null;
  is_forecast: boolean;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_phone: string;
  contact_person_designation: string;
  dc_capacity_kw: number | null;
  ac_capacity_kw: number | null;
  sanctioned_load_kw: number | null;
  connected_load_kw: number | null;
  grid_voltage_kv: number | null;
  connection_point: string;
  transformer_capacity_kva: number | null;
  meter_number: string;
  consumer_number: string;
  feeder_name: string;
  substation_name: string;
  discom_name: string;
  location_name: string;
  address: string;
  city: string;
  district: string;
  state: string | null;
  country: string;
  pincode: string;
  taluka: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  net_metering: boolean;
  cod_date: string;
  ppa_rate: number | null;
  ppa_escalation_percent: number | null;
  ppa_duration_years: number | null;
  revenue_type: Option | null;
  tariff_type: string;
  expected_annual_generation_kwh: number | null;
  expected_cuf_percent: number | null;
  expected_pr_percent: number | null;
  expected_yield_kwh_kwp: number | null;
  module_json: Record<string, any>[];
  tilt_angle_degrees: number | null;
  azimuth_angle_degrees: number | null;
  orientation: string;
  notify_user: boolean;
  is_active: boolean;
  plant_image: string;
  tags: string[];
  metadata: Record<string, any>;
  permissions: string[];
};

type PlantFormProps = {
  mode?: PlantFormMode;
  initialValues?: Partial<PlantRow>;
  onSuccess?: () => void;
  close?: () => void;
  isOpen?: boolean;
};


function createPlantValidators(isEdit: boolean, showTenantDropdown: boolean, getValues: () => PlantFormValues) {
  return {
    tenant_id: (v: string | null) => {
      if (isEdit || !showTenantDropdown) return true;
      const id = v != null ? String(v).trim() : "";
      return (id.length === 36) || "Tenant is required";
    },
    organization_id: (v: string | null) => {
      const id = v != null ? String(v).trim() : "";
      return id.length === 36 || "Organization is required";
    },
    plant_name: (v: string) => {
      if (isEdit) return true;
      const s = (v ?? "").trim();
      if (!s) return "Plant name is required";
      if (s.length < 5) return "At least 5 characters";
      return true;
    },
    contact_person_name: (v: string) => {
      const s = (v ?? "").trim();
      if (!s) return "Contact person name is required";
      if (s.length < 2) return "At least 2 characters";
      return true;
    },
    contact_person_email: (v: string) => validateEmail(v) ?? true,
    contact_person_phone: (v: string) => toRHF(() => validatePhone(v, { strict10: true })),
    contact_person_designation: (v: string) => {
      const s = (v ?? "").trim();
      if (!s) return true;
      if (s.length < 2) return "At least 2 characters";
      return true;
    },
    address: (v: string) => {
      if (isEdit) return true;
      const s = (v ?? "").trim();
      if (!s) return "Address is required";
      if (s.length < 5) return "At least 5 characters";
      return true;
    },
    city: (v: string) => {
      if (isEdit) return true;
      const s = (v ?? "").trim();
      if (!s) return "City is required";
      if (s.length < 4) return "At least 4 characters";
      return true;
    },
    state: (v: any) => {
      if (isEdit) return true;
      const s = String(v?.value ?? v ?? "").trim();
      if (!s) return "State is required";
      return true;
    },
    country: (v: string) => {
      if (isEdit) return true;
      const s = (v ?? "").trim();
      if (!s) return "Country is required";
      return true;
    },
    pincode: (v: string) => {
      if (isEdit) return true;
      const s = (v ?? "").trim();
      if (!s) return true;
      if (s.length < 6 || s.length > 20) return "Pin code must be 6–20 characters when provided";
      return true;
    },
    first_name: (v: string) => {
      if (isEdit || getValues().use_existing_user) return true;
      const s = (v ?? "").trim();
      if (!s) return "First name is required";
      if (s.length < 2) return "At least 2 characters";
      return true;
    },
    last_name: (v: string) => {
      if (isEdit || getValues().use_existing_user) return true;
      const s = (v ?? "").trim();
      if (!s) return "Last name is required";
      if (s.length < 4) return "At least 4 characters";
      return true;
    },
    email: (v: string) => {
      if (isEdit || getValues().use_existing_user) return true;
      return validateEmail(v) ?? true;
    },
    username: (v: string) => {
      if (isEdit || getValues().use_existing_user) return true;
      const s = (v ?? "").trim();
      if (!s) return "Username is required";
      return true;
    },
    phone: (v: string) => {
      if (isEdit || getValues().use_existing_user) return true;
      return toRHF(() => validatePhone(v, { required: true, strict10: true }));
    },
    dc_capacity_kw: (v: number | null) => {
      if (v === null || v === undefined || isNaN(v as number)) return "DC capacity is required";
      const acCapacity = getValues().ac_capacity_kw;
      if (acCapacity !== null && acCapacity !== undefined && !isNaN(acCapacity as number) && v <= acCapacity) {
        return "DC capacity must be greater than AC capacity";
      }
      return true;
    },
    ac_capacity_kw: (v: number | null) => {
      if (v === null || v === undefined || isNaN(v as number)) return "AC capacity is required";
      const dcCapacity = getValues().dc_capacity_kw;
      if (dcCapacity !== null && dcCapacity !== undefined && !isNaN(dcCapacity as number) && dcCapacity <= v) {
        return "AC capacity must be less than DC capacity";
      }
      return true;
    },
    latitude: (v: number | null) => {
      if (v === null || v === undefined || isNaN(v as number)) return "Latitude is required";
      if (v < -90 || v > 90) return "Latitude must be between -90 and 90";
      return true;
    },
    longitude: (v: number | null) => {
      if (v === null || v === undefined || isNaN(v as number)) return "Longitude is required";
      if (v < -180 || v > 180) return "Longitude must be between -180 and 180";
      return true;
    },
    expected_cuf_percent: (v: number | null) => {
      if (v !== null && v !== undefined && !isNaN(v as number) && v > 100) {
        return "CUF percentage cannot exceed 100%";
      }
      return true;
    },
    expected_pr_percent: (v: number | null) => {
      if (v !== null && v !== undefined && !isNaN(v as number) && v > 100) {
        return "PR percentage cannot exceed 100%";
      }
      return true;
    },
  };
}

/** Keep in sync with `platform/src/routes/plant/update-plant/update-plant.ts` — `PLANT_UPDATE_BODY_FIELDS`. */
const PLANT_UPDATE_BODY_FIELDS = [
  "organization_id", "plant_name", "plant_type", "plant_category", "grid_type", "connection_point", "meter_number", "consumer_number", "feeder_name", "substation_name", "discom_name",
  "location_name", "address", "city", "district", "state", "country", "timezone", "tariff_type", "orientation",
  "contact_person_name", "contact_person_email", "contact_person_phone", "contact_person_designation", "pincode", "dc_capacity_kw", "ac_capacity_kw", "sanctioned_load_kw", "connected_load_kw", "grid_voltage_kv",
  "transformer_capacity_kva", "latitude", "longitude", "ppa_rate", "ppa_escalation_percent", "ppa_duration_years", "revenue_type",
  "expected_annual_generation_kwh", "expected_cuf_percent", "expected_pr_percent", "expected_yield_kwh_kwp", "tilt_angle_degrees", "azimuth_angle_degrees",
  "cod_date", "is_forecast", "net_metering", "is_active", "plant_image", "tags", "module_json",
] as const;

/** Update payload includes fields not on `CreatePlantInput` (e.g. `cod_date`). */
function pickPlantUpdateBody(
  data: CreatePlantInput & Pick<PlantFormValues, "cod_date">,
): Partial<UpdatePlantInput> {
  const out: Partial<UpdatePlantInput> = {};
  for (const key of PLANT_UPDATE_BODY_FIELDS) {
    (out as Record<string, unknown>)[key] = data[key as keyof typeof data];
  }
  return out;
}

const SOLAR_MODULE_COLUMNS: ModuleColumnConfig[] = [
  { key: "make", label: "Make", placeholder: "Make", type: "text" },
  { key: "model", label: "Model", placeholder: "Model", type: "text" },
  { key: "technology", label: "Technology", placeholder: "Technology", type: "text" },
  { key: "capacity_w", label: "Cap. (W)", placeholder: "Cap. (W)", type: "number" },
  { key: "efficiency_percent", label: "Eff. (%)", placeholder: "Eff. (%)", type: "number", step: "0.1" },
  { key: "qty", label: "Qty", placeholder: "Qty", type: "number" },
];

function toRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}


const buildOption = (
  value: string | null | undefined,
  label?: string | null | undefined,
): Option | null =>
  value ? { value, label: label ?? value } : null;

const gridTypeOptions: Option[] = GRID_TYPE_OPTIONS.map((option) => ({ ...option }));

function buildEditFormValues(initialValues: Partial<PlantRow>): PlantFormValues {
  return {
    tenant_id: initialValues.tenant_id ?? null,
    organization_id: initialValues.organization_id ?? null,
    use_existing_user: false,
    existing_user_id: null,
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    is_password_login_enable: false,
    plant_name: initialValues.plant_name ?? "",
    plant_type: buildOption(
      initialValues.plant_type,
      initialValues.plant_type ? (String(initialValues.plant_type).charAt(0).toUpperCase() + String(initialValues.plant_type).slice(1)) : undefined
    ),
    plant_category: buildOption(
      initialValues.plant_category,
      initialValues.plant_category ? (String(initialValues.plant_category).charAt(0).toUpperCase() + String(initialValues.plant_category).slice(1).replace(/_/g, " ")) : undefined
    ),
    grid_type: gridTypeOptions.find((option) => option.value === initialValues.grid_type) ?? null,
    is_forecast: initialValues.is_forecast ?? false,
    contact_person_name: initialValues.contact_person_name ?? "",
    contact_person_email: initialValues.contact_person_email ?? "",
    contact_person_phone: initialValues.contact_person_phone ?? "",
    contact_person_designation: initialValues.contact_person_designation ?? "",
    dc_capacity_kw: initialValues.dc_capacity_kw ?? null,
    ac_capacity_kw: initialValues.ac_capacity_kw ?? null,
    sanctioned_load_kw: initialValues.sanctioned_load_kw ?? null,
    connected_load_kw: initialValues.connected_load_kw ?? null,
    grid_voltage_kv: initialValues.grid_voltage_kv ?? null,
    connection_point: initialValues.connection_point ?? "",
    transformer_capacity_kva: initialValues.transformer_capacity_kva ?? null,
    meter_number: initialValues.meter_number ?? "",
    consumer_number: initialValues.consumer_number ?? "",
    feeder_name: initialValues.feeder_name ?? "",
    substation_name: initialValues.substation_name ?? "",
    discom_name: initialValues.discom_name ?? "",
    location_name: initialValues.location_name ?? "",
    address: initialValues.address ?? "",
    city: initialValues.city ?? "",
    district: initialValues.district ?? "",
    state: initialValues.state || "",
    country: initialValues.country ?? "",
    pincode: initialValues.pincode ?? "",
    taluka: initialValues.taluka ?? "",
    latitude: initialValues.latitude ?? null,
    longitude: initialValues.longitude ?? null,
    timezone: initialValues.timezone ?? "",
    net_metering: initialValues.net_metering ?? false,
    cod_date: initialValues.cod_date ? initialValues.cod_date.slice(0, 10) : "",
    ppa_rate: initialValues.ppa_rate ?? null,
    ppa_escalation_percent: initialValues.ppa_escalation_percent ?? null,
    ppa_duration_years: initialValues.ppa_duration_years ?? null,
    revenue_type: buildOption(
      initialValues.revenue_type?.toString(),
      initialValues.revenue_type?.toString() ? `Option ${initialValues.revenue_type}` : undefined,
    ),
    tariff_type: initialValues.tariff_type ?? "",
    expected_annual_generation_kwh:
      initialValues.expected_annual_generation_kwh ?? null,
    expected_cuf_percent: initialValues.expected_cuf_percent ?? null,
    expected_pr_percent: initialValues.expected_pr_percent ?? null,
    expected_yield_kwh_kwp: initialValues.expected_yield_kwh_kwp ?? null,
    module_json: Array.isArray(initialValues.module_json)
      ? initialValues.module_json.map((m) =>
        m && typeof m === "object" && !Array.isArray(m)
          ? (m as Record<string, any>)
          : {},
      )
      : [],
    tilt_angle_degrees: initialValues.tilt_angle_degrees ?? null,
    azimuth_angle_degrees: initialValues.azimuth_angle_degrees ?? null,
    orientation: initialValues.orientation ?? "",
    notify_user: Boolean(initialValues.notify_users?.length),
    is_active: initialValues.is_active ?? true,
    plant_image: initialValues.plant_image ?? "",
    tags: initialValues.tags ?? [],
    metadata: toRecord(initialValues.metadata),
    permissions: [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const PlantForm = ({
  mode = "create",
  initialValues,
  onSuccess,
  isOpen = true,
}: PlantFormProps) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);

  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const showTenantDropdown: boolean = canGetAllTenantNames(userPermissions);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    reset,
    getValues,
    control,
    formState: { errors },
  } = useForm<PlantFormValues>({

    defaultValues: {
      tenant_id: null,
      organization_id: null,
      use_existing_user: false,
      existing_user_id: null,
      first_name: "",
      last_name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      is_password_login_enable: false,
      plant_name: "",
      plant_type: null,
      plant_category: null,
      grid_type: null,
      is_forecast: false,
      contact_person_name: "",
      contact_person_email: "",
      contact_person_phone: "",
      contact_person_designation: "",
      dc_capacity_kw: null,
      ac_capacity_kw: null,
      sanctioned_load_kw: null,
      connected_load_kw: null,
      grid_voltage_kv: null,
      connection_point: "",
      transformer_capacity_kva: null,
      meter_number: "",
      consumer_number: "",
      feeder_name: "",
      substation_name: "",
      discom_name: "",
      location_name: "",
      address: "",
      city: "",
      district: "",
      state: "",
      country: "",
      pincode: "",
      taluka: "",
      latitude: null,
      longitude: null,
      timezone: "",
      net_metering: false,
      cod_date: "",
      ppa_rate: null,
      ppa_escalation_percent: null,
      ppa_duration_years: null,
      revenue_type: null,
      tariff_type: "",
      expected_annual_generation_kwh: null,
      expected_cuf_percent: null,
      expected_pr_percent: null,
      expected_yield_kwh_kwp: null,
      module_json: [],
      tilt_angle_degrees: null,
      azimuth_angle_degrees: null,
      orientation: "",
      notify_user: false,
      is_active: true,
      plant_image: "",
      tags: [],
      metadata: {} as Record<string, any>,
      permissions: [] as string[],
    },
  });

  const plantValidators = useMemo(
    () => createPlantValidators(isEdit, showTenantDropdown, getValues),
    [isEdit, showTenantDropdown, getValues],
  );

  const { data: fullPlantData } = useGetPlantDetailsQuery(
    isEdit ? initialValues?.id : undefined
  );

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit) {
      if (fullPlantData?.data) {
        reset(buildEditFormValues(fullPlantData.data));
      } else if (initialValues) {
        reset(buildEditFormValues(initialValues));
      }
    }
  }, [isEdit, initialValues, fullPlantData, reset]);

  const watchedTenantId = watch("tenant_id");
  const watchedOrganizationId = watch("organization_id");
  const watchedPasswordLogin = watch("is_password_login_enable");
  const watchedUseExistingUser = watch("use_existing_user");
  const watchedExistingUserId = watch("existing_user_id");

  // Reset user selection when tenant changes
  useEffect(() => {
    if (!isEdit) {
      setValue("existing_user_id", null, { shouldValidate: false });
      setSelectedUserLabel("");
    }
  }, [watchedTenantId, isEdit, setValue]);

  const [selectedUserLabel, setSelectedUserLabel] = useState<string>("");
  const [selectedTenantLabel, setSelectedTenantLabel] = useState<string>(
    initialValues?.tenant_id ? String(initialValues.tenant_id) : ""
  );
  const [selectedOrganizationLabel, setSelectedOrganizationLabel] = useState<string>(
    initialValues?.organization_name
      ? String(initialValues.organization_name)
      : (initialValues?.organization_id ? String(initialValues.organization_id) : "")
  );

  useEffect(() => {
    if (!isEdit || !showTenantDropdown) return;
    const tId = fullPlantData?.data?.tenant_id || initialValues?.tenant_id;
    const tName = fullPlantData?.data?.tenant_name || initialValues?.tenant_name;
    
    if (!tId) return;
    if (tName) {
      setSelectedTenantLabel(String(tName));
      return;
    }

    let cancelled = false;
    fetchTenantNames().then((opts) => {
      if (cancelled) return;
      const match = opts.find((o) => o.value === String(tId));
      if (match) setSelectedTenantLabel(match.label);
    });
    return () => { cancelled = true; };
  }, [isEdit, initialValues?.tenant_id, initialValues?.tenant_name, fullPlantData?.data?.tenant_id, fullPlantData?.data?.tenant_name, showTenantDropdown]);

  const watchedPincode = watch("pincode");
  const {
    data: pincodeDetails,
    isFetching: isFetchingPincode,
    isFetched: isPincodeFetched,
    isError: isPincodeLookupError,
  } =
    useGetPincodeDetailsQuery(watchedPincode);
  const pincodeLookupMessage =
    watchedPincode && watchedPincode.length === 6 && !isFetchingPincode
      ? isPincodeLookupError
        ? "Unable to fetch pincode details right now"
        : !pincodeDetails && isPincodeFetched
          ? "Pincode does not exist"
          : undefined
      : undefined;
  const showPincodeLookupMessage =
    !!pincodeLookupMessage && !errors.pincode?.message;
  const hasValidPincodeLookup =
    !!watchedPincode && watchedPincode.length === 6 && !!pincodeDetails;

  useEffect(() => {
    if (pincodeDetails) {
      clearErrors("pincode");
      setValue("district", pincodeDetails.District, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("taluka", pincodeDetails.Block, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("country", "India", { shouldDirty: true, shouldValidate: true });
      setValue("state", pincodeDetails.State, {
        shouldDirty: true,
        shouldValidate: true,
      });
      
    }
  }, [clearErrors, pincodeDetails, setValue]);

  useEffect(() => {
    if (!watchedPincode || watchedPincode.length !== 6) {
      clearErrors("pincode");
      return;
    }

    if (isFetchingPincode) return;

    if (isPincodeLookupError) {
      setError("pincode", {
        type: "manual",
        message: "Unable to fetch pincode details right now",
      });
      return;
    }

    if (isPincodeFetched && !pincodeDetails) {
      setError("pincode", {
        type: "manual",
        message: "Pincode does not exist",
      });

      setValue("district", "", { shouldDirty: true, shouldValidate: true });
      setValue("taluka", "", { shouldDirty: true, shouldValidate: true });
      setValue("state", "", { shouldDirty: true, shouldValidate: true });
      setValue("country", "", { shouldDirty: true, shouldValidate: true });
      setValue("timezone", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [
    watchedPincode,
    isFetchingPincode,
    isPincodeFetched,
    isPincodeLookupError,
    pincodeDetails,
    clearErrors,
    setError,
    setValue,
  ]);

  // Auto-fill timezone when country is India
  const watchedCountry = watch("country");
  useEffect(() => {
    if (watchedCountry && watchedCountry.toLowerCase() === "india") {
      setValue("timezone", "Asia/Kolkata", { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedCountry, setValue]);

  useEffect(() => {
    if (!isEdit) return;
    const oId = fullPlantData?.data?.organization_id || initialValues?.organization_id;
    const oName = fullPlantData?.data?.organization_name || initialValues?.organization_name;

    if (!oId) return;
    if (oName) {
      setSelectedOrganizationLabel(String(oName));
      return;
    }

    let cancelled = false;
    fetchOrganizationNames().then((opts) => {
      if (cancelled) return;
      const match = opts.find((o) => o.value === String(oId));
      if (match) setSelectedOrganizationLabel(match.label);
    });
    return () => { cancelled = true; };
  }, [isEdit, initialValues?.organization_id, initialValues?.organization_name, fullPlantData?.data?.organization_id, fullPlantData?.data?.organization_name]);

  const loadTenantOptions = useCallback(
    (search = "") => fetchTenantNames(search, 1, 50),
    [],
  );
  const loadExistingUserOptions = useCallback(
    (search = "") => {
      const tenantId = watchedTenantId;
      if (!tenantId) return Promise.resolve([]);
      return fetchUserNamesByTenant(tenantId, search, 1, 50);
    },
    [watchedTenantId],
  );
  const loadOrganizationOptions = useCallback(
    (search = "") => fetchOrganizationNames(search, 1, 50),
    [],
  );


  const loadPlantTypeOptions = useCallback(
    (search = "") => fetchPlantTypeOptions(search),
    [],
  );
  const loadPlantCategoryOptions = useCallback(
    (search = "") => fetchPlantCategoryOptions(search),
    [],
  );

  const loadRevenueOptions = useCallback(
    (search = "") => fetchRevenueOptions(search),
    [],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useCreatePlantMutation();
  const updateMutation = useUpdatePlantMutation();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = (data: PlantFormValues) => {
    const finalData: CreatePlantInput = {
      tenant_id: data.tenant_id || null,
      organization_id: data.organization_id || null,
      ...(!isEdit
        ? data.use_existing_user
          ? { existing_user_id: data.existing_user_id || null }
          : {
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            email: data.email.trim().toLowerCase(),
            username: data.username.trim(),
            phone: data.phone.trim(),
            is_password_login_enable: data.is_password_login_enable,
            ...(data.is_password_login_enable && data.password?.trim()
              ? { password: data.password.trim() }
              : {}),
          }
        : {}),
      plant_name: data.plant_name || null,
      plant_type: data.plant_type?.value || null,
      plant_category: data.plant_category?.value || null,
      grid_type: data.grid_type?.value || null,
      is_forecast: data.is_forecast,
      contact_person_name: data.contact_person_name.trim(),
      contact_person_email: data.contact_person_email.trim().toLowerCase(),
      contact_person_phone: data.contact_person_phone.trim() || null,
      contact_person_designation: data.contact_person_designation.trim() || null,
      dc_capacity_kw: data.dc_capacity_kw,
      ac_capacity_kw: data.ac_capacity_kw,
      sanctioned_load_kw: data.sanctioned_load_kw,
      connected_load_kw: data.connected_load_kw,
      grid_voltage_kv: data.grid_voltage_kv,
      connection_point: data.connection_point || null,
      transformer_capacity_kva: data.transformer_capacity_kva,
      meter_number: data.meter_number || null,
      consumer_number: data.consumer_number || null,
      feeder_name: data.feeder_name || null,
      substation_name: data.substation_name || null,
      discom_name: data.discom_name || null,
      location_name: data.location_name || null,
      address: data.address || null,
      city: data.city || null,
      district: data.district || null,
      state: data.state || null,
      country: data.country || null,
      pincode: data.pincode || null,
      taluka: data.taluka || null,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone || null,
      net_metering: data.net_metering,
      ppa_rate: data.ppa_rate,
      ppa_escalation_percent: data.ppa_escalation_percent,
      ppa_duration_years: data.ppa_duration_years,
      revenue_type: data.revenue_type?.value ? Number(data.revenue_type.value) : null,
      tariff_type: data.tariff_type || null,
      expected_annual_generation_kwh: data.expected_annual_generation_kwh,
      expected_cuf_percent: data.expected_cuf_percent,
      expected_pr_percent: data.expected_pr_percent,
      expected_yield_kwh_kwp: data.expected_yield_kwh_kwp,
      module_json: (() => {
        const filtered = data.module_json.filter((m) =>
          Object.values(m).some((v) => v !== null && v !== "" && v !== undefined),
        );
        return filtered.length > 0 ? filtered : null;
      })(),
      tilt_angle_degrees: data.tilt_angle_degrees,
      azimuth_angle_degrees: data.azimuth_angle_degrees,
      orientation: data.orientation || null,
      notify_user: !isEdit ? data.notify_user : undefined,
      is_active: data.is_active,
      plant_image: data.plant_image || null,
      tags: data.tags?.length > 0 ? data.tags : null,
      metadata: Object.keys(data.metadata ?? {}).length > 0 ? data.metadata : null,
    };

    if (!isEdit) {
      finalData.permissions = data.permissions?.length
        ? data.permissions
        : null;
    }

    if (isEdit && initialValues?.id) {
      updateMutation.mutate(
        {
          id: initialValues.id,
          ...pickPlantUpdateBody({ ...finalData, cod_date: data.cod_date }),
        },
        {
          onSuccess: () => onSuccess?.(),
          onError: (error) => {
            applyBackendErrors(error, setError, getValues);
          },
        },
      );
    } else {
      createMutation.mutate(finalData, {
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: (error) => {
          applyBackendErrors(error, setError, getValues);
        },
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

      <div className="space-y-2">
        <div className="space-y-2">
          <SectionSubHeader
            icon={Info}
            title="Basic Information"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {showTenantDropdown && (
              isEdit ? (
                <div className="md:col-span-2">
                  <Input
                    label="Tenant"
                    value={initialValues?.tenant_name
                      || selectedTenantLabel
                      || (initialValues?.tenant_id ? String(initialValues.tenant_id) : "—")}
                    disabled
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <input
                    type="hidden"
                    {...register("tenant_id", {
                      validate: plantValidators.tenant_id,
                    })}
                  />
                  <AsyncSelect
                    label="Tenant"
                    star
                    apiSearch
                    loadOptions={loadTenantOptions}
                    isMulti={false}
                    placeholder="Tenant"
                    value={
                      watchedTenantId
                        ? ({ value: String(watchedTenantId), label: selectedTenantLabel || String(watchedTenantId) } as any)
                        : null
                    }
                    onChange={(v: any) => {
                      setSelectedTenantLabel(v?.label ?? "");
                      setValue("tenant_id", v?.value ?? null, { shouldValidate: true });
                    }}
                    isClearable
                    errors={errors.tenant_id}
                  />
                </div>
              )
            )}
            <div className="md:col-span-2">
              <input
                type="hidden"
                {...register("organization_id", {
                  validate: plantValidators.organization_id,
                })}
              />
              <AsyncSelect
                label="Organization"
                star
                apiSearch
                loadOptions={loadOrganizationOptions}
                isMulti={false}
                placeholder="Organization"
                value={
                  watchedOrganizationId
                    ? ({
                      value: String(watchedOrganizationId),
                      label: selectedOrganizationLabel || String(watchedOrganizationId),
                    } as Option)
                    : null
                }
                onChange={(value) => {
                  const next = value as Option | null;
                  setSelectedOrganizationLabel(next?.label ?? "");
                  setValue("organization_id", next?.value ?? null, { shouldValidate: true });
                }}
                isClearable
                errors={errors.organization_id}
              />
            </div>
            <Input
              label="Plant Name"
              star={!isEdit}
              {...register("plant_name", { validate: plantValidators.plant_name })}
              errors={errors.plant_name}
              placeholder="Plant Name"
            />
            <Controller
              name="plant_category"
              control={control}
              rules={{
                required: isEdit ? false : "Plant category is required",
              }}
              render={({ field }) => (
                <AsyncSelect
                  label="Plant Category"
                  star={!isEdit}
                  apiSearch
                  loadOptions={loadPlantCategoryOptions}
                  placeholder="Plant Category"
                  value={field.value}
                  onChange={(value) => field.onChange((value as Option | null) ?? null)}
                  errors={errors.plant_category as { message?: string } | undefined}
                  isClearable
                />
              )}
            />

            <Controller
              name="plant_type"
              control={control}
              rules={{
                required: isEdit ? false : "Plant type is required",
              }}
              render={({ field }) => (
                <AsyncSelect
                  label="Plant Type"
                  star={!isEdit}
                  apiSearch
                  loadOptions={loadPlantTypeOptions}
                  placeholder="Plant Type"
                  value={field.value}
                  onChange={(value) => field.onChange((value as Option | null) ?? null)}
                  errors={errors.plant_type as { message?: string } | undefined}
                  isClearable
                />
              )}
            />

            <Controller
              name="grid_type"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  label="Grid Type"
                  loadOptions={async () => gridTypeOptions}
                  placeholder="Grid Type"
                  value={gridTypeOptions.find((option) => option.value === field.value?.value) ?? field.value}
                  onChange={(value) => field.onChange((value as Option | null) ?? null)}
                  errors={errors.grid_type as { message?: string } | undefined}
                  isClearable
                />
              )}
            />

             <Input
              label="DC Capacity (kW)"
              star
              type="number"
              step="any"
              {...register("dc_capacity_kw", { valueAsNumber: true, validate: plantValidators.dc_capacity_kw })}
              errors={errors.dc_capacity_kw}
              placeholder="DC Capacity (kW)"
            />
            <Input
              label="AC Capacity (kW)"
              star
              type="number"
              step="any"
              {...register("ac_capacity_kw", { valueAsNumber: true, validate: plantValidators.ac_capacity_kw })}
              errors={errors.ac_capacity_kw}
              placeholder="AC Capacity (kW)"
            />
             
             <Toggle
              id="is_active"
              label="Is Active"
              {...register("is_active")}
            />
            {!isEdit && (
              <>
                <div className="relative md:col-span-2">
                  <SectionSubHeader
                    icon={watchedUseExistingUser ? UserCheck : User}
                    title="Owner Account"
                  />
                  {/* Segmented pill switcher */}
                  <div className="absolute right-0 top-0 z-10">
                    <Tabs
                      size="sm"
                      tabs={[
                        { key: "new", label: "New User" },
                        { key: "existing", label: "Existing User" },
                      ]}
                      selected={watchedUseExistingUser ? "existing" : "new"}
                      onChange={(key) => {
                        if (key === "new" && watchedUseExistingUser) {
                          setValue("use_existing_user", false, { shouldValidate: true });
                          setValue("existing_user_id", null, { shouldValidate: false });
                          setSelectedUserLabel("");
                          clearErrors("existing_user_id");
                        } else if (key === "existing" && !watchedUseExistingUser) {
                          setValue("use_existing_user", true, { shouldValidate: true });
                          setValue("first_name", "", { shouldValidate: false });
                          setValue("last_name", "", { shouldValidate: false });
                          setValue("email", "", { shouldValidate: false });
                          setValue("username", "", { shouldValidate: false });
                          setValue("phone", "", { shouldValidate: false });
                          setValue("password", "", { shouldValidate: false });
                          clearErrors(["first_name", "last_name", "email", "username", "phone", "password"]);
                        }
                      }}
                    />
                  </div>
                </div>

                {watchedUseExistingUser ? (
                  /* ── Existing User Dropdown ── */
                  <div className="md:col-span-2">
                    <input type="hidden" {...register("existing_user_id", {
                      validate: (v) => {
                        if (!getValues().use_existing_user) return true;
                        return (v && String(v).trim().length > 0) || "Please select an existing user.";
                      },
                    })} />
                    <AsyncSelect
                      key={watchedTenantId || "default"}
                      label="Select User"
                      star
                      apiSearch
                      loadOptions={loadExistingUserOptions}
                      isMulti={false}
                      placeholder={
                        watchedTenantId
                          ? "Search and select a user"
                          : "Select a tenant first"
                      }
                      isDisabled={!watchedTenantId}
                      value={
                        watchedExistingUserId
                          ? ({ value: String(watchedExistingUserId), label: selectedUserLabel || String(watchedExistingUserId) } as any)
                          : null
                      }
                      onChange={(v: any) => {
                        setSelectedUserLabel(v?.label ?? "");
                        setValue("existing_user_id", v?.value ?? null, { shouldValidate: true });
                      }}
                      isClearable
                      errors={errors.existing_user_id}
                    />
                  </div>
                ) : (
                  /* ── New User Fields ── */
                  <>
                    <Input
                      label="First name"
                      star
                      {...register("first_name", { validate: plantValidators.first_name })}
                      errors={errors.first_name}
                      placeholder="First name"
                    />
                    <Input
                      label="Last name"
                      star
                      {...register("last_name", { validate: plantValidators.last_name })}
                      errors={errors.last_name}
                      placeholder="Last name"
                    />
                    <Input
                      label="Email"
                      star
                      type="email"
                      autoComplete="email"
                      className="md:col-span-2"
                      {...register("email", { validate: plantValidators.email })}
                      errors={errors.email}
                      placeholder="Email"
                    />
                    <Input
                      label="Username"
                      star
                      autoComplete="username"
                      {...register("username", { validate: plantValidators.username })}
                      errors={errors.username}
                      placeholder="Username"
                    />
                    <Input
                      label="Phone"
                      star
                      autoComplete="tel"
                      onInput={sanitizePhoneInput}
                      {...register("phone", { validate: plantValidators.phone })}
                      errors={errors.phone}
                      placeholder="Phone"
                    />
                    <Toggle
                      id="plant_owner_password_login"
                      label="Enable password login"
                      className="sm:mt-6"
                      {...register("is_password_login_enable")}
                    />
                    {watchedPasswordLogin && (
                      <div className="md:col-span-2">
                        <Password
                          label="Password"
                          star
                          autoComplete="new-password"
                          {...register("password", {
                            validate: (val) => {
                              if (isEdit) return true;
                              if (getValues().use_existing_user) return true;
                              if (!getValues("is_password_login_enable")) return true;
                              if (!val || String(val).length < 8) {
                                return "Password must be at least 8 characters";
                              }
                              return true;
                            },
                            pattern: {
                              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                              message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                            },
                          })}
                          errors={errors.password}
                          placeholder="Password"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <Input
              label="Contact Person Name"
              star
              {...register("contact_person_name", { validate: plantValidators.contact_person_name })}
              errors={errors.contact_person_name}
              placeholder="Contact Person Name"
            />
            <Input
              label="Contact Person Email"
              star
              type="email"
              autoComplete="email"
              {...register("contact_person_email", { validate: plantValidators.contact_person_email })}
              errors={errors.contact_person_email}
              placeholder="Contact Person Email"
            />
            <Input
              label="Contact Person Phone"
              autoComplete="tel"
              onInput={sanitizePhoneInput}
              {...register("contact_person_phone", { validate: plantValidators.contact_person_phone })}
              errors={errors.contact_person_phone}
              placeholder="Contact Person Phone"
            />
            <Input
              label="Contact Person Designation"
              {...register("contact_person_designation", { validate: plantValidators.contact_person_designation })}
              errors={errors.contact_person_designation}
              placeholder="Contact Person Designation"
            />

            {showAdvanced && (<>

              <Input
                label="Meter Number"
                {...register("meter_number")}
                placeholder="Meter Number"
              />
              <Input
                label="Consumer Number"
                {...register("consumer_number")}
                placeholder="Consumer Number"
              />
              <Input
                label="Discom Name"
                {...register("discom_name")}
                placeholder="Discom Name"
              />
              <Input
                label="Connection Point"
                {...register("connection_point")}
                placeholder="Connection Point"
              />
            </>)}

           

            <Toggle
              id="is_forecast"
              label="Forecast Enabled"
              {...register("is_forecast")}
            />
          </div>
        </div>

        {!isEdit && !watchedUseExistingUser && (
          <div className="space-y-2">
            <SectionSubHeader
              icon={Settings}
              title="Owner Permissions"
            />
            <PermissionPicker
              value={watch("permissions") ?? []}
              onChange={(next) =>
                setValue("permissions", next, { shouldValidate: true })
              }
              filterRole="user"
              enabled={isOpen}

            />
          </div>
        )}

        <div className="space-y-2">
          <SectionSubHeader
            icon={MapPin}
            title="Location Details"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="relative">
              <Input
                label="Pin Code"
                star
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
                {...register("pincode", {
                  required: "Pincode is required",
                  pattern: { value: /^[0-9]{6}$/, message: "Invalid pincode" }
                })}
                maxLength={6}
                errors={errors.pincode}
                placeholder="Pin Code"
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
            />
            <Input
              label="Location Name"
              {...register("location_name")}
              placeholder="Location Name"
              className="md:col-span-2"
            />
            <Input
              label="Address"
              star={!isEdit}
              {...register("address", { validate: plantValidators.address })}
              errors={errors.address}
              placeholder="Address"
              className="md:col-span-2"
            />
            <Input
              label="District"
              star
              {...register("district")}
              placeholder="District"
              disabled={hasValidPincodeLookup}
            />
            <Input
              label="City"
              star={!isEdit}
              {...register("city", { validate: plantValidators.city })}
              errors={errors.city}
              placeholder="City"
            />
            <Input
              label="State"
              star
              {...register("state", { validate: plantValidators.state })}
              errors={errors.state}
              placeholder="State"
              disabled={hasValidPincodeLookup}
            />

            <Input
              label="Country"
              star
              {...register("country", { validate: plantValidators.country })}
              errors={errors.country}
              placeholder="Country"
              disabled={hasValidPincodeLookup}
            />
            <Input
              label="Longitude"
              star
              type="number"
              step="any"
              {...register("longitude", { valueAsNumber: true, validate: plantValidators.longitude })}
              errors={errors.longitude}
              placeholder="Longitude"
            />
            <Input
              label="Latitude"
              star
              type="number"
              step="any"
              {...register("latitude", { valueAsNumber: true, validate: plantValidators.latitude })}
              errors={errors.latitude}
              placeholder="Latitude"
            />
             <Input
              label="Timezone"
              {...register("timezone")}
              placeholder="Timezone"
              disabled={hasValidPincodeLookup}
            />
          </div>
        </div>

          {showAdvanced && (<>
        <div className="space-y-2">
          <SectionSubHeader
            icon={Settings}
            title="Site & Solar Details"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              label="Feeder Name"
              {...register("feeder_name")}
              placeholder="Feeder Name"
            />
            <Input
              label="Substation Name"
              {...register("substation_name")}
              placeholder="Substation Name"
            />


              <Input
                label="Sanctioned Load (kW)"
                type="number"
                step="any"
                {...register("sanctioned_load_kw", { valueAsNumber: true })}
                placeholder="Sanctioned Load (kW)"
              />
              <Input
                label="Connected Load (kW)"
                type="number"
                step="any"
                {...register("connected_load_kw", { valueAsNumber: true })}
                placeholder="Connected Load (kW)"
              />
              <Input
                label="Grid Voltage (kV)"
                type="number"
                step="any"
                {...register("grid_voltage_kv", { valueAsNumber: true })}
                placeholder="Grid Voltage (kV)"
              />
              <Input
                label="Transformer Capacity (kVA)"
                type="number"
                step="any"
                {...register("transformer_capacity_kva", { valueAsNumber: true })}
                placeholder="Transformer Capacity (kVA)"
              />

              <Input
                label="Orientation"
                {...register("orientation")}
                placeholder="Orientation"
              />
              <Input
                label="Tilt Angle (°)"
                type="number"
                step="any"
                {...register("tilt_angle_degrees", { valueAsNumber: true })}
                placeholder="Tilt Angle (°)"
              />
              <Input
                label="Azimuth Angle (°)"
                type="number"
                step="any"
                {...register("azimuth_angle_degrees", { valueAsNumber: true })}
                placeholder="Azimuth Angle (°)"
              />
              <Input
                label="Expected Annual Generation (kWh)"
                type="number"
                step="any"
                {...register("expected_annual_generation_kwh", {
                  valueAsNumber: true,
                })}
                placeholder="Expected Annual Generation (kWh)"
              />
              <Input
                label="Expected CUF (%)"
                type="number"
                step="any"
                max="100"
                {...register("expected_cuf_percent", {
                  valueAsNumber: true,
                  validate: plantValidators.expected_cuf_percent
                })}
                placeholder="Expected CUF (%)"
                errors={errors.expected_cuf_percent}
              />
              <Input
                label="Expected PR (%)"
                type="number"
                step="any"
                max="100"
                {...register("expected_pr_percent", {
                  valueAsNumber: true,
                  validate: plantValidators.expected_pr_percent
                })}
                placeholder="Expected PR (%)"
                errors={errors.expected_pr_percent}
              />
              <Input
                label="Expected Yield (kWh/kWp)"
                type="number"
                step="any"
                {...register("expected_yield_kwh_kwp", { valueAsNumber: true })}
                placeholder="Expected Yield (kWh/kWp)"
              />
              <Toggle
                id="net_metering"
                label="Net Metering"
                className="sm:mt-6"
                {...register("net_metering")}
              />
              <div className="md:col-span-2 space-y-2">
                <div>
                  <label className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                    Solar Modules
                  </label>
                </div>
                <ModuleTableEditor
                  columns={SOLAR_MODULE_COLUMNS}
                  value={watch("module_json")}
                  onChange={(updated) =>
                    setValue("module_json", updated, { shouldDirty: true, shouldValidate: true })
                  }
                  addLabel="Add module"
                  emptyText="No modules yet — click 'Add module' below."
                  cols={3}
                />
              </div>
          </div>
        </div>
            </>)}

        {showAdvanced && (<>
          <div className="space-y-2">
            <SectionSubHeader
              icon={DollarSign}
              title="Financial & PPA"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {isEdit && (
                <Input label="COD Date" type="date" {...register("cod_date")} />
              )}
              <Input
                label="PPA Rate"
                type="number"
                step="any"
                {...register("ppa_rate", { valueAsNumber: true })}
                placeholder="PPA Rate"
              />
              <Input
                label="PPA Escalation (%)"
                type="number"
                step="any"
                {...register("ppa_escalation_percent", { valueAsNumber: true })}
                placeholder="PPA Escalation (%)"
              />
              <Input
                label="PPA Duration (Years)"
                type="number"
                {...register("ppa_duration_years", { valueAsNumber: true })}
                placeholder="PPA Duration (Years)"
              />
              <Controller
                name="revenue_type"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Revenue Type"
                    apiSearch
                    loadOptions={loadRevenueOptions}
                    placeholder="Revenue Type"
                    value={field.value}
                    onChange={(value) => field.onChange((value as Option | null) ?? null)}
                    errors={errors.revenue_type as { message?: string } | undefined}
                    isClearable
                  />
                )}
              />
              <Input
                label="Tariff Type"
                {...register("tariff_type")}
                placeholder="Tariff Type"
              />
              {!isEdit && (
                <Toggle
                  id="notify_user"
                  label="Notify owner user"
                  className="sm:mt-6"
                  {...register("notify_user")}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <SectionSubHeader
              icon={Settings}
              title="Advanced Meta"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                label="Plant Image URL"
                {...register("plant_image")}
                placeholder="Plant Image URL"
                className="md:col-span-2"
              />
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    className="md:col-span-2"
                    label="Tags"
                    placeholder="Type a tag and press Enter"
                  />
                )}
              />
            </div>
          </div>
        </>)}

      </div>

      {/* ── Footer Navigation ── */}
      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit && initialValues) {
                reset(buildEditFormValues(initialValues));
              } else {
                reset();
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
          >
            {isEdit ? "Update Plant" : "Create Plant"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PlantForm;
