import {
    generateCaptiveInverterConfig,
} from "@/utils/tag-template/captiveInverterTagTemplate";
import { generateCaptiveMeterConfig } from "@/utils/tag-template/captivemeterTagTemplate";
import {
    defaultDcChannelSuggestions,
    defaultKusumDcChannelSuggestions,
    defaultOtherSuggestions,
    defaultTrackerSuggestions,
    type DynamicParameter,
    generateDynamicDcChannelConfig,
    generateDynamicOtherConfig,
    generateDynamicTrackerConfig,
    type DynamicTemplateType,
} from "@/utils/tag-template/dynamicTagTemplate";
import {
    normalizeTagTemplateCategory,
    normalizeTagTemplatePlantCategory,
    type CreateTagTemplateInput,
    type TagTemplateCategory,
    type TagTemplatePlantCategory,
} from "@/services/operations/tagTemplateAPI";

export type BulkTagTemplatePreset = "inverter" | "meter" | "dc_channel" | "dynamic";

export type BulkTagTemplateDraft = {
    id: string;
    order: number;
    name: string;
    description: string;
    plant_category: TagTemplatePlantCategory;
    version: number;
    is_active: boolean;
    preset: BulkTagTemplatePreset;
    generatorNumber: number;
    dynamicType: DynamicTemplateType;
    trackerCount: number;
    vdInput: string;
    dynamicParameters?: DynamicParameter[];
    tag_map?: Record<string, unknown>;
};

export type BulkTagTemplateSharedValues = {
    count: number;
    namePrefix: string;
    plant_category: TagTemplatePlantCategory;
    preset: BulkTagTemplatePreset;
    startNumber: number;
    dynamicType: DynamicTemplateType;
    vdInput: string;
};

export type BulkTagTemplateEditScope = "single" | "all";

export function isBulkDynamicPreset(preset: BulkTagTemplatePreset): boolean {
    return preset === "dynamic" || preset === "dc_channel";
}

export const BULK_TAG_TEMPLATE_PRESET_OPTIONS: Array<{
    value: BulkTagTemplatePreset;
    label: string;
    description: string;
}> = [
    {
        value: "inverter",
        label: "Inverter",
        description: "Generates captive inverter tags from the inverter utility script.",
    },
    {
        value: "meter",
        label: "Meter",
        description: "Generates captive meter tags from the meter utility script.",
    },
    {
        value: "dc_channel",
        label: "DC Channel",
        description: "Generates dynamic DC channel tags from the DC channel utility script.",
    },
    {
        value: "dynamic",
        label: "Dynamic",
        description: "Builds dynamic templates with DC channel, tracker, or custom parameter rows.",
    },
];

const DEFAULT_VD_INPUT = "1,13,14,17,18,23";

function createDraftId(order: number): string {
    return `bulk-template-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePositiveInteger(value: number, fallback: number): number {
    if (!Number.isFinite(value) || value < 1) return fallback;
    return Math.floor(value);
}

function cloneTagMapValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    const type = typeof value;
    if (type === "number" || type === "boolean" || type === "string") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }
    if (type === "object") {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
    }
    return JSON.stringify(String(value));
}

export function getDefaultBulkTagTemplateSharedValues(): BulkTagTemplateSharedValues {
    return {
        count: 1,
        namePrefix: "Tag Template",
        plant_category: "captive",
        preset: "inverter",
        startNumber: 1,
        dynamicType: "dc_channel",
        vdInput: DEFAULT_VD_INPUT,
    };
}

export function getDefaultBulkDynamicParameters(
    dynamicType: DynamicTemplateType,
    generatorNumber: number,
    trackerCount = 1,
    plantCategory: TagTemplatePlantCategory = "captive",
): DynamicParameter[] {
    if (dynamicType === "dc_channel") {
        return normalizeTagTemplatePlantCategory(plantCategory) === "pm_kusum"
            ? defaultKusumDcChannelSuggestions(generatorNumber)
            : defaultDcChannelSuggestions(generatorNumber);
    }

    if (dynamicType === "tracker") {
        return defaultTrackerSuggestions({
            blockId: generatorNumber,
            trackerCount: normalizePositiveInteger(trackerCount, 1),
        });
    }

    return defaultOtherSuggestions();
}

export function createBulkTagTemplateDrafts(
    shared: BulkTagTemplateSharedValues,
): BulkTagTemplateDraft[] {
    const count = normalizePositiveInteger(shared.count, 1);
    const startNumber = normalizePositiveInteger(shared.startNumber, 1);
    const plant_category = normalizeTagTemplatePlantCategory(shared.plant_category);
    const safePrefix = shared.namePrefix.trim() || "Tag Template";
    const isDynamic = shared.preset === "dynamic" || shared.preset === "dc_channel";
    const effectiveDynamicType: DynamicTemplateType =
        shared.preset === "dc_channel" ? "dc_channel" : shared.dynamicType;

    return Array.from({ length: count }, (_, index) => {
        const order = index + 1;
        const generatorNumber = startNumber + index;
        return {
            id: createDraftId(order),
            order,
            name: `${safePrefix} ${generatorNumber}`,
            description: "",
            plant_category,
            version: 1,
            is_active: true,
            preset: shared.preset,
            generatorNumber,
            dynamicType: effectiveDynamicType,
            trackerCount: 1,
            vdInput: shared.vdInput.trim() || DEFAULT_VD_INPUT,
            dynamicParameters: isDynamic
                ? getDefaultBulkDynamicParameters(effectiveDynamicType, generatorNumber, 1, plant_category)
                : undefined,
            tag_map: undefined,
        };
    });
}

export function applySharedValuesToBulkTagTemplateDrafts(
    drafts: BulkTagTemplateDraft[],
    shared: BulkTagTemplateSharedValues,
): BulkTagTemplateDraft[] {
    const count = normalizePositiveInteger(shared.count, 1);
    const startNumber = normalizePositiveInteger(shared.startNumber, 1);
    const safePrefix = shared.namePrefix.trim() || "Tag Template";
    const plant_category = normalizeTagTemplatePlantCategory(shared.plant_category);
    const vdInput = shared.vdInput.trim() || DEFAULT_VD_INPUT;

    const isDynamic = shared.preset === "dynamic" || shared.preset === "dc_channel";
    const effectiveDynamicType: DynamicTemplateType =
        shared.preset === "dc_channel" ? "dc_channel" : shared.dynamicType;

    return Array.from({ length: count }, (_, index) => {
        const draft = drafts[index];
        const generatorNumber = startNumber + index;
        const dynamicTypeChanged = draft != null && draft.dynamicType !== effectiveDynamicType;
        return {
            id: draft?.id ?? createDraftId(index + 1),
            order: index + 1,
            name: `${safePrefix} ${generatorNumber}`,
            description: draft?.description ?? "",
            plant_category,
            version: normalizePositiveInteger(draft?.version ?? 1, 1),
            is_active: draft?.is_active ?? true,
            preset: shared.preset,
            generatorNumber,
            dynamicType: effectiveDynamicType,
            trackerCount: normalizePositiveInteger(draft?.trackerCount ?? 1, 1),
            vdInput,
            dynamicParameters: isDynamic
                ? (dynamicTypeChanged
                    ? getDefaultBulkDynamicParameters(
                          effectiveDynamicType,
                          generatorNumber,
                          draft?.trackerCount ?? 1,
                          plant_category,
                      )
                    : draft?.dynamicParameters ??
                      getDefaultBulkDynamicParameters(
                          effectiveDynamicType,
                          generatorNumber,
                          draft?.trackerCount ?? 1,
                          plant_category,
                      ))
                : undefined,
            tag_map: undefined,
        };
    });
}

export function getBulkTagTemplateCategoryFromPreset(
    preset: BulkTagTemplatePreset,
): TagTemplateCategory {
    if (preset === "dynamic" || preset === "dc_channel") return normalizeTagTemplateCategory("dynamic");
    return normalizeTagTemplateCategory(preset);
}

export function parseBulkVdInput(value: string): number[] {
    return value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((item) => Number.isFinite(item) && item > 0)
        .map((item) => Math.floor(item));
}

export function buildBulkTagTemplateTagMap(
    draft: BulkTagTemplateDraft,
): Record<string, unknown> {
    if (draft.tag_map && Object.keys(draft.tag_map).length > 0) {
        return draft.tag_map;
    }

    if (draft.preset === "inverter") {
        return generateCaptiveInverterConfig({
            inverterId: normalizePositiveInteger(draft.generatorNumber, 1),
        });
    }

    if (draft.preset === "meter") {
        return generateCaptiveMeterConfig({
            meterId: normalizePositiveInteger(draft.generatorNumber, 1),
        });
    }

    // dc_channel preset falls through to the dynamic generation below with dynamicType=dc_channel

    const generatorNumber = normalizePositiveInteger(draft.generatorNumber, 1);
    const trackerCount = normalizePositiveInteger(draft.trackerCount, 1);
    const parameters =
        draft.dynamicParameters ??
        getDefaultBulkDynamicParameters(draft.dynamicType, generatorNumber, trackerCount, draft.plant_category);
    const input = {
        vd: parseBulkVdInput(draft.vdInput),
        parameters,
    };

    if (draft.dynamicType === "tracker") {
        return generateDynamicTrackerConfig(input);
    }

    if (draft.dynamicType === "other") {
        return generateDynamicOtherConfig(input);
    }

    return generateDynamicDcChannelConfig(input);
}

export function buildBulkTagTemplatePayload(
    drafts: BulkTagTemplateDraft[],
): CreateTagTemplateInput[] {
    return drafts.map((draft) => ({
        name: draft.name.trim(),
        category: getBulkTagTemplateCategoryFromPreset(draft.preset),
        plant_category: normalizeTagTemplatePlantCategory(draft.plant_category),
        tag_map: buildBulkTagTemplateTagMap(draft),
        description: draft.description.trim() || null,
        version: normalizePositiveInteger(draft.version, 1),
        is_active: draft.is_active,
    }));
}

export function summarizeBulkTagTemplateDraft(
    draft: BulkTagTemplateDraft,
): string {
    if (draft.preset === "dynamic" || draft.preset === "dc_channel") {
        const vdCount = parseBulkVdInput(draft.vdInput).length;
        if (draft.dynamicType === "tracker") {
            return `Tracker Block ${draft.generatorNumber} • ${draft.trackerCount} tracker${draft.trackerCount === 1 ? "" : "s"} • ${vdCount} VD value${vdCount === 1 ? "" : "s"}`;
        }

        if (draft.dynamicType === "other") {
            return `Custom Dynamic • ${vdCount} VD value${vdCount === 1 ? "" : "s"}`;
        }

        return `DC Channel Inverter ${draft.generatorNumber} • ${vdCount} VD value${vdCount === 1 ? "" : "s"}`;
    }

    return `${draft.preset === "inverter" ? "Inverter" : "Meter"} ${draft.generatorNumber}`;
}

export function applyBulkTagMapChangesToAllDrafts(
    drafts: BulkTagTemplateDraft[],
    options: {
        sourceDraftId: string;
        previousTagMap: Record<string, unknown>;
        nextTagMap: Record<string, unknown>;
    },
): BulkTagTemplateDraft[] {
    const removedKeys = Object.keys(options.previousTagMap).filter(
        (key) => !(key in options.nextTagMap),
    );
    const changedEntries = Object.entries(options.nextTagMap).filter(
        ([key, value]) =>
            !(key in options.previousTagMap) ||
            stableStringify(options.previousTagMap[key]) !== stableStringify(value),
    );

    return drafts.map((draft) => {
        const currentTagMap = buildBulkTagTemplateTagMap(draft);
        const nextDraftTagMap = cloneTagMapValue(currentTagMap);

        for (const key of removedKeys) {
            delete nextDraftTagMap[key];
        }

        for (const [key, value] of changedEntries) {
            nextDraftTagMap[key] = cloneTagMapValue(value);
        }

        return {
            ...draft,
            tag_map:
                draft.id === options.sourceDraftId
                    ? cloneTagMapValue(options.nextTagMap)
                    : nextDraftTagMap,
        };
    });
}

export function applyBulkTagMapFromSourceToAllDrafts(
    drafts: BulkTagTemplateDraft[],
    sourceDraftId: string,
): BulkTagTemplateDraft[] {
    const sourceDraft = drafts.find((draft) => draft.id === sourceDraftId);
    if (!sourceDraft) return drafts;

    const sourceTagMap = buildBulkTagTemplateTagMap(sourceDraft);

    return drafts.map((draft) => ({
        ...draft,
        tag_map: cloneTagMapValue(sourceTagMap),
    }));
}

function cloneDynamicParameters(parameters: DynamicParameter[]): DynamicParameter[] {
    return parameters.map((parameter) => ({ ...parameter }));
}

export function remapDynamicParameterExternalNameForGenerator(
    externalName: string,
    sourceGeneratorNumber: number,
    targetGeneratorNumber: number,
): string {
    if (sourceGeneratorNumber === targetGeneratorNumber) return externalName;

    const source = String(sourceGeneratorNumber);
    const target = String(targetGeneratorNumber);

    return externalName
        .replace(new RegExp(`I${source}(?=-|[A-Z])`, "g"), `I${target}`)
        .replace(new RegExp(`B${source}(?=[A-Z])`, "g"), `B${target}`);
}

function remapDynamicParametersForDraft(
    parameters: DynamicParameter[],
    sourceDraft: BulkTagTemplateDraft,
    targetDraft: BulkTagTemplateDraft,
): DynamicParameter[] {
    return parameters.map((parameter) => ({
        ...parameter,
        external_name: remapDynamicParameterExternalNameForGenerator(
            parameter.external_name,
            sourceDraft.generatorNumber,
            targetDraft.generatorNumber,
        ),
    }));
}

export function applyBulkDynamicParametersFromSourceToAllDrafts(
    drafts: BulkTagTemplateDraft[],
    sourceDraftId: string,
): BulkTagTemplateDraft[] {
    const sourceDraft = drafts.find((draft) => draft.id === sourceDraftId);
    if (!sourceDraft || !isBulkDynamicPreset(sourceDraft.preset)) return drafts;

    const sourceParameters =
        sourceDraft.dynamicParameters ??
        getDefaultBulkDynamicParameters(
            sourceDraft.dynamicType,
            sourceDraft.generatorNumber,
            sourceDraft.trackerCount,
            sourceDraft.plant_category,
        );

    return drafts.map((draft) => {
        if (!isBulkDynamicPreset(draft.preset)) return draft;

        return {
            ...draft,
            vdInput: sourceDraft.vdInput,
            trackerCount: sourceDraft.trackerCount,
            dynamicParameters: remapDynamicParametersForDraft(
                sourceParameters,
                sourceDraft,
                draft,
            ),
            tag_map: undefined,
        };
    });
}

export function applyBulkDynamicParameterChangesToAllDrafts(
    drafts: BulkTagTemplateDraft[],
    options: {
        sourceDraftId: string;
        previousParameters: DynamicParameter[];
        nextParameters: DynamicParameter[];
    },
): BulkTagTemplateDraft[] {
    const sourceDraft = drafts.find((draft) => draft.id === options.sourceDraftId);
    if (!sourceDraft) return drafts;

    const { previousParameters, nextParameters } = options;

    return drafts.map((draft) => {
        if (!isBulkDynamicPreset(draft.preset)) {
            if (draft.id === options.sourceDraftId) {
                return {
                    ...draft,
                    dynamicParameters: cloneDynamicParameters(nextParameters),
                    tag_map: undefined,
                };
            }
            return draft;
        }

        const currentParameters =
            draft.dynamicParameters ??
            getDefaultBulkDynamicParameters(
                draft.dynamicType,
                draft.generatorNumber,
                draft.trackerCount,
                draft.plant_category,
            );

        let updatedParameters = cloneDynamicParameters(currentParameters);

        if (nextParameters.length < previousParameters.length) {
            updatedParameters = updatedParameters.slice(0, nextParameters.length);
        }

        updatedParameters = nextParameters.map((nextRow, index) => {
            const previousRow = previousParameters[index];
            const currentRow = updatedParameters[index];

            if (!previousRow) {
                return {
                    ...nextRow,
                    external_name: remapDynamicParameterExternalNameForGenerator(
                        nextRow.external_name,
                        sourceDraft.generatorNumber,
                        draft.generatorNumber,
                    ),
                };
            }

            const result = { ...(currentRow ?? nextRow) };

            if (previousRow.internal_name !== nextRow.internal_name) {
                result.internal_name = nextRow.internal_name;
            }
            if (previousRow.count !== nextRow.count) {
                result.count = nextRow.count;
            }
            if (previousRow.soft_tag !== nextRow.soft_tag) {
                result.soft_tag = nextRow.soft_tag;
            }
            if (previousRow.external_name !== nextRow.external_name) {
                result.external_name = remapDynamicParameterExternalNameForGenerator(
                    nextRow.external_name,
                    sourceDraft.generatorNumber,
                    draft.generatorNumber,
                );
            }

            return result;
        });

        return {
            ...draft,
            dynamicParameters: updatedParameters,
            tag_map: undefined,
        };
    });
}

export function applyBulkDynamicSharedFieldToAllDrafts(
    drafts: BulkTagTemplateDraft[],
    sourceDraftId: string,
    field: "vdInput" | "trackerCount",
    value: string | number,
): BulkTagTemplateDraft[] {
    const sourceDraft = drafts.find((draft) => draft.id === sourceDraftId);
    if (!sourceDraft || !isBulkDynamicPreset(sourceDraft.preset)) return drafts;

    const nextDrafts = drafts.map((draft) => {
        if (!isBulkDynamicPreset(draft.preset)) return draft;

        const nextDraft: BulkTagTemplateDraft = {
            ...draft,
            [field]: value,
            tag_map: undefined,
        };

        if (field === "trackerCount") {
            nextDraft.dynamicParameters = getDefaultBulkDynamicParameters(
                draft.dynamicType,
                draft.generatorNumber,
                normalizePositiveInteger(Number(value), 1),
                draft.plant_category,
            );
        }

        return nextDraft;
    });

    return nextDrafts;
}
