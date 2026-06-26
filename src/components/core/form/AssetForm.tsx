/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import FormModeToggle from "@/components/common/FormModeToggle";
import FileUpload from "@/components/common/FileUpload";
import { TagMapBuilder } from "@/components/common/JsonFields";
import { useParams } from "react-router-dom";
import { useGetComponentTypeOptionsQuery } from "@/services/operations/componentAPI";
import {
    ASSET_STATUS_OPTIONS,
    useUpdateAssetStatusMutation,
    useCreateAssetMutation,
    useUpdateAssetMutation,
    useGetAssetTypeOptionsQuery,
    useGetAssetDetailsQuery,
    type CreateAssetInput,
    type AssetRow,
} from "@/services/operations/assetsAPI";
import { Box, Calendar, FileText, Settings, Upload } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetFormMode = "create" | "edit";

type AssetFormValues = {
    plant_id: string,
    category_name: Option | null;
    component_type: Option | null;
    name: string;
    model_number: string;
    serial_number: string;
    manufacturer_name: string;
    specifications: Record<string, string>;
    status: Option | null;
    manufacture_date: string;
    installation_date: string;
    commissioning_date: string;
    purchase_date: string;
    warranty_start_date: string;
    warranty_end_date: string;
    description: string;
    retired_at: string;
    profile_url: string;
    media_files: File[];
};

type AssetFormProps = {
    mode?: AssetFormMode;
    initialValues?: Partial<AssetRow>;
    onSuccess?: () => void;
    close?: () => void;
    scanPrefill?: Partial<AssetRow> | null;
    isOpen?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildOption = (value: string | null | undefined): Option | null =>
    value ? { value, label: value } : null;

function buildEditFormValues(iv: Partial<AssetRow>): AssetFormValues {
    const toSpecEntries = (
        specs: Record<string, any> | null | undefined
    ): Record<string, string> => {
        if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(specs).map(([key, value]) => [
                key,
                String(value ?? ""),
            ])
        );
    };

    return {
        plant_id: iv.plant_id ?? "",
        category_name: buildOption(iv.category_name),
        component_type: buildOption(iv.component_type),
        name: iv.name ?? "",
        model_number: iv.model_number ?? "",
        serial_number: iv.serial_number ?? "",
        manufacturer_name: iv.manufacturer_name ?? "",
        specifications: toSpecEntries(iv.specifications),
        status: buildOption(iv.status),
        manufacture_date: iv.manufacture_date ? String(iv.manufacture_date).slice(0, 10) : "",
        installation_date: iv.installation_date ? String(iv.installation_date).slice(0, 10) : "",
        commissioning_date: iv.commissioning_date ? String(iv.commissioning_date).slice(0, 10) : "",
        purchase_date: iv.purchase_date ? String(iv.purchase_date).slice(0, 10) : "",
        warranty_start_date: iv.warranty_start_date ? String(iv.warranty_start_date).slice(0, 10) : "",
        warranty_end_date: iv.warranty_end_date ? String(iv.warranty_end_date).slice(0, 10) : "",
        description: iv.description ?? "",
        retired_at: iv.retired_at ? String(iv.retired_at).slice(0, 10) : "",
        profile_url: iv.profile_url ?? "",
        media_files: [],
    };
}

const DEFAULT_VALUES: AssetFormValues = {
    plant_id: "",
    category_name: null,
    component_type: null,
    name: "",
    model_number: "",
    serial_number: "",
    manufacturer_name: "",
    specifications: {},
    status: null,
    manufacture_date: "",
    installation_date: "",
    commissioning_date: "",
    purchase_date: "",
    warranty_start_date: "",
    warranty_end_date: "",
    description: "",
    retired_at: "",
    profile_url: "",
    media_files: [],
};

/** Single source of truth for what values the form should show, in every mode. */
function resolveDefaults(
    isEdit: boolean,
    resolvedInitialValues: Partial<AssetRow> | undefined,
    mode: AssetFormMode,
    scanPrefill: Partial<AssetRow> | null | undefined,
): AssetFormValues {
    if (isEdit && resolvedInitialValues) {
        return buildEditFormValues(resolvedInitialValues);
    }
    if (mode === "create" && scanPrefill) {
        return buildEditFormValues({
            ...scanPrefill,
            category_name: scanPrefill.category_name || "Other",
            component_type: scanPrefill.component_type || "Other",
            name: scanPrefill.name || "Other",
            status: scanPrefill.status || "in_stock",
            model_number: scanPrefill.model_number ?? "",
            serial_number: scanPrefill.serial_number ?? "",
            manufacturer_name: scanPrefill.manufacturer_name ?? "",
            specifications: scanPrefill.specifications ?? {},
        });
    }
    return DEFAULT_VALUES;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AssetForm: React.FC<AssetFormProps> = ({
    mode = "create",
    initialValues,
    onSuccess,
    scanPrefill,
}) => {
    const { id: plantId } = useParams<{ id: string }>();
    const isEdit = mode === "edit";
    const [showAdvanced, setShowAdvanced] = useState(isEdit);

    const createMutation = useCreateAssetMutation();
    const updateMutation = useUpdateAssetMutation();
    const updateStatusMutation = useUpdateAssetStatusMutation();
    const { data: assetDetailsResponse } = useGetAssetDetailsQuery(
        isEdit ? initialValues?.id : null
    );

    const detailAsset =
        assetDetailsResponse?.data?.data ??
        assetDetailsResponse?.data ??
        assetDetailsResponse?.asset;
    const resolvedInitialValues = (detailAsset ?? initialValues) as Partial<AssetRow> | undefined;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        control,
        formState: { errors },
    } = useForm<AssetFormValues>({
        defaultValues: resolveDefaults(isEdit, resolvedInitialValues, mode, scanPrefill),
    });

    // ── Options ────────────────────────────────────────────────────────────────

    const { data: assetTypes } = useGetAssetTypeOptionsQuery();

    const loadAssetTypeOptions = useCallback(
        async (): Promise<Option[]> => {
            return assetTypes ?? [];
        },
        [assetTypes]
    );

    const { data } = useGetComponentTypeOptionsQuery();

    const loadComponentTypeOptions = useCallback(
        async (): Promise<Option[]> => {
            return data ?? [];
        },
        [data]
    );

    const loadStatusOptions = useCallback(
        async () => ASSET_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        []
    );

    const toSpecificationRecord = (value: unknown): Record<string, string> => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
                key,
                String(entry ?? ""),
            ]),
        );
    };

    useEffect(() => {
        reset(resolveDefaults(isEdit, resolvedInitialValues, mode, scanPrefill));
        setShowAdvanced(isEdit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedInitialValues, isEdit, scanPrefill, mode, reset]);

    const isSubmitting =
        createMutation.isPending ||
        updateMutation.isPending ||
        updateStatusMutation.isPending;

    // ── Submit (STATIC ONLY) ───────────────────────────────────────────────────
    const onSubmit = async (formData: AssetFormValues) => {
        const finalData: CreateAssetInput = {
            plant_id: plantId ?? "",
            category_name: formData.category_name?.value ?? "",
            component_type: formData.component_type?.value ?? "",
            name: formData.name.trim(),
            model_number: formData.model_number.trim(),
            serial_number: formData.serial_number.trim(),
            manufacturer_name: formData.manufacturer_name.trim(),
            specifications: formData.specifications,
            status: formData.status?.value ?? "in_stock",
            manufacture_date: formData.manufacture_date || "",
            installation_date: formData.installation_date || "",
            commissioning_date: formData.commissioning_date || "",
            purchase_date: formData.purchase_date || "",
            warranty_start_date: formData.warranty_start_date || "",
            warranty_end_date: formData.warranty_end_date || "",
            description: formData.description.trim(),
            retired_at: formData.retired_at || null,
            profile_url: formData.profile_url || "",
            media_files: formData.media_files,
        };

        if (isEdit && initialValues?.id) {
            const assetId = initialValues.id;
            await updateMutation.mutateAsync({ id: assetId, ...finalData });
            await updateStatusMutation.mutateAsync({ id: assetId, status: finalData.status });
        } else {
            await createMutation.mutateAsync(finalData);
        }
        reset();
        onSuccess?.();
    };

    const watchedMediaFiles = watch("media_files");

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex h-full flex-col gap-2"
            noValidate
        >
            <FormModeToggle
                showAdvanced={showAdvanced}
                onToggle={() => setShowAdvanced((prev) => !prev)}
                className="!absolute right-14 top-5 z-10"
            />

            <div className="space-y-2">
                {/* Basic Info */}
                <div className="space-y-2">
                    <SectionSubHeader icon={Box} title="Basic Information" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Controller
                            name="category_name"
                            control={control}
                            rules={{ required: "Category is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Category"
                                    star
                                    apiSearch
                                    loadOptions={loadAssetTypeOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    errors={errors.category_name}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="component_type"
                            control={control}
                            rules={{ required: "Component type is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Component Type"
                                    star
                                    apiSearch
                                    loadOptions={loadComponentTypeOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    errors={errors.component_type}
                                    isClearable
                                />
                            )}
                        />

                        <Input
                            label="Asset Name"
                            star
                            {...register("name", { required: "Asset name is required" })}
                            errors={errors.name}
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
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                />
                            )}
                        />

                        <Input label="Model Number" {...register("model_number")} />
                        <Input 
                        label="Serial Number" 
                        star 
                        {...register("serial_number", { required: "Serial No is required" })}
                        errors={errors.serial_number}
                         />
                        <Input label="Manufacturer" {...register("manufacturer_name")} />
                        <div className="space-y-2 md:col-span-2">
                            <SectionSubHeader icon={Settings} title="Specifications" />
                            <div className="rounded-xs border border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-dark-100 p-3">
                                <TagMapBuilder
                                    key={`asset-specifications-${isEdit ? "edit" : "create"}`}
                                    initialConfig={watch("specifications") || {}}
                                    onChange={(value) =>
                                        setValue("specifications", toSpecificationRecord(value), {
                                            shouldDirty: true,
                                        })
                                    }
                                    previewLabel="specifications"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2"></div>
                    </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                    <SectionSubHeader icon={Calendar} title="Dates" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input type="date" label="Manufacture Date" {...register("manufacture_date")} />
                        <Input type="date" label="Purchase Date" {...register("purchase_date")} />
                        <Input type="date" label="Installation Date" {...register("installation_date")} />
                        <Input type="date" label="Commissioning Date" {...register("commissioning_date")} />
                        <Input type="date" label="Warranty Start Date" {...register("warranty_start_date")} />
                        <Input type="date" label="Warranty End Date" {...register("warranty_end_date")} />
                    </div>
                </div>

                {showAdvanced && (
                    <>
                        <div className="space-y-2">
                            <SectionSubHeader icon={FileText} title="Description" />
                            <textarea
                                {...register("description")}
                                rows={3}
                                className="input resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <SectionSubHeader icon={Upload} title="Media" />
                            <FileUpload
                                multiple
                                value={watchedMediaFiles}
                                onChange={(files) =>
                                    setValue("media_files", files, { shouldDirty: true })
                                }
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-between z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => reset(resolveDefaults(isEdit, resolvedInitialValues, mode, scanPrefill))}
                >
                    Reset
                </Button>

                <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                    {isEdit ? "Update Asset" : "Create Asset"}
                </Button>
            </div>
        </form>
    );
};

export default AssetForm;