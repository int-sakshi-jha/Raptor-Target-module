import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import { useGetAllAssetsQuery, type AssetRow, useReplaceAssetMutation, type ReplaceAssetInput } from "@/services/operations/assetsAPI";
import { applyBackendErrors } from "@/utils/formValidators";
import { Box } from "lucide-react";


// ── Types ─────────────────────────────────────────────────────────────────────

type AssetReplacementFormValues = {
    asset: Option | null;
    remarks: string;
    reason: string;
};

type AssetReplacementFormProps = {
    assetId: string;
    plantId: string;    
    onSuccess?: () => void;
    close?: () => void;
    onOpenCreateAsset?: () => void;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_VALUES: AssetReplacementFormValues = {
    asset: null,
    remarks: "",
    reason: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

const AssetReplacementForm: React.FC<AssetReplacementFormProps> = ({
    assetId,
    plantId,
    onSuccess,
    close,
    onOpenCreateAsset,
}) => {
    const {
        register,
        handleSubmit,
        setError,
        getValues,
        reset,
        control,
        formState: { errors },
    } = useForm<AssetReplacementFormValues>({
        defaultValues: DEFAULT_VALUES,
    });

    // ── Options ────────────────────────────────────────────────────────────────

    const { data: assetResponse } = useGetAllAssetsQuery({
        search: "",
        filters: {},
        page: 1,
        limit: 1000,
        enabled: true,
    });

    const assetOptions =
    (assetResponse?.data?.assets ?? [])
        .filter((asset: AssetRow) => asset.plant_id === plantId && asset.id !== assetId)  // filter by plant + exclude current asset
        .map((asset: AssetRow) => ({
            value: asset.id,
            label: asset.name,
        }));

    const dropdownOptions = [
        ...assetOptions,
        {
            value: "__create_asset__",
            label: "+ Create New Asset",
        },
    ];

    const loadAssetOptions = useCallback(async () => {
        return dropdownOptions;
    }, [dropdownOptions]);

    const replaceAssetMutation = useReplaceAssetMutation();

    // ── Submit ─────────────────────────────────────────────────────────────────

    const onSubmit = (data: AssetReplacementFormValues) => {
        const payload: ReplaceAssetInput = {
            asset_id: assetId,
            new_asset_id: data.asset?.value ?? "",
            remarks: data.remarks,
            reason: data.reason,
        };

        replaceAssetMutation.mutate(payload, {
            onSuccess: () => {
                reset();
                onSuccess?.();
                close?.(); 
            },
            onError: (error) => {
                applyBackendErrors(error, setError, getValues);
            },
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex h-full flex-col gap-2"
            noValidate
        >
            <div className="space-y-2">
                <div className="space-y-2">
                    <SectionSubHeader icon={Box} title="Replacement Details" />
                    <div className="grid grid-cols-1 gap-2">
                        <Controller
                            name="asset"
                            control={control}
                            rules={{ required: "Asset is required" }}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Asset"
                                    star
                                    apiSearch
                                    loadOptions={loadAssetOptions}
                                    value={field.value}
                                    onChange={(v) => {
                                        if (Array.isArray(v)) return;

                                        if ((v as Option)?.value === "__create_asset__") {
                                            onOpenCreateAsset?.();

                                            return;
                                        }

                                        field.onChange(v ?? null);
                                    }}
                                    errors={errors.asset}
                                    isClearable
                                />
                            )}
                        />

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                                Remarks
                            </label>
                            <textarea
                                {...register("remarks")}
                                rows={3}
                                className="input resize-none"
                                placeholder="Enter remarks..."
                            />
                            {errors.remarks && (
                                <span className="text-xs text-error-500">{errors.remarks.message}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                                Reason
                            </label>
                            <textarea
                                {...register("reason")}
                                rows={3}
                                className="input resize-none"
                                placeholder="Enter reason..."
                            />
                            {errors.reason && (
                                <span className="text-xs text-error-500">{errors.reason.message}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                <Button type="submit">
                    Replace
                </Button>
            </div>
        </form>
    );
};

export default AssetReplacementForm;