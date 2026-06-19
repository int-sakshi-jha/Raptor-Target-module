
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Check, ChevronDown, ChevronUp, Copy, Database, HardDrive, Settings, Info } from "lucide-react";

import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import { type SingleValue, type MultiValue } from "react-select";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import Spinner from "@/components/common/Spinner";
import Tabs from "@/components/common/Tabs";
import {
  componentTechnicalAttributesAreConfiguredEmpty,
  fetchComponentTypeOptions,
  normalizeComponentMeterTypeValue,
  shouldShowComponentTechnicalField,
  useGetComponentTypeOptionsQuery,
} from "@/services/operations/componentAPI";
import { fetchPlantNames, useGetPlantDetailsQuery } from "@/services/operations/plantAPI";
import { fetchDeviceNames } from "@/services/operations/deviceAPI";
import { fetchTagTemplateNames, useGetTagTemplateDetailsQuery } from "@/services/operations/tagTemplateAPI";
import {
  useCreateComponentMutation,
  fetchComponentRowsForPlant,
  useGetComponentDetailsQuery,
  useUpdateComponentMutation,
  type ComponentRow,
  type CreateComponentInput,
  type UpdateComponentInput,
  fetchComponentNames,
} from "@/services/operations/componentAPI";
import { fetchInverterTypeNames } from "@/services/operations/inverterTypeAPI";
import { applyBackendErrors } from "@/utils/formValidators";
import { useAppSelector } from "@/store/hooks";


type ComponentFormValues = {
  plant_id: Option | null;
  parent_id: Option | null;
  device_id: Option | null;
  share_component_plant_id: Option | null;
  share_component_type: Option | null;
  share_component_id: Option | null;
  share_component_tag_template_id: Option | null;
  inverter_type_id: Option | null;
  tag_template_id: Option | null;
  alarm_tag_template_id: Option | null;
  is_shared_component: boolean;
  is_dynamic: boolean;
  component_type: string;
  component_name: string;
  component_code: string;
  serial_number: string;
  vd_number: string;
  ac_capacity_kw: string;
  dc_capacity_kw: string;
  meter_type: string;
  is_bot_layer_process: boolean;
  is_default_bot_process_template: boolean;
  default_alarm_template: boolean;
  is_active: boolean;
  identifier: string;
  is_all_channels_same: boolean;
  dc_channel_configs: Array<{
    is_active: boolean;
    dc_capacity: string;
  }>;
};

type ComponentFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<ComponentRow>;
  editValues?: Partial<ComponentRow>;
  lockPlantSelection?: boolean;
  onSuccess?: () => void;
};

type ComponentTypeCode = "P" | "B" | "AC";

type TechnicalNumberFieldName =
  | "ac_capacity_kw"
  | "dc_capacity_kw";

const BOT_LAYER_COMPONENT_TYPES = new Set<ComponentTypeCode>(["P", "B", "AC"]);


const TECHNICAL_NUMBER_FIELDS: ReadonlyArray<{
  name: TechnicalNumberFieldName;
  label: string;
  step?: string;
}> = [
    { name: "ac_capacity_kw", label: "AC Capacity (kW)" },
    { name: "dc_capacity_kw", label: "DC Capacity (kW)" },
  ];


const COMPONENT_METER_TYPE_SELECT_OPTIONS: Option[] = [
  { value: "HT", label: "HT Meter" },
  { value: "LT", label: "LT Meter" },
];



const toNumberInputValue = (value?: number | null) =>
  value == null ? "" : String(value);

const parseNullableNumber = (value: string) => {
  if (value.trim() === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const supportsBotLayerProcess = (componentType: string) =>
  BOT_LAYER_COMPONENT_TYPES.has(componentType as ComponentTypeCode);

const ComponentForm: React.FC<ComponentFormProps> = ({
  mode = "create",
  initialValues,
  editValues: externalEditValues,
  lockPlantSelection = false,
  onSuccess,
}) => {
  const isEdit = mode === "edit";
  const editComponentId = isEdit ? (externalEditValues?.id ?? initialValues?.id ?? null) : null;
  const currentUser = useAppSelector((state) => state.auth.user as { tenant_id?: string | null } | null);

  const createMutation = useCreateComponentMutation();
  const updateMutation = useUpdateComponentMutation();
  const {
    data: componentDetailsResponse,
    isLoading: isLoadingComponentDetails,
  } = useGetComponentDetailsQuery(editComponentId, {
    staleTime: 0,
    enabled: isEdit && !!editComponentId && !externalEditValues,
  });

  const resolvedEditValues = isEdit
    ? componentDetailsResponse?.data ?? externalEditValues ?? initialValues
    : undefined;
  const resolvedDefaultAlarmTemplate =
    isEdit && resolvedEditValues
      ? Number(resolvedEditValues.alarm_tag_template_version ?? -1) === 0
      : undefined;
  const isDefaultAlarmTemplateLocked =
    isEdit && resolvedEditValues
      ? Number(resolvedEditValues.alarm_tag_template_version ?? -1) !== 0
      : false;
  const editTagTemplateId =
    isEdit && resolvedEditValues?.is_bot_layer_process
      ? resolvedEditValues.tag_template_id ?? null
      : null;
  const { data: editTagTemplate } = useGetTagTemplateDetailsQuery(editTagTemplateId, {
    enabled: !!editTagTemplateId,
    staleTime: 0,
  });

  const currentTenantId =
    currentUser?.tenant_id ??
    resolvedEditValues?.tenant_id ??
    initialValues?.tenant_id ??
    null;


  const { data: componentTypeOptions = [] } = useGetComponentTypeOptionsQuery();
  const getTypeLabel = useCallback(
    (code?: string | null) =>
      componentTypeOptions.find((o) => o.value.toUpperCase() === String(code ?? "").trim().toUpperCase())?.label ?? String(code ?? "").trim(),
    [componentTypeOptions],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    trigger,
    control,
    formState: { errors },
  } = useForm<ComponentFormValues>({

    defaultValues: {
      plant_id: null,
      parent_id: null,
      device_id: null,
      share_component_plant_id: null,
      share_component_type: null,
      share_component_id: null,
      share_component_tag_template_id: null,
      inverter_type_id: null,
      tag_template_id: null,
      alarm_tag_template_id: null,
      is_shared_component: false,
      is_dynamic: false,
      component_type: "",
      component_name: "",
      component_code: "",
      serial_number: "",
      vd_number: "",
      ac_capacity_kw: "",
      dc_capacity_kw: "",
      meter_type: "",
      is_bot_layer_process: false,
      is_default_bot_process_template: true,
      default_alarm_template: true,
      is_active: true,
      identifier: "",
      is_all_channels_same: true,
      dc_channel_configs: [{ is_active: true, dc_capacity: "" }],
    },
  });

  useEffect(() => {
    if (!isEdit || !resolvedEditValues?.id) return;
    const resolvedShareComponentId =
      resolvedEditValues.share_component_id ??
      resolvedEditValues.shared_component_id ??
      null;

    reset({
      plant_id: resolvedEditValues.plant_id
        ? {
          value: resolvedEditValues.plant_id,
          label: resolvedEditValues.plant_name ?? resolvedEditValues.plant_id,
        }
        : null,
      parent_id: resolvedEditValues.parent_id
        ? {
          value: resolvedEditValues.parent_id,
          label:
            resolvedEditValues.parent_name ??
            resolvedEditValues.parent_component_name ??
            resolvedEditValues.parent_id,
        }
        : null,
      device_id: resolvedEditValues.device_id
        ? {
          value: resolvedEditValues.device_id,
          label: resolvedEditValues.device_name ?? resolvedEditValues.device_id,
        }
        : null,
      share_component_plant_id: resolvedEditValues.share_component_plant_id
        ? {
          value: resolvedEditValues.share_component_plant_id,
          label:
            resolvedEditValues.share_component_plant_name ??
            resolvedEditValues.share_component_plant_id,
        }
        : null,
      share_component_type: resolvedEditValues.share_component_type
        ? {
          value: resolvedEditValues.share_component_type,
          label: getTypeLabel(resolvedEditValues.share_component_type),
        }
        : null,
      share_component_id: resolvedShareComponentId
        ? {
          value: resolvedShareComponentId,
          label:
            resolvedEditValues.share_component_name ??
            resolvedEditValues.share_component_name ??
            resolvedShareComponentId,
        }
        : null,
      share_component_tag_template_id: resolvedEditValues.share_component_tag_template_id
        ? {
          value: resolvedEditValues.share_component_tag_template_id,
          label:
            resolvedEditValues.share_component_tag_template_name ??
            resolvedEditValues.share_component_tag_template_id,
        }
        : null,
      inverter_type_id: resolvedEditValues.inverter_type_id
        ? {
          value: resolvedEditValues.inverter_type_id,
          label:
            resolvedEditValues.inverter_type_name ??
            resolvedEditValues.inverter_type_id,
        }
        : null,
      tag_template_id: resolvedEditValues.tag_template_id
        ? {
          value: resolvedEditValues.tag_template_id,
          label:
            resolvedEditValues.tag_template_name ??
            resolvedEditValues.tag_template_id,
        }
        : null,
      alarm_tag_template_id: resolvedEditValues.alarm_tag_template_id
        ? {
          value: resolvedEditValues.alarm_tag_template_id,
          label:
            resolvedEditValues.alarm_tag_template_name ??
            resolvedEditValues.alarm_tag_template_id,
        }
        : null,
      component_type: resolvedEditValues.component_type ?? "",
      component_name: resolvedEditValues.component_name ?? "",
      component_code: resolvedEditValues.component_code ?? "",
      serial_number: resolvedEditValues.serial_number ?? "",
      is_shared_component: Boolean(resolvedEditValues.share_component_id ?? resolvedEditValues.share_component_id),
      is_dynamic: resolvedEditValues.is_dynamic_component ?? resolvedEditValues.is_dynamic ?? false,
      vd_number: toNumberInputValue(resolvedEditValues.vd_number),
      ac_capacity_kw: toNumberInputValue(resolvedEditValues.ac_capacity_kw),
      dc_capacity_kw: toNumberInputValue(resolvedEditValues.dc_capacity_kw),
      meter_type: normalizeComponentMeterTypeValue(resolvedEditValues.meter_type) ?? "",
      is_bot_layer_process: resolvedEditValues.is_bot_layer_process ?? false,
      is_default_bot_process_template:
        resolvedEditValues.is_default_bot_process_template ??
        (!resolvedEditValues.tag_template_id &&
        Boolean(resolvedEditValues.is_bot_layer_process)),
      default_alarm_template: resolvedDefaultAlarmTemplate ?? resolvedEditValues.default_alarm_template ?? false,
      is_active: resolvedEditValues.is_active ?? true,
      identifier: toNumberInputValue(resolvedEditValues.identifier),
      is_all_channels_same: (() => {
        const channels = resolvedEditValues.metadata?.dc_channel;
        if (!channels || channels.length <= 1) return true;
        const first = channels[0];
        return channels.every(c => c.is_active === first.is_active && c.dc_capacity === first.dc_capacity);
      })(),
      dc_channel_configs: resolvedEditValues.metadata?.dc_channel && resolvedEditValues.metadata.dc_channel.length > 0 
        ? resolvedEditValues.metadata.dc_channel.map((c: any) => ({
            is_active: c.is_active,
            dc_capacity: toNumberInputValue(c.dc_capacity)
          }))
        : [{ is_active: true, dc_capacity: "" }],
    });
  }, [
    isEdit,
    reset,
    resolvedEditValues,
    getTypeLabel,
    resolvedDefaultAlarmTemplate,
  ]);

  const createDefaultsKey = useMemo(() => {
    if (!initialValues?.plant_id && !initialValues?.parent_id && !initialValues?.component_type) {
      return "empty";
    }

    return [
      initialValues?.plant_id ?? "",
      initialValues?.plant_name ?? "",
      initialValues?.parent_id ?? "",
      initialValues?.component_type ?? "",
      initialValues?.component_name ?? "",
      initialValues?.component_code ?? "",
    ].join("|");
  }, [
    initialValues?.plant_id,
    initialValues?.plant_name,
    initialValues?.parent_id,
    initialValues?.component_type,
    initialValues?.component_name,
    initialValues?.component_code,
  ]);
  const appliedCreateDefaultsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isEdit) return;
    if (appliedCreateDefaultsKeyRef.current === createDefaultsKey) return;
    appliedCreateDefaultsKeyRef.current = createDefaultsKey;

    reset({
      plant_id: initialValues?.plant_id
        ? {
            value: initialValues.plant_id,
            label: initialValues.plant_name ?? initialValues.plant_id,
          }
        : null,
      parent_id: initialValues?.parent_id
        ? {
            value: initialValues.parent_id,
            label:
              initialValues.parent_name ??
              initialValues.parent_component_name ??
              initialValues.parent_id,
          }
        : null,
      device_id: null,
      share_component_plant_id: null,
      share_component_type: null,
      share_component_id: null,
      share_component_tag_template_id: null,
      inverter_type_id: null,
      tag_template_id: null,
      alarm_tag_template_id: null,
      is_shared_component: false,
      is_dynamic: false,
      component_type: initialValues?.component_type ?? "",
      component_name: initialValues?.component_name ?? "",
      component_code: initialValues?.component_code ?? "",
      serial_number: initialValues?.serial_number ?? "",
      vd_number: toNumberInputValue(initialValues?.vd_number),
      ac_capacity_kw: toNumberInputValue(initialValues?.ac_capacity_kw),
      dc_capacity_kw: toNumberInputValue(initialValues?.dc_capacity_kw),
      meter_type: normalizeComponentMeterTypeValue(initialValues?.meter_type) ?? "",
      is_bot_layer_process: initialValues?.is_bot_layer_process ?? false,
      is_default_bot_process_template: initialValues?.is_default_bot_process_template ?? true,
      default_alarm_template: initialValues?.default_alarm_template ?? true,
      is_active: initialValues?.is_active ?? true,
      identifier: toNumberInputValue(initialValues?.identifier),
      is_all_channels_same: true,
      dc_channel_configs: [{ is_active: true, dc_capacity: "" }],
    });
  }, [createDefaultsKey, isEdit, reset]);

  const watchedPlantId = useWatch({ control, name: "plant_id" });
  const plantIdForTenantLookup = watchedPlantId?.value
    ? String(watchedPlantId.value)
    : undefined;
  const shouldFetchPlantDetails =
    !isEdit && !!plantIdForTenantLookup && !currentTenantId;
  const { data: selectedPlantResponse } = useGetPlantDetailsQuery(
    shouldFetchPlantDetails ? plantIdForTenantLookup : undefined,
  );
  const selectedPlantTenantId = selectedPlantResponse?.data?.tenant_id;

  const watchedParentId = useWatch({ control, name: "parent_id" });
  const watchedDeviceId = useWatch({ control, name: "device_id" });
  const watchedSharedComponentPlantId = useWatch({ control, name: "share_component_plant_id" });
  const watchedSharedComponentType = useWatch({ control, name: "share_component_type" });
  const watchedSharedComponentId = useWatch({ control, name: "share_component_id" });
  const watchedShareComponentTagTemplateId = useWatch({ control, name: "share_component_tag_template_id" });
  const watchedInverterTypeId = useWatch({ control, name: "inverter_type_id" });
  const watchedTagTemplateId = useWatch({ control, name: "tag_template_id" });
  const watchedAlarmTagTemplateId = useWatch({ control, name: "alarm_tag_template_id" });
  const watchedDefaultAlarmTemplate = useWatch({ control, name: "default_alarm_template" });
  const watchedIsBotLayerProcess = useWatch({ control, name: "is_bot_layer_process" });
  const watchedIsDefaultBotProcessTemplate = useWatch({ control, name: "is_default_bot_process_template" });
  const watchedIsSharedComponent = useWatch({ control, name: "is_shared_component" });
  const watchedIsDynamic = useWatch({ control, name: "is_dynamic" });
  const watchedComponentType = useWatch({ control, name: "component_type" });
  const watchedMeterType = useWatch({ control, name: "meter_type" });
  const watchedAcCapacity = useWatch({ control, name: "ac_capacity_kw" });
  const watchedDcCapacity = useWatch({ control, name: "dc_capacity_kw" });
  const watchedVdNumber = useWatch({ control, name: "vd_number" });
  const watchedIdentifier = useWatch({ control, name: "identifier" });
  const watchedIsAllChannelsSame = useWatch({ control, name: "is_all_channels_same" });
  const watchedDcChannelConfigs = useWatch({ control, name: "dc_channel_configs" });

  const anyExternalFieldInDeviceFilled = !!(
    watchedDeviceId?.value ||
    watchedTagTemplateId?.value ||
    watchedVdNumber?.trim()
  );
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const currentComponentId = resolvedEditValues?.id ?? null;
  const watchedShareComponentId = useWatch({ control, name: "share_component_id" });
  const { data: shareComponentDetailsResponse } = useGetComponentDetailsQuery(
    watchedShareComponentId?.value ? String(watchedShareComponentId.value) : undefined,
    { enabled: !!watchedShareComponentId?.value, staleTime: 60000 }
  );
  const shareComponentDetails = shareComponentDetailsResponse?.data;

  useEffect(() => {
    if (shareComponentDetails && watchedIsSharedComponent) {
      const currentSharePlant = getValues("share_component_plant_id");
      if (shareComponentDetails.plant_id && (
        !currentSharePlant?.value || 
        currentSharePlant.value !== shareComponentDetails.plant_id ||
        currentSharePlant.label !== shareComponentDetails.plant_name
      )) {
        setValue("share_component_plant_id", {
          value: shareComponentDetails.plant_id,
          label: shareComponentDetails.plant_name ?? shareComponentDetails.plant_id
        }, { shouldValidate: true });
      }

      const currentShareType = getValues("share_component_type");
      if (shareComponentDetails.component_type && (
        !currentShareType?.value ||
        currentShareType.value !== shareComponentDetails.component_type
      )) {
        setValue("share_component_type", {
          value: shareComponentDetails.component_type,
          label: getTypeLabel(shareComponentDetails.component_type)
        }, { shouldValidate: true });
      }
    }
  }, [shareComponentDetails, watchedIsSharedComponent, setValue, getValues, getTypeLabel]);
  const normalizedWatchedComponentType = watchedComponentType?.trim().toUpperCase() ?? "";

  const [expandedChannels, setExpandedChannels] = React.useState<number[]>([]);
  const [appliedFeedback, setAppliedFeedback] = React.useState<Record<string, boolean>>({});

  const triggerFeedback = (key: string) => {
    setAppliedFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAppliedFeedback(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };
  const toggleExpandChannel = (index: number) => {
    setExpandedChannels((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const [assetTab, setAssetTab] = React.useState<"common" | "shared" | "dynamic">(() => {
    const hasShared =
      resolvedEditValues?.share_component_id ||
      resolvedEditValues?.share_component_id ||
      initialValues?.share_component_id ||
      initialValues?.share_component_id;
    if (hasShared) return "shared";

    const vdNum = resolvedEditValues?.vd_number ?? initialValues?.vd_number;
    const hasVd = vdNum != null && vdNum !== 0; // Assuming 0 is not a valid VD number if it acts like null
    if (hasVd) return "common";

    const hasTagTemplate = resolvedEditValues?.tag_template_id || initialValues?.tag_template_id;
    if (hasTagTemplate) return "dynamic";

    return "common";
  });

  const assetTabInitializedRef = useRef(false);

  useEffect(() => {
    if (assetTab === "shared") {
      setValue("is_shared_component", true, { shouldValidate: true, shouldDirty: true });
      setValue("is_dynamic", false, { shouldValidate: true, shouldDirty: true });

      const currentPlant = getValues("plant_id");
      const currentType = getValues("component_type");
      const currentShareId = getValues("share_component_id");

      if (!currentShareId?.value) {
        if (currentPlant && !getValues("share_component_plant_id")?.value) {
          setValue("share_component_plant_id", currentPlant, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
        if (currentType && !getValues("share_component_type")?.value) {
          setValue("share_component_type", {
            value: currentType,
            label: getTypeLabel(currentType),
          }, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    } else if (assetTab === "dynamic") {
      setValue("is_shared_component", false, { shouldValidate: true, shouldDirty: true });
      setValue("is_dynamic", true, { shouldValidate: true, shouldDirty: true });
    } else if (!assetTabInitializedRef.current) {
      setValue("is_shared_component", false, { shouldDirty: true });
      setValue("is_dynamic", false, { shouldDirty: true });
      assetTabInitializedRef.current = true;
    }
  }, [assetTab, setValue, getValues, getTypeLabel]);

  const hasTriggeredDeviceValidationRef = useRef(false);

  useEffect(() => {
    if (watchedAcCapacity === "" && watchedDcCapacity === "") return;
    void trigger(["ac_capacity_kw", "dc_capacity_kw"]);
  }, [watchedAcCapacity, watchedDcCapacity, trigger]);

  const skipDeviceGroupValidationForBotLayer =
    supportsBotLayerProcess(normalizedWatchedComponentType) &&
    watchedIsBotLayerProcess &&
    watchedIsDefaultBotProcessTemplate;

  useEffect(() => {
    if (!hasTriggeredDeviceValidationRef.current) {
      hasTriggeredDeviceValidationRef.current = true;
      return;
    }

    if (skipDeviceGroupValidationForBotLayer || !anyExternalFieldInDeviceFilled) {
      clearErrors(["device_id", "tag_template_id", "vd_number"]);
      return;
    }
    void trigger(["device_id", "tag_template_id", "vd_number"]);
  }, [
    watchedDeviceId,
    watchedTagTemplateId,
    watchedVdNumber,
    trigger,
    anyExternalFieldInDeviceFilled,
    clearErrors,
    skipDeviceGroupValidationForBotLayer,
  ]);

  // Component validators
  const validators = useMemo(() => {
    const getIsShared = () => getValues("is_shared_component");
    const getCompType = () => getValues("component_type")?.trim().toUpperCase();
    const usesBotLayerDefaultTemplate = () => {
      const isBotLayer =
        supportsBotLayerProcess(getCompType()) && getValues("is_bot_layer_process");
      return isBotLayer && getValues("is_default_bot_process_template");
    };

    return {
      component_type: (v: string) => {
        if (getIsShared()) return true;
        return v ? true : "Component type is required";
      },
      parent_id: (v: Option | null) => {
        if (getCompType() === "P") return true;
        return v?.value ? true : "Parent component is required";
      },
      device_id: (v: Option | null) => {
        if (getIsShared()) return true;
        if (usesBotLayerDefaultTemplate()) return true;
        if (anyExternalFieldInDeviceFilled && !v?.value) return "Device is required";
        return true;
      },
      tag_template_id: (v: Option | null) => {
        if (getIsShared()) return true;
        if (usesBotLayerDefaultTemplate()) return true;
        const isBotLayer =
          supportsBotLayerProcess(getCompType()) && getValues("is_bot_layer_process");
        const usesDefaultBotTemplate = getValues("is_default_bot_process_template");
        if (isBotLayer && !usesDefaultBotTemplate) {
          return v?.value ? true : "Tag template is required";
        }
        if (anyExternalFieldInDeviceFilled && !v?.value) return "Tag template is required";
        return true;
      },
      alarm_tag_template_id: () => true,
      share_component_tag_template_id: (v: Option | null) => {
        if (!getIsShared()) return true;
        return v?.value ? true : "Shared tag template is required";
      },
      share_component_plant_id: (v: Option | null) => {
        if (!getIsShared()) return true;
        return v?.value ? true : "Shared component plant is required.";
      },
      share_component_type: (v: Option | null) => {
        if (!getIsShared()) return true;
        return v?.value ? true : "Shared component type is required.";
      },
      share_component_id: (v: Option | null) => {
        if (!getIsShared()) return true;
        return v?.value ? true : "Shared component is required.";
      },
      vd_number: (v: string) => {
        if (getIsShared() || getValues("is_dynamic")) return true;
        if (usesBotLayerDefaultTemplate()) return true;
        if (anyExternalFieldInDeviceFilled && (!v || v.trim() === "")) {
          return "VD number is required.";
        }
        return true;
      },
      ac_capacity_kw: (v: string) => {
        const acCapacity = parseNullableNumber(v);
        const dcCapacity = parseNullableNumber(getValues("dc_capacity_kw"));
        if (dcCapacity !== null && acCapacity !== null && dcCapacity <= acCapacity) {
          return "AC capacity must be less than DC capacity";
        }
        return true;
      },
      dc_capacity_kw: (v: string) => {
        const dcCapacity = parseNullableNumber(v);
        const acCapacity = parseNullableNumber(getValues("ac_capacity_kw"));
        if (acCapacity !== null && dcCapacity !== null && dcCapacity <= acCapacity) {
          return "DC capacity must be greater than AC capacity";
        }
        return true;
      },
      identifier: (v: string) => {
        if (getCompType() !== "DC") return true;
        const n = parseNullableNumber(v);
        if (n === null || n <= 0) return "Identifier must be greater than 0";
        return true;
      }
    };
  }, [getValues, anyExternalFieldInDeviceFilled, watchedIsBotLayerProcess, watchedIsDefaultBotProcessTemplate]);

  // Register validation rules for fields that need conditional validation
  useEffect(() => {
    register("component_type", { validate: validators.component_type });
    register("parent_id", { validate: validators.parent_id });
    register("share_component_plant_id", { validate: validators.share_component_plant_id });
    register("share_component_type", { validate: validators.share_component_type });
    register("share_component_id", { validate: validators.share_component_id });
    register("device_id", { validate: validators.device_id });
    register("tag_template_id", { validate: validators.tag_template_id });
    register("alarm_tag_template_id", { validate: validators.alarm_tag_template_id });
    register("share_component_tag_template_id", { validate: validators.share_component_tag_template_id });
    register("dc_capacity_kw", { validate: validators.dc_capacity_kw });
    register("ac_capacity_kw", { validate: validators.ac_capacity_kw });
    register("is_shared_component");
    register("is_dynamic");
    register("is_bot_layer_process");
    register("is_default_bot_process_template");
    register("identifier", { validate: validators.identifier });
  }, [register, validators]);
  const showTechnicalField = (field: string) =>
    shouldShowComponentTechnicalField(normalizedWatchedComponentType, field);
  const technicalSectionNeedsTypeHint = normalizedWatchedComponentType === "";
  const technicalSectionHasNoFields =
    !technicalSectionNeedsTypeHint &&
    componentTechnicalAttributesAreConfiguredEmpty(normalizedWatchedComponentType);
  const showBotLayerProcessField =
    supportsBotLayerProcess(normalizedWatchedComponentType);
  const showDefaultBotProcessTemplateField =
    showBotLayerProcessField && watchedIsBotLayerProcess;
  const hideTagTemplateForDefaultBotProcess =
    showDefaultBotProcessTemplateField && watchedIsDefaultBotProcessTemplate;
  const tagTemplateFieldRequired =
    (showDefaultBotProcessTemplateField && !watchedIsDefaultBotProcessTemplate) ||
    anyExternalFieldInDeviceFilled;
  const isPlantTypeSelected = normalizedWatchedComponentType === "P";
  const shouldShowInverterTypeField =
    normalizedWatchedComponentType === "INV";
  const shouldShowTechnicalSection = !technicalSectionHasNoFields;
  const canSelectParentComponent =
    Boolean(watchedPlantId?.value) &&
    normalizedWatchedComponentType !== "" &&
    !isPlantTypeSelected;

  const loadComponentTypeOptions = useCallback(
    (search = "") => fetchComponentTypeOptions(search),
    [],
  );

  const loadSharedComponentTypeOptions = useCallback(
    (search = "") => fetchComponentTypeOptions(search, selectedPlantTenantId || currentTenantId),
    [selectedPlantTenantId, currentTenantId],
  );

  const loadPlantSelectOptions = useCallback(
    (search = "") => fetchPlantNames(search, 1, 50),
    [],
  );

  const loadSharedPlantOptions = useCallback(
    (search = "") => fetchPlantNames(search, 1, 50, selectedPlantTenantId || currentTenantId),
    [selectedPlantTenantId, currentTenantId],
  );

  const loadParentComponentOptions = useCallback(
    (search = "") =>
      canSelectParentComponent && watchedPlantId?.value
        ? fetchComponentNames(search, 1, 50, String(watchedPlantId.value), {
          excludeId: currentComponentId,
        })
        : Promise.resolve([]),
    [canSelectParentComponent, watchedPlantId, currentComponentId],
  );

  const loadDeviceOptions = useCallback(
    (search = "") =>
      fetchDeviceNames(search, 1, 50, watchedPlantId?.value !== undefined ? String(watchedPlantId.value) : undefined),
    [watchedPlantId],
  );

  const loadSharedComponentOptions = useCallback(
    async (search = "") => {
      if (!watchedSharedComponentPlantId?.value || !watchedSharedComponentType?.value) {
        return [];
      }

      const rows = await fetchComponentRowsForPlant(
        watchedSharedComponentPlantId.value,
        500,
        search,
      );
      const query = search.trim().toLowerCase();

      return rows
        .filter((row) => String(row.id) !== String(currentComponentId))
        .filter((row) => row.component_type === watchedSharedComponentType.value)
        .filter(
          (row) =>
            !query ||
            row.component_name.toLowerCase().includes(query) ||
            (row.component_code ?? "").toLowerCase().includes(query),
        )
        .map((row) => ({
          value: row.id,
          label: row.component_name,
        }));
    },
    [watchedSharedComponentPlantId, watchedSharedComponentType, currentComponentId],
  );

  const loadInverterTypeOptions = useCallback(
    (search = "") => fetchInverterTypeNames(search, 1, 50),
    [],
  );

  const loadTagTemplateOptions = useCallback(
    (search = "") => {
      const category = watchedIsDynamic ? "dynamic" : undefined;
      return fetchTagTemplateNames(search, 1, 50, category);
    },
    [watchedIsDynamic],
  );
  const loadAlarmTagTemplateOptions = useCallback(
    (search = "") => fetchTagTemplateNames(search, 1, 50),
    [],
  );


  const loadMeterTypeOptions = useCallback(
    async () => COMPONENT_METER_TYPE_SELECT_OPTIONS,
    [],
  );


  useEffect(() => {
    if (!isPlantTypeSelected) return;
    if (!watchedParentId) return;
    setValue("parent_id", null);
  }, [isPlantTypeSelected, setValue, watchedParentId]);

  useEffect(() => {
    if (shouldShowInverterTypeField) return;
    if (!watchedInverterTypeId) return;
    setValue("inverter_type_id", null);
  }, [setValue, shouldShowInverterTypeField, watchedInverterTypeId]);

  useEffect(() => {
    if (!showBotLayerProcessField && watchedIsBotLayerProcess) {
      setValue("is_bot_layer_process", false, { shouldDirty: true });
    }
  }, [showBotLayerProcessField, setValue, watchedIsBotLayerProcess]);

  useEffect(() => {
    if (!showDefaultBotProcessTemplateField && watchedIsDefaultBotProcessTemplate) {
      setValue("is_default_bot_process_template", false, { shouldDirty: true });
    }
  }, [showDefaultBotProcessTemplateField, setValue, watchedIsDefaultBotProcessTemplate]);

  useEffect(() => {
    if (!hideTagTemplateForDefaultBotProcess) return;
    if (!watchedTagTemplateId) return;
    setValue("tag_template_id", null, { shouldDirty: true });
    clearErrors("tag_template_id");
  }, [hideTagTemplateForDefaultBotProcess, setValue, watchedTagTemplateId, clearErrors]);

  useEffect(() => {
    clearErrors("tag_template_id");
  }, [
    watchedIsBotLayerProcess,
    watchedIsDefaultBotProcessTemplate,
    hideTagTemplateForDefaultBotProcess,
    clearErrors,
  ]);

  useEffect(() => {
    if (!isEdit || !resolvedEditValues?.is_bot_layer_process) return;
    if (!editTagTemplateId) {
      setValue("is_default_bot_process_template", true, { shouldDirty: false });
      return;
    }
    if (editTagTemplate) {
      setValue(
        "is_default_bot_process_template",
        Number(editTagTemplate.version) === 0,
        { shouldDirty: false },
      );
    }
  }, [
    isEdit,
    resolvedEditValues?.is_bot_layer_process,
    editTagTemplateId,
    editTagTemplate,
    setValue,
  ]);

  const onSubmit = (data: ComponentFormValues) => {
    const componentName = data.component_name.trim();
    const componentCode = data.component_code.trim();
    const componentType = data.component_type.trim().toUpperCase();
    const normalizedMeterType =
      componentType === "M" ? normalizeComponentMeterTypeValue(data.meter_type) : null;

    const includeInverterType =
      componentType === "INV" || componentType === "DCDB";

    const isShared = data.is_shared_component;
    const isDynamic = data.is_dynamic;

    const payload: CreateComponentInput = {
      plant_id: data.plant_id?.value ?? resolvedEditValues?.plant_id ?? "",
      parent_id: data.parent_id?.value || null,
      component_type: componentType,
      component_name: componentName,
      component_code: componentCode,
      serial_number: data.serial_number.trim() || null,
      is_active: data.is_active,

      // Shared fields 
      share_component_id: isShared ? (data.share_component_id?.value || null) : null,
      shared_component_type: isShared ? (data.share_component_type?.value || null) : null,
      share_component_tag_template_id: isShared ? (data.share_component_tag_template_id?.value || null) : null,

      device_id: !isShared ? (data.device_id?.value ? String(data.device_id.value) : null) : null,
      vd_number: (!isShared && !isDynamic) ? parseNullableNumber(data.vd_number) : null,

      // Tag Template
      tag_template_id:
        !isShared &&
        !(showBotLayerProcessField && data.is_bot_layer_process && data.is_default_bot_process_template)
          ? (data.tag_template_id?.value || null)
          : null,
      alarm_tag_template_id: (!isShared && !data.default_alarm_template) ? (data.alarm_tag_template_id?.value || null) : null,

      // Technical attributes
      ac_capacity_kw: parseNullableNumber(data.ac_capacity_kw),
      dc_capacity_kw: parseNullableNumber(data.dc_capacity_kw),
      meter_type: normalizedMeterType,
      inverter_type_id: includeInverterType
        ? data.inverter_type_id?.value != null ? String(data.inverter_type_id.value) : null
        : null,

      // Dynamic flags
      is_dynamic_component: isDynamic,
      is_dynamic: isDynamic,

      // Other fields
      is_bot_layer_process: showBotLayerProcessField ? data.is_bot_layer_process : null,
      is_default_bot_process_template:
        showBotLayerProcessField && data.is_bot_layer_process
          ? data.is_default_bot_process_template
          : null,
      default_alarm_template: data.default_alarm_template,
      identifier: componentType === "DC" ? parseNullableNumber(data.identifier) : null,
      metadata: componentType === "DC" ? {
        dc_channel: data.is_all_channels_same 
          ? Array.from({ length: parseNullableNumber(data.identifier) || 1 }, (_, i) => ({
              index: i + 1,
              is_active: data.dc_channel_configs[0].is_active,
              dc_capacity: parseNullableNumber(data.dc_channel_configs[0].dc_capacity) || 0
            }))
          : data.dc_channel_configs.map((c, i) => ({
              index: i + 1,
              is_active: c.is_active,
              dc_capacity: parseNullableNumber(c.dc_capacity) || 0
            }))
      } : null
    };

    if (isEdit && resolvedEditValues?.id) {
      const { plant_id: _plantId, ...updatePayload } = payload;
      void _plantId;
      const nextUpdatePayload: UpdateComponentInput = {
        id: resolvedEditValues.id,
        ...updatePayload,
      };
      updateMutation.mutate(nextUpdatePayload, {
        onSuccess: () => onSuccess?.(),
        onError: (error) => {
          applyBackendErrors(error, setError, getValues);
        },
      });
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
      onError: (error) => {
        applyBackendErrors(error, setError, getValues);
      },
    });
  };

  const handleResetForm = () => {
    if (isEdit && resolvedEditValues) {
      const resetSharedComponentId =
        resolvedEditValues.share_component_id ??
        resolvedEditValues.share_component_id ??
        null;
      reset({
        plant_id: resolvedEditValues.plant_id
          ? {
            value: resolvedEditValues.plant_id,
            label: resolvedEditValues.plant_name ?? resolvedEditValues.plant_id,
          }
          : null,
        parent_id: resolvedEditValues.parent_id
          ? {
            value: resolvedEditValues.parent_id,
            label:
              resolvedEditValues.parent_name ??
              resolvedEditValues.parent_component_name ??
              resolvedEditValues.parent_id,
          }
          : null,
        device_id: resolvedEditValues.device_id
          ? {
            value: resolvedEditValues.device_id,
            label: resolvedEditValues.device_name ?? resolvedEditValues.device_id,
          }
          : null,
        share_component_plant_id: resolvedEditValues.share_component_plant_id
          ? {
            value: resolvedEditValues.share_component_plant_id,
            label:
              resolvedEditValues.share_component_plant_name ??
              resolvedEditValues.share_component_plant_id,
          }
          : null,
        share_component_type: resolvedEditValues.share_component_type
          ? {
            value: resolvedEditValues.share_component_type,
            label: getTypeLabel(resolvedEditValues.share_component_type),
          }
          : null,
        share_component_id: resetSharedComponentId
          ? {
            value: resetSharedComponentId,
            label:
              resolvedEditValues.share_component_name ??
              resolvedEditValues.share_component_name ??
              resetSharedComponentId,
          }
          : null,
        share_component_tag_template_id: resolvedEditValues.share_component_tag_template_id
          ? {
            value: resolvedEditValues.share_component_tag_template_id,
            label:
              resolvedEditValues.share_component_tag_template_name ??
              resolvedEditValues.share_component_tag_template_id,
          }
          : null,
        inverter_type_id: resolvedEditValues.inverter_type_id
          ? {
            value: resolvedEditValues.inverter_type_id,
            label:
              resolvedEditValues.inverter_type_name ??
              resolvedEditValues.inverter_type_id,
          }
          : null,
        tag_template_id: resolvedEditValues.tag_template_id
          ? {
            value: resolvedEditValues.tag_template_id,
            label:
              resolvedEditValues.tag_template_name ??
              resolvedEditValues.tag_template_id,
          }
          : null,
        alarm_tag_template_id: resolvedEditValues.alarm_tag_template_id
          ? {
            value: resolvedEditValues.alarm_tag_template_id,
            label:
              resolvedEditValues.alarm_tag_template_name ??
              resolvedEditValues.alarm_tag_template_id,
          }
          : null,
        component_type: resolvedEditValues.component_type ?? "",
        component_name: resolvedEditValues.component_name ?? "",
        component_code: resolvedEditValues.component_code ?? "",
        serial_number: resolvedEditValues.serial_number ?? "",
        is_shared_component: Boolean(resolvedEditValues.share_component_id ?? resolvedEditValues.share_component_id),
        is_dynamic: resolvedEditValues.is_dynamic_component ?? resolvedEditValues.is_dynamic ?? false,
        vd_number: toNumberInputValue(resolvedEditValues.vd_number),
        ac_capacity_kw: toNumberInputValue(resolvedEditValues.ac_capacity_kw),
        dc_capacity_kw: toNumberInputValue(resolvedEditValues.dc_capacity_kw),
        meter_type: normalizeComponentMeterTypeValue(resolvedEditValues.meter_type) ?? "",
        is_bot_layer_process: resolvedEditValues.is_bot_layer_process ?? false,
        is_default_bot_process_template:
          resolvedEditValues.is_default_bot_process_template ??
          (!resolvedEditValues.tag_template_id &&
          Boolean(resolvedEditValues.is_bot_layer_process)),
        default_alarm_template: resolvedDefaultAlarmTemplate ?? resolvedEditValues.default_alarm_template ?? false,
        is_active: resolvedEditValues.is_active ?? true,
      });
    } else {
      reset();
    }
  };

  if (isEdit && editComponentId && isLoadingComponentDetails && !resolvedEditValues) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size={3} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-dark-700">
          Loading component details...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
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
        <div className="space-y-2">
          <SectionSubHeader
            icon={Info}
            title="Basic Information"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="md:col-span-2">
              {isEdit ? (
                <Input
                  label="Plant"
                  value={resolvedEditValues?.plant_name ?? resolvedEditValues?.plant_id ?? ""}
                  disabled
                />
              ) : (
                <AsyncSelect
                  label="Plant"
                  star
                  name="plant_id"
                  apiSearch
                  loadOptions={loadPlantSelectOptions}
                  placeholder="Plant"
                  value={watchedPlantId}
                  onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                    const v = value as SingleValue<Option>;
                    setValue("plant_id", v || null, { shouldValidate: true });
                    setValue("parent_id", null);
                    setValue("device_id", null);
                    setValue("inverter_type_id", null);
                    setValue("tag_template_id", null);
                  }}
                  errors={errors.plant_id}
                  isClearable
                  isDisabled={lockPlantSelection}
                />
              )}
            </div>
            {!watchedIsSharedComponent && (
              <div>
                <AsyncSelect
                  key={`device-${watchedPlantId?.value ?? "no-plant"}`}
                  label="Device"
                  star={anyExternalFieldInDeviceFilled && !watchedIsSharedComponent}
                  name="device_id"
                  apiSearch
                  loadOptions={loadDeviceOptions}
                  placeholder="Device"
                  value={watchedDeviceId}
                  onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                    setValue("device_id", (value as SingleValue<Option>) || null);
                  }}
                  isClearable
                  isDisabled={!watchedPlantId?.value}
                  errors={errors.device_id as { message?: string } | undefined}
                />
              </div>
            )}

            <div>
              <AsyncSelect
                label="Component Type"
                star={!watchedIsSharedComponent}
                apiSearch
                loadOptions={loadComponentTypeOptions}
                placeholder="Component Type"
                value={watchedComponentType ? { value: watchedComponentType, label: getTypeLabel(watchedComponentType) } : null}
                onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                  const next = value as SingleValue<Option>;
                  const nextType = next?.value ?? "";
                  setValue("component_type", nextType, { shouldValidate: true, shouldDirty: true });
                  setValue("parent_id", null, { shouldDirty: true });
                  if (nextType.trim().toUpperCase() === "INV" && assetTab === "shared") {
                    setAssetTab("common");
                  }
                  void trigger("parent_id");
                }}
                errors={errors.component_type as { message?: string } | undefined}
                isClearable={false}
              />
            </div>

            {!isPlantTypeSelected && (
              <AsyncSelect
                key={`parent-${watchedPlantId?.value ?? "no-plant"}-${normalizedWatchedComponentType || "no-type"}`}
                label="Parent Component"
                star
                name="parent_id"
                apiSearch
                loadOptions={loadParentComponentOptions}
                placeholder="Parent Component"
                isDisabled={!canSelectParentComponent}
                value={watchedParentId}
                onChange={(value: SingleValue<Option> | MultiValue<Option>) => setValue("parent_id", (value as SingleValue<Option>) || null)}
                isClearable
              />
            )}

            <Input
              label="Component Name"
              star
              {...register("component_name", { required: "Component name is required" })}
              errors={errors.component_name}
              placeholder="Component Name"
            />

            <Input
              label="Component Code"
              star
              {...register("component_code", { required: "Component code is required" })}
              errors={errors.component_code}
              maxLength={100}
              placeholder="Component Code"
            />

            {showBotLayerProcessField ? (
              <div className="flex flex-col justify-end">
                <Toggle
                  id="component_is_bot_layer_process"
                  label="Enable bot layer process"
                  {...register("is_bot_layer_process")}
                />
              </div>
            ) : null}

            {showDefaultBotProcessTemplateField ? (
              <div className="flex flex-col justify-end">
                <Toggle
                  id="is_default_bot_process_template"
                  label="Default Tag Template"
                  {...register("is_default_bot_process_template")}
                />
              </div>
            ) : null}

            {showAdvanced ? (
              <>
                <Input
                  label="Serial Number"
                  {...register("serial_number")}
                  placeholder="Serial Number"
                />
                <div className="w-full sm:mt-2">
                  <Toggle id="component_is_active" label="Active" {...register("is_active")} />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <SectionSubHeader
              icon={HardDrive}
              title="Connected Assets"
            />
            <div className="mt-2 flex justify-start sm:absolute sm:right-0 sm:top-0 sm:z-10 sm:mt-0">
              <Tabs
                tabs={[
                  { key: "common", label: "Common" },
                  ...(normalizedWatchedComponentType !== "INV"
                    ? [{ key: "shared", label: "Shared" }]
                    : []),
                  { key: "dynamic", label: "Dynamic" },
                ]}
                selected={assetTab}
                onChange={(key) => {
                  setAssetTab(key as typeof assetTab);
                  if (key === "shared") {
                    clearErrors(["device_id", "tag_template_id", "vd_number", "component_type", "parent_id"]);
                  } else if (key === "common") {
                    setValue("share_component_plant_id", null);
                    setValue("share_component_type", null);
                    setValue("share_component_id", null);
                    setValue("share_component_tag_template_id", null);
                  } else if (key === "dynamic") {
                    setValue("is_shared_component", false);
                    setValue("share_component_plant_id", null);
                    setValue("share_component_type", null);
                    setValue("share_component_id", null);
                    setValue("share_component_tag_template_id", null);
                  }
                }}
                className="w-fit max-w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {assetTab !== "shared" && (
              <>
                {assetTab === "common" && (
                  <Input
                    type="number"
                    label="VD Number"
                    placeholder="VD Number"
                    errors={errors.vd_number}
                    {...register("vd_number", { validate: validators.vd_number })}
                    star={anyExternalFieldInDeviceFilled}
                  />
                )}

                {!hideTagTemplateForDefaultBotProcess ? (
                  <div key="normal-tag-template-field">
                    <AsyncSelect
                      label="Tag Template"
                      star={tagTemplateFieldRequired}
                      name="tag_template_id"
                      apiSearch
                      loadOptions={loadTagTemplateOptions}
                      placeholder="Select Tag Template"
                      value={watchedTagTemplateId}
                      onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                        setValue("tag_template_id", (value as SingleValue<Option>) || null, {
                          shouldDirty: true,
                        });
                      }}
                      isClearable
                      isDisabled={false}
                      errors={errors.tag_template_id as { message?: string } | undefined}
                    />
                  </div>
                ) : null}

                {!watchedDefaultAlarmTemplate ? (
                  <div key="alarm-tag-template-field">
                    <AsyncSelect
                      label="Alarm Tag Template"
                      name="alarm_tag_template_id"
                      apiSearch
                      loadOptions={loadAlarmTagTemplateOptions}
                      placeholder="Select Alarm Tag Template"
                      value={watchedAlarmTagTemplateId}
                      onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                        setValue("alarm_tag_template_id", (value as SingleValue<Option>) || null, {
                          shouldDirty: true,
                        });
                      }}
                      isClearable
                      isDisabled={false}
                      errors={errors.alarm_tag_template_id as { message?: string } | undefined}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col justify-end">
                  <Toggle
                    id="default_alarm_template"
                    label="Default Alarm Template"
                    disabled={isDefaultAlarmTemplateLocked}
                    {...register("default_alarm_template")}
                  />
                </div>
              </>
            )}

            {shouldShowInverterTypeField ? (
              <AsyncSelect
                label="Inverter Type"
                name="inverter_type_id"
                apiSearch
                loadOptions={loadInverterTypeOptions}
                placeholder="Inverter Type"
                value={watchedInverterTypeId}
                onChange={(value: SingleValue<Option> | MultiValue<Option>) => setValue("inverter_type_id", (value as SingleValue<Option>) || null)}
                isClearable
              />
            ) : null}

            {assetTab === "shared" && (
              <>
                <div>
                  <AsyncSelect
                    key={`shared-plant-${selectedPlantTenantId || currentTenantId || "all"}`}
                    label="Shared Component Plant"
                    star
                    name="share_component_plant_id"
                    apiSearch
                    loadOptions={loadSharedPlantOptions}
                    placeholder="Shared Component Plant"
                    value={watchedSharedComponentPlantId}
                    onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                      const nextValue = (value as SingleValue<Option>) || null;
                      setValue("share_component_plant_id", nextValue, { shouldValidate: true, shouldDirty: true });
                      setValue("share_component_type", null, { shouldValidate: true, shouldDirty: true });
                      setValue("share_component_id", null, { shouldValidate: true, shouldDirty: true });
                      trigger("share_component_plant_id");
                      trigger("share_component_type");
                      trigger("share_component_id");
                    }}
                    errors={errors.share_component_plant_id as { message?: string } | undefined}
                    isClearable
                  />
                </div>

                <div>
                  <AsyncSelect
                    key={`shared-type-${watchedSharedComponentPlantId?.value ?? "no-plant"}`}
                    label="Shared Component Type"
                    star
                    apiSearch
                    loadOptions={loadSharedComponentTypeOptions}
                    placeholder="Shared Component Type"
                    value={watchedSharedComponentType}
                    onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                      setValue("share_component_type", (value as SingleValue<Option>) || null, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setValue("share_component_id", null, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      trigger("share_component_type");
                      trigger("share_component_id");
                    }}
                    errors={errors.share_component_type as { message?: string } | undefined}
                    isClearable
                    isDisabled={!watchedSharedComponentPlantId?.value}
                  />
                </div>

                <div>
                  <AsyncSelect
                    key={`shared-component-${watchedSharedComponentPlantId?.value ?? "no-plant"}-${watchedSharedComponentType?.value ?? "no-type"}`}
                    label="Shared Component"
                    star
                    name="share_component_id"
                    apiSearch
                    loadOptions={loadSharedComponentOptions}
                    placeholder="Shared Component"
                    value={watchedSharedComponentId}
                    onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                      setValue("share_component_id", (value as SingleValue<Option>) || null, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      trigger("share_component_id");
                    }}
                    errors={errors.share_component_id as { message?: string } | undefined}
                    isClearable
                    isDisabled={!watchedSharedComponentPlantId?.value || !watchedSharedComponentType?.value}
                  />
                </div>

                <div key="shared-tag-template-field">
                  <AsyncSelect
                    label="Share Component Tag Template"
                    star
                    name="share_component_tag_template_id"
                    apiSearch
                    loadOptions={loadTagTemplateOptions}
                    placeholder="Select Shared Component Tag Template"
                    value={watchedShareComponentTagTemplateId}
                    onChange={(value: SingleValue<Option> | MultiValue<Option>) => {
                      setValue("share_component_tag_template_id", (value as SingleValue<Option>) || null, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      void trigger("share_component_tag_template_id");
                    }}
                    isClearable
                    errors={errors.share_component_tag_template_id as { message?: string } | undefined}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {shouldShowTechnicalSection ? (
          <div className="space-y-2">
            <SectionSubHeader
              icon={Database}
              title="Technical Attributes"
            />

            {technicalSectionNeedsTypeHint ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-dark-600">
                Select a component type to see relevant technical attributes.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {showTechnicalField("meter_type") ? (
                  <Controller
                    name="meter_type"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Meter Type"
                        loadOptions={loadMeterTypeOptions}
                        placeholder="Meter Type"
                        value={
                          COMPONENT_METER_TYPE_SELECT_OPTIONS.find(
                            (o) =>
                              String(o.value) ===
                              String(field.value ?? watchedMeterType ?? ""),
                          ) ?? null
                        }
                        onChange={(v) =>
                          setValue(
                            "meter_type",
                            normalizeComponentMeterTypeValue(String((v as import('react-select').SingleValue<Option>)?.value ?? "")) ?? "",
                            { shouldDirty: true, shouldTouch: true },
                          )
                        }
                        isClearable={false}
                      />
                    )}
                  />
                ) : null}


                {TECHNICAL_NUMBER_FIELDS.map((field) =>
                  showTechnicalField(field.name) ? (
                    <Input
                      key={field.name}
                      type="number"
                      label={field.label}
                      step={field.step}
                      {...register(field.name)}
                      errors={errors[field.name]}
                      placeholder={field.label}
                    />
                  ) : null,
                )}

                {normalizedWatchedComponentType === "DC" && (
                  <div className="md:col-span-2 space-y-2">
                    <SectionSubHeader
                      icon={Settings}
                      title="Metadata"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            label="Identifier"
                            star
                            {...register("identifier")}
                            value={watchedIdentifier}
                            errors={errors.identifier}
                            placeholder="Identifier"
                          />
                        </div>
                        <Button
                          type="button"
                          variant={appliedFeedback['identifier'] ? "outline" : "primary"}
                          size="sm"
                          className={`h-9 max-h-[38px] px-4 font-bold uppercase text-[10px] rounded-sm transition-all duration-300 ${appliedFeedback['identifier'] ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100' : ''}`}
                          onClick={() => {
                            const count = parseInt(getValues("identifier")) || 0;
                            const currentConfigs = getValues("dc_channel_configs") || [];
                            const nextConfigs = Array.from({ length: count }, (_, i) => 
                              currentConfigs[i] || { is_active: true, dc_capacity: "" }
                            );
                            setValue("dc_channel_configs", nextConfigs);
                            triggerFeedback('identifier');
                          }}
                        >
                          {appliedFeedback['identifier'] ? <Check className="w-3.5 h-3.5 mr-1" /> : null}
                          {appliedFeedback['identifier'] ? "Applied" : "Apply"}
                        </Button>
                      </div>
                      
                      <Toggle 
                        id="is_all_channels_same" 
                        label="All DC channels same?" 
                        checked={!!watchedIsAllChannelsSame}
                        onChange={(e: any) => {
                          const checked = e.target.checked;
                          setValue("is_all_channels_same", checked);
                          if (checked) {
                            setExpandedChannels([0]);
                          } else {
                            const count = parseInt(getValues("identifier")) || 1;
                            const currentConfigs = getValues("dc_channel_configs") || [];
                            if (currentConfigs.length < count) {
                              const firstConfig = currentConfigs[0] || { is_active: true, dc_capacity: "" };
                              const nextConfigs = Array.from({ length: count }, (_, i) => {
                                return currentConfigs[i] || { ...firstConfig };
                              });
                              setValue("dc_channel_configs", nextConfigs);
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                          Channel Configuration Instances
                        </p>
                        {!watchedIsAllChannelsSame && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[10px] uppercase font-bold text-brand-600 h-auto py-1 hover:bg-brand-50/50 rounded-sm"
                            onClick={() => {
                              const count = parseInt(getValues("identifier")) || 0;
                              if (expandedChannels.length === count) {
                                setExpandedChannels([]);
                              } else {
                                setExpandedChannels(Array.from({ length: count }, (_, i) => i));
                              }
                            }}
                          >
                            {expandedChannels.length === (parseInt(getValues("identifier")) || 0) ? "Collapse All" : "Expand All"}
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {(watchedIsAllChannelsSame 
                          ? [ (watchedDcChannelConfigs || [])[0] || {is_active: true, dc_capacity: ""} ] 
                          : (watchedDcChannelConfigs || [])
                        ).map((config, idx) => {
                          const isExpanded = watchedIsAllChannelsSame || expandedChannels.includes(idx);
                          
                          return (
                            <div 
                              key={idx} 
                              className={`
                                group transition-all duration-300 rounded-sm border 
                                ${isExpanded 
                                  ? 'bg-white dark:bg-neutral-dark-200 border-brand-200' 
                                  : 'bg-neutral-50/50 dark:bg-neutral-dark-300/30 border-neutral-200 hover:border-brand-200 hover:bg-white'
                                }
                              `}
                            >
                              <div 
                                className={`
                                  flex items-center justify-between px-4 py-3 cursor-pointer select-none
                                  ${watchedIsAllChannelsSame ? 'cursor-default' : ''}
                                `}
                                onClick={() => !watchedIsAllChannelsSame && toggleExpandChannel(idx)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`
                                    w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold transition-colors
                                    ${isExpanded ? 'bg-brand-600 text-white' : 'bg-neutral-200 text-neutral-500 group-hover:bg-brand-100 group-hover:text-brand-600'}
                                  `}>
                                    {watchedIsAllChannelsSame ? "All" : idx + 1}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-dark-800 uppercase tracking-tight">
                                      {watchedIsAllChannelsSame ? "Universal Config" : `DC Channel ${idx + 1}`}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 font-medium">
                                      {config?.dc_capacity ? `${config.dc_capacity} W` : 'Not set'} • {config?.is_active ? 'Active' : 'Inactive'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!watchedIsAllChannelsSame && isExpanded && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className={`h-7 px-2 text-[10px] uppercase font-bold flex items-center gap-1.5 rounded-sm transition-all duration-300 ${appliedFeedback[`chan-${idx}`] ? 'text-green-600 bg-green-50' : 'text-brand-600 hover:bg-brand-50'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentConfig = getValues(`dc_channel_configs.${idx}` as any);
                                        const count = parseInt(getValues("identifier")) || 0;
                                        const nextConfigs = Array.from({ length: count }, () => ({ ...currentConfig }));
                                        setValue("dc_channel_configs", nextConfigs);
                                        triggerFeedback(`chan-${idx}`);
                                      }}
                                    >
                                      {appliedFeedback[`chan-${idx}`] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      {appliedFeedback[`chan-${idx}`] ? "Applied" : "Apply to all"}
                                    </Button>
                                  )}
                                  {!watchedIsAllChannelsSame && (
                                    <div className="flex items-center gap-2 ml-1">
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="px-4 pb-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <Input
                                      type="number"
                                      label="DC Capacity (W)"
                                      placeholder="DC Capacity"
                                      {...register(`dc_channel_configs.${idx}.dc_capacity` as any)}
                                      className="bg-neutral-50/50"
                                    />
                                    <Toggle 
                                      id={`chan-active-${idx}`} 
                                      label="Active" 
                                      checked={!!config?.is_active}
                                      onChange={(e: any) => setValue(`dc_channel_configs.${idx}.is_active` as any, e.target.checked)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Footer Navigation ── */}
      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 pb-2.5   pt-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForm}
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
            {isEdit ? "Update Component" : "Create Component"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ComponentForm;
