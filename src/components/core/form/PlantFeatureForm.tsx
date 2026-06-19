import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import { Settings } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import {
  useCreatePlantFeatureMutation,
  useUpdatePlantFeatureMutation,
  useGetPlantFeatureDetailsQuery,
  pickPlantFeatureDetail,
  fetchPlantFeatureOptions,
  type CreatePlantFeatureInput,
  type PlantFeature,
} from "@/services/operations/plantFeaturesAPI";
import { useGetPlantCategoryOptionsQuery } from "@/services/operations/plantAPI";
import { applyBackendErrors } from "@/utils/formValidators";

const formPlantCategories = (raw: string[] | null | undefined): string[] =>
  Array.isArray(raw)
    ? raw.filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];

type PlantFeatureFormValues = {
  name: string;
  display_name: string;
  module: string;
  price: number | null;
  plant_category: string[];
  parent_feature_id: string;
  is_active: boolean;
  is_default: boolean;
};

type PlantFeatureFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<PlantFeature>;
  /** Full row from GET `/plant-feature/:id` when editing */
  editValues?: PlantFeature | null;
  onSuccess?: () => void;
};

const PlantFeatureForm: React.FC<PlantFeatureFormProps> = ({
  mode = "create",
  initialValues,
  editValues,
  onSuccess,
}) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const editingId = initialValues?.id;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<PlantFeatureFormValues>({

    defaultValues: {
      name: initialValues?.name ?? "",
      display_name: initialValues?.display_name ?? "",
      module: initialValues?.module ?? "",
      price:
        initialValues?.price !== undefined && initialValues?.price !== null
          ? Number(initialValues.price)
          : null,
      plant_category: formPlantCategories(initialValues?.plant_category),
      parent_feature_id: initialValues?.parent_feature_id ?? "",
      is_active: initialValues?.is_active ?? true,
      is_default: initialValues?.is_default ?? false,
    },
  });

  const prevEditRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isEdit || !editValues?.id) return;
    const key = `${editValues.id}:${editValues.updated_at ?? ""}`;
    if (prevEditRef.current === key) return;
    prevEditRef.current = key;
    reset({
      name: editValues.name ?? "",
      display_name: editValues.display_name ?? "",
      module: editValues.module ?? "",
      price:
        editValues.price !== undefined && editValues.price !== null
          ? Number(editValues.price)
          : null, plant_category: formPlantCategories(editValues.plant_category),
      parent_feature_id: editValues.parent_feature_id ?? "",
      is_active: editValues.is_active ?? true,
      is_default: editValues.is_default ?? false,
    });
  }, [editValues, isEdit, reset]);

  const watchedParentId = useWatch({ control, name: "parent_feature_id", defaultValue: "" });

  const createMutation = useCreatePlantFeatureMutation();
  const updateMutation = useUpdatePlantFeatureMutation();
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const parentIdTrim =
    typeof watchedParentId === "string" ? watchedParentId.trim() : "";
  const excludeSelfId = isEdit && editingId ? editingId : undefined;
  const parentLabelQueryId =
    parentIdTrim && parentIdTrim !== excludeSelfId ? parentIdTrim : null;

  const { data: parentDetailResponse } = useGetPlantFeatureDetailsQuery(parentLabelQueryId, {
    enabled: !!parentLabelQueryId,
    staleTime: 60_000,
  });

  const parentSelectLabel = useMemo(() => {
    const row = pickPlantFeatureDetail(parentDetailResponse);
    if (!row) return parentIdTrim || "";
    if (row.display_name && row.name) return `${row.display_name} (${row.name})`;
    return row.display_name || row.name || parentIdTrim || "";
  }, [parentDetailResponse, parentIdTrim]);

  const loadParentFeatureOptions = useCallback(
    async (search = "") => {
      const opts = await fetchPlantFeatureOptions(search, 1, 100);
      if (!excludeSelfId) return opts;
      return opts.filter((o) => o.value !== excludeSelfId);
    },
    [excludeSelfId],
  );

  const { data: apiCategoriesResponse, isLoading: loadingCategories } = useGetPlantCategoryOptionsQuery();
  const initialPlantCategory = initialValues?.plant_category;
  const editPlantCategory = editValues?.plant_category;

  const displayOptions = useMemo(() => {
    const apiCategories = apiCategoriesResponse ?? [];
    if (apiCategories.length > 0) return apiCategories;
    const current = Array.isArray(initialPlantCategory)
      ? initialPlantCategory
      : Array.isArray(editPlantCategory)
        ? editPlantCategory
        : [];
    return current.map((v) => ({ value: v, label: v }));
  }, [apiCategoriesResponse, initialPlantCategory, editPlantCategory]);

  const selectedPlantCategories = useWatch({ control, name: "plant_category", defaultValue: [] as string[] }) ?? [];

  const handleToggleType = (field: any, val: string, checked: boolean) => {
    const next = checked
      ? [...field.value, val]
      : field.value.filter((v: string) => v !== val);
    field.onChange(next);
  };

  const onSubmit = (data: PlantFeatureFormValues) => {
    const payload: CreatePlantFeatureInput = {
      name: data.name.trim(),
      display_name: data.display_name.trim(),
      module: data.module.trim() || null,
      price: data.price,
      plant_category: formPlantCategories(data.plant_category),
      parent_feature_id:
        data.parent_feature_id && data.parent_feature_id.trim() !== ""
          ? data.parent_feature_id.trim()
          : null,
      is_active: data.is_active,
      is_default: data.is_default,
    };

    if (isEdit && editingId) {
      updateMutation.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => onSuccess?.(),
          onError: (error) => applyBackendErrors(error, setError, getValues),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    }
  };

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

        <div className="space-y-2">
          <div className="space-y-2">
            <SectionSubHeader icon={navIcons.plantFeature} title="Feature details" />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input
                label="Name"
                star
                {...register("name", { required: "Name is required" })}
                errors={errors.name}
                placeholder="Plant feature name"
              />
              <Input
                label="Display name"
                star
                {...register("display_name", { required: "Display name is required" })}
                errors={errors.display_name}
                placeholder="Display name"
              />
              <Input
                label="Module"
                star
                {...register("module", { required: "Module is required" })}
                errors={errors.module}
                placeholder="Module name"
              />
              {showAdvanced && (<>
                <Input
                  label="Price"
                  type="number"
                  step="any"
                  min={0}
                  {...register("price", {
                    setValueAs: (v) => {
                      if (!v || !String(v).trim()) return null;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : null;
                    },
                    validate: (v) => {
                      if (v === null) return true;
                      return v >= 0 ? true : "Enter a valid non-negative number";
                    },
                  })}
                  errors={errors.price}
                  placeholder="Price"
                />
              </>)}
            </div>

            {showAdvanced && (
              <div>
                <Controller
                  name="parent_feature_id"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Parent feature"
                      name="parent_feature_id"
                      apiSearch
                      loadOptions={loadParentFeatureOptions}
                      placeholder="Search parent feature (optional)…"
                      value={
                        field.value && String(field.value).trim()
                          ? {
                            value: String(field.value).trim(),
                            label: parentSelectLabel || String(field.value).trim(),
                          }
                          : null
                      }
                      onChange={(v) => {
                        const opt = v as Option | null;
                        field.onChange(opt?.value ?? "");
                      }}
                      errors={errors.parent_feature_id}
                      isClearable
                    />
                  )}
                />
              </div>)}
          </div>

          <div className="space-y-2">
            <SectionSubHeader icon={navIcons.plantFeature} title="Plant categories" />
            <div>
              <Controller
                name="plant_category"
                control={control}
                rules={{
                  validate: (v) => (Array.isArray(v) && v.length > 0) || "Select at least one plant category",
                }}
                render={({ field }) => (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {displayOptions.length === 0 && !loadingCategories && (
                        <p className="text-xs text-neutral-500 italic py-2">Click to load available plant categories…</p>
                      )}
                      {displayOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-xs border p-2 cursor-pointer transition-colors ${selectedPlantCategories.includes(opt.value)
                              ? "border-brand-600 bg-brand-50 dark:bg-brand-600/10"
                              : "border-neutral-200 dark:border-neutral-dark-300 hover:border-brand-300 dark:hover:border-brand-700"
                            }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selectedPlantCategories.includes(opt.value)}
                            onChange={(e) => handleToggleType(field, opt.value, e.target.checked)}
                          />
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-dark-700">
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.plant_category?.message != null && (
                      <p className="mt-1 text-xs text-error-500">
                        {String(errors.plant_category.message)}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          {showAdvanced && (
            <div className="space-y-2">
              <SectionSubHeader icon={Settings} title="Settings" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Toggle
                  id="plant-feature-is-active"
                  label="Active"
                  {...register("is_active")}
                />
                <Toggle
                  id="plant-feature-is-default"
                  label="Default feature"
                  {...register("is_default")}
                />
              </div>
            </div>)}
        </div>
      </div>

      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit && editValues) {
                reset({
                  name: editValues.name ?? "",
                  display_name: editValues.display_name ?? "",
                  module: editValues.module ?? "",
                  price:
                    editValues.price !== undefined && editValues.price !== null
                      ? Number(editValues.price)
                      : null,
                  plant_category: formPlantCategories(editValues.plant_category),
                  parent_feature_id: editValues.parent_feature_id ?? "",
                  is_active: editValues.is_active ?? true,
                  is_default: editValues.is_default ?? false,
                });
              } else {
                reset();
              }
            }}
          >
            Reset
          </Button>

          <Button type="submit" variant="primary" disabled={isLoading} loading={isLoading}>
            {isEdit ? "Update plant feature" : "Create plant feature"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PlantFeatureForm;
