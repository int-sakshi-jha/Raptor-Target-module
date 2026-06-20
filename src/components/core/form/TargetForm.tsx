/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import {
    TARGET_STATUS_OPTIONS,
    TARGET_PERIOD_OPTIONS,
    useCreateTargetMutation,
    useUpdateTargetMutation,
    type CreateTargetInput,
    type TargetParametersPayload,
    type TargetParametersResponse,
    type TargetRow,
} from "@/services/operations/targetAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchComponentNames } from "@/services/operations/componentAPI";
import { fetchTagMapKeyOptions } from "@/services/operations/historyAPI";
import { ArrowRight, BarChart2, Box, Calendar, Plus, X } from "lucide-react";
import { applyBackendErrors } from "@/utils/formValidators";

type TargetFormMode = "create" | "edit";

export type TargetParameterFormRow = {
    parameter: Option | null;
    value: number | "";
};

export type TargetFormValues = {
    tenant_id: Option | null;
    plant_id: Option | null;
    target_name: string;
    component_id: Option | null;
    parameters: TargetParameterFormRow[];
    status: Option | null;
    target_period: Option | null;
    start_date: string;
    end_date: string;
};

type TargetFormProps = {
    mode?: TargetFormMode;
    initialValues?: Partial<TargetRow>;
    onSuccess?: () => void;
    close?: () => void;
    isOpen?: boolean;
};

const buildOption = (value: string | null | undefined, label?: string | null): Option | null =>
    value ? { value, label: label || value } : null;

export const mapTargetParametersToFormRows = (
    parameters: TargetParametersResponse | null | undefined,
): TargetParameterFormRow[] => {
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
        return [];
    }

    return Object.entries(parameters).map(([parameter, config]) => ({
        parameter: buildOption(parameter),
        value: typeof config?.value === "number" ? config.value : "",
    }));
};

export const mapTargetFormRowsToPayload = (
    rows: TargetParameterFormRow[],
): TargetParametersPayload =>
    rows.reduce<TargetParametersPayload>((acc, row) => {
        const key = row.parameter?.value?.trim();
        if (!key) return acc;
        acc[key] = { value: Number(row.value) };
        return acc;
    }, {});

function buildEditFormValues(iv: Partial<TargetRow>): TargetFormValues {
    return {
        tenant_id: buildOption(iv.tenant_id, iv.tenant_name),
        plant_id: buildOption(iv.plant_id, iv.plant_name),
        target_name: iv.target_name ?? "",
        component_id: buildOption(iv.component_id, iv.component_name),
        parameters: mapTargetParametersToFormRows(iv.parameters),
        status: buildOption(iv.status),
        target_period: buildOption(iv.target_period),
        start_date: iv.start_date ? String(iv.start_date).slice(0, 10) : "",
        end_date: iv.end_date ? String(iv.end_date).slice(0, 10) : "",
    };
}

const DEFAULT_VALUES: TargetFormValues = {
    tenant_id: null,
    plant_id: null,
    target_name: "",
    component_id: null,
    parameters: [],
    status: null,
    target_period: null,
    start_date: "",
    end_date: "",
};

const CACHE_LIMIT = 12;

const TargetForm: React.FC<TargetFormProps> = ({
    mode = "create",
    initialValues,
    onSuccess,
}) => {
    const isEdit = mode === "edit";

    const createMutation = useCreateTargetMutation();
    const updateMutation = useUpdateTargetMutation();

    const {
        register,
        handleSubmit,
        setError,
        getValues,
        watch,
        reset,
        control,
        setValue,
        formState: { errors },
    } = useForm<TargetFormValues>({
        defaultValues:
            isEdit && initialValues
                ? buildEditFormValues(initialValues)
                : DEFAULT_VALUES,
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "parameters",
        rules: {
            minLength: {
                value: 1,
                message: "At least one parameter is required",
            },
        },
    });

    const selectedTenantId = watch("tenant_id")?.value ?? "";
    const selectedPlantId = watch("plant_id")?.value ?? "";
    const selectedComponentId = watch("component_id")?.value ?? "";
    const parameterRows = watch("parameters");
    const selectedParameterValues = useMemo(
        () => parameterRows.map((row) => row.parameter?.value).filter(Boolean) as string[],
        [parameterRows],
    );

    const [tenantLabelCache, setTenantLabelCache] = useState<Record<string, string>>(() => {
        if (initialValues?.tenant_id) {
            return { [initialValues.tenant_id]: initialValues.tenant_name || initialValues.tenant_id };
        }
        return {};
    });

    const [plantLabelCache, setPlantLabelCache] = useState<Record<string, string>>(() => {
        if (initialValues?.plant_id) {
            return { [initialValues.plant_id]: initialValues.plant_name || initialValues.plant_id };
        }
        return {};
    });

    const tenantSearchCacheRef = useRef<Record<string, Option[]>>({});
    const tenantRequestRef = useRef<Record<string, Promise<Option[]>>>({});
    const plantSearchCacheRef = useRef<Record<string, Option[]>>({});
    const plantRequestRef = useRef<Record<string, Promise<Option[]>>>({});
    const componentSearchCacheRef = useRef<Record<string, Option[]>>({});
    const componentRequestRef = useRef<Record<string, Promise<Option[]>>>({});
    const parameterSearchCacheRef = useRef<Record<string, Option[]>>({});
    const parameterRequestRef = useRef<Record<string, Promise<Option[]>>>({});

    const clearRecord = (record: Record<string, unknown>) => {
        Object.keys(record).forEach((key) => delete record[key]);
    };

    const trimCache = (record: Record<string, unknown>) => {
        const keys = Object.keys(record);
        if (keys.length > CACHE_LIMIT) delete record[keys[0]];
    };

    const loadTenantOptions = useCallback(async (search = ""): Promise<Option[]> => {
        const cacheKey = search.trim().toLowerCase();
        const cached = tenantSearchCacheRef.current[cacheKey];
        if (cached) return cached;

        const inFlight = tenantRequestRef.current[cacheKey];
        if (inFlight) return inFlight;

        const request = fetchTenantNames(search, 1, 100)
            .then((options: Option[]) => {
                setTenantLabelCache((prev) => {
                    const next = { ...prev };
                    for (const option of options) next[option.value] = option.label;
                    return next;
                });
                tenantSearchCacheRef.current[cacheKey] = options;
                trimCache(tenantSearchCacheRef.current);
                return options;
            })
            .finally(() => {
                delete tenantRequestRef.current[cacheKey];
            });

        tenantRequestRef.current[cacheKey] = request;
        return request;
    }, []);

    const loadPlantOptions = useCallback(async (search = ""): Promise<Option[]> => {
        if (!selectedTenantId) return [];

        const cacheKey = `${selectedTenantId}::${search.trim().toLowerCase()}`;
        const cached = plantSearchCacheRef.current[cacheKey];
        if (cached) return cached;

        const inFlight = plantRequestRef.current[cacheKey];
        if (inFlight) return inFlight;

        const request = fetchPlantNames(search, 1, 100, selectedTenantId)
            .then((options: Option[]) => {
                setPlantLabelCache((prev) => {
                    const next = { ...prev };
                    for (const option of options) next[option.value] = option.label;
                    return next;
                });
                plantSearchCacheRef.current[cacheKey] = options;
                trimCache(plantSearchCacheRef.current);
                return options;
            })
            .finally(() => {
                delete plantRequestRef.current[cacheKey];
            });

        plantRequestRef.current[cacheKey] = request;
        return request;
    }, [selectedTenantId]);

    const loadComponentOptions = useCallback(async (search = ""): Promise<Option[]> => {
        if (!selectedPlantId) return [];

        const cacheKey = `${selectedPlantId}::${search.trim().toLowerCase()}`;
        const cached = componentSearchCacheRef.current[cacheKey];
        if (cached) return cached;

        const inFlight = componentRequestRef.current[cacheKey];
        if (inFlight) return inFlight;

        const request = fetchComponentNames(search, 1, 50, selectedPlantId)
            .then((options: Option[]) => {
                componentSearchCacheRef.current[cacheKey] = options;
                trimCache(componentSearchCacheRef.current);
                return options;
            })
            .finally(() => {
                delete componentRequestRef.current[cacheKey];
            });

        componentRequestRef.current[cacheKey] = request;
        return request;
    }, [selectedPlantId]);

    const loadParameterOptions = useCallback(async (search = ""): Promise<Option[]> => {
        if (!selectedComponentId) return [];

        const cacheKey = `${selectedComponentId}::${search.trim().toLowerCase()}`;
        const cached = parameterSearchCacheRef.current[cacheKey];
        if (cached) return cached;

        const inFlight = parameterRequestRef.current[cacheKey];
        if (inFlight) return inFlight;

        const request = fetchTagMapKeyOptions([selectedComponentId], search)
            .then((options: Option[]) => {
                parameterSearchCacheRef.current[cacheKey] = options;
                trimCache(parameterSearchCacheRef.current);
                return options;
            })
            .catch(() => [] as Option[])
            .finally(() => {
                delete parameterRequestRef.current[cacheKey];
            });

        parameterRequestRef.current[cacheKey] = request;
        return request;
    }, [selectedComponentId]);

    const loadAvailableParameterOptions = useCallback(
        async (rowIndex: number, search = ""): Promise<Option[]> => {
            const currentValue = parameterRows[rowIndex]?.parameter?.value;
            const selectedInOtherRows = new Set(
                selectedParameterValues.filter((value) => value !== currentValue),
            );
            const options = await loadParameterOptions(search);
            console.log("BEFORE FILTER", options);
            return options
        },
        [loadParameterOptions, parameterRows, selectedParameterValues],
    );

    const loadStatusOptions = useCallback(
        async () => TARGET_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
        [],
    );

    const loadPeriodOptions = useCallback(
        async () => TARGET_PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
        [],
    );

    const hasDuplicateParameter = (value: string, rowIndex: number) =>
        parameterRows.some(
            (row, index) => index !== rowIndex && row.parameter?.value === value,
        );

    const addParameterRow = () => append({ parameter: null, value: "" });

    const resetForm = () => {
        reset(isEdit && initialValues ? buildEditFormValues(initialValues) : DEFAULT_VALUES);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const onSubmit = (data: TargetFormValues) => {
        const finalData: CreateTargetInput = {
            tenant_id: data.tenant_id?.value ?? "",
            plant_id: data.plant_id?.value ?? "",
            target_name: data.target_name.trim(),
            component_id: data.component_id?.value ?? "",
            parameters: mapTargetFormRowsToPayload(data.parameters),
            status: data.status?.value ?? "",
            target_period: data.target_period?.value ?? "",
            start_date: data.start_date || "",
            end_date: data.end_date || "",
        };

        if (isEdit && initialValues?.id) {
            updateMutation.mutate(
                { id: initialValues.id, ...finalData },
                {
                    onSuccess: () => onSuccess?.(),
                    onError: (error) => {
                        applyBackendErrors(error, setError, getValues);
                    },
                },
            );
        } else {
            createMutation.mutate(finalData, {
                onSuccess: () => {
                    reset();
                    onSuccess?.();
                },
                onError: (error) => {
                    applyBackendErrors(error, setError, getValues);
                },
            });
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex h-full flex-col gap-2"
            noValidate
        >
            <div className="space-y-2">
                <div className="space-y-2">
                    <SectionSubHeader icon={Box} title="Basic Information" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Controller
                            name="tenant_id"
                            control={control}
                            rules={{ required: "Tenant is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Tenant"
                                    star
                                    apiSearch
                                    loadOptions={loadTenantOptions}
                                    value={field.value}
                                    onChange={(value) => {
                                        const option = (value as Option | null) ?? null;
                                        if (option?.value !== field.value?.value) {
                                            setValue("plant_id", null);
                                            setValue("component_id", null);
                                            replace([]);
                                            clearRecord(plantSearchCacheRef.current);
                                            clearRecord(componentSearchCacheRef.current);
                                            clearRecord(parameterSearchCacheRef.current);
                                        }
                                        field.onChange(option);
                                    }}
                                    errors={errors.tenant_id}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="plant_id"
                            control={control}
                            rules={{ required: "Plant is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Plant"
                                    star
                                    apiSearch
                                    loadOptions={loadPlantOptions}
                                    placeholder={selectedTenantId ? "Search plant..." : "Select a tenant first"}
                                    isDisabled={!selectedTenantId}
                                    value={
                                        field.value
                                            ? {
                                                value: field.value.value,
                                                label: plantLabelCache[field.value.value] ?? field.value.label,
                                            }
                                            : null
                                    }
                                    onChange={(value) => {
                                        const option = (value as Option | null) ?? null;
                                        if (option?.value !== field.value?.value) {
                                            setValue("component_id", null);
                                            replace([]);
                                            clearRecord(componentSearchCacheRef.current);
                                            clearRecord(parameterSearchCacheRef.current);
                                        }
                                        field.onChange(option);
                                    }}
                                    errors={errors.plant_id}
                                    isClearable
                                />
                            )}
                        />

                        <Input
                            label="Target Name"
                            star
                            {...register("target_name", { required: "Target name is required" })}
                            errors={errors.target_name}
                        />

                        <Controller
                            name="component_id"
                            control={control}
                            rules={{ required: "Component is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Component"
                                    star
                                    apiSearch
                                    loadOptions={loadComponentOptions}
                                    placeholder={selectedPlantId ? "Search component..." : "Select a plant first"}
                                    isDisabled={!selectedPlantId}
                                    value={field.value}
                                    onChange={(value) => {
                                        const option = (value as Option | null) ?? null;
                                        if (option?.value !== field.value?.value) {
                                            replace([]);
                                            clearRecord(parameterSearchCacheRef.current);
                                        }
                                        field.onChange(option);
                                    }}
                                    errors={errors.component_id}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="status"
                            control={control}
                            rules={{ required: "Status is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Status"
                                    star
                                    loadOptions={loadStatusOptions}
                                    value={field.value}
                                    onChange={(value) => field.onChange((value as Option | null) ?? null)}
                                    errors={errors.status}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="target_period"
                            control={control}
                            rules={{ required: "Period is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Period"
                                    star
                                    loadOptions={loadPeriodOptions}
                                    value={field.value}
                                    onChange={(value) => field.onChange((value as Option | null) ?? null)}
                                    errors={errors.target_period}
                                    isClearable
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <SectionSubHeader icon={BarChart2} title="Parameters" />
                    <div className="rounded-xs border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-700/60 dark:bg-neutral-dark-100">
                        <div
                            className="grid items-center gap-2 px-3"
                            style={{ gridTemplateColumns: "1fr 0.75rem 1fr 1.25rem" }}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                Parameter
                            </span>
                            <span />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                Value
                            </span>
                            <span />
                        </div>

                        <div className="mt-2 space-y-1 pr-0.5">
                            {errors.parameters?.root?.message && (
                                <p className="text-xs text-error-500 dark:text-error-400">
                                    {errors.parameters.root.message}
                                </p>
                            )}

                            {fields.length === 0 && (
                                <div className="flex h-12 items-center justify-center rounded-sm border border-dashed border-neutral-200 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                                    No parameters yet - click &quot;Add parameter&quot; below
                                </div>
                            )}

                            {fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="grid items-start gap-2 rounded-xs border border-dashed border-brand-200 bg-neutral-50 px-2 py-1.5 transition-colors dark:border-brand-800/50 dark:bg-neutral-dark-100"
                                    style={{ gridTemplateColumns: "1fr 0.75rem 1fr auto" }}
                                >
                                    <Controller
                                        name={`parameters.${index}.parameter`}
                                        control={control}
                                        rules={{
                                            required: "Parameter is required",
                                            validate: (value) =>
                                                !value?.value ||
                                                !hasDuplicateParameter(value.value, index) ||
                                                "Parameter already selected",
                                        }}
                                        render={({ field: parameterField }) => (
                                            <AsyncSelect
                                                apiSearch
                                                loadOptions={(search) => loadAvailableParameterOptions(index, search)}
                                                placeholder={selectedComponentId ? "Search parameter..." : "Select component first"}
                                                isDisabled={!selectedComponentId}
                                                value={parameterField.value}
                                                onChange={(value) => parameterField.onChange((value as Option | null) ?? null)}
                                                errors={errors.parameters?.[index]?.parameter}
                                                isClearable
                                                menuPlacement="auto"
                                            />
                                        )}
                                    />

                                    <span className="mt-2 flex justify-center text-neutral-700 dark:text-neutral-400">
                                        <ArrowRight className="h-3 w-3" />
                                    </span>

                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder="value"
                                            {...register(`parameters.${index}.value`, {
                                                required: "Value is required",
                                                valueAsNumber: true,
                                                validate: (value) =>
                                                    Number.isFinite(Number(value)) || "Value must be numeric",
                                        })}
                                        errors={errors.parameters?.[index]?.value}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="mt-2 rounded-full p-0.5 text-neutral-700 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-neutral-400 dark:hover:bg-red-900/20"
                                        title="Remove"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addParameterRow}
                            disabled={!selectedComponentId}
                            className="mt-2 flex items-center gap-1.5 rounded-xs border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-400 dark:hover:text-brand-400"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Parameter
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <SectionSubHeader icon={Calendar} title="Dates" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                            type="date"
                            label="Start Date"
                            star
                            {...register("start_date", { required: "Start date is required" })}
                            errors={errors.start_date}
                        />
                        <Input
                            type="date"
                            label="End Date"
                            star
                            {...register("end_date", { required: "End date is required" })}
                            errors={errors.end_date}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={resetForm}
                >
                    Reset
                </Button>

                <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                    {isEdit ? "Update Target" : "Create Target"}
                </Button>
            </div>
        </form>
    );
};

export default TargetForm;
