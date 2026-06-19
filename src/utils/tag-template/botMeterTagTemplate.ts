import {
    normalizeTagTemplatePlantCategory,
    type TagTemplatePlantCategory,
} from "@/services/operations/tagTemplateAPI";
import {
    meterBotSoftTags,
    meterToMeterBotTemplate,
} from "@/utils/tag-template/captiveMeterToMeterBotTemplate";
import {
    meterFromInverterBotTemplate,
    meterFromInverterSoftTags,
} from "@/utils/tag-template/captiveMeterToInverterBotTemplate";
import {
    kusumInverterToMeterSoftTags,
    kusumMeterToInverterWithApparentPowerTemplate,
} from "@/utils/tag-template/kusumMeterToInverterBotTemplate";
import {
    kusumMeterToMeterBotTemplate,
    kusumMeterToMeterSoftTags,
} from "@/utils/tag-template/kusumMeterToMeterBotTemplate";

export type BotMeterAggregationMode = "meter_to_meter" | "meter_to_inverter";

export const BOT_METER_AGGREGATION_OPTIONS: Array<{
    value: BotMeterAggregationMode;
    label: string;
}> = [
    { value: "meter_to_meter", label: "Meter to meter" },
    { value: "meter_to_inverter", label: "Meter to inverter" },
];

export function resolveBotAggregationModeForCategory(
    category: string,
    userMode: BotMeterAggregationMode,
): BotMeterAggregationMode | null {
    const normalized = category.trim().toLowerCase().replace(/[-\s]+/g, "_");
    if (normalized === "plant_bot") return "meter_to_meter";
    if (normalized === "acdb_block") return "meter_to_inverter";
    if (normalized === "block_bot") return userMode;
    return null;
}

export function generateBotMeterTagMap(
    plantCategory: TagTemplatePlantCategory,
    mode: BotMeterAggregationMode,
): Record<string, unknown> {
    const isKusum = normalizeTagTemplatePlantCategory(plantCategory) === "pm_kusum";

    if (mode === "meter_to_meter") {
        return isKusum
            ? { ...kusumMeterToMeterBotTemplate, soft_tag: kusumMeterToMeterSoftTags }
            : { ...meterToMeterBotTemplate, soft_tag: meterBotSoftTags };
    }

    return isKusum
        ? {
              ...kusumMeterToInverterWithApparentPowerTemplate,
              soft_tag: kusumInverterToMeterSoftTags,
          }
        : { ...meterFromInverterBotTemplate, soft_tag: meterFromInverterSoftTags };
}
