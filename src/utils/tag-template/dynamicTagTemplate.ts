export type DynamicTemplateType = "dc_channel" | "tracker" | "other";

export type DynamicParameter = {
    internal_name: string;
    external_name: string;
    count: number;
    soft_tag: boolean;
};

export type DynamicTagMapConfig = {
    vd: number[];
    parameters: DynamicParameter[];
};

type BuildDynamicConfigInput = {
    vd: number[];
    parameters: DynamicParameter[];
};

export const defaultDcChannelSuggestions = (inverterId: number): DynamicParameter[] => [
    { internal_name: "current{prefix}", external_name: `I${inverterId}-C{prefix}`, count: 30, soft_tag: false },
    { internal_name: "voltage{prefix}", external_name: `I${inverterId}-V{prefix}`, count: 14, soft_tag: false },
    { internal_name: "power{prefix}", external_name: `MUL(current{prefix},voltage{prefix})/1000`, count: 30, soft_tag: true },
    { internal_name: "energy{prefix}", external_name: `I${inverterId}-E{prefix}`, count: 30, soft_tag: false },
    { internal_name: "generation_time{prefix}", external_name: `I${inverterId}-GT{prefix}`, count: 30, soft_tag: false },
    { internal_name: "day_first_energy{prefix}", external_name: `I${inverterId}-DFE{prefix}`, count: 30, soft_tag: false },
    { internal_name: "day_first_generation_time{prefix}", external_name: `I${inverterId}-DFGT{prefix}`, count: 30, soft_tag: false },
    { internal_name: "CDT{prefix}", external_name: `I${inverterId}-CDT{prefix}`, count: 30, soft_tag: false },
];
export const defaultKusumDcChannelSuggestions = (inverterId: number): DynamicParameter[] => [
    { internal_name: "current{prefix}", external_name: `IDC{prefix}-I${inverterId}`, count: 28, soft_tag: false },
    { internal_name: "voltage{prefix}", external_name: `IDC{prefix}-V${inverterId}`, count: 14, soft_tag: false },
    { internal_name: "power{prefix}", external_name: `MUL(current{prefix},voltage{prefix})/1000`, count: 30, soft_tag: true },
    { internal_name: "energy{prefix}", external_name: `I${inverterId}-E{prefix}`, count: 30, soft_tag: false },
    { internal_name: "totalEnergy{prefix}", external_name: `SUM(energy{prefix})`, count: 30, soft_tag: false },
    { internal_name: "generation_time{prefix}", external_name: `I${inverterId}-GT{prefix}`, count: 30, soft_tag: false },
    { internal_name: "day_first_energy{prefix}", external_name: `I${inverterId}-DFE{prefix}`, count: 30, soft_tag: false },
    { internal_name: "day_first_generation_time{prefix}", external_name: `I${inverterId}-DFGT{prefix}`, count: 30, soft_tag: false },
    { internal_name: "CDT{prefix}", external_name: `I${inverterId}-CDT{prefix}`, count: 30, soft_tag: false },
];

export const defaultTrackerSuggestions = (ids: {
    blockId: number;
    trackerCount: number;
}): DynamicParameter[] => {
    const blockId = Number.isFinite(ids.blockId) && ids.blockId >= 1 ? Math.floor(ids.blockId) : 1;
    const trackerCount =
        Number.isFinite(ids.trackerCount) && ids.trackerCount >= 1 ? Math.floor(ids.trackerCount) : 1;

    return [
        { internal_name: "timestamp", external_name: "TIMESTAMP", count: 1, soft_tag: false },
        { internal_name: "index", external_name: "INDEX", count: 1, soft_tag: false },
        { internal_name: "status", external_name: `B${blockId}STT{prefix}`, count: trackerCount, soft_tag: false },
        { internal_name: "actual_angle{prefix}", external_name: `B${blockId}ANGT{prefix}`, count: trackerCount, soft_tag: false },
        { internal_name: "projected_angle{prefix}", external_name: `B${blockId}PANGT{prefix}`, count: trackerCount, soft_tag: false },
        { internal_name: "slave_no{prefix}", external_name: `B${blockId}SLT{prefix}`, count: trackerCount, soft_tag: false },
        { internal_name: "angle_deviation{prefix}", external_name: "projected_angle{prefix} - actual_angle{prefix}", count: trackerCount, soft_tag: true },
        {
            internal_name: "absolute_angle_deviation{prefix}",
            external_name: "Math.abs(projected_angle{prefix} - actual_angle{prefix})",
            count: trackerCount,
            soft_tag: true,
        },
        { internal_name: "is_tracking{prefix}", external_name: "status{prefix} > 0", count: trackerCount, soft_tag: true },
        {
            internal_name: "tracker_ok{prefix}",
            external_name: "Math.abs(projected_angle{prefix} - actual_angle{prefix}) <= 5",
            count: trackerCount,
            soft_tag: true,
        },
        {
            internal_name: "tracker_alarm{prefix}",
            external_name:
                "Math.abs(projected_angle{prefix} - actual_angle{prefix}) > 5 && Math.abs(projected_angle{prefix} - actual_angle{prefix}) <= 20",
            count: trackerCount,
            soft_tag: true,
        },
        {
            internal_name: "tracker_alert{prefix}",
            external_name: "Math.abs(projected_angle{prefix} - actual_angle{prefix}) > 20",
            count: trackerCount,
            soft_tag: true,
        },
        {
            internal_name: "angle_correction_required{prefix}",
            external_name: "Math.abs(projected_angle{prefix} - actual_angle{prefix}) > 5",
            count: trackerCount,
            soft_tag: true,
        },
    ];
};

export const defaultOtherSuggestions = (): DynamicParameter[] => [
    { internal_name: "", external_name: "", count: 1, soft_tag: false },
];

const sanitizeParameters = (parameters: DynamicParameter[]): DynamicParameter[] =>
    parameters
        .map((p) => ({
            internal_name: p.internal_name.trim(),
            external_name: p.external_name.trim(),
            count: Number.isFinite(p.count) && p.count > 0 ? Math.floor(p.count) : 1,
            soft_tag: Boolean(p.soft_tag),
        }))
        .filter((p) => p.internal_name.length > 0 || p.external_name.length > 0);

const sanitizeVd = (vd: number[]): number[] =>
    vd
        .filter((v) => Number.isFinite(v) && v > 0)
        .map((v) => Math.floor(v));

export function generateDynamicDcChannelConfig(input: BuildDynamicConfigInput): DynamicTagMapConfig {
    return {
        vd: sanitizeVd(input.vd),
        parameters: sanitizeParameters(input.parameters),
    };
}

export function generateDynamicTrackerConfig(input: BuildDynamicConfigInput): DynamicTagMapConfig {
    return {
        vd: sanitizeVd(input.vd),
        parameters: sanitizeParameters(input.parameters),
    };
}

export function generateDynamicOtherConfig(input: BuildDynamicConfigInput): DynamicTagMapConfig {
    return {
        vd: sanitizeVd(input.vd),
        parameters: sanitizeParameters(input.parameters),
    };
}
