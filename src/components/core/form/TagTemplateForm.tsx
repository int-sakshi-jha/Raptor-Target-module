import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import Button from "@/components/common/Button";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import TextArea from "@/components/common/TextArea";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import { TagMapBuilder } from "@/components/common/JsonFields";
import Toggle from "@/components/common/Toggle";
import Tabs from "@/components/common/Tabs";
import FormModeToggle from "@/components/common/FormModeToggle";
import { applyBackendErrors } from "@/utils/formValidators";
import {
    coerceTagTemplateTagMap,
    fetchTagTemplateCategoryOptions,
    finalizeTagTemplateWritePayload,
    normalizeTagTemplateCategory,
    normalizeTagTemplatePlantCategory,
    useCreateTagTemplateMutation,
    useUpdateTagTemplateMutation,
    type CreateTagTemplateInput,
    type TagTemplateCategory,
    type TagTemplatePlantCategory,
    type TagTemplateRow,
} from "@/services/operations/tagTemplateAPI";
import { fetchPlantCategoryOptions } from "@/services/operations/plantAPI";
import {
    getTagTemplateCategoryLabel,
    getTagTemplatePlantCategoryLabel,
} from "@/services/operations/tagTemplateAPI";
import type { TagMapStaticRow } from "@/components/common/JsonFields";
import { TAG_TEMPLATE_CATEGORY_CONFIG } from "@/utils/tagTemplateCategoryConfig";
import { generateCaptiveInverterConfig } from "@/utils/tag-template/captiveInverterTagTemplate";
import { generateCaptiveMeterConfig } from "@/utils/tag-template/captivemeterTagTemplate";
import { generateHealthTagTemplateConfig } from "@/utils/tag-template/healthTagTemplate";
import { generateKusumInverterConfig } from "@/utils/tag-template/kusumInverterTagTemplate";
import { generateKusumMeterConfig } from "@/utils/tag-template/kusumMeterTagTemplate";
import { generateWeatherStationConfig } from "@/utils/tag-template/weatherStationTagTemplate";
import { generateTransformerConfig } from "@/utils/tag-template/transformerTagTemplate";



import { generateABTMeterConfig } from "@/utils/tag-template/abtMeterTagTemplate";
import {
    BOT_METER_AGGREGATION_OPTIONS,
    generateBotMeterTagMap,
    resolveBotAggregationModeForCategory,
    type BotMeterAggregationMode,
} from "@/utils/tag-template/botMeterTagTemplate";
import { generateNumericalRelayConfig } from "@/utils/tag-template/numericalRelayTemplate";
import { generateFireSystemConfig } from "@/utils/tag-template/fireSystemConfigTemplate";
import {
    defaultDcChannelSuggestions,
    defaultKusumDcChannelSuggestions,
    defaultOtherSuggestions,
    defaultTrackerSuggestions,
    generateDynamicDcChannelConfig,
    generateDynamicOtherConfig,
    generateDynamicTrackerConfig,
    type DynamicParameter,
    type DynamicTemplateType,
} from "@/utils/tag-template/dynamicTagTemplate";
import { FileText, Info, Settings, X } from "lucide-react";

type TagTemplateFormValues = {
    name: string;
    category: TagTemplateCategory;
    plant_category: TagTemplatePlantCategory;
    description: string;
    version: number | null;
    is_default_version: boolean;
    is_active: boolean;
};

const resolveFormVersion = (data: Pick<TagTemplateFormValues, "version" | "is_default_version">): number =>
    data.is_default_version ? 0 : (data.version ?? 1);

const formVersionFromRow = (version: number | null | undefined): number =>
    version === 0 ? 1 : (version ?? 1);

const isDefaultVersionFromRow = (version: number | null | undefined): boolean =>
    version === 0;

type TagTemplateFormProps = {
    mode?: "create" | "edit";
    initialValues?: Partial<TagTemplateRow>;
    editValues?: Partial<TagTemplateRow> | null;
    onSuccess?: () => void;
};

const parseVdInput = (value: string): number[] =>
    value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.floor(n));

const getDefaultDynamicParameters = (
    type: DynamicTemplateType,
    ids: { inverterId: number; blockId: number; trackerCount: number },
    plantCategory: TagTemplatePlantCategory,
): DynamicParameter[] => {
    if (type === "dc_channel") {
        return normalizeTagTemplatePlantCategory(plantCategory) === "pm_kusum"
            ? defaultKusumDcChannelSuggestions(ids.inverterId)
            : defaultDcChannelSuggestions(ids.inverterId);
    }
    if (type === "tracker") {
        return defaultTrackerSuggestions({ blockId: ids.blockId, trackerCount: ids.trackerCount });
    }
    return defaultOtherSuggestions();
};

const hasCategoryConfig = (value: unknown): value is TagTemplateCategory =>
    typeof value === "string" && Object.hasOwn(TAG_TEMPLATE_CATEGORY_CONFIG, value);


/**
 * TagMapBuilder only edits string cells. Flatten backend tag_map values so nested
 * JSON shows as text (avoids "[object Object]") while preserving round-trip in
 * {@link tagMapFromBuilderFlatOutput}.
 */
function tagMapForBuilderDisplay(map: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map)) {
        if (v === null || v === undefined) {
            out[k] = "";
            continue;
        }
        if (typeof v === "object") {
            try {
                out[k] = JSON.stringify(v);
            } catch {
                out[k] = String(v);
            }
        } else {
            out[k] = String(v);
        }
    }
    return out;
}

/** Restore backend-shaped tag_map from TagMapBuilder string-only output. */
function tagMapFromBuilderFlatOutput(flat: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(flat)) {
        if (typeof v !== "string") {
            out[k] = v;
            continue;
        }
        const t = v.trim();
        if (!t) {
            out[k] = "";
            continue;
        }
        if (
            (t.startsWith("{") && t.endsWith("}")) ||
            (t.startsWith("[") && t.endsWith("]"))
        ) {
            try {
                out[k] = JSON.parse(t) as unknown;
                continue;
            } catch {
                out[k] = v;
                continue;
            }
        }
        if (t === "true") {
            out[k] = true;
            continue;
        }
        if (t === "false") {
            out[k] = false;
            continue;
        }
        const num = Number(t);
        if (!Number.isNaN(num) && String(num) === t) {
            out[k] = num;
            continue;
        }
        out[k] = v;
    }
    return out;
}

/**
 * TagMapBuilder disables static rows when any data exists but that key is missing.
 * Pre-fill missing static keys with "" so every row stays enabled and visible.
 */
function mergeStaticRowPlaceholders(
    map: Record<string, unknown>,
    staticRows: TagMapStaticRow[],
): Record<string, unknown> {
    if (staticRows.length === 0) return { ...map };
    const out = { ...map };
    for (const r of staticRows) {
        if (!(r.key in out)) {
            out[r.key] = "";
        }
    }
    return out;
}

function getRowId(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    const v = value as { id?: unknown };
    return typeof v.id === "string" && v.id.trim() ? v.id : null;
}

const TagTemplateForm: React.FC<TagTemplateFormProps> = ({
    mode = "create",
    initialValues,
    editValues: editValuesProp,
    onSuccess,
}) => {
    const isEdit = mode === "edit";
    const [showAdvanced, setShowAdvanced] = useState(isEdit);
    type EditTagMapSource = "keep_saved" | "regenerate";
    const DYNAMIC_TYPES: Array<{ value: DynamicTemplateType; label: string }> = [
        { value: "dc_channel", label: "DC Channel" },
        { value: "tracker", label: "Tracker" },
        { value: "other", label: "Other" },
    ];

    /** List rows often omit tag_map; detail API has the full row — prefer editValues when editing. */
    const resolvedRow = isEdit
        ? (editValuesProp ?? initialValues)
        : initialValues;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setError,
        clearErrors,
        getValues,
        formState: { errors },
    } = useForm<TagTemplateFormValues>({

        defaultValues: {
            name: resolvedRow?.name ?? "",
            category: normalizeTagTemplateCategory(resolvedRow?.category),
            plant_category: normalizeTagTemplatePlantCategory(resolvedRow?.plant_category),
            description: resolvedRow?.description ?? "",
            version: formVersionFromRow(resolvedRow?.version),
            is_default_version: isDefaultVersionFromRow(resolvedRow?.version),
            is_active: resolvedRow?.is_active ?? true,
        },
    });

    const [tagMapDraft, setTagMapDraft] = useState<Record<string, unknown>>({});
    const [tagMapDraftKey, setTagMapDraftKey] = useState<string | null>(null);
    const [pendingSubmitData, setPendingSubmitData] =
        useState<TagTemplateFormValues | null>(null);
    const [showUpdateScopeModal, setShowUpdateScopeModal] = useState(false);
    const [updateScopeChoice, setUpdateScopeChoice] = useState<"update" | "create_new">("update");
    const [createNewTemplateName, setCreateNewTemplateName] = useState("");
    const [createNewNameError, setCreateNewNameError] = useState<string | null>(null);
    const [dynamicType, setDynamicType] = useState<DynamicTemplateType>("dc_channel");
    const [dynamicVdInput, setDynamicVdInput] = useState("1,13,14,17,18,23");
    const [dynamicParametersDraft, setDynamicParametersDraft] = useState<DynamicParameter[]>([]);
    const [dynamicParametersDraftKey, setDynamicParametersDraftKey] = useState<string | null>(null);

    // Inputs required to auto-generate tag_map for certain (plant_category, category) combinations.
    const [tagGenInputs, setTagGenInputs] = useState({
        // Inverter
        inverterId: 1,
        // Meter / Block
        meterId: 1,
        // WMS (weather_station)
        diCount: 16,
        doCount: 6,
        aiCount: 6,
        includeSoftTags: true,
        // Tracker (blockId is fixed in external names; trackerCount drives {prefix} 1..N)
        blockId: 1,
        trackerCount: 1,
        // Numerical Relay / NIFPS
        relayNumber: 1,
        fireSystemNumber: 1,
        // Block bot aggregation script
        botAggregationMode: "meter_to_meter" as BotMeterAggregationMode,
    });

    const editValues = isEdit ? (editValuesProp ?? initialValues) : undefined;

    /**
     * Keep RHF fields in sync when detail `editValues` arrive.
     * (tag_map sync is handled via computed baseline + draft edits, not setState in effects)
     */
    const prevSyncedEditSnapshot = React.useRef<string | null>(null);
    useEffect(() => {
        if (!isEdit || !editValues) return;

        const snapshot = JSON.stringify(editValues);
        if (prevSyncedEditSnapshot.current === snapshot) return;

        const nextCategory = normalizeTagTemplateCategory(editValues.category);
        reset({
            name: editValues.name ?? "",
            category: nextCategory,
            plant_category: normalizeTagTemplatePlantCategory(editValues.plant_category),
            description: editValues.description ?? "",
            version: formVersionFromRow(editValues.version),
            is_default_version: isDefaultVersionFromRow(editValues.version),
            is_active: editValues.is_active ?? true,
        });

        prevSyncedEditSnapshot.current = snapshot;
    }, [editValues, isEdit, reset]);

    const watchedIsDefaultVersion = useWatch({ control, name: "is_default_version" });
    const watchedCategory = useWatch({ control, name: "category" });
    const safeCategory = hasCategoryConfig(watchedCategory) ? watchedCategory : "others";
    const categoryConfig = TAG_TEMPLATE_CATEGORY_CONFIG[safeCategory];
    const watchedPlantCategory = useWatch({ control, name: "plant_category" });
    const safePlantCategory = normalizeTagTemplatePlantCategory(watchedPlantCategory);
    const categoryLabel = getTagTemplateCategoryLabel(safeCategory);
    const loadCategoryOptions = useCallback(
        (search = "") => fetchTagTemplateCategoryOptions(search),
        [],
    );
    const loadPlantCategoryOptions = useCallback(
        (search = "") => fetchPlantCategoryOptions(search),
        [],
    );
    const { inverterId, blockId, trackerCount } = tagGenInputs;
    const effectiveDynamicType: DynamicTemplateType =
        safeCategory === "tracker"
            ? "tracker"
            : safeCategory === "dcdb"
                ? "dc_channel"
                : dynamicType;

    const dynamicParametersBaselineKey = useMemo(
        () => `${effectiveDynamicType}:${safePlantCategory}:${inverterId}:${blockId}:${trackerCount}`,
        [effectiveDynamicType, safePlantCategory, inverterId, blockId, trackerCount],
    );
    const dynamicParametersBaseline = useMemo(
        () => getDefaultDynamicParameters(effectiveDynamicType, { inverterId, blockId, trackerCount }, safePlantCategory),
        [effectiveDynamicType, safePlantCategory, inverterId, blockId, trackerCount],
    );
    const dynamicParameters =
        dynamicParametersDraftKey === dynamicParametersBaselineKey
            ? dynamicParametersDraft
            : dynamicParametersBaseline;

    const applyDynamicParameters = useCallback(
        (
            next:
                | DynamicParameter[]
                | ((current: DynamicParameter[]) => DynamicParameter[]),
            options?: { baselineKey?: string },
        ) => {
            const baselineKey = options?.baselineKey ?? dynamicParametersBaselineKey;
            const current =
                dynamicParametersDraftKey === baselineKey
                    ? dynamicParametersDraft
                    : baselineKey === dynamicParametersBaselineKey
                        ? dynamicParametersBaseline
                        : getDefaultDynamicParameters(effectiveDynamicType, { inverterId, blockId, trackerCount }, safePlantCategory);
            const resolvedNext = typeof next === "function" ? next(current) : next;
            setDynamicParametersDraftKey(baselineKey);
            setDynamicParametersDraft(resolvedNext);
        },
        [
            dynamicParametersBaseline,
            dynamicParametersBaselineKey,
            dynamicParametersDraft,
            dynamicParametersDraftKey,
            effectiveDynamicType,
            safePlantCategory,
            inverterId,
            blockId,
            trackerCount,
        ],
    );

    type AutoFillKind =
        | null
        | "health"
        | "captive_inverter"
        | "kusum_inverter"
        | "captive_meter"
        | "kusum_meter"
        | "abt_meter"
        | "wms"
        | "dynamic"
        | "numerical_relay"
        | "nifps"
        | "transformer"
        | "bot_meter_script";


    const autoFillKind: AutoFillKind = (() => {
        if (safeCategory === "health") return "health";
        if (safeCategory === "inverter") {
            if (safePlantCategory === "captive") return "captive_inverter";
            if (safePlantCategory === "pm_kusum") return "kusum_inverter";
            return null;
        }
        if (safeCategory === "meter") {
            if (safePlantCategory === "captive") return "captive_meter";
            if (safePlantCategory === "pm_kusum") return "kusum_meter";
            if (safePlantCategory === "rooftop") return "abt_meter";
            return null;
        }
        if (
            safeCategory === "plant_bot" ||
            safeCategory === "block_bot" ||
            safeCategory === "acdb_block"
        ) {
            return "bot_meter_script";
        }
        if (safeCategory === "weather_station") return "wms";
        if (safeCategory === "transformer") return "transformer";
        if (safeCategory === "numerical_relay") return "numerical_relay";

        if (safeCategory === "nifps") return "nifps";
        if (safeCategory === "tracker" || safeCategory === "dcdb" || safeCategory === "dynamic") {
            return "dynamic";
        }
        if (safeCategory === "others") return null;
        return null;
    })();

    const originalCategory = normalizeTagTemplateCategory(editValues?.category);
    const originalPlantCategory = normalizeTagTemplatePlantCategory(editValues?.plant_category);
    const hasCategoryOrPlantChanged =
        isEdit && !!editValues && (safeCategory !== originalCategory || safePlantCategory !== originalPlantCategory);

    const [editTagMapSource, setEditTagMapSource] = useState<EditTagMapSource>("keep_saved");
    const canRegenerate = autoFillKind !== null;
    const shouldAutoFill = !isEdit && autoFillKind !== null;
    const shouldGenerateFromCategory =
        (!isEdit && autoFillKind !== null) ||
        (isEdit && editTagMapSource === "regenerate" && autoFillKind !== null);
    const showAutoFillParameters =
        shouldGenerateFromCategory &&
        autoFillKind !== "health" &&
        !(autoFillKind === "bot_meter_script" && safeCategory !== "block_bot");

    const autoFilledTagMap = useMemo<Record<string, unknown>>(() => {
        if (!shouldGenerateFromCategory) return {};

        if (autoFillKind === "health") return generateHealthTagTemplateConfig();
        if (autoFillKind === "captive_inverter") {
            return generateCaptiveInverterConfig({
                inverterId: tagGenInputs.inverterId,
            });
        }
        if (autoFillKind === "kusum_inverter") {
            return generateKusumInverterConfig({
                inverterId: tagGenInputs.inverterId,
            });
        }
        if (autoFillKind === "captive_meter") return generateCaptiveMeterConfig({ meterId: tagGenInputs.meterId });
        if (autoFillKind === "kusum_meter") return generateKusumMeterConfig({ meterId: tagGenInputs.meterId });
        if (autoFillKind === "abt_meter") return generateABTMeterConfig(tagGenInputs.meterId);
        if (autoFillKind === "bot_meter_script") {
            const mode = resolveBotAggregationModeForCategory(
                safeCategory,
                tagGenInputs.botAggregationMode,
            );
            return mode ? generateBotMeterTagMap(safePlantCategory, mode) : {};
        }
        if (autoFillKind === "wms") {
            return generateWeatherStationConfig({
                includeSoftTags: tagGenInputs.includeSoftTags,
            });
        }


        if (autoFillKind === "numerical_relay") {
            return generateNumericalRelayConfig(tagGenInputs.relayNumber);
        }
        if (autoFillKind === "nifps") {
            return generateFireSystemConfig(tagGenInputs.fireSystemNumber);
        }
        if (autoFillKind === "transformer") {
            return generateTransformerConfig({
                diCount: tagGenInputs.diCount,
                doCount: tagGenInputs.doCount,
                aiCount: tagGenInputs.aiCount,
            });
        }


        const vd = parseVdInput(dynamicVdInput);
        return effectiveDynamicType === "dc_channel"
            ? generateDynamicDcChannelConfig({ vd, parameters: dynamicParameters })
            : effectiveDynamicType === "tracker"
                ? generateDynamicTrackerConfig({ vd, parameters: dynamicParameters })
                : generateDynamicOtherConfig({ vd, parameters: dynamicParameters });
    }, [
        autoFillKind,
        dynamicParameters,
        effectiveDynamicType,
        dynamicVdInput,
        shouldGenerateFromCategory,
        tagGenInputs.inverterId,
        tagGenInputs.meterId,
        tagGenInputs.diCount,
        tagGenInputs.doCount,
        tagGenInputs.aiCount,
        tagGenInputs.includeSoftTags,
        tagGenInputs.relayNumber,
        tagGenInputs.fireSystemNumber,
        tagGenInputs.botAggregationMode,
        safeCategory,
        safePlantCategory,
    ]);

    const baselineTagMap = useMemo<Record<string, unknown>>(() => {
        if (isEdit) {
            if (editTagMapSource === "regenerate" && autoFillKind !== null) return autoFilledTagMap;
            return coerceTagTemplateTagMap(editValues?.tag_map ?? resolvedRow?.tag_map);
        }
        return shouldAutoFill ? autoFilledTagMap : {};
    }, [
        autoFillKind,
        autoFilledTagMap,
        editTagMapSource,
        editValues,
        isEdit,
        resolvedRow?.tag_map,
        shouldAutoFill,
    ]);

    const baselineKey = useMemo(() => {
        if (isEdit) {
            const idKey = getRowId(editValues) ?? getRowId(resolvedRow) ?? "";
            const paramsKey =
                editTagMapSource === "regenerate" && autoFillKind !== null
                    ? JSON.stringify({
                        tagGenInputs,
                        effectiveDynamicType,
                        dynamicVdInput,
                        dynamicParameters,
                    })
                    : "";
            return `edit:${idKey}:${editTagMapSource}:${safePlantCategory}:${safeCategory}:${autoFillKind ?? "manual"}:${paramsKey}`;
        }
        const paramsKey = shouldAutoFill
            ? JSON.stringify({
                tagGenInputs,
                effectiveDynamicType,
                dynamicVdInput,
                dynamicParameters,
            })
            : "";
        return `create:${safePlantCategory}:${safeCategory}:${autoFillKind ?? "manual"}:${paramsKey}`;
    }, [
        autoFillKind,
        dynamicParameters,
        effectiveDynamicType,
        dynamicVdInput,
        editTagMapSource,
        editValues,
        isEdit,
        resolvedRow,
        safeCategory,
        safePlantCategory,
        shouldAutoFill,
        tagGenInputs,
    ]);

    const isDraftActive = tagMapDraftKey === baselineKey;
    const effectiveTagMap = isDraftActive ? tagMapDraft : baselineTagMap;

    /** Edit: only static row slots for keys present in API tag_map — no empty/default rows. Create: full template. */
    const staticRowsForTagMap = useMemo(() => {
        if (shouldGenerateFromCategory) return [];
        if (!isEdit) return categoryConfig.rows;
        const keys = new Set(Object.keys(effectiveTagMap));
        return categoryConfig.rows.filter((r) => keys.has(r.key));
    }, [isEdit, categoryConfig.rows, shouldGenerateFromCategory, effectiveTagMap]);

    const tagMapBuilderConfig = useMemo(() => {
        if (isEdit) return tagMapForBuilderDisplay(effectiveTagMap);
        const source = shouldGenerateFromCategory
            ? effectiveTagMap
            : mergeStaticRowPlaceholders(effectiveTagMap, categoryConfig.rows);
        return tagMapForBuilderDisplay(source);
    }, [isEdit, shouldGenerateFromCategory, effectiveTagMap, categoryConfig.rows]);

    const handleTagMapBuilderChange = useCallback((flat: Record<string, unknown>) => {
        // Do NOT strip empty-string values during editing.
        // `stripEmptyStringKeysFromRecord` removes entries when value === "",
        // which makes dynamic rows disappear while the user is still typing.
        // We strip empty values only on submit inside `finalizeTagTemplateWritePayload`.
        setTagMapDraftKey(baselineKey);
        setTagMapDraft(tagMapFromBuilderFlatOutput(flat));
    }, [baselineKey]);

    const createMutation = useCreateTagTemplateMutation();
    const updateMutation = useUpdateTagTemplateMutation();
    const isLoading = createMutation.isPending || updateMutation.isPending;

    const submitTemplate = (
        data: TagTemplateFormValues,
        isCreateNew = false,
    ) => {
        const baseInput: CreateTagTemplateInput & { is_create_new?: boolean } = {
            name: data.name.trim(),
            category: normalizeTagTemplateCategory(data.category ?? safeCategory),
            plant_category: normalizeTagTemplatePlantCategory(data.plant_category),
            tag_map: effectiveTagMap,
            description: data.description?.trim() || null,
            version: resolveFormVersion(data),
            is_active: data.is_active,
            ...(isEdit ? { is_create_new: isCreateNew } : {}),
        };

        if (isEdit && initialValues?.id) {
            updateMutation.mutate(
                { id: initialValues.id, ...baseInput },
                {
                    onSuccess: () => {
                        setShowUpdateScopeModal(false);
                        setPendingSubmitData(null);
                        setCreateNewTemplateName("");
                        setCreateNewNameError(null);
                        onSuccess?.();
                    },
                    onError: (error) => applyBackendErrors(error, setError, getValues),
                },
            );
        } else {
            createMutation.mutate(baseInput, {
                onSuccess: () => { reset(); onSuccess?.(); },
                onError: (error) => applyBackendErrors(error, setError, getValues),
            });
        }
    };

    const onSubmit = (data: TagTemplateFormValues) => {
        clearErrors("root");
        const preview = finalizeTagTemplateWritePayload({
            name: data.name.trim(),
            category: normalizeTagTemplateCategory(data.category ?? safeCategory),
            plant_category: normalizeTagTemplatePlantCategory(data.plant_category),
            tag_map: effectiveTagMap,
            description: data.description?.trim() || null,
            version: resolveFormVersion(data),
            is_active: data.is_active,
        });

        if (
            !isEdit &&
            Object.keys(preview.tag_map as Record<string, unknown>).length === 0
        ) {
            setError("root", {
                type: "manual",
                message: "Add at least one tag mapping before creating a template.",
            });
            return;
        }

        if (isEdit) {
            setUpdateScopeChoice("update");
            setCreateNewTemplateName("");
            setCreateNewNameError(null);
            setPendingSubmitData(data);
            setShowUpdateScopeModal(true);
            return;
        }

        submitTemplate(data);
    };

    const handleConfirmUpdateScope = () => {
        if (!pendingSubmitData) return;

        const isCreateNew = updateScopeChoice === "create_new";
        if (isCreateNew) {
            const trimmedName = createNewTemplateName.trim();
            if (!trimmedName) {
                setCreateNewNameError("Template name is required for a new template");
                return;
            }
            submitTemplate({ ...pendingSubmitData, name: trimmedName }, true);
            return;
        }

        submitTemplate(pendingSubmitData, false);
    };

    const handleCloseUpdateScopeModal = () => {
        if (isLoading) return;
        setShowUpdateScopeModal(false);
        setPendingSubmitData(null);
        setCreateNewTemplateName("");
        setCreateNewNameError(null);
    };

    return (
        <>
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
                    {/* ── Section 1: Details ── */}
                    <div className="space-y-2">
                        <SectionSubHeader
                            icon={Info}
                            title="Basic Information"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Controller
                                name="plant_category"
                                control={control}
                                rules={{ required: "Plant category is required" }}
                                render={({ field }) => (
                                    <AsyncSelect
                                        label="Plant category"
                                        star
                                        apiSearch
                                        loadOptions={loadPlantCategoryOptions}
                                        placeholder="Type to search plant categories..."
                                        value={
                                            field.value ? { value: field.value, label: getTagTemplatePlantCategoryLabel(field.value) } : null
                                        }
                                        onChange={(value) => {
                                            const next = value as Option | null;
                                            field.onChange(normalizeTagTemplatePlantCategory(next?.value));
                                        }}
                                        errors={errors.plant_category as { message?: string } | undefined}
                                        isClearable={false}
                                        menuPortalTarget={document.body}
                                    />
                                )}
                            />
                            <Controller
                                name="category"
                                control={control}
                                rules={{ required: "Category is required" }}
                                render={({ field }) => (
                                    <AsyncSelect
                                        label="Category"
                                        star
                                        apiSearch
                                        loadOptions={loadCategoryOptions}
                                        placeholder="Type to search categories..."
                                        value={
                                            field.value ? { value: field.value, label: getTagTemplateCategoryLabel(field.value) } : null
                                        }
                                        onChange={(value) => {
                                            const next = value as Option | null;
                                            field.onChange(normalizeTagTemplateCategory(next?.value));
                                        }}
                                        errors={errors.category as { message?: string } | undefined}
                                        isClearable={false}
                                        menuPortalTarget={document.body}
                                    />
                                )}
                            />
                            <Input
                                label="Template Name"
                                star
                                {...register("name", { required: "Template name is required" })}
                                errors={errors.name}
                                placeholder="e.g., Growatt Health Template"
                            />
                            
                            {!watchedIsDefaultVersion && (
                                <Input
                                    label="Version"
                                    star
                                    type="number"
                                    min={1}
                                    step={1}
                                    {...register("version", {
                                        setValueAs: (v) => {
                                            if (v === "" || v === null || v === undefined) return null;
                                            const num = Number(v);
                                            return Number.isFinite(num) ? Math.floor(num) : v;
                                        },
                                        validate: (v) => {
                                            if (getValues("is_default_version")) return true;
                                            if (v === null || v === undefined) {
                                                return "Version is required";
                                            }
                                            const num = Number(v);
                                            if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1) {
                                                return "Version must be a positive whole number of 1 or greater";
                                            }
                                            return true;
                                        },
                                    })}
                                    errors={errors.version}
                                    placeholder="1"
                                />
                            )}
                            <Toggle
                                id="is_default_version_tt"
                                label="Default version"
                                {...register("is_default_version", {
                                    onChange: (e) => {
                                        if (e.target.checked) {
                                            clearErrors("version");
                                        }
                                    },
                                })}
                                className={watchedIsDefaultVersion ? "sm:!mt-6": ""}
                            />
                            <Toggle id="is_active_tt" label="Active" {...register("is_active")} />
                            { showAdvanced && (<div className="md:col-span-2">
                                <TextArea
                                    label="Description"
                                    {...register("description")}
                                    rows={2}
                                    placeholder="Optional description of this tag template…"
                                />
                            </div>)}
                        </div>
                    </div>

                    {/* ── Section 2: Tag Map ── */}
                    <div className="space-y-2">
                        <SectionSubHeader
                            icon={FileText}
                            title={`Tag Map — ${categoryLabel}`}
                        />
                        {errors.root?.message && (
                            <div className="rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                                {errors.root.message}
                            </div>
                        )}
                        {isEdit && hasCategoryOrPlantChanged && canRegenerate && (
                            <div className="rounded-xs border border-brand-200/70 dark:border-brand-900/40 bg-brand-50/60 dark:bg-brand-950/20 p-4 space-y-3">
                                <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                                    Category/plant category changed — choose tag map source
                                </p>
                                <p className="text-xs text-brand-700/85 dark:text-brand-300/85">
                                    Your saved tag map may not match the new generator. Pick whether you want to keep the existing JSON or regenerate using the selected category.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 rounded-xs border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-dark-50 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="edit_tag_map_source"
                                            className="accent-primary-500"
                                            checked={editTagMapSource === "keep_saved"}
                                            onChange={() => {
                                                setEditTagMapSource("keep_saved");
                                            }}
                                        />
                                        Keep saved JSON
                                    </label>
                                    <label className="flex items-center gap-2 rounded-xs border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-dark-50 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="edit_tag_map_source"
                                            className="accent-primary-500"
                                            checked={editTagMapSource === "regenerate"}
                                            onChange={() => {
                                                setEditTagMapSource("regenerate");
                                                setTagMapDraft({});
                                                setTagMapDraftKey(null);
                                            }}
                                        />
                                        Regenerate from category
                                    </label>
                                </div>
                            </div>
                        )}

                        {showAutoFillParameters && (
                            <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-50 p-4 space-y-3">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-dark-400">
                                    Auto-fill parameters
                                </p>

                                {(autoFillKind === "captive_inverter" || autoFillKind === "kusum_inverter") && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input
                                            label="Inverter ID"
                                            type="number"
                                            min={1}
                                            value={tagGenInputs.inverterId}
                                            onChange={(e) => {
                                                const n = Number(e.target.value);
                                                setTagGenInputs((p) => ({ ...p, inverterId: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.inverterId }));
                                            }}
                                        />
                                    </div>
                                )}

                                {(autoFillKind === "captive_meter" ||
                                    autoFillKind === "kusum_meter" ||
                                    autoFillKind === "abt_meter") && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input
                                                label="Meter ID"
                                                type="number"
                                                min={1}
                                                value={tagGenInputs.meterId}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value);
                                                    setTagGenInputs((p) => ({ ...p, meterId: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.meterId }));
                                                }}
                                            />
                                        </div>
                                    )}

                                {autoFillKind === "bot_meter_script" && safeCategory === "block_bot" && (
                                    <AsyncSelect
                                        label="Aggregation script"
                                        star
                                        loadOptions={async () => BOT_METER_AGGREGATION_OPTIONS}
                                        value={
                                            BOT_METER_AGGREGATION_OPTIONS.find(
                                                (option) => option.value === tagGenInputs.botAggregationMode,
                                            ) ?? null
                                        }
                                        isClearable={false}
                                        menuPortalTarget={document.body}
                                        onChange={(val) => {
                                            const next = (val as Option | null)?.value as
                                                | BotMeterAggregationMode
                                                | undefined;
                                            if (next) {
                                                setTagGenInputs((p) => ({
                                                    ...p,
                                                    botAggregationMode: next,
                                                }));
                                            }
                                        }}
                                    />
                                )}

                                {(autoFillKind === "wms" || autoFillKind === "transformer") && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <Input
                                                label="DI Count"
                                                type="number"
                                                min={1}
                                                value={tagGenInputs.diCount}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value);
                                                    setTagGenInputs((p) => ({ ...p, diCount: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.diCount }));
                                                }}
                                            />
                                            <Input
                                                label="DO Count"
                                                type="number"
                                                min={1}
                                                value={tagGenInputs.doCount}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value);
                                                    setTagGenInputs((p) => ({ ...p, doCount: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.doCount }));
                                                }}
                                            />
                                            <Input
                                                label="AI Count"
                                                type="number"
                                                min={1}
                                                value={tagGenInputs.aiCount}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value);
                                                    setTagGenInputs((p) => ({ ...p, aiCount: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.aiCount }));
                                                }}
                                            />
                                        </div>
                                        {autoFillKind === "wms" && (
                                            <Toggle
                                                id="include_soft_tags"
                                                label="Include soft tags"
                                                checked={tagGenInputs.includeSoftTags}
                                                onChange={(e) =>
                                                    setTagGenInputs((p) => ({ ...p, includeSoftTags: e.target.checked }))
                                                }
                                            />
                                        )}
                                    </div>
                                )}

                                {autoFillKind === "dynamic" && (
                                    <div className="space-y-4">
                                        {/* ── Config Fields ── */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {safeCategory === "dynamic" && (
                                                <AsyncSelect
                                                    label="Dynamic Type"
                                                    loadOptions={async () => DYNAMIC_TYPES}
                                                    value={DYNAMIC_TYPES.find((o) => o.value === effectiveDynamicType) ?? null}
                                                    isDisabled={safeCategory !== "dynamic"}
                                                    isClearable={false}
                                                    menuPortalTarget={document.body}
                                                    onChange={(val) => {
                                                        const next = (val as Option | null)?.value as DynamicTemplateType;
                                                        if (next) {
                                                            setDynamicType(next);
                                                            const nextBaselineKey = `${next}:${safePlantCategory}:${inverterId}:${blockId}:${trackerCount}`;
                                                            applyDynamicParameters(
                                                                getDefaultDynamicParameters(next, { inverterId, blockId, trackerCount }, safePlantCategory),
                                                                { baselineKey: nextBaselineKey },
                                                            );
                                                        }
                                                    }}
                                                />
                                            )}
                                            {effectiveDynamicType === "dc_channel" ? (
                                                <Input
                                                    label="Inverter ID (suggestions)"
                                                    type="number"
                                                    min={1}
                                                    value={tagGenInputs.inverterId}
                                                    onChange={(e) => {
                                                        const n = Number(e.target.value);
                                                        setTagGenInputs((p) => {
                                                            const nextInverterId = Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.inverterId;
                                                            return { ...p, inverterId: nextInverterId };
                                                        });
                                                    }}
                                                />
                                            ) : effectiveDynamicType === "tracker" ? (
                                                <>
                                                    <Input
                                                        label="Block ID (fixed in tags)"
                                                        type="number"
                                                        min={1}
                                                        value={tagGenInputs.blockId}
                                                        onChange={(e) => {
                                                            const n = Number(e.target.value);
                                                            setTagGenInputs((p) => {
                                                                const nextBlockId = Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.blockId;
                                                                return { ...p, blockId: nextBlockId };
                                                            });
                                                        }}
                                                    />
                                                    <Input
                                                        label="Tracker count ({prefix})"
                                                        type="number"
                                                        min={1}
                                                        value={tagGenInputs.trackerCount}
                                                        onChange={(e) => {
                                                            const n = Number(e.target.value);
                                                            setTagGenInputs((p) => {
                                                                const nextTrackerCount =
                                                                    Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.trackerCount;
                                                                return { ...p, trackerCount: nextTrackerCount };
                                                            });
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <div className="flex items-end pb-2">
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                        Add your own custom tags below for the "other" type.
                                                    </p>
                                                </div>
                                            )}
                                            <Input
                                                label="VD numbers"
                                                value={dynamicVdInput}
                                                onChange={(e) => setDynamicVdInput(e.target.value)}
                                                placeholder="e.g. 1,13,14,17,18,23"
                                            />
                                        </div>

                                        {/* ── Parameters Sub-section ── */}
                                        <div className="space-y-2">
                                            <p className="form-sub-heading !mb-0">Parameters</p>

                                            {/* Desktop column header */}
                                            <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_72px_48px_32px] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-500">
                                                <span>Internal Name</span>
                                                <span>External Name</span>
                                                <span>Count</span>
                                                <span>Soft</span>
                                                <span />
                                            </div>

                                            {/* Parameter rows */}
                                            <div className="space-y-1.5">
                                                {dynamicParameters.map((row, idx) => (
                                                    <div
                                                        key={`dynamic-param-${idx}`}
                                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_72px_48px_32px] gap-2 items-center rounded-xs border border-neutral-200 dark:border-neutral-dark-300 bg-neutral-0 dark:bg-neutral-dark-200 px-3 py-2.5"
                                                    >
                                                        <Input
                                                            label="Internal Name"
                                                            labelClassName="lg:hidden"
                                                            value={row.internal_name}
                                                            onChange={(e) =>
                                                                applyDynamicParameters((prev) =>
                                                                    prev.map((p, i) =>
                                                                        i === idx ? { ...p, internal_name: e.target.value } : p,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder="current"
                                                        />
                                                        <Input
                                                            label="External Name"
                                                            labelClassName="lg:hidden"
                                                            value={row.external_name}
                                                            onChange={(e) =>
                                                                applyDynamicParameters((prev) =>
                                                                    prev.map((p, i) =>
                                                                        i === idx ? { ...p, external_name: e.target.value } : p,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder={
                                                                effectiveDynamicType === "dc_channel"
                                                                    ? safePlantCategory === "pm_kusum"
                                                                        ? `IDC{prefix}-I${inverterId}`
                                                                        : `I${inverterId}C{prefix}`
                                                                    : effectiveDynamicType === "tracker"
                                                                        ? `B${blockId}ANGT{prefix}`
                                                                        : "TAG{prefix}"
                                                            }
                                                        />
                                                        {/* Count + Soft Tag + Delete grouped: inline row on mobile/tablet, dissolves into grid cols on desktop */}
                                                        <div className="col-span-1 sm:col-span-2 lg:contents flex items-end gap-3">
                                                            <div className="w-20 shrink-0 lg:w-auto">
                                                                <Input
                                                                    label="Count"
                                                                    labelClassName="lg:hidden"
                                                                    type="number"
                                                                    min={1}
                                                                    value={row.count}
                                                                    onChange={(e) => {
                                                                        const n = Number(e.target.value);
                                                                        applyDynamicParameters((prev) =>
                                                                            prev.map((p, i) =>
                                                                                i === idx
                                                                                    ? { ...p, count: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.count }
                                                                                    : p,
                                                                            ),
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900 lg:hidden">Soft Tag</span>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={row.soft_tag}
                                                                        onChange={(e) =>
                                                                            applyDynamicParameters((prev) =>
                                                                                prev.map((p, i) =>
                                                                                    i === idx ? { ...p, soft_tag: e.target.checked } : p,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="w-9 h-5 bg-neutral-300 dark:bg-neutral-dark-300 peer-checked:bg-brand-600 rounded-full transition-colors" />
                                                                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm border border-neutral-200 transition-transform peer-checked:translate-x-4" />
                                                                </label>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-md text-neutral-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 dark:text-neutral-dark-500 dark:hover:text-error-dark-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                                onClick={() =>
                                                                    applyDynamicParameters((prev) => prev.filter((_, i) => i !== idx))
                                                                }
                                                                disabled={dynamicParameters.length <= 1}
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        applyDynamicParameters((prev) => [
                                                            ...prev,
                                                            {
                                                                internal_name: "",
                                                                external_name:
                                                                    effectiveDynamicType === "dc_channel"
                                                                        ? safePlantCategory === "pm_kusum"
                                                                            ? `IDC{prefix}-I${tagGenInputs.inverterId}`
                                                                            : `I${tagGenInputs.inverterId}X{prefix}`
                                                                        : effectiveDynamicType === "tracker"
                                                                            ? `B${tagGenInputs.blockId}TAGT{prefix}`
                                                                            : "",
                                                                count:
                                                                    effectiveDynamicType === "tracker"
                                                                        ? tagGenInputs.trackerCount
                                                                        : 1,
                                                                soft_tag: false,
                                                            },
                                                        ])
                                                    }
                                                >
                                                    Add parameter
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        applyDynamicParameters(
                                                            getDefaultDynamicParameters(
                                                                effectiveDynamicType,
                                                                { inverterId, blockId, trackerCount },
                                                                safePlantCategory,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Reset suggestions
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {autoFillKind === "numerical_relay" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input
                                            label="Relay Number"
                                            type="number"
                                            min={1}
                                            value={tagGenInputs.relayNumber}
                                            onChange={(e) => {
                                                const n = Number(e.target.value);
                                                setTagGenInputs((p) => ({ ...p, relayNumber: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.relayNumber }));
                                            }}
                                        />
                                    </div>
                                )}

                                {autoFillKind === "nifps" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input
                                            label="System Number"
                                            type="number"
                                            min={1}
                                            value={tagGenInputs.fireSystemNumber}
                                            onChange={(e) => {
                                                const n = Number(e.target.value);
                                                setTagGenInputs((p) => ({ ...p, fireSystemNumber: Number.isFinite(n) && n >= 1 ? Math.floor(n) : p.fireSystemNumber }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-2">
                            <TagMapBuilder
                                key={`${safeCategory}-${safePlantCategory}-${isEdit ? "e" : "c"}`}
                                staticRows={staticRowsForTagMap}
                                keyLabel={categoryConfig.keyLabel}
                                valueLabel={categoryConfig.valueLabel}
                                previewLabel={categoryConfig.previewLabel}
                                initialConfig={tagMapBuilderConfig}
                                onChange={handleTagMapBuilderChange}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (isEdit && editValues) {
                                    const nextCategory = normalizeTagTemplateCategory(
                                        editValues.category,
                                    );
                                    reset({
                                        name: editValues.name ?? "",
                                        category: nextCategory,
                                        plant_category: normalizeTagTemplatePlantCategory(
                                            editValues.plant_category,
                                        ),
                                        description: editValues.description ?? "",
                                        version: formVersionFromRow(editValues.version),
                                        is_default_version: isDefaultVersionFromRow(editValues.version),
                                        is_active: editValues.is_active ?? true,
                                    });
                                    setTagMapDraft({});
                                    setTagMapDraftKey(null);
                                    return;
                                }

                                reset();
                                setTagMapDraft({});
                                setTagMapDraftKey(null);
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            {isEdit ? "Update Template" : "Create Template"}
                        </Button>
                    </div>
                </div>
            </form>

            <Modal
                open={showUpdateScopeModal}
                onClose={handleCloseUpdateScopeModal}
                title="Save template changes"
                subtitle="Choose whether to update this template or create a new one"
                icon={Settings}
                maxWidth="max-w-xl"
                centerModal
                backdropClassName="z-[69]"
                containerClassName="z-[70]"
            >
                <div className="space-y-6">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        If this template is already used by components, use{" "}
                        <span className="font-medium">Create new</span> to save your changes as a separate template.
                        Use <span className="font-medium">Update existing</span> to change this record in place.
                    </p>

                    <Tabs
                        size="sm"
                        className="w-full max-w-max"
                        tabs={[
                            { key: "update", label: "Update existing" },
                            { key: "create_new", label: "Create new" },
                        ]}
                        selected={updateScopeChoice}
                        onChange={(key) => {
                            setUpdateScopeChoice(key as "update" | "create_new");
                            setCreateNewNameError(null);
                            if (key === "update") {
                                setCreateNewTemplateName("");
                            }
                        }}
                    />

                    {updateScopeChoice === "create_new" && (
                        <Input
                            label="New template name"
                            star
                            value={createNewTemplateName}
                            onChange={(e) => {
                                setCreateNewTemplateName(e.target.value);
                                if (createNewNameError) setCreateNewNameError(null);
                            }}
                            errors={createNewNameError ? { message: createNewNameError } : undefined}
                            placeholder="e.g., Growatt Health Template v2"
                        />
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseUpdateScopeModal}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleConfirmUpdateScope}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            {updateScopeChoice === "create_new" ? "Create New Template" : "Update Template"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TagTemplateForm;
