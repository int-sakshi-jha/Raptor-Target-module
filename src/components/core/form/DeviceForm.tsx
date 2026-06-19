import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  type Device,
  type CreateDeviceInput,
  type UpdateDeviceInput,
  fetchDeviceTypeOptions,
  fetchPlantUtilityTypeOptions,
  useGetDeviceDetailsQuery,
  useCreateDeviceMutation,
  useUpdateDeviceMutation,
} from "@/services/operations/deviceAPI";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Password from "@/components/common/Password";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Toggle from "@/components/common/Toggle";
import { Wifi, Settings, Shield, Radio, Plus, Trash2, Info } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import FormModeToggle from "@/components/common/FormModeToggle";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { applyBackendErrors } from "@/utils/formValidators";
import {
  fetchTagTemplateNames,
} from "@/services/operations/tagTemplateAPI";

// ── Types ───────────────────────────────────────────────────────────────────
type ExternalTopicEntry = {
  topic: string;
  topic_name: string;
};

type DeviceFormValues = {
  tenant_id: Option | null;
  plant_id?: Option | null;
  plant_utility_type?: Option | null;
  device_type?: Option | null;
  device_name?: string;
  serial_number?: string;
  mac_address?: string;
  imei?: string;
  model_code?: string;
  manufacturer?: string;
  data_interval_seconds?: string;
  external_client_id?: string;
  external_username?: string;
  external_password?: string;
  external_vd_tag_name?: string;
  external_broker_url?: string;
  external_topics: ExternalTopicEntry[];
  topics: ExternalTopicEntry[];
  is_default_config: boolean;
  is_active: boolean;
  health_vd?: string;
  health_tag_template_id?: Option | null;
  warranty_start_date?: string;
  warranty_end_date?: string;
  client_id?: string;
  username?: string;
  password?: string;
  config_json?: string;
};

type DeviceFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<Device>;
  editValues?: Partial<Device>;
  onSuccess?: () => void;
};

const parseJsonObjectField = (
  rawValue: string | undefined,
  fieldLabel: string,
): Record<string, unknown> | null => {
  if (!rawValue || rawValue.trim() === "") return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error(`${fieldLabel} must be a JSON object.`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : `${fieldLabel} must be valid JSON.`,
    );
  }
};

const normalizeTopicEntries = (
  topics: Array<Partial<ExternalTopicEntry> | null | undefined> | null | undefined,
): ExternalTopicEntry[] => {
  if (!Array.isArray(topics)) return [];

  return topics.map((topic) => ({
    topic: typeof topic?.topic === "string" ? topic.topic : "",
    topic_name: typeof topic?.topic_name === "string" ? topic.topic_name : "",
  }));
};

const buildOption = (
  value: string | null | undefined,
  label: string | null | undefined,
): Option | null =>
  value
    ? {
      value,
      label: label ?? value,
    }
    : null;

const TOPIC_LIST_SCROLL_CLASS =
  "max-h-[26rem] overflow-y-auto pr-2 custom-scrollbar";

// ── Component ────────────────────────────────────────────────────────────────

const DeviceForm = ({
  mode = "create",
  initialValues,
  editValues: externaleditValues,
  onSuccess,
}: DeviceFormProps) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const editDeviceId =
    isEdit ? (externaleditValues?.id ?? initialValues?.id ?? null) : null;

  const createMutation = useCreateDeviceMutation();
  const updateMutation = useUpdateDeviceMutation();
  const isLoading = createMutation.isPending;
  const updateLoading = updateMutation.isPending;

  const {
    data: deviceDetailsResponse,
    isLoading: isLoadingDeviceDetails,
  } = useGetDeviceDetailsQuery(editDeviceId, {
    staleTime: 0,
    enabled: isEdit && !!editDeviceId,
  });

  const editValues = useMemo(
    () => deviceDetailsResponse?.data?.device ?? externaleditValues ?? initialValues,
    [externaleditValues, deviceDetailsResponse, initialValues],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    trigger,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<DeviceFormValues>({
    defaultValues: {
      tenant_id: null,
      plant_id: null,
      plant_utility_type: null,
      device_type: null,
      device_name: "",
      serial_number: "",
      mac_address: "",
      imei: "",
      model_code: "",
      manufacturer: "",
      data_interval_seconds: "300",
      external_client_id: "",
      external_username: "",
      external_password: "",
      external_vd_tag_name: "",
      external_broker_url: "",
      external_topics: [],
      topics: [],
      is_default_config: false,
      is_active: true,
      health_vd: "",
      health_tag_template_id: null,
      warranty_start_date: "",
      warranty_end_date: "",
      client_id: "",
      username: "",
      password: "",
      config_json: "",
    },
  });

  useEffect(() => {
    if (isEdit && editValues) {
      reset({
        tenant_id: buildOption(
          editValues.tenant_id,
          editValues.tenant_name,
        ),
        plant_id: buildOption(
          editValues.plant_id,
          editValues.plant_name,
        ),
        plant_utility_type: buildOption(
          editValues.plant_utility_type,
          editValues.plant_utility_type,
        ),
        device_type: buildOption(
          editValues.device_type,
          editValues.device_type,
        ),
        device_name: editValues.device_name ?? "",
        serial_number: editValues.serial_number ?? "",
        mac_address: editValues.mac_address ?? "",
        imei: editValues.imei ?? "",
        model_code: editValues.model_code ?? "",
        manufacturer: editValues.manufacturer ?? "",
        data_interval_seconds: String(editValues.data_interval_seconds ?? 300),
        external_client_id: editValues.external_client_id ?? "",
        external_username: editValues.external_username ?? "",
        external_password: editValues.external_password ?? "",
        external_vd_tag_name: editValues.external_vd_tag_name ?? "",
        external_broker_url: editValues.external_broker_url ?? "",
        external_topics: normalizeTopicEntries(editValues.external_topics),
        topics: normalizeTopicEntries(editValues.topics),
        is_default_config: editValues.is_default_config ?? false,
        is_active: editValues.is_active ?? true,
        health_vd: editValues.health_vd != null ? String(editValues.health_vd) : "",
        health_tag_template_id: buildOption(
          editValues.health_tag_template_id,
          editValues.health_tag_template_name,
        ),
        warranty_start_date: editValues.warranty_start_date
          ? editValues.warranty_start_date.slice(0, 10)
          : "",
        warranty_end_date: editValues.warranty_end_date
          ? editValues.warranty_end_date.slice(0, 10)
          : "",
        client_id: editValues.client_id ?? "",
        username: editValues.username ?? "",
        password: editValues.password ?? "",
        config_json: editValues.config_json
          ? JSON.stringify(editValues.config_json, null, 2)
          : "",
      });
    }
  }, [isEdit, editValues, reset]);

  const selectedTenant = useWatch({ control, name: "tenant_id" });
  const watchedImei = useWatch({ control, name: "imei" });
  const watchedMacAddress = useWatch({ control, name: "mac_address" });
  const watchedExternalClientId = useWatch({ control, name: "external_client_id" });
  const watchedExternalUsername = useWatch({ control, name: "external_username" });
  const watchedExternalPassword = useWatch({ control, name: "external_password" });
  const watchedExternalVdTagName = useWatch({ control, name: "external_vd_tag_name" });
  const watchedExternalBrokerUrl = useWatch({ control, name: "external_broker_url" });
  const topicEntries = useWatch({ control, name: "external_topics" }) || [];
  const generatedTopicEntries = useWatch({ control, name: "topics" }) || [];
  const watchedHealthVd = useWatch({ control, name: "health_vd" });
  const warrantyStartDate = useWatch({ control, name: "warranty_start_date" });
  const warrantyEndDate = useWatch({ control, name: "warranty_end_date" });

  const anyExternalFieldFilled = !!(
    watchedExternalClientId?.trim() ||
    watchedExternalUsername?.trim() ||
    watchedExternalPassword?.trim() ||
    watchedExternalVdTagName?.trim() ||
    watchedExternalBrokerUrl?.trim()
  );

  const loadPlantOptions = useCallback(
    (search = "") =>
      fetchPlantNames(
        search,
        1,
        50,
        selectedTenant?.value ? String(selectedTenant.value) : undefined,
      ),
    [selectedTenant],
  );

  const loadDeviceTypeOptions = useCallback(
    (search = "") => fetchDeviceTypeOptions(search),
    [],
  );

  const loadPlantUtilityTypeOptions = useCallback(
    (search = "") => fetchPlantUtilityTypeOptions(search),
    [],
  );

  const loadHealthTagTemplateOptions = useCallback(
    (search = "") => fetchTagTemplateNames(search, 1, 50),
    [],
  );

  const onSubmit = (data: DeviceFormValues) => {
    try {
      const configJson = parseJsonObjectField(data.config_json, "Config JSON");

      const basePayload = {
        tenant_id: data.tenant_id?.value ? String(data.tenant_id.value) : "",
        plant_id: data.plant_id?.value ? String(data.plant_id.value) : "",
        device_name: (data.device_name ?? "").trim(),
        device_type: data.device_type?.value ? String(data.device_type.value) : "",
        imei: (data.imei ?? "").trim() || null,
        mac_address: (data.mac_address ?? "").trim() || null,
        serial_number: (data.serial_number ?? "").trim() || null,
        model_code: (data.model_code ?? "").trim() || null,
        manufacturer: (data.manufacturer ?? "").trim() || null,
        plant_utility_type: data.plant_utility_type?.value
          ? String(data.plant_utility_type.value)
          : null,
        data_interval_seconds: data.data_interval_seconds
          ? Number(data.data_interval_seconds)
          : 300,
        external_client_id: (data.external_client_id ?? "").trim() || null,
        external_username: (data.external_username ?? "").trim() || null,
        external_password: (data.external_password ?? "").trim() || null,
        external_vd_tag_name: (data.external_vd_tag_name ?? "").trim() || null,
        external_broker_url: (data.external_broker_url ?? "").trim() || null,
        external_topics: data.external_topics.length > 0 ? data.external_topics : null,
        is_default_config: data.is_default_config,
        is_active: data.is_active,
        health_vd: data.health_vd ? Number(data.health_vd) : null,
        health_tag_template_id: data.health_tag_template_id?.value
          ? String(data.health_tag_template_id.value)
          : null,
        warranty_start_date: data.warranty_start_date || null,
        warranty_end_date: data.warranty_end_date || null,
        metadata: {}, // placeholders or from data.metadata if you had it
      };

      if (isEdit && editDeviceId) {
        const updatePayload: UpdateDeviceInput = {
          id: editDeviceId,
          ...basePayload,
          client_id: (data.client_id ?? "").trim() || null,
          username: (data.username ?? "").trim() || null,
          password: (data.password ?? "").trim() || null,
          config_json: configJson,
          topics: data.topics,
        };

        updateMutation.mutate(
          updatePayload,
          {
            onSuccess: () => {
              if (onSuccess) onSuccess();
            },
            onError: (error) => {
              applyBackendErrors(error, setError, getValues);
            },
          },
        );
      } else {
        const createPayload: CreateDeviceInput = basePayload;
        createMutation.mutate(createPayload, {
          onSuccess: () => {
            reset();
            if (onSuccess) onSuccess();
          },
          onError: (error) => {
            applyBackendErrors(error, setError, getValues);
          },
        });
      }
    } catch {
      /* ignore */
    }
  };


  const handleResetForm = () => {
    if (isEdit && editValues) {
      reset({
        tenant_id: buildOption(
          editValues.tenant_id,
          editValues.tenant_name,
        ),
        plant_id: buildOption(
          editValues.plant_id,
          editValues.plant_name,
        ),
        plant_utility_type: buildOption(
          editValues.plant_utility_type,
          editValues.plant_utility_type,
        ),
        device_type: buildOption(
          editValues.device_type,
          editValues.device_type,
        ),
        device_name: editValues.device_name ?? "",
        serial_number: editValues.serial_number ?? "",
        mac_address: editValues.mac_address ?? "",
        imei: editValues.imei ?? "",
        model_code: editValues.model_code ?? "",
        manufacturer: editValues.manufacturer ?? "",
        data_interval_seconds: String(editValues.data_interval_seconds ?? 300),
        external_client_id: editValues.external_client_id ?? "",
        external_username: editValues.external_username ?? "",
        external_password: editValues.external_password ?? "",
        external_vd_tag_name: editValues.external_vd_tag_name ?? "",
        external_broker_url: editValues.external_broker_url ?? "",
        external_topics: normalizeTopicEntries(editValues.external_topics),
        topics: normalizeTopicEntries(editValues.topics),
        is_default_config: editValues.is_default_config ?? false,
        is_active: editValues.is_active ?? true,
        health_vd: editValues.health_vd != null ? String(editValues.health_vd) : "",
        health_tag_template_id: buildOption(
          editValues.health_tag_template_id,
          editValues.health_tag_template_name,
        ),
        warranty_start_date: editValues.warranty_start_date
          ? editValues.warranty_start_date.slice(0, 10)
          : "",
        warranty_end_date: editValues.warranty_end_date
          ? editValues.warranty_end_date.slice(0, 10)
          : "",
        client_id: editValues.client_id ?? "",
        username: editValues.username ?? "",
        password: editValues.password ?? "",
        config_json: editValues.config_json
          ? JSON.stringify(editValues.config_json, null, 2)
          : "",
      });
    } else {
      reset();
    }
  };

  const addTopicEntry = () => {
    setValue("external_topics", [
      ...topicEntries,
      { topic: "", topic_name: "" },
    ]);
  };

  const updateTopicEntry = (
    index: number,
    field: keyof ExternalTopicEntry,
    value: string,
  ) => {
    const next = [...topicEntries];
    next[index] = { ...next[index], [field]: value };
    setValue("external_topics", next);
  };

  const removeTopicEntry = (index: number) => {
    const next = topicEntries.filter((_, i) => i !== index);
    setValue("external_topics", next);
  };

  const addGeneratedTopicEntry = () => {
    setValue("topics", [
      ...generatedTopicEntries,
      { topic: "", topic_name: "" },
    ]);
  };

  const updateGeneratedTopicEntry = (
    index: number,
    field: keyof ExternalTopicEntry,
    value: string,
  ) => {
    const next = [...generatedTopicEntries];
    next[index] = { ...next[index], [field]: value };
    setValue("topics", next);
  };

  const removeGeneratedTopicEntry = (index: number) => {
    const next = generatedTopicEntries.filter((_, i) => i !== index);
    setValue("topics", next);
  };

  if (isEdit && editDeviceId && isLoadingDeviceDetails && !editValues) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size={3} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-dark-700">
          Loading device details...
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
            <div className="md:col-span-2">
              {isEdit ? (
                <Input
                  label="Tenant"
                  value={editValues?.tenant_name ?? editValues?.tenant_id ?? ""}
                  disabled
                />
              ) : (
                <Controller
                  name="tenant_id"
                  control={control}
                  rules={{ required: "Tenant is required" }}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Tenant"
                      star
                      placeholder="Tenant"
                      apiSearch
                      loadOptions={(search = "") => fetchTenantNames(search, 1, 50)}
                      value={field.value}
                      onChange={(val) => field.onChange(val as Option | null)}
                      errors={errors.tenant_id as { message?: string } | undefined}
                      isClearable
                    />
                  )}
                />
              )}
            </div>
            <Controller
              name="plant_id"
              control={control}
              rules={{
                required: selectedTenant ? "Plant is required" : false,
                validate: (value) => {
                  if (!selectedTenant) return true;
                  return value != null || "Plant is required";
                }
              }}
              render={({ field }) => (
                <AsyncSelect
                  label="Plant"
                  star={!!selectedTenant}
                  placeholder="Plant"
                  apiSearch
                  loadOptions={loadPlantOptions}
                  value={field.value ?? null}
                  onChange={(val) => {
                    field.onChange(val as Option | null);
                    trigger("plant_id");
                  }}
                  isDisabled={!selectedTenant}
                  isClearable
                  key={selectedTenant?.value ?? "no-tenant"}
                  errors={errors.plant_id as { message?: string } | undefined}
                />
              )}
            />
            <Input
              label="Device Name"
              star
              {...register("device_name", {
                required: "Device name is required",
                validate: (value) =>
                  (value?.trim().length ?? 0) >= 2 ||
                  "Device name must contain at least 2 characters.",
              })}
              placeholder="Device Name"
              errors={errors.device_name}
            />
            <Controller
              name="device_type"
              control={control}
              rules={{ required: "Device type is required" }}
              render={({ field }) => (
                <AsyncSelect
                  label="Device Type"
                  star
                  placeholder="Device Type"
                  loadOptions={loadDeviceTypeOptions}
                  value={field.value ?? null}
                  onChange={(val) => field.onChange(val as Option | null)}
                  errors={errors.device_type as { message?: string } | undefined}
                  isClearable
                />
              )}
            />
            <Input
              label="IMEI"
              star={!watchedMacAddress?.trim()}
              {...register("imei", {
                validate: (value) =>
                  value?.trim() || watchedMacAddress?.trim()
                    ? true
                    : "Enter either an IMEI or a MAC address.",
              })}
              placeholder="IMEI"
              errors={errors.imei}
            />
            <Input
              label="MAC Address"
              star={!watchedImei?.trim()}
              {...register("mac_address", {
                validate: (value) =>
                  value?.trim() || watchedImei?.trim()
                    ? true
                    : "Enter either an IMEI or a MAC address.",
              })}
              placeholder="MAC Address"
              errors={errors.mac_address}
            />

            {showAdvanced && (
              <>
                <Input
                  label="Serial Number"
                  {...register("serial_number", {
                    validate: (value) =>
                      !value || value.trim() === "" || value.trim().length >= 2 ||
                      "Serial number must contain at least 2 characters.",
                  })}
                  placeholder="Serial Number"
                  errors={errors.serial_number}
                />
                <Input
                  label="Model Code"
                  {...register("model_code", {
                    validate: (value) =>
                      !value || value.trim() === "" || value.trim().length >= 2 ||
                      "Model code must contain at least 2 characters.",
                  })}
                  placeholder="Model Code"
                  errors={errors.model_code}
                />
                <Input
                  label="Manufacturer"
                  {...register("manufacturer", {
                    validate: (value) =>
                      !value || value.trim() === "" || value.trim().length >= 2 ||
                      "Manufacturer name must contain at least 2 characters.",
                  })}
                  placeholder="Manufacturer"
                  errors={errors.manufacturer}
                />
                <Controller
                  name="plant_utility_type"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Plant Utility Type"
                      placeholder="Plant Utility Type"
                      loadOptions={loadPlantUtilityTypeOptions}
                      value={field.value ?? null}
                      onChange={(val) => field.onChange(val as Option | null)}
                      isClearable
                    />
                  )}
                />
              </>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="space-y-2">
            <SectionSubHeader
              icon={Wifi}
              title="Connectivity"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                label="Data Interval (seconds)"
                type="number"
                min={30}
                {...register("data_interval_seconds", {
                  validate: (value) => {
                    if (!value) return true;
                    return (
                      Number(value) >= 30 ||
                      "Data interval must be at least 30 seconds."
                    );
                  },
                })}
                placeholder="Data Interval"
                errors={errors.data_interval_seconds}
              />
              <Input
                label="External Client ID"
                star={anyExternalFieldFilled}
                {...register("external_client_id", {
                  required: anyExternalFieldFilled
                    ? "External client ID is required"
                    : false,
                })}
                placeholder="External Client ID"
                errors={errors.external_client_id}
              />
              <Input
                label="External Username"
                star={anyExternalFieldFilled}
                {...register("external_username", {
                  required: anyExternalFieldFilled
                    ? "External username is required"
                    : false,
                })}
                placeholder="External Username"
                errors={errors.external_username}
              />
              <Password
                label="External Password"
                star={anyExternalFieldFilled}
                {...register("external_password", {
                  required: anyExternalFieldFilled
                    ? "External password is required"
                    : false,
                })}
                placeholder="External Password"
                errors={errors.external_password}
              />
              <Input
                label="External VD Tag Name"
                star={anyExternalFieldFilled}
                {...register("external_vd_tag_name", {
                  required: anyExternalFieldFilled
                    ? "External VD tag name is required"
                    : false,
                })}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.replace(/[0-9]/g, "");
                }}
                placeholder="External VD Tag Name"
                errors={errors.external_vd_tag_name}
              />
              <Input
                label="External Broker URL"
                star={anyExternalFieldFilled}
                {...register("external_broker_url", {
                  required: anyExternalFieldFilled
                    ? "External broker URL is required"
                    : false,
                })}
                placeholder="External Broker URL"
                className="md:col-span-2"
                errors={errors.external_broker_url}
              />
            </div>
          </div>
        )}

        {showAdvanced && (
          <div className="space-y-2">
            <SectionSubHeader
              icon={Radio}
              title="External Topics"
            />
            <div className="space-y-2">
              {topicEntries.length === 0 && (
                <div className="rounded-xs border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/30 px-4 py-5">
                  <p className="text-sm text-neutral-500 dark:text-neutral-dark-500">
                    No external topics added yet. Add one only if this device needs
                    to publish or subscribe to an external broker topic.
                  </p>
                </div>
              )}

              {topicEntries.length > 0 && (
                <div className={TOPIC_LIST_SCROLL_CLASS}>
                  <div className="hidden md:grid md:grid-cols-[1fr_1fr_auto] gap-3 px-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-dark-500">
                      Topic Name
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-dark-500">
                      Topic
                    </span>
                    <span className="sr-only">Actions</span>
                  </div>

                  <div className="space-y-3 pt-3 md:pt-2">
                    {topicEntries.map((entry, index) => (
                      <div
                        key={index}
                        className="rounded-xs border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-dark-200 p-3 md:p-0 md:bg-transparent md:border-none flex flex-col gap-3 md:block"
                      >
                        <div className="flex items-center justify-between md:hidden">
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-dark-900">
                            Topic {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTopicEntry(index)}
                            className="p-1 -mr-1 rounded-xs text-neutral-400 dark:text-neutral-dark-500 hover:text-error-500 dark:hover:text-error-dark-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-all"
                            title="Remove topic"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                          <Input
                            label={`Topic Name ${index + 1}`}
                            labelClassName="md:sr-only"
                            placeholder="Topic Name"
                            value={entry.topic_name}
                            onChange={(e) =>
                              updateTopicEntry(index, "topic_name", e.target.value)
                            }
                          />
                          <Input
                            label={`Topic ${index + 1}`}
                            labelClassName="md:sr-only"
                            placeholder="Topic"
                            value={entry.topic}
                            onChange={(e) =>
                              updateTopicEntry(index, "topic", e.target.value)
                            }
                          />
                          <div className="hidden md:flex items-end h-full">
                            <button
                              type="button"
                              className="w-auto border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-dark-500 dark:hover:bg-error-500/10 px-3 py-2.5 rounded-xs border transition-colors"
                              onClick={() => removeTopicEntry(index)}
                              title="Remove topic"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xs border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 px-4 py-4 mt-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                  Add topic mapping
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-dark-500">
                  Use `topic-name` as a short identifier (e.g. datapub) and `topic`
                  for the full broker topic path.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={addTopicEntry}
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Topic
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {isEdit && (
          <div className="space-y-2">
            <SectionSubHeader
              icon={Settings}
              title="Backend Fields"
            />
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Client ID"
                  {...register("client_id")}
                  placeholder="Client ID"
                />
                <Input
                  label="Username"
                  {...register("username")}
                  placeholder="Username"
                />
                <Password
                  label="Password"
                  {...register("password")}
                  placeholder="Password"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                  Config JSON
                </p>
                <textarea
                  {...register("config_json")}
                  rows={10}
                  className="input min-h-[14rem] rounded-xs px-3 py-2 font-mono text-xs"
                  placeholder="Config JSON"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                  Topics
                </p>
                <div className="space-y-2">
                  {generatedTopicEntries.length === 0 && (
                    <div className="rounded-xs border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-dark-500">
                      No generated topics are available for this device.
                    </div>
                  )}
                  {generatedTopicEntries.length > 0 && (
                    <div className={TOPIC_LIST_SCROLL_CLASS}>
                      <div className="hidden md:grid md:grid-cols-[1fr_1fr_auto] gap-3 px-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-dark-500">
                          Topic Name
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-dark-500">
                          Topic
                        </span>
                        <span className="sr-only">Actions</span>
                      </div>
                      <div className="space-y-3 pt-3 md:pt-2">
                        {generatedTopicEntries.map((entry, index) => (
                          <div
                            key={`generated-topic-${index}`}
                            className="rounded-xs border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 p-3 md:p-0 md:bg-transparent md:border-none flex flex-col gap-3 md:block"
                          >
                            <div className="flex items-center justify-between md:hidden">
                              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-dark-900">
                                Topic {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeGeneratedTopicEntry(index)}
                                className="p-1 -mr-1 rounded-xs text-neutral-400 dark:text-neutral-dark-500 hover:text-error-500 dark:hover:text-error-dark-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-all"
                                title="Remove topic"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                              <Input
                                label={`Topic Name ${index + 1}`}
                                labelClassName="md:sr-only"
                                placeholder="Topic Name"
                                value={entry.topic_name}
                                onChange={(e) =>
                                  updateGeneratedTopicEntry(index, "topic_name", e.target.value)
                                }
                              />
                              <Input
                                label={`Topic ${index + 1}`}
                                labelClassName="md:sr-only"
                                placeholder="Topic"
                                value={entry.topic}
                                onChange={(e) =>
                                  updateGeneratedTopicEntry(index, "topic", e.target.value)
                                }
                              />
                              <div className="hidden md:flex items-end h-full">
                                <button
                                  type="button"
                                  className="w-auto border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-dark-500 dark:hover:bg-error-500/10 px-3 py-2 rounded-xs border transition-colors"
                                  onClick={() => removeGeneratedTopicEntry(index)}
                                  title="Remove topic"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addGeneratedTopicEntry}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Generated Topic
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAdvanced && (
          <div className="space-y-2">
            <div className="space-y-2">
              <SectionSubHeader
                icon={Settings}
                title="Settings"
              />
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Toggle label="Default Config" {...register("is_default_config")} />
                  <Toggle label="Active" {...register("is_active")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    label="Health VD"
                    type="number"
                    min={0}
                    {...register("health_vd", {
                      min: { value: 0, message: "Health VD must be 0 or greater." },
                    })}
                    placeholder="Health VD"
                    errors={errors.health_vd}
                  />
                  <Controller
                    name="health_tag_template_id"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (watchedHealthVd && watchedHealthVd.trim() !== "") {
                          return value != null || "Health template is required when Health VD is specified.";
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Health Template"
                        star={!!watchedHealthVd && watchedHealthVd.trim() !== ""}
                        apiSearch
                        placeholder="Health Template"
                        loadOptions={loadHealthTagTemplateOptions}
                        value={field.value ?? null}
                        onChange={(val) => field.onChange(val as Option | null)}
                        isClearable
                        errors={errors.health_tag_template_id as { message?: string } | undefined}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <SectionSubHeader
                icon={Shield}
                title="Warranty"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="Warranty Start Date"
                  type="date"
                  {...register("warranty_start_date", {
                    validate: (val) => {
                      if (!warrantyEndDate) return true;
                      return !!val || "Start date is required when an end date is set.";
                    },
                  })}
                  errors={errors.warranty_start_date}
                />
                <Input
                  label="Warranty End Date"
                  type="date"
                  {...register("warranty_end_date", {
                    validate: (val) => {
                      if (!val || !warrantyStartDate) return true;
                      return (
                        new Date(val) > new Date(warrantyStartDate) ||
                        "End date must be later than the start date."
                      );
                    },
                    onChange: () => trigger("warranty_start_date"),
                  })}
                  errors={errors.warranty_end_date}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Navigation ── */}
      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForm}
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
            {isEdit ? "Update Device" : "Create Device"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default DeviceForm;
