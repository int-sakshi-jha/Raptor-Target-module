import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { type MultiValue } from "react-select";
import { Blocks, Info, Network, Tags } from "lucide-react";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import { fetchPlantNames } from "@/services/operations/plantAPI";
import { fetchComponentNames } from "@/services/operations/componentAPI";
import { fetchTagMapKeyOptions } from "@/services/operations/historyAPI";
import {
  useCreateTagGroupMutation,
  useUpdateTagGroupMutation,
  type CreateTagGroupInput,
  type TagGroupConfigItem,
  type TagGroupRow,
} from "@/services/operations/tagGroupAPI";
import { applyBackendErrors } from "@/utils/formValidators";

// ── Types ─────────────────────────────────────────────────────────────────────

type TagGroupFormValues = {
  plant_id: string;
  name: string;
  category: string;
  is_active: boolean;
  tag_config: TagGroupConfigItem[];
};

type TagGroupFormMode = "create" | "edit";

type TagGroupFormProps = {
  mode?: TagGroupFormMode;
  initialValues?: Partial<TagGroupRow>;
  editValues?: TagGroupRow | null;
  onSuccess?: () => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SELECT_ALL_TAGS_OPTION: Option = {
  value: "__all_tags__",
  label: "Select all tags",
};

const SELECT_ALL_COMPONENTS_OPTION: Option = {
  value: "__all_components__",
  label: "Select all components",
};

const COMPONENT_SEARCH_CACHE_LIMIT = 12;

const TEMPLATE_TAG_SELECT_PROPS: {
  closeMenuOnSelect: boolean;
  blurInputOnSelect: boolean;
  hideSelectedOptions: boolean;
  menuPosition: "absolute";
  menuShouldScrollIntoView: boolean;
} = {
  closeMenuOnSelect: false,
  blurInputOnSelect: false,
  hideSelectedOptions: false,
  menuPosition: "absolute",
  menuShouldScrollIntoView: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTagIds(tagIds: string[] | undefined) {
  return [...new Set((tagIds ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

function buildComponentSearchCacheKey(plantId: string, search = "") {
  return `${plantId}::${search.trim().toLowerCase()}`;
}

type ComponentOptionMeta = {
  id: string;
  component_name: string;
};

function mergeComponentOptions(
  previous: Record<string, ComponentOptionMeta>,
  options: Option[],
) {
  const next = { ...previous };
  for (const option of options) {
    next[option.value] = {
      id: option.value,
      component_name: option.label,
    };
  }
  return next;
}

function toFormDefaults(values?: Partial<TagGroupRow> | null): TagGroupFormValues {
  const list = Array.isArray(values?.tag_config) ? values.tag_config : [];
  return {
    plant_id: values?.plant_id ?? "",
    name: values?.name ?? "",
    category: values?.category ?? "",
    is_active: values?.is_active ?? true,
    tag_config: list.map((item) => ({
      component_id: item.component_id,
      tag_ids: normalizeTagIds(item.tag_ids),
    })),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const TagGroupForm = ({
  mode = "create",
  initialValues,
  editValues,
  onSuccess,
}: TagGroupFormProps) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const editingId = initialValues?.id;

  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<TagGroupFormValues>({

    defaultValues: toFormDefaults(initialValues),
  });

  const prevEditRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isEdit || !editValues?.id) return;
    const key = `${editValues.id}:${editValues.updated_at ?? ""}`;
    if (prevEditRef.current === key) return;
    prevEditRef.current = key;
    reset(toFormDefaults(editValues));
    setComponentCache((prev) => {
      const next = { ...prev };
      for (const item of editValues.tag_config ?? []) {
        if (!item.component_id) continue;
        next[item.component_id] = {
          id: item.component_id,
          component_name: item.component_name ?? item.component_id,
        };
      }
      return next;
    });
  }, [editValues, isEdit, reset]);

  const selectedPlantId = useWatch({ control, name: "plant_id", defaultValue: "" });
  const configItemsValue = useWatch({
    control,
    name: "tag_config",
    defaultValue: [] as TagGroupConfigItem[],
  });
  const configItems = useMemo(
    () => configItemsValue ?? [],
    [configItemsValue],
  );

  const [plantLabelCache, setPlantLabelCache] = useState<Record<string, string>>(() => {
    if (initialValues?.plant_id && initialValues?.plant_name) {
      return { [initialValues.plant_id]: initialValues.plant_name };
    }
    return {};
  });
  const [componentCache, setComponentCache] = useState<Record<string, ComponentOptionMeta>>({});
  const [componentTagOptionsCache, setComponentTagOptionsCache] = useState<Record<string, Option[]>>({});
  const componentSearchCacheRef = useRef<Record<string, Option[]>>({});
  const componentRequestRef = useRef<Record<string, Promise<Option[]>>>({});
  const componentTagRequestRef = useRef<Record<string, Promise<Option[]>>>({});

  const selectedPlantLabel = useMemo(() => {
    if (!selectedPlantId) return "";
    return plantLabelCache[selectedPlantId] ?? selectedPlantId;
  }, [plantLabelCache, selectedPlantId]);

  const createMutation = useCreateTagGroupMutation();
  const updateMutation = useUpdateTagGroupMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const loadPlantOptions = useCallback(async (search = "") => {
    const options = await fetchPlantNames(search, 1, 100);
    setPlantLabelCache((prev) => {
      const next = { ...prev };
      for (const option of options) next[option.value] = option.label;
      return next;
    });
    return options;
  }, []);

  const componentById = componentCache;

  const ensureComponentOptions = useCallback(
    async (plantId: string, search = "") => {
      const cacheKey = buildComponentSearchCacheKey(plantId, search);
      const cachedOptions = componentSearchCacheRef.current[cacheKey];
      if (cachedOptions) return cachedOptions;

      const inFlight = componentRequestRef.current[cacheKey];
      if (inFlight) return inFlight;

      const request = fetchComponentNames(search, 1, 100, plantId)
        .then((componentOptions) => {
          setComponentCache((prev) => mergeComponentOptions(prev, componentOptions));
          const nextOptions = componentOptions.length === 0
            ? componentOptions
            : [SELECT_ALL_COMPONENTS_OPTION, ...componentOptions];
          componentSearchCacheRef.current[cacheKey] = nextOptions;

          const keys = Object.keys(componentSearchCacheRef.current);
          if (keys.length > COMPONENT_SEARCH_CACHE_LIMIT) {
            delete componentSearchCacheRef.current[keys[0]];
          }

          return nextOptions;
        })
        .finally(() => {
          delete componentRequestRef.current[cacheKey];
        });

      componentRequestRef.current[cacheKey] = request;
      return request;
    },
    [],
  );

  const ensureComponentTagOptions = useCallback(async (componentId: string) => {
    const cachedOptions = componentTagOptionsCache[componentId];
    if (cachedOptions) return cachedOptions;

    const inFlight = componentTagRequestRef.current[componentId];
    if (inFlight) return inFlight;

    const request = fetchTagMapKeyOptions([componentId])
      .then((options) => {
        setComponentTagOptionsCache((prev) => {
          if (prev[componentId]) return prev;
          return {
            ...prev,
            [componentId]: options,
          };
        });
        return options;
      })
      .finally(() => {
        delete componentTagRequestRef.current[componentId];
      });

    componentTagRequestRef.current[componentId] = request;
    return request;
  }, [componentTagOptionsCache]);

  const loadComponentOptions = useCallback(
    async (search = "") => {
      if (!selectedPlantId) return [];
      return ensureComponentOptions(selectedPlantId, search);
    },
    [ensureComponentOptions, selectedPlantId],
  );

  const loadComponentTagOptions = useCallback(
    async (componentId: string) => {
      const options = await ensureComponentTagOptions(componentId);
      return options.length === 0
        ? options
        : [SELECT_ALL_TAGS_OPTION, ...options];
    },
    [ensureComponentTagOptions],
  );

  useEffect(() => {
    if (!selectedPlantId) return;
    let cancelled = false;

    void ensureComponentOptions(selectedPlantId, "")
      .then(() => {
        if (cancelled) return;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [ensureComponentOptions, selectedPlantId]);

  const selectedComponentOptions = useMemo(
    () =>
      configItems
        .map((item) => {
          const row = componentById[item.component_id];
          if (row) {
            return {
              value: row.id,
              label: row.component_name,
            };
          }
          if (item.component_id) {
            return {
              value: item.component_id,
              label: item.component_name ?? item.component_id,
            };
          }
          return null;
        })
        .filter((item): item is Option => item !== null),
    [componentById, configItems],
  );

  const selectedComponentIds = useMemo(
    () =>
      [...new Set(
        configItems
          .map((item) => item.component_id)
          .filter((id): id is string => Boolean(id)),
      )],
    [configItems],
  );

  useEffect(() => {
    if (selectedComponentIds.length === 0) return;

    void Promise.all(
      selectedComponentIds.map((componentId) => ensureComponentTagOptions(componentId)),
    ).catch(() => undefined);
  }, [ensureComponentTagOptions, selectedComponentIds]);

  const tagOptionsByComponent = useMemo(
    () =>
      configItems.reduce<Record<string, Option[]>>((acc, item) => {
        acc[item.component_id] = componentTagOptionsCache[item.component_id] ?? [];
        return acc;
      }, {}),
    [componentTagOptionsCache, configItems],
  );

  useEffect(() => {
    if (configItems.length === 0) return;

    const sanitized = configItems.map((item) => {
      const componentId = item.component_id;
      const selected = normalizeTagIds(item.tag_ids);
      const allowed = new Set(
        (tagOptionsByComponent[componentId] ?? []).map((option) => option.value),
      );
      if (allowed.size === 0) return item;

      const filtered = selected.filter((tagId) => allowed.has(tagId));
      if (filtered.length === selected.length) return item;
      return { ...item, tag_ids: filtered };
    });

    const changed = sanitized.some((item, index) => {
      const before = normalizeTagIds(configItems[index]?.tag_ids);
      const after = normalizeTagIds(item.tag_ids);
      if (before.length !== after.length) return true;
      return before.some((tag, tagIndex) => tag !== after[tagIndex]);
    });

    if (!changed) return;
    setValue("tag_config", sanitized, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [configItems, setValue, tagOptionsByComponent]);

  const handleComponentsChange = useCallback(
    async (value: Option[] | null) => {
      const hasSelectAll = (value ?? []).some(
        (option) => option.value === SELECT_ALL_COMPONENTS_OPTION.value,
      );
      if (hasSelectAll && selectedPlantId) {
        const allOptions = (await ensureComponentOptions(selectedPlantId, ""))
          .filter((option) => option.value !== SELECT_ALL_COMPONENTS_OPTION.value);
        const allIds = allOptions.map((option) => option.value);
        const existingById = new Map(
          configItems.map((item) => [item.component_id, { ...item, tag_ids: normalizeTagIds(item.tag_ids) }]),
        );
        const nextItems = allIds.map((componentId) => {
          const existing = existingById.get(componentId);
          return existing ?? { component_id: componentId, tag_ids: [] };
        });
        setValue("tag_config", nextItems, {
          shouldDirty: true,
          shouldValidate: true,
        });
        return;
      }

      const nextIds = (value ?? []).map((option) => option.value);
      const existingById = new Map(
        configItems.map((item) => [item.component_id, { ...item, tag_ids: normalizeTagIds(item.tag_ids) }]),
      );
      const nextItems = nextIds.map((componentId) => {
        const existing = existingById.get(componentId);
        return existing ?? { component_id: componentId, tag_ids: [] };
      });
      setValue("tag_config", nextItems, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [configItems, ensureComponentOptions, selectedPlantId, setValue],
  );

  const componentSections = useMemo(
    () =>
      configItems.map((item, index) => {
        const component = componentById[item.component_id];
        const componentTagOptions = tagOptionsByComponent[item.component_id] ?? [];
        const selectedTagOptions = normalizeTagIds(item.tag_ids).map((tagId) => {
          const existing = componentTagOptions.find((option) => option.value === tagId);
          return existing ?? { value: tagId, label: tagId };
        });

        return {
          item,
          index,
          component,
          componentTagOptions,
          selectedTagOptions,
          hasTagOptions: componentTagOptions.length > 0,
        };
      }),
    [componentById, configItems, tagOptionsByComponent],
  );

  const updateComponentTags = useCallback(
    (componentId: string, selectedOptions: readonly Option[] | null) => {
      const nextTagIds = [...new Set((selectedOptions ?? []).map((option) => option.value))];
      const next = configItems.map((item) =>
        item.component_id === componentId ? { ...item, tag_ids: nextTagIds } : item,
      );
      setValue("tag_config", next, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [configItems, setValue],
  );

  const previewConfig = useMemo(
    () => configItems.map((item) => ({
      component_id: item.component_id,
      tag_ids: normalizeTagIds(item.tag_ids),
    })),
    [configItems],
  );

  const onSubmit = (values: TagGroupFormValues) => {
    const normalizedConfig = values.tag_config.map((item) => {
      const componentId = item.component_id.trim();
      const selectedTagIds = normalizeTagIds(item.tag_ids);
      const allowedTags = new Set(
        (tagOptionsByComponent[componentId] ?? []).map((option) => option.value),
      );
      const hasTemplate = (tagOptionsByComponent[componentId] ?? []).length > 0;
      const tagIds =
        hasTemplate && allowedTags.size > 0
          ? selectedTagIds.filter((tagId) => allowedTags.has(tagId))
          : selectedTagIds;

      return {
        component_id: componentId,
        tag_ids: tagIds,
      };
    });

    const duplicateComponentIds = new Set<string>();
    for (const item of normalizedConfig) {
      if (duplicateComponentIds.has(item.component_id)) {
        return;
      }
      duplicateComponentIds.add(item.component_id);
    }

    const payload: CreateTagGroupInput = {
      plant_id: values.plant_id.trim(),
      name: values.name.trim(),
      category: values.category.trim(),
      tag_config: normalizedConfig,
      is_active: values.is_active,
    };

    if (isEdit && editingId) {
      updateMutation.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => onSuccess?.(),
          onError: (error) => applyBackendErrors(error, setError, getValues),
        },
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => { reset(); onSuccess?.(); },
      onError: (error) => applyBackendErrors(error, setError, getValues),
    });
  };

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              name="plant_id"
              control={control}
              rules={{ required: "Plant is required" }}
              render={({ field }) => (
                <AsyncSelect
                  label="Plant"
                  star
                  name="plant_id"
                  apiSearch
                  loadOptions={loadPlantOptions}
                  placeholder="Search plant..."
                  value={
                    field.value
                      ? {
                        value: field.value,
                        label:
                          field.value === selectedPlantId
                            ? selectedPlantLabel
                            : plantLabelCache[field.value] ?? field.value,
                      }
                      : null
                  }
                  onChange={(value) => {
                    const option = value as Option | null;
                    const nextPlantId = option?.value ?? "";
                    if (nextPlantId !== field.value) {
                      setValue("tag_config", [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setComponentCache({});
                      setComponentTagOptionsCache({});
                    }
                    field.onChange(nextPlantId);
                  }}
                  errors={errors.plant_id}
                />
              )}
            />

            <Input
              label="Category"
              star
              {...register("category", { required: "Category is required" })}
              errors={errors.category}
              placeholder="Category"
            />

            <Input
              label="Tag group name"
              star
              {...register("name", { required: "Tag group name is required" })}
              errors={errors.name}
              placeholder="Tag group name"
            />

            {showAdvanced && (
              <Toggle
                className="sm:mt-6"
                label=" Active group Enabled"
                {...register("is_active")}
              />)}
          </div>
        </section>

        <section className="space-y-2">
          <SectionSubHeader
            icon={Network}
            title="Plant Filter Configuration"
          />

          <Controller
            name="tag_config"
            control={control}
            render={() => (
              <AsyncSelect
                key={`filter-group-components-${selectedPlantId || "none"}`}
                label="Components"
                star
                isMulti
                name="tag_config"
                apiSearch
                loadOptions={loadComponentOptions}
                placeholder={
                  selectedPlantId
                    ? "Search and select components..."
                    : "Select a plant first"
                }
                isDisabled={!selectedPlantId}
                value={selectedComponentOptions}
                closeMenuOnSelect={false}
                onChange={(value) => {
                  void handleComponentsChange(value as Option[] | null);
                }}
              />
            )}
          />

          {!selectedPlantId ? (
            <div className="rounded-xs border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/20 dark:text-neutral-dark-500">
              Choose a plant to load component options.
            </div>
          ) : configItems.length === 0 ? (
            <div className="rounded-xs border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/20 dark:text-neutral-dark-500">
              Select one or more components to configure their tags.
            </div>
          ) : (
            <div className="space-y-2">
              {componentSections.map((section) => (
                <div
                  key={`${section.index}-${section.item.component_id || "new"}`}
                  className="rounded-xs border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/25"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-dark-900">
                        <Blocks className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        {section.component?.component_name
                          ?? section.item.component_name
                          ?? `Component ${section.index + 1}`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xs border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-200 dark:text-neutral-dark-900">
                      <div className="flex items-center gap-2 font-medium">
                        <Network className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        {section.component?.component_name
                          ?? section.item.component_name
                          ?? section.item.component_id}
                      </div>
                    </div>

                    <div>
                      <Controller
                        name={`tag_config.${section.index}.tag_ids`}
                        control={control}
                        render={() => (
                          <div className="flex flex-col gap-1">
                            <label className="font-medium text-neutral-700 dark:text-neutral-200">
                              Template tags
                              <sup className="ml-1 text-error-500 dark:text-error-400">*</sup>
                            </label>
                            <AsyncSelect
                              $id={`tag_config_${section.index}_tag_ids`}
                              label=""
                              isMulti
                              name={`tag_config.${section.index}.tag_ids`}
                              loadOptions={() =>
                                section.item.component_id
                                  ? loadComponentTagOptions(section.item.component_id)
                                  : Promise.resolve([])
                              }
                              placeholder={
                                section.hasTagOptions
                                  ? "Select template tags..."
                                  : "This component has no tag template"
                              }
                              isDisabled={!section.hasTagOptions}
                              value={section.selectedTagOptions}
                              {...TEMPLATE_TAG_SELECT_PROPS}
                              onChange={(value) => {
                                const selected = (value as MultiValue<Option>) ?? [];
                                const hasSelectAll = selected.some(
                                  (option) => option.value === SELECT_ALL_TAGS_OPTION.value,
                                );
                                if (hasSelectAll) {
                                  updateComponentTags(
                                    section.item.component_id,
                                    section.componentTagOptions,
                                  );
                                  return;
                                }
                                updateComponentTags(section.item.component_id, selected);
                              }}
                            />
                          </div>
                        )}
                      />
                      <p className="mt-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-dark-500">
                        <Tags className="h-3.5 w-3.5" />
                        {section.hasTagOptions
                          ? `${section.componentTagOptions.length} tag option${section.componentTagOptions.length === 1 ? "" : "s"} available from the linked template.`
                          : "Add a tag template to this component first to choose tags here."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showAdvanced && (
          <section className="space-y-2">
            <SectionSubHeader
              icon={Tags}
              title="JSON Preview"
            />
            <div className="rounded-xs border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/25">
              <pre className="max-h-56 overflow-auto rounded-xs bg-neutral-900 px-3 py-2 text-xs text-neutral-100">
                {JSON.stringify(previewConfig, null, 2)}
              </pre>
            </div>
          </section>)}
      </div>

      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 pb-2.5 pt-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit && editValues) {
                reset(toFormDefaults(editValues));
              } else {
                reset(toFormDefaults(initialValues));
              }
            }}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEdit ? "Update tag group" : "Create tag group"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TagGroupForm;
