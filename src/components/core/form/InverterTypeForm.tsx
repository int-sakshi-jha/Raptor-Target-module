import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  type Inverter,
  useCreateInverterMutation,
  useUpdateInverterMutation,
  useGetInverterDetailsQuery,
  type CreateInverterInput,
  type UpdateInverterInput,
} from "@/services/operations/inverterTypeAPI";
import { fetchTagTemplateNames } from "@/services/operations/tagTemplateAPI";
import type { SingleValue } from "react-select";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Spinner from "@/components/common/Spinner";
import { TagMapBuilder } from "@/components/common/JsonFields";
import Toggle from "@/components/common/Toggle";
import {
  Factory,
  Zap,
  Gauge,
  Cpu,
  Thermometer,
  Wifi,
  FileText,
  Settings,
  Database,
  Bell,
  Info,
} from "lucide-react";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import FormModeToggle from "@/components/common/FormModeToggle";

import { cleanEmptyStrings } from "@/utils/requestQuery";
import { applyBackendErrors } from "@/utils/formValidators";
import { COUNTRIES, getCountryOptions } from "@/utils/countries";
import TagInput from "@/components/common/TagInput";

/** Normalize API payload to an array of strings and/or plain objects (drop nulls). */
function normalizeCommunicationInterfacesFromApi(raw: unknown): unknown[] {
  if (raw == null) return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x) =>
      x !== null &&
      x !== undefined &&
      (typeof x === "string" ||
        typeof x === "number" ||
        typeof x === "boolean" ||
        typeof x === "object"),
  );
}

function stableCommInterfaceKey(entry: unknown): string {
  try {
    return JSON.stringify(entry);
  } catch {
    return String(entry);
  }
}

function formatCommunicationInterfaceChip(entry: unknown): string {
  if (typeof entry === "string") return entry;
  try {
    return JSON.stringify(entry);
  } catch {
    return String(entry);
  }
}

/**
 * Plain text → string; JSON starting with { or [ → parsed value (object/array primitive).
 */
function parseCommunicationInterfaceInput(raw: string): unknown | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const p = JSON.parse(t);
      if (p === null) return null;
      if (
        typeof p === "object" ||
        typeof p === "number" ||
        typeof p === "boolean"
      ) {
        return p;
      }
    } catch {

      return null;
    }
  }
  return t;
}

/** API expects string[]; drop non-strings from mixed/legacy payloads. */
function stringArrayOnly(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Same as stringArrayOnly, then trim and remove empties (tags, protocols, certifications). */
function trimmedStringArrayOnly(value: unknown): string[] {
  return stringArrayOnly(value)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type CreateInverterFormValues = {
  brand: string;
  model: string;
  model_number: string;
  manufacturer?: string;
  country_of_origin?: string;
  capacity_kw: number;
  max_ac_power_kw?: number;
  max_dc_power_kw?: number;
  nominal_power_kw?: number;
  max_efficiency_percent?: number;
  mppt_count: number;
  strings_per_mppt: number;
  max_string_count: number;
  max_dc_voltage?: number;
  min_dc_voltage?: number;
  mppt_voltage_range_min?: number;
  mppt_voltage_range_max?: number;
  max_dc_current_per_mppt?: number;
  max_short_circuit_current?: number;
  ac_voltage_nominal?: number;
  ac_voltage_range_min?: number;
  ac_voltage_range_max?: number;
  ac_frequency_nominal?: number;
  ac_frequency_range_min?: number;
  ac_frequency_range_max?: number;
  max_ac_current?: number;
  power_factor_range_min?: number;
  power_factor_range_max?: number;
  phase_type: string;
  phase_count: number;
  weight_kg?: number;
  cooling_method?: string;
  protection_rating?: string;
  noise_level_db?: number;
  operating_temp_min?: number;
  operating_temp_max?: number;
  has_wifi: boolean;
  has_ethernet: boolean;
  has_rs485: boolean;
  has_display: boolean;
  certifications: string[];
  warranty_years: number;
  datasheet_url?: string;
  manual_url?: string;
  list_price?: number;
  currency: string;
  is_active: boolean;
  tags?: string[];
  communication_interfaces: unknown[];
  protocols_supported?: string[] ;
  register_map?: Record<string, unknown>;
  data_points?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  alarm_tag_template_id: string | null;
  alarm_decode_mode: "bitmap" | "direct";
  modbus_start_index: 0 | 1;
  alarm_bitmap_bits: 8 | 16 | 32 | 64;
  alarm_bit_order: "left" | "right";
};

type InverterFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<Inverter>;
  onSuccess?: () => void;
};

const ALARM_DECODE_MODE_OPTIONS: Option[] = [
  { value: "bitmap", label: "Bitmap" },
  { value: "direct", label: "Direct" },
];

const ALARM_BIT_ORDER_OPTIONS: Option[] = [
  { value: "right", label: "Right (LSB first)" },
  { value: "left", label: "Left (MSB first)" },
];

const ALARM_BITMAP_BITS_OPTIONS: Option[] = [
  { value: "8", label: "8 bits" },
  { value: "16", label: "16 bits" },
  { value: "32", label: "32 bits" },
  { value: "64", label: "64 bits" },
];

const MODBUS_START_INDEX_OPTIONS: Option[] = [
  { value: "0", label: "0 (zero-based)" },
  { value: "1", label: "1 (one-based)" },
];

const PHASE_TYPE_OPTIONS: Option[] = [
  { value: "single_phase", label: "Single Phase" },
  { value: "three_phase", label: "Three Phase" },
];

const COOLING_METHOD_OPTIONS: Option[] = [
  { value: "", label: "Select cooling method" },
  { value: "forced_air", label: "Forced Air" },
  { value: "natural_convection", label: "Natural Convection" },
  { value: "liquid", label: "Liquid" },
  { value: "passive", label: "Passive" },
];

const CURRENCY_OPTIONS: Option[] = [
  { value: "INR", label: "INR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

const CreateInverterTypeForm = ({
  mode = "create",
  initialValues,
  onSuccess,
}: InverterFormProps) => {
  const [kvBuildersKey, setKvBuildersKey] = useState(0);
  const [selectedAlarmTagTemplate, setSelectedAlarmTagTemplate] =
    useState<Option | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<CreateInverterFormValues>({

    defaultValues: {
      brand: "",
      model: "",
      model_number: "",
      manufacturer: "",
      country_of_origin: "",
      capacity_kw: 0,
      max_ac_power_kw: undefined,
      max_dc_power_kw: undefined,
      nominal_power_kw: undefined,
      max_efficiency_percent: undefined,
      mppt_count: 1,
      strings_per_mppt: 1,
      max_string_count: 1,
      max_dc_voltage: undefined,
      min_dc_voltage: undefined,
      mppt_voltage_range_min: undefined,
      mppt_voltage_range_max: undefined,
      max_dc_current_per_mppt: undefined,
      max_short_circuit_current: undefined,
      ac_voltage_nominal: undefined,
      ac_voltage_range_min: undefined,
      ac_voltage_range_max: undefined,
      ac_frequency_nominal: undefined,
      ac_frequency_range_min: undefined,
      ac_frequency_range_max: undefined,
      max_ac_current: undefined,
      power_factor_range_min: undefined,
      power_factor_range_max: undefined,
      phase_type: "single_phase",
      phase_count: 1,
      weight_kg: undefined,
      cooling_method: "",
      protection_rating: "",
      noise_level_db: undefined,
      operating_temp_min: undefined,
      operating_temp_max: undefined,
      has_wifi: false,
      has_ethernet: false,
      has_rs485: false,
      has_display: false,
      warranty_years: 0,
      datasheet_url: "",
      manual_url: "",
      list_price: undefined,
      currency: "INR",
      is_active: true,
      tags: [],
      communication_interfaces: [],
      certifications: [],
      protocols_supported: [],
      register_map: {},
      data_points: {},
      specifications: {},
      alarm_tag_template_id: null,
      alarm_decode_mode: "bitmap",
      modbus_start_index: 0,
      alarm_bitmap_bits: 16,
      alarm_bit_order: "right",
    },
  });

  const tags = watch("tags") ?? [];
  const communicationInterfaces = watch("communication_interfaces") ?? [];
  const certifications = watch("certifications") ?? [];
  const protocols = watch("protocols_supported") ?? [];
  const registerMap = watch("register_map") ?? {};
  const dataPoints = watch("data_points") ?? {};
  const specifications = watch("specifications") ?? {};
  const alarmDecodeMode = watch("alarm_decode_mode");

  const createMutation = useCreateInverterMutation();
  const updateMutation = useUpdateInverterMutation();
  const isLoading = createMutation.isPending;
  const updateLoading = updateMutation.isPending;
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const editInverterId = isEdit ? (initialValues?.id ?? null) : null;

  const { data: inverterDetailsResponse, isLoading: isLoadingInverterDetails } =
    useGetInverterDetailsQuery(editInverterId);

  const inverterFromQuery = inverterDetailsResponse?.data;
  const editValues = isEdit ? (inverterFromQuery ?? initialValues) : undefined;

  const toRecord = (v: unknown): Record<string, unknown> => {
    if (v && typeof v === "object" && !Array.isArray(v))
      return v as Record<string, unknown>;
    return {};
  };

  useEffect(() => {
    if (isEdit && editValues) {
      const cap = editValues.capacity_kw;
      const capacityNum = cap != null && cap !== "" ? Number(cap) : 0;
      reset({
        ...editValues,
        capacity_kw: Number.isFinite(capacityNum) ? capacityNum : 0,
        certifications: editValues.certifications ?? [],
        tags: editValues.tags ?? [],
        protocols_supported: editValues.protocols_supported ?? [],
        register_map: toRecord(editValues.register_map),
        data_points: toRecord(editValues.data_points),
        warranty_years: editValues.warranty_years ?? 0,
        currency: editValues.currency ?? "INR",
        is_active: editValues.is_active ?? true,
        has_wifi: editValues.has_wifi ?? false,
        has_ethernet: editValues.has_ethernet ?? false,
        has_rs485: editValues.has_rs485 ?? false,
        has_display: editValues.has_display ?? false,
        communication_interfaces: normalizeCommunicationInterfacesFromApi(
          editValues.communication_interfaces,
        ),
        specifications: toRecord(editValues.specifications),
        alarm_tag_template_id: editValues.alarm_tag_template_id ?? null,
        alarm_decode_mode: editValues.alarm_decode_mode ?? "bitmap",
        modbus_start_index: editValues.modbus_start_index ?? 0,
        alarm_bitmap_bits: editValues.alarm_bitmap_bits ?? 16,
        alarm_bit_order: editValues.alarm_bit_order ?? "right",
      });
      setSelectedAlarmTagTemplate(
        editValues.alarm_tag_template_id
          ? {
            value: editValues.alarm_tag_template_id,
            label:
              editValues.alarm_tag_template_name ??
              editValues.alarm_tag_template_id,
          }
          : null,
      );
      setKvBuildersKey((k) => k + 1);
    }
  }, [isEdit, editValues, reset]);

  const loadAlarmTagTemplateOptions = useCallback(
    (search = "") => fetchTagTemplateNames(search, 1, 50, "alarm"),
    [],
  );

  const loadAlarmDecodeModeOptions = useCallback(
    async () => ALARM_DECODE_MODE_OPTIONS,
    [],
  );

  const loadAlarmBitOrderOptions = useCallback(
    async () => ALARM_BIT_ORDER_OPTIONS,
    [],
  );

  const loadAlarmBitmapBitsOptions = useCallback(
    async () => ALARM_BITMAP_BITS_OPTIONS,
    [],
  );

  const loadModbusStartIndexOptions = useCallback(
    async () => MODBUS_START_INDEX_OPTIONS,
    [],
  );

  const loadPhaseTypeOptions = useCallback(
    async () => PHASE_TYPE_OPTIONS,
    [],
  );

  const loadCoolingMethodOptions = useCallback(
    async () => COOLING_METHOD_OPTIONS,
    [],
  );

  const loadCurrencyOptions = useCallback(
    async () => CURRENCY_OPTIONS,
    [],
  );

  const onSubmit = (data: CreateInverterFormValues) => {
    const ci = Array.isArray(data.communication_interfaces)
      ? data.communication_interfaces.filter(
        (x) => x !== null && x !== undefined,
      )
      : [];
    const tagsOut = trimmedStringArrayOnly(data.tags);
    const certificationsOut = trimmedStringArrayOnly(data.certifications);
    const protocolsOut = trimmedStringArrayOnly(data.protocols_supported);

    const specificationsOut = Object.fromEntries(
      Object.entries(toRecord(data.specifications)).filter(
        ([key, value]) =>
          key.trim() &&
          !(typeof value === "string" && value.trim() === ""),
      ),
    );

    let cleanedData: Record<string, unknown> = {
      ...data,
      communication_interfaces: ci.length > 0 ? ci : null,
      has_wifi: data.has_wifi ?? false,
      has_ethernet: data.has_ethernet ?? false,
      has_rs485: data.has_rs485 ?? false,
      has_display: data.has_display ?? false,
      certifications: certificationsOut.length > 0 ? certificationsOut : null,
      tags: tagsOut.length > 0 ? tagsOut : null,
      protocols_supported: protocolsOut.length > 0 ? protocolsOut : null,
      specifications: specificationsOut,
      register_map: registerMap,
      data_points: dataPoints,
    };

    cleanedData = cleanEmptyStrings(cleanedData) as Record<string, unknown>;
    const filteredData = Object.fromEntries(
      Object.entries(cleanedData).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        return true;
      }),
    );


    const finalData = {
      brand: data.brand,
      model: data.model,
      capacity_kw: data.capacity_kw,
      mppt_count: data.mppt_count,
      strings_per_mppt: data.strings_per_mppt,
      max_string_count: data.max_string_count,
      phase_type: data.phase_type,
      phase_count: data.phase_count,
      currency: data.currency || "INR",
      warranty_years: data.warranty_years ?? 0,
      has_wifi: data.has_wifi ?? false,
      has_ethernet: data.has_ethernet ?? false,
      has_rs485: data.has_rs485 ?? false,
      has_display: data.has_display ?? false,
      is_active: data.is_active ?? true,
      ...filteredData,
    } as CreateInverterInput;

    if (isEdit && initialValues?.id) {
      updateMutation.mutate(
        { ...finalData, id: initialValues.id } as UpdateInverterInput,
        {
          onSuccess: () => onSuccess?.(),
          onError: (error) => applyBackendErrors(error, setError, getValues),
        },
      );
    } else {
      createMutation.mutate(finalData, {
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    }
  };

  if (isEdit && editInverterId && isLoadingInverterDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size={3} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-dark-700">
          Loading inverter details...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex min-h-full flex-col gap-1"
      noValidate
    >
      <FormModeToggle
        showAdvanced={showAdvanced}
        onToggle={() => setShowAdvanced((prev) => !prev)}
        className="!absolute right-14 top-5 z-10"
      />

      <div className="space-y-2">

        <section className="space-y-2">
          <SectionSubHeader
            icon={Info}
            title="Basic Information"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              label="Brand"
              placeholder="Brand Name"
              star
              {...register("brand", { required: "Brand is required" })}
              errors={errors.brand}
            />
            <Input
              label="Model"
              placeholder="Model Name"
              star
              {...register("model", { required: "Model is required" })}
              errors={errors.model}
            />
            <Input
              label="Model Number"
              placeholder="Model Number"
              star
              {...register("model_number", {
                required: "Model number is required",
              })}
              errors={errors.model_number}
            />
            <Input
              label="Capacity (kW)"
              star
              type="number"
              step="0.01"
              {...register("capacity_kw", {
                required: "Capacity is required",
                valueAsNumber: true,
                min: { value: 0, message: "Capacity must be 0 or more" },
              })}
              errors={errors.capacity_kw}
            />
            {showAdvanced && (
              <div className="">
                <Toggle label="Active" {...register("is_active")} />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <SectionSubHeader
            icon={Bell}
            title="Alarm Configuration"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="md:col-span-2 flex flex-col gap-1">
              <input
                type="hidden"
                {...register("alarm_tag_template_id", {
                  required: "Alarm tag template is required",
                })}
              />
              <AsyncSelect
                label="Alarm Tag Template"
                star
                name="alarm_tag_template_id"
                apiSearch
                loadOptions={loadAlarmTagTemplateOptions}
                isMulti={false}
                placeholder="Type to search alarm tag templates..."
                value={selectedAlarmTagTemplate}
                errors={errors.alarm_tag_template_id}
                onChange={(value) => {
                  const selectedValue: SingleValue<Option> =
                    value === null || Array.isArray(value)
                      ? null
                      : (value as SingleValue<Option>);
                  setSelectedAlarmTagTemplate(selectedValue);
                  setValue(
                    "alarm_tag_template_id",
                    selectedValue?.value != null ? String(selectedValue.value) : null,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
                isClearable
              />
            </div>
            <Controller
              name="alarm_decode_mode"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  star
                  label="Alarm Decode Mode"
                  loadOptions={loadAlarmDecodeModeOptions}
                  value={
                    ALARM_DECODE_MODE_OPTIONS.find((o) => o.value === field.value) ??
                    ALARM_DECODE_MODE_OPTIONS[0]
                  }
                  onChange={(v) =>
                    field.onChange(
                      String(
                        (
                          v as import("react-select").SingleValue<Option>
                        )?.value ?? "",
                      ),
                    )
                  }
                  isClearable={false}
                  errors={errors.alarm_decode_mode}
                />
              )}
            />
            {alarmDecodeMode === "bitmap" && (
              <>
                <Controller
                  name="alarm_bit_order"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      star
                      label="Alarm Bit Order"
                      loadOptions={loadAlarmBitOrderOptions}
                      value={
                        ALARM_BIT_ORDER_OPTIONS.find((o) => o.value === field.value) ??
                        null
                      }
                      onChange={(v) =>
                        field.onChange(
                          String(
                            (
                              v as import("react-select").SingleValue<Option>
                            )?.value ?? "",
                          ),
                        )
                      }
                      isClearable={false}
                      errors={errors.alarm_bit_order}
                    />
                  )}
                />
                <Controller
                  name="alarm_bitmap_bits"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Alarm Bitmap Bits"
                      star
                      loadOptions={loadAlarmBitmapBitsOptions}
                      value={
                        ALARM_BITMAP_BITS_OPTIONS.find(
                          (o) => o.value === String(field.value),
                        ) ?? ALARM_BITMAP_BITS_OPTIONS[1]
                      }
                      onChange={(v) =>
                        field.onChange(
                          Number(
                            (
                              v as import("react-select").SingleValue<Option>
                            )?.value ?? 16,
                          ),
                        )
                      }
                      isClearable={false}
                      errors={errors.alarm_bitmap_bits}
                    />
                  )}
                />
                <Controller
                  name="modbus_start_index"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      star
                      label="Modbus Start Index"
                      loadOptions={loadModbusStartIndexOptions}
                      value={
                        MODBUS_START_INDEX_OPTIONS.find(
                          (o) => o.value === String(field.value),
                        ) ?? MODBUS_START_INDEX_OPTIONS[0]
                      }
                      onChange={(v) =>
                        field.onChange(
                          Number(
                            (
                              v as import("react-select").SingleValue<Option>
                            )?.value ?? 0,
                          ),
                        )
                      }
                      isClearable={false}
                      errors={errors.modbus_start_index}
                    />
                  )}
                />
              </>
            )}
          </div>
        </section>

        {showAdvanced && (
          <>
            <section className="space-y-2">
              <SectionSubHeader
                icon={Factory}
                title="Additional Basic Details"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Manufacturer"
                  placeholder="Manufacturer Name"
                  {...register("manufacturer")}
                  errors={errors.manufacturer}
                />
                <Controller
                  name="country_of_origin"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      placeholder="Select country"
                      label="Country of Origin"
                      loadOptions={getCountryOptions}
                      value={
                        COUNTRIES.find((country) => country.value === field.value) ??
                        null
                      }
                      onChange={(value) =>
                        field.onChange(
                          String(
                            (
                              value as import("react-select").SingleValue<Option>
                            )?.value ?? "",
                          ),
                        )
                      }
                      isClearable
                      errors={errors.country_of_origin}
                    />
                  )}
                />
              </div>
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={Gauge}
                title="Power Ratings"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Max AC Power (kW)"
                  type="number"
                  step="0.01"
                  {...register("max_ac_power_kw", {
                    valueAsNumber: true,
                  })}
                  errors={errors.max_ac_power_kw}
                />
                <Input
                  label="Max DC Power (kW)"
                  type="number"
                  step="0.01"
                  {...register("max_dc_power_kw", {
                    valueAsNumber: true,
                  })}
                  errors={errors.max_dc_power_kw}
                />
                <Input
                  label="Nominal Power (kW)"
                  type="number"
                  step="0.01"
                  {...register("nominal_power_kw", {
                    valueAsNumber: true,
                  })}
                  errors={errors.nominal_power_kw}
                />
              </div>
            </section>



            <section className="space-y-2">
              <SectionSubHeader
                icon={Zap}
                title="MPPT and DC voltage/current specifications"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="MPPT Count"
                  type="number"
                  {...register("mppt_count", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Min 1" },
                  })}
                  errors={errors.mppt_count}
                />
                <Input
                  label="Strings per MPPT"
                  type="number"
                  {...register("strings_per_mppt", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Min 1" },
                  })}
                  errors={errors.strings_per_mppt}
                />
                <Input
                  label="Min DC Voltage (V)"
                  type="number"
                  step="0.1"
                  {...register("min_dc_voltage", { valueAsNumber: true })}
                  errors={errors.min_dc_voltage}
                />
                <Input
                  label="Max DC Voltage (V)"
                  type="number"
                  step="0.1"
                  {...register("max_dc_voltage", { valueAsNumber: true })}
                  errors={errors.max_dc_voltage}
                />
                <Input
                  label="MPPT Voltage Range Min (V)"
                  type="number"
                  step="0.1"
                  {...register("mppt_voltage_range_min", { valueAsNumber: true })}
                  errors={errors.mppt_voltage_range_min}
                />
                <Input
                  label="MPPT Voltage Range Max (V)"
                  type="number"
                  step="0.1"
                  {...register("mppt_voltage_range_max", { valueAsNumber: true })}
                  errors={errors.mppt_voltage_range_max}
                />
                <Input
                  label="Max String Count"
                  type="number"
                  {...register("max_string_count", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Min 1" },
                  })}
                  errors={errors.max_string_count}
                />
                <Input
                  label="Max DC Current per MPPT (A)"
                  type="number"
                  step="0.1"
                  {...register("max_dc_current_per_mppt", { valueAsNumber: true })}
                  errors={errors.max_dc_current_per_mppt}
                />
                <Input
                  label="Max Short Circuit Current (A)"
                  type="number"
                  step="0.1"
                  {...register("max_short_circuit_current", {
                    valueAsNumber: true,
                  })}
                  errors={errors.max_short_circuit_current}
                />
              </div>
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={Cpu}
                title="AC voltage, frequency, and current specifications"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="AC Voltage Nominal (V)"
                  type="number"
                  step="0.1"
                  {...register("ac_voltage_nominal", {
                    valueAsNumber: true,
                  })}
                  errors={errors.ac_voltage_nominal}
                />
                <Input
                  label="AC Frequency Nominal (Hz)"
                  type="number"
                  step="0.1"
                  {...register("ac_frequency_nominal", {
                    valueAsNumber: true,
                  })}
                  errors={errors.ac_frequency_nominal}
                />
                <Input
                  label="AC Voltage Range Min (V)"
                  type="number"
                  step="0.1"
                  {...register("ac_voltage_range_min", { valueAsNumber: true })}
                  errors={errors.ac_voltage_range_min}
                />
                <Input
                  label="AC Voltage Range Max (V)"
                  type="number"
                  step="0.1"
                  {...register("ac_voltage_range_max", { valueAsNumber: true })}
                  errors={errors.ac_voltage_range_max}
                />
                <Input
                  label="AC Frequency Range Min (Hz)"
                  type="number"
                  step="0.1"
                  {...register("ac_frequency_range_min", { valueAsNumber: true })}
                  errors={errors.ac_frequency_range_min}
                />
                <Input
                  label="AC Frequency Range Max (Hz)"
                  type="number"
                  step="0.1"
                  {...register("ac_frequency_range_max", { valueAsNumber: true })}
                  errors={errors.ac_frequency_range_max}
                />
                <Input
                  label="Power Factor Range Min"
                  type="number"
                  step="0.01"
                  {...register("power_factor_range_min", { valueAsNumber: true })}
                  errors={errors.power_factor_range_min}
                />
                <Input
                  label="Power Factor Range Max"
                  type="number"
                  step="0.01"
                  {...register("power_factor_range_max", { valueAsNumber: true })}
                  errors={errors.power_factor_range_max}
                />
              </div>
              <Input
                label="Max AC Current (A)"
                type="number"
                step="0.1"
                {...register("max_ac_current", {
                  valueAsNumber: true,
                })}
                errors={errors.max_ac_current}
              />
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={Settings}
                title="Phase & Mechanical"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Controller
                  name="phase_type"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Phase Type"
                      loadOptions={loadPhaseTypeOptions}
                      value={
                        PHASE_TYPE_OPTIONS.find((o) => o.value === field.value) ?? null
                      }
                      onChange={(v) => field.onChange(String((v as import('react-select').SingleValue<Option>)?.value ?? ""))}
                      isClearable={false}
                      errors={errors.phase_type}
                    />
                  )}
                />
                <Input
                  label="Phase Count"
                  type="number"
                  {...register("phase_count", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Min 1" },
                  })}
                  errors={errors.phase_count}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  {...register("weight_kg", { valueAsNumber: true })}
                  errors={errors.weight_kg}
                />
                <Controller
                  name="cooling_method"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Cooling Method"
                      loadOptions={loadCoolingMethodOptions}
                      value={
                        COOLING_METHOD_OPTIONS.find(
                          (o) => o.value === (field.value ?? ""),
                        ) ?? COOLING_METHOD_OPTIONS[0]
                      }
                      onChange={(v) => field.onChange(String((v as import('react-select').SingleValue<Option>)?.value ?? ""))}
                      isClearable={false}
                      errors={errors.cooling_method}
                    />
                  )}
                />
                <Input
                  label="Protection Rating"
                  {...register("protection_rating")}
                  errors={errors.protection_rating}
                />
                <Input
                  label="Noise Level (dB)"
                  type="number"
                  step="0.1"
                  {...register("noise_level_db", { valueAsNumber: true })}
                  errors={errors.noise_level_db}
                />
              </div>
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={Thermometer}
                title="Temperature"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Operating Temp Min (°C)"
                  type="number"
                  step="0.1"
                  {...register("operating_temp_min", { valueAsNumber: true })}
                  errors={errors.operating_temp_min}
                />
                <Input
                  label="Operating Temp Max (°C)"
                  type="number"
                  step="0.1"
                  {...register("operating_temp_max", { valueAsNumber: true })}
                  errors={errors.operating_temp_max}
                />
              </div>
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={Wifi}
                title="Communication & Features"
              />
              <div className="space-y-2">
                <TagInput
                  label="Communication interfaces"
                  addButtonLabel={"Add"}
                  value={communicationInterfaces}
                  onChange={(next) =>
                    setValue("communication_interfaces", next, {
                      shouldDirty: true,
                    })
                  }
                  placeholder="Communication interfaces"
                  parseInput={parseCommunicationInterfaceInput}
                  formatTag={formatCommunicationInterfaceChip}
                  getTagKey={(entry, index) =>
                    `${stableCommInterfaceKey(entry)}-${index}`
                  }
                  isDuplicate={(existing, next) =>
                    stableCommInterfaceKey(existing) === stableCommInterfaceKey(next)
                  }
                />
                <div className="space-y-2">
                  <SectionSubHeader icon={Wifi} title="Hardware Interface Flags" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Toggle label="Has Wi-Fi" {...register("has_wifi")} />
                    <Toggle label="Has Ethernet" {...register("has_ethernet")} />
                    <Toggle label="Has RS485" {...register("has_rs485")} />
                    <Toggle label="Has display" {...register("has_display")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <TagInput
                    label="Protocols Supported"
                    addButtonLabel="Add"
                    value={protocols}
                    onChange={(next) =>
                      setValue("protocols_supported", next, {
                        shouldDirty: true,
                      })
                    }
                    placeholder="Add protocol"
                  />
                </div>
                <div className="space-y-2">
                  <TagInput
                    label="Certifications"
                    addButtonLabel="Add"
                    value={certifications}
                    onChange={(next) =>
                      setValue("certifications", next, {
                        shouldDirty: true,
                      })
                    }
                    placeholder="Certifications"
                  />
                </div>
                <Input
                  label="Warranty (Years)"
                  type="number"
                  {...register("warranty_years", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Min 0" },
                    validate: {
                      isWholeNumber: (v) =>
                        Number.isInteger(v) || "Must be a whole number",
                    },
                  })}
                  errors={errors.warranty_years}
                />
              </div>
            </section>

            <section className="space-y-2">
              <SectionSubHeader
                icon={FileText}
                title="Documents & Pricing"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Datasheet URL"
                  className="md:col-span-2"
                  {...register("datasheet_url", {
                    validate: (v) =>
                      !v || /^https?:\/\/.+/.test(v) || "Enter a valid URL",
                  })}
                  errors={errors.datasheet_url}
                />
                <Input
                  label="Manual URL"
                  className="md:col-span-2"
                  {...register("manual_url", {
                    validate: (v) =>
                      !v || /^https?:\/\/.+/.test(v) || "Enter a valid URL",
                  })}
                  errors={errors.manual_url}
                />
                <Input
                  label="List Price"
                  type="number"
                  step="0.01"
                  {...register("list_price", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Min 0" },
                  })}
                  errors={errors.list_price}
                />
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Currency"
                      loadOptions={loadCurrencyOptions}
                      value={CURRENCY_OPTIONS.find((o) => o.value === field.value) ?? null}
                      onChange={(v) => field.onChange(String((v as import('react-select').SingleValue<Option>)?.value ?? ""))}
                      isClearable={false}
                      errors={errors.currency}
                    />
                  )}
                />
                <div className="md:col-span-2 space-y-2">
                  <TagInput
                    label="Tags"
                    addButtonLabel="Add"
                    value={tags}
                    onChange={(next) =>
                      setValue("tags", next, {
                        shouldDirty: true,
                      })
                    }
                    placeholder="Add Tags"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="space-y-2">
                <div className="space-y-2">
                  <SectionSubHeader icon={Settings} title="Specifications" />
                  <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-3">
                    <TagMapBuilder
                      key={`specifications-${kvBuildersKey}`}
                      initialConfig={specifications}
                      onChange={(v) => {
                        setValue("specifications", v, { shouldDirty: true });
                      }}
                      keyLabel="Specification"
                      valueLabel="Value"
                      previewLabel="specifications"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionSubHeader icon={Database} title="Register Map" />
                  <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-3">
                    <TagMapBuilder
                      key={`register_map-${kvBuildersKey}`}
                      initialConfig={registerMap}
                      onChange={(v) => {
                        setValue("register_map", v, { shouldDirty: true });
                      }}
                      keyLabel="Register Name"
                      valueLabel="Address / Value"
                      previewLabel="register_map"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionSubHeader icon={Database} title="Data Points" />
                  <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-3">
                    <TagMapBuilder
                      key={`data_points-${kvBuildersKey}`}
                      initialConfig={dataPoints}
                      onChange={(v) => {
                        setValue("data_points", v, { shouldDirty: true });
                      }}
                      keyLabel="Point Name"
                      valueLabel="Type / Value"
                      previewLabel="data_points"
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 pb-2.5 pt-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              isEdit && initialValues
                ? reset({ ...initialValues } as CreateInverterFormValues)
                : reset()
            }
            disabled={isEdit ? updateLoading : isLoading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isEdit ? updateLoading : isLoading}
            loading={isEdit ? updateLoading : isLoading}
          >
            {isEdit ? "Update Inverter" : "Create Inverter"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CreateInverterTypeForm;
