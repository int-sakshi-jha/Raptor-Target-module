import React, { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Copy, Info, Layers3, X } from "lucide-react";

import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { TagMapBuilder } from "@/components/common/JsonFields";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import Tabs from "@/components/common/Tabs";
import TextArea from "@/components/common/TextArea";
import Toggle from "@/components/common/Toggle";
import { fetchPlantCategoryOptions } from "@/services/operations/plantAPI";
import {
  getTagTemplateCategoryLabel,
  getTagTemplatePlantCategoryLabel,
  normalizeTagTemplatePlantCategory,
  useCreateBulkTagTemplateMutation,
} from "@/services/operations/tagTemplateAPI";
import {
  applySharedValuesToBulkTagTemplateDrafts,
  applyBulkDynamicParameterChangesToAllDrafts,
  applyBulkDynamicParametersFromSourceToAllDrafts,
  applyBulkDynamicSharedFieldToAllDrafts,
  applyBulkTagMapFromSourceToAllDrafts,
  applyBulkTagMapChangesToAllDrafts,
  buildBulkTagTemplatePayload,
  isBulkDynamicPreset,
  buildBulkTagTemplateTagMap,
  getDefaultBulkDynamicParameters,
  type BulkTagTemplateEditScope,
  BULK_TAG_TEMPLATE_PRESET_OPTIONS,
  createBulkTagTemplateDrafts,
  parseBulkVdInput,
  getBulkTagTemplateCategoryFromPreset,
  getDefaultBulkTagTemplateSharedValues,
  summarizeBulkTagTemplateDraft,
  type BulkTagTemplateDraft,
  type BulkTagTemplatePreset,
  type BulkTagTemplateSharedValues,
} from "@/utils/tag-template/bulkTagTemplate";
import {
  type DynamicParameter,
  type DynamicTemplateType,
} from "@/utils/tag-template/dynamicTagTemplate";

type BulkTagTemplateFormProps = {
  onSuccess?: () => void;
};

const loadPresetOptions = async (search = ""): Promise<Option[]> => {
  const query = search.trim().toLowerCase();
  return BULK_TAG_TEMPLATE_PRESET_OPTIONS.filter(
    (option) =>
      !query ||
      option.label.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query),
  ).map((option) => ({
    value: option.value,
    label: option.label,
  }));
};

const DYNAMIC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "dc_channel", label: "DC Channel" },
  { value: "tracker", label: "Tracker" },
  { value: "other", label: "Other" },
];

const loadDynamicTypeOptions = async (search = ""): Promise<Option[]> => {
  const query = search.trim().toLowerCase();
  return DYNAMIC_TYPE_OPTIONS.filter(
    (o) => !query || o.label.toLowerCase().includes(query),
  );
};

const getSharedStartNumberLabel = (
  preset: BulkTagTemplatePreset,
  dynamicType: DynamicTemplateType,
) => {
  if (preset === "meter") return "Starting meter number";
  if (
    (preset === "dynamic" || preset === "dc_channel") &&
    dynamicType === "tracker"
  )
    return "Starting block number";
  if (
    (preset === "dynamic" || preset === "dc_channel") &&
    dynamicType === "other"
  )
    return "Starting sequence number";
  return "Starting inverter number";
};

const getDraftNumberLabel = (draft: BulkTagTemplateDraft) => {
  if (draft.preset === "meter") return "Meter number";
  if (
    (draft.preset === "dynamic" || draft.preset === "dc_channel") &&
    draft.dynamicType === "tracker"
  )
    return "Block number";
  if (
    (draft.preset === "dynamic" || draft.preset === "dc_channel") &&
    draft.dynamicType === "other"
  )
    return "Sequence number";
  return "Inverter number";
};

const getDynamicExternalPlaceholder = (draft: BulkTagTemplateDraft) => {
  if (draft.dynamicType === "tracker") {
    return `B${draft.generatorNumber}ANGT{prefix}`;
  }
  if (draft.dynamicType === "other") {
    return "TAG{prefix}";
  }
  if (normalizeTagTemplatePlantCategory(draft.plant_category) === "pm_kusum") {
    return `IDC{prefix}-I${draft.generatorNumber}`;
  }
  return `I${draft.generatorNumber}-C{prefix}`;
};

const getNewDynamicParameterRow = (
  draft: BulkTagTemplateDraft,
): DynamicParameter => ({
  internal_name: "",
  external_name:
    draft.dynamicType === "dc_channel"
      ? normalizeTagTemplatePlantCategory(draft.plant_category) === "pm_kusum"
        ? `IDC{prefix}-I${draft.generatorNumber}`
        : `I${draft.generatorNumber}X{prefix}`
      : draft.dynamicType === "tracker"
        ? `B${draft.generatorNumber}TAGT{prefix}`
        : "",
  count: draft.dynamicType === "tracker" ? draft.trackerCount : 1,
  soft_tag: false,
});

const BulkTagTemplateForm: React.FC<BulkTagTemplateFormProps> = ({
  onSuccess,
}) => {
  const [sharedValues, setSharedValues] = useState<BulkTagTemplateSharedValues>(
    () => getDefaultBulkTagTemplateSharedValues(),
  );
  const [drafts, setDrafts] = useState<BulkTagTemplateDraft[]>(() =>
    createBulkTagTemplateDrafts(getDefaultBulkTagTemplateSharedValues()),
  );
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [tagEditScope, setTagEditScope] =
    useState<BulkTagTemplateEditScope>("single");
  const [formError, setFormError] = useState<string | null>(null);

  const createBulkMutation = useCreateBulkTagTemplateMutation();
  const isSubmitting = createBulkMutation.isPending;

  const handleSharedChange = useCallback(
    <K extends keyof BulkTagTemplateSharedValues>(
      key: K,
      value: BulkTagTemplateSharedValues[K],
    ) => {
      setFormError(null);
      setSharedValues((prev) => {
        const next = { ...prev, [key]: value };
        setDrafts((currentDrafts) =>
          applySharedValuesToBulkTagTemplateDrafts(currentDrafts, next),
        );
        return next;
      });
    },
    [],
  );

  const updateDraft = useCallback(
    (
      draftId: string,
      updater: (draft: BulkTagTemplateDraft) => BulkTagTemplateDraft,
    ) => {
      setFormError(null);
      setDrafts((prev) =>
        prev.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
      );
    },
    [],
  );

  const updateDraftParameters = useCallback(
    (
      draftId: string,
      updater:
        | DynamicParameter[]
        | ((rows: DynamicParameter[]) => DynamicParameter[]),
    ) => {
      setFormError(null);
      setDrafts((prev) => {
        const sourceDraft = prev.find((draft) => draft.id === draftId);
        if (!sourceDraft) return prev;

        const previousParameters =
          sourceDraft.dynamicParameters ??
          getDefaultBulkDynamicParameters(
            sourceDraft.dynamicType,
            sourceDraft.generatorNumber,
            sourceDraft.trackerCount,
            sourceDraft.plant_category,
          );
        const nextParameters =
          typeof updater === "function"
            ? updater(previousParameters)
            : updater;

        if (tagEditScope === "all") {
          return applyBulkDynamicParameterChangesToAllDrafts(prev, {
            sourceDraftId: draftId,
            previousParameters,
            nextParameters,
          });
        }

        return prev.map((draft) =>
          draft.id === draftId
            ? {
              ...draft,
              dynamicParameters: nextParameters,
              tag_map: undefined,
            }
            : draft,
        );
      });
    },
    [tagEditScope],
  );

  const handleTagMapChange = useCallback(
    (
      draftId: string,
      previousTagMap: Record<string, unknown>,
      nextTagMap: Record<string, unknown>,
    ) => {
      setDrafts((prev) => {
        if (tagEditScope === "all") {
          return applyBulkTagMapChangesToAllDrafts(prev, {
            sourceDraftId: draftId,
            previousTagMap,
            nextTagMap,
          });
        }

        return prev.map((draft) =>
          draft.id === draftId
            ? {
              ...draft,
              tag_map: nextTagMap,
            }
            : draft,
        );
      });
    },
    [tagEditScope],
  );

  const handleApplyCurrentTagMapToAll = useCallback((draftId: string) => {
    setFormError(null);
    setDrafts((prev) => applyBulkTagMapFromSourceToAllDrafts(prev, draftId));
    toast.success("Current tags applied to all templates successfully.");
  }, []);

  const validateDrafts = useCallback(() => {
    if (drafts.length === 0) {
      return "Generate at least one template before creating a bulk batch.";
    }

    for (const draft of drafts) {
      if (!draft.name.trim()) {
        return `Template ${draft.order} is missing a name.`;
      }

      if (
        isBulkDynamicPreset(draft.preset) &&
        parseBulkVdInput(draft.vdInput).length === 0
      ) {
        return `Template ${draft.order} needs at least one valid VD value.`;
      }
    }

    return null;
  }, [drafts]);

  const handleTagEditScopeChange = useCallback(
    (scope: BulkTagTemplateEditScope) => {
      setFormError(null);
      setTagEditScope((currentScope) => {
        if (currentScope === scope) return currentScope;

        if (scope === "all") {
          setDrafts((currentDrafts) => {
            if (currentDrafts.length <= 1) return currentDrafts;
            const sourceDraftId =
              expandedIds.length > 0
                ? expandedIds[0]
                : currentDrafts[0]?.id;

            if (!sourceDraftId) return currentDrafts;

            const sourceDraft = currentDrafts.find(
              (draft) => draft.id === sourceDraftId,
            );
            if (sourceDraft && isBulkDynamicPreset(sourceDraft.preset)) {
              return applyBulkDynamicParametersFromSourceToAllDrafts(
                currentDrafts,
                sourceDraftId,
              );
            }

            return applyBulkTagMapFromSourceToAllDrafts(
              currentDrafts,
              sourceDraftId,
            );
          });
        }

        return scope;
      });
    },
    [expandedIds],
  );

  const handleSubmit = async () => {
    const validationError = validateDrafts();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await createBulkMutation.mutateAsync(buildBulkTagTemplatePayload(drafts));
      setFormError(null);
      setSharedValues(getDefaultBulkTagTemplateSharedValues());
      setDrafts(
        createBulkTagTemplateDrafts(getDefaultBulkTagTemplateSharedValues()),
      );
      setExpandedIds([]);
      setTagEditScope("single");
      onSuccess?.();
    } catch {
      // handled by mutation
    }
  };

  const handleReset = useCallback(() => {
    const defaults = getDefaultBulkTagTemplateSharedValues();
    setFormError(null);
    setSharedValues(defaults);
    setDrafts(createBulkTagTemplateDrafts(defaults));
    setExpandedIds([]);
    setTagEditScope("single");
  }, []);

  const allExpanded = useMemo(() => drafts.length > 0 && expandedIds.length === drafts.length, [drafts.length, expandedIds.length]);

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedIds([]);
    } else {
      setExpandedIds(drafts.map((d) => d.id));
    }
  }, [allExpanded, drafts]);

  const toggleExpandDraft = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  return (
    <div className="flex h-full flex-col gap-2">
      <form
        className="flex h-full flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="space-y-2">
            <SectionSubHeader
              icon={Info}
              title="Basic Information"
            />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input
                label="Number of templates"
                type="number"
                min={1}
                max={50}
                value={sharedValues.count}
                onChange={(e) =>
                  handleSharedChange(
                    "count",
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
              />

              <ControllerRow>
                <AsyncSelect
                  label="Category"
                  loadOptions={loadPresetOptions}
                  value={{
                    value: sharedValues.preset,
                    label:
                      BULK_TAG_TEMPLATE_PRESET_OPTIONS.find(
                        (option) => option.value === sharedValues.preset,
                      )?.label ?? "Inverter",
                  }}
                  onChange={(value) => {
                    const next = (value as Option | null)?.value as
                      | BulkTagTemplatePreset
                      | undefined;
                    if (!next) return;
                    handleSharedChange("preset", next);
                  }}
                  isClearable={false}
                  menuPortalTarget={document.body}
                />
              </ControllerRow>

              <ControllerRow>
                <AsyncSelect
                  label="Plant category"
                  apiSearch
                  loadOptions={fetchPlantCategoryOptions}
                  value={{
                    value: sharedValues.plant_category,
                    label: getTagTemplatePlantCategoryLabel(
                      sharedValues.plant_category,
                    ),
                  }}
                  onChange={(value) => {
                    const next = (value as Option | null)?.value;
                    if (!next) return;
                    handleSharedChange("plant_category", next);
                  }}
                  isClearable={false}
                  menuPortalTarget={document.body}
                />
              </ControllerRow>

              <Input
                label="Name prefix"
                value={sharedValues.namePrefix}
                onChange={(e) =>
                  handleSharedChange("namePrefix", e.target.value)
                }
                placeholder="Name"
              />

              <Input
                label={getSharedStartNumberLabel(
                  sharedValues.preset,
                  sharedValues.dynamicType,
                )}
                type="number"
                min={1}
                value={sharedValues.startNumber}
                onChange={(e) =>
                  handleSharedChange(
                    "startNumber",
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
              />

              {sharedValues.preset === "dynamic" && (
                <ControllerRow>
                  <AsyncSelect
                    label="Dynamic type"
                    loadOptions={loadDynamicTypeOptions}
                    value={
                      DYNAMIC_TYPE_OPTIONS.find(
                        (o) => o.value === sharedValues.dynamicType,
                      ) ?? null
                    }
                    onChange={(val) => {
                      const next = (val as Option | null)?.value as
                        | DynamicTemplateType
                        | undefined;
                      if (next) handleSharedChange("dynamicType", next);
                    }}
                    isClearable={false}
                    menuPortalTarget={document.body}
                  />
                </ControllerRow>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="relative">
              <SectionSubHeader icon={Layers3} title="Template Rows" />
              <div className="absolute right-0 top-0 z-10 flex flex-wrap items-center justify-end gap-2">
                <Tabs
                  size="sm"
                  tabs={[
                    { key: "single", label: "Edit Single Template" },
                    { key: "all", label: "Edit All Templates" },
                  ]}
                  selected={tagEditScope}
                  onChange={(key) =>
                    handleTagEditScopeChange(key as BulkTagTemplateEditScope)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleExpandAll}
                >
                  {allExpanded ? "Collapse All" : "Expand All"}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 bg-white dark:border-neutral-700 dark:bg-neutral-dark-200">
              {drafts.map((draft) => {
                const shouldExpand = expandedIds.includes(draft.id);
                const tagMap = buildBulkTagTemplateTagMap(draft);
                const previewCount = Object.keys(tagMap).length;

                return (
                  <div
                    key={draft.id}
                    className="rounded-xs border border-neutral-200 bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-dark-100"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      onClick={() => toggleExpandDraft(draft.id)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-dark-900">
                          {draft.order}.{" "}
                          {draft.name || `Template ${draft.order}`}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-dark-500">
                          {summarizeBulkTagTemplateDraft(draft)} •{" "}
                          {previewCount} tag keys
                        </p>
                      </div>
                      {shouldExpand ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-neutral-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
                      )}
                    </button>

                    {shouldExpand && (
                      <div className="space-y-3 border-t border-neutral-200 px-4 py-4 dark:border-neutral-700">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <Input
                            label="Template name"
                            value={draft.name}
                            onChange={(e) =>
                              updateDraft(draft.id, (current) => ({
                                ...current,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Template name"
                          />
                          <Input
                            label={getDraftNumberLabel(draft)}
                            type="number"
                            min={1}
                            value={draft.generatorNumber}
                            onChange={(e) =>
                              updateDraft(draft.id, (current) => {
                                const nextGeneratorNumber = Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                );

                                return {
                                  ...current,
                                  generatorNumber: nextGeneratorNumber,
                                  dynamicParameters: isBulkDynamicPreset(
                                    current.preset,
                                  )
                                    ? getDefaultBulkDynamicParameters(
                                      current.dynamicType,
                                      nextGeneratorNumber,
                                      current.trackerCount,
                                      current.plant_category,
                                    )
                                    : current.dynamicParameters,
                                  tag_map: undefined,
                                };
                              })
                            }
                          />
                          <TextArea
                            label="Description"
                            rows={2}
                            value={draft.description}
                            onChange={(e) =>
                              updateDraft(draft.id, (current) => ({
                                ...current,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Optional description"
                            divClassName="lg:col-span-2"
                          />
                          {isBulkDynamicPreset(draft.preset) && (
                            <>
                              {draft.dynamicType === "tracker" && (
                                <Input
                                  label="Tracker count"
                                  type="number"
                                  min={1}
                                  value={draft.trackerCount}
                                  onChange={(e) => {
                                    const nextTrackerCount = Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    );
                                    setFormError(null);
                                    setDrafts((prev) => {
                                      if (tagEditScope === "all") {
                                        return applyBulkDynamicSharedFieldToAllDrafts(
                                          prev,
                                          draft.id,
                                          "trackerCount",
                                          nextTrackerCount,
                                        );
                                      }

                                      return prev.map((current) =>
                                        current.id === draft.id
                                          ? {
                                            ...current,
                                            trackerCount: nextTrackerCount,
                                            dynamicParameters: isBulkDynamicPreset(
                                              current.preset,
                                            )
                                              ? getDefaultBulkDynamicParameters(
                                                current.dynamicType,
                                                current.generatorNumber,
                                                nextTrackerCount,
                                                current.plant_category,
                                              )
                                              : current.dynamicParameters,
                                            tag_map: undefined,
                                          }
                                          : current,
                                      );
                                    });
                                  }}
                                />
                              )}
                              <Input
                                label="VD numbers"
                                value={draft.vdInput}
                                onChange={(e) => {
                                  const nextVdInput = e.target.value;
                                  setFormError(null);
                                  setDrafts((prev) => {
                                    if (tagEditScope === "all") {
                                      return applyBulkDynamicSharedFieldToAllDrafts(
                                        prev,
                                        draft.id,
                                        "vdInput",
                                        nextVdInput,
                                      );
                                    }

                                    return prev.map((current) =>
                                      current.id === draft.id
                                        ? {
                                          ...current,
                                          vdInput: nextVdInput,
                                          tag_map: undefined,
                                        }
                                        : current,
                                    );
                                  });
                                }}
                                placeholder="1,13,14,17,18,23"
                                divClassName={
                                  draft.dynamicType === "tracker"
                                    ? ""
                                    : "lg:col-span-2"
                                }
                              />
                            </>
                          )}
                          <Input
                            label="Version"
                            type="number"
                            min={1}
                            value={draft.version}
                            onChange={(e) =>
                              updateDraft(draft.id, (current) => ({
                                ...current,
                                version: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              }))
                            }
                          />
                          <div className="flex items-end">
                            <Toggle
                              id={`bulk_tag_template_active_${draft.id}`}
                              label="Active"
                              checked={draft.is_active}
                              onChange={(e) =>
                                updateDraft(draft.id, (current) => ({
                                  ...current,
                                  is_active: e.target.checked,
                                }))
                              }
                            />
                          </div>
                        </div>

                        {isBulkDynamicPreset(draft.preset) ? (
                          <div className="rounded-xs border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-dark-200">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-dark-500">
                              <span>
                                Category:{" "}
                                <strong className="text-neutral-700 dark:text-neutral-dark-900">
                                  {getTagTemplateCategoryLabel(
                                    getBulkTagTemplateCategoryFromPreset(
                                      draft.preset,
                                    ),
                                  )}
                                </strong>
                              </span>
                              <span>
                                Plant:{" "}
                                <strong className="text-neutral-700 dark:text-neutral-dark-900">
                                  {getTagTemplatePlantCategoryLabel(
                                    draft.plant_category,
                                  )}
                                </strong>
                              </span>
                            </div>

                            <div className="mt-3 space-y-2">
                              {draft.dynamicType === "other" && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-dark-500">
                                  Add your own custom tags below for the "other"
                                  type.
                                </p>
                              )}
                              <p className="form-sub-heading !mb-0">
                                Parameters
                              </p>

                              <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_72px_48px_32px] gap-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-dark-500">
                                <span>Internal Name</span>
                                <span>External Name</span>
                                <span>Count</span>
                                <span>Soft</span>
                                <span />
                              </div>

                              <div className="space-y-1.5">
                                {(
                                  draft.dynamicParameters ??
                                  getDefaultBulkDynamicParameters(
                                    draft.dynamicType,
                                    draft.generatorNumber,
                                    draft.trackerCount,
                                    draft.plant_category,
                                  )
                                ).map((row, idx) => (
                                  <div
                                    key={`${draft.id}-dynamic-param-${idx}`}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_72px_48px_32px] gap-2 items-center rounded-xs border border-neutral-200 dark:border-neutral-dark-300 bg-neutral-0 dark:bg-neutral-dark-200 p-1"
                                  >
                                    <Input
                                      label="Internal Name"
                                      labelClassName="lg:hidden"
                                      value={row.internal_name}
                                      onChange={(e) =>
                                        updateDraftParameters(
                                          draft.id,
                                          (prev) =>
                                            prev.map((p, i) =>
                                              i === idx
                                                ? {
                                                  ...p,
                                                  internal_name:
                                                    e.target.value,
                                                }
                                                : p,
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
                                        updateDraftParameters(
                                          draft.id,
                                          (prev) =>
                                            prev.map((p, i) =>
                                              i === idx
                                                ? {
                                                  ...p,
                                                  external_name:
                                                    e.target.value,
                                                }
                                                : p,
                                            ),
                                        )
                                      }
                                      placeholder={getDynamicExternalPlaceholder(
                                        draft,
                                      )}
                                    />
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
                                            updateDraftParameters(
                                              draft.id,
                                              (prev) =>
                                                prev.map((p, i) =>
                                                  i === idx
                                                    ? {
                                                      ...p,
                                                      count:
                                                        Number.isFinite(n) &&
                                                          n >= 1
                                                          ? Math.floor(n)
                                                          : p.count,
                                                    }
                                                    : p,
                                                ),
                                            );
                                          }}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900 lg:hidden">
                                          Soft Tag
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={row.soft_tag}
                                            onChange={(e) =>
                                              updateDraftParameters(
                                                draft.id,
                                                (prev) =>
                                                  prev.map((p, i) =>
                                                    i === idx
                                                      ? {
                                                        ...p,
                                                        soft_tag:
                                                          e.target.checked,
                                                      }
                                                      : p,
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
                                          updateDraftParameters(
                                            draft.id,
                                            (prev) =>
                                              prev.filter((_, i) => i !== idx),
                                          )
                                        }
                                        disabled={
                                          (
                                            draft.dynamicParameters ??
                                            getDefaultBulkDynamicParameters(
                                              draft.dynamicType,
                                              draft.generatorNumber,
                                              draft.trackerCount,
                                              draft.plant_category,
                                            )
                                          ).length <= 1
                                        }
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    updateDraftParameters(draft.id, (prev) => [
                                      ...prev,
                                      getNewDynamicParameterRow(draft),
                                    ])
                                  }
                                >
                                  Add parameter
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setFormError(null);
                                    setDrafts((prev) =>
                                      prev.map((current) =>
                                        isBulkDynamicPreset(current.preset) &&
                                        (tagEditScope === "all" ||
                                          current.id === draft.id)
                                          ? {
                                            ...current,
                                            dynamicParameters:
                                              getDefaultBulkDynamicParameters(
                                                current.dynamicType,
                                                current.generatorNumber,
                                                current.trackerCount,
                                                current.plant_category,
                                              ),
                                            tag_map: undefined,
                                          }
                                          : current,
                                      ),
                                    );
                                  }}
                                >
                                  Reset suggestions
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xs border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-dark-200">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-dark-500">
                                <span>
                                  Category:{" "}
                                  <strong className="text-neutral-700 dark:text-neutral-dark-900">
                                    {getTagTemplateCategoryLabel(
                                      getBulkTagTemplateCategoryFromPreset(
                                        draft.preset,
                                      ),
                                    )}
                                  </strong>
                                </span>
                                <span>
                                  Plant:{" "}
                                  <strong className="text-neutral-700 dark:text-neutral-dark-900">
                                    {getTagTemplatePlantCategoryLabel(
                                      draft.plant_category,
                                    )}
                                  </strong>
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() =>
                                  handleApplyCurrentTagMapToAll(draft.id)
                                }
                                disabled={drafts.length <= 1}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Apply Current Tags To All
                              </Button>
                            </div>
                            <div className="mt-3 rounded-xs border border-neutral-100 bg-neutral-50 p-2 dark:border-neutral-700/60 dark:bg-neutral-dark-100">
                              <TagMapBuilder
                                key={`${draft.id}:${draft.generatorNumber}:${draft.vdInput}:${draft.preset}`}
                                staticRows={[]}
                                keyLabel="Key"
                                valueLabel="Value"
                                previewLabel="tag_map"
                                initialConfig={tagMap}
                                onChange={(nextTagMap) =>
                                  handleTagMapChange(
                                    draft.id,
                                    tagMap,
                                    nextTagMap,
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
          {formError && (
            <div className="mb-3 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {formError}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || drafts.length === 0}
            >
              Create {drafts.length} Template{drafts.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ControllerRow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="w-full">{children}</div>;

export default BulkTagTemplateForm;
