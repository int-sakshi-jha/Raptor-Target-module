type TrackerConfigInput = {
    blockId: number
    trackerId: number
}

export function generateCaptiveTrackerConfig(
    input: TrackerConfigInput
) {
    const { blockId, trackerId } = input

    const prefix = `B${blockId}`
    const suffix = `T${trackerId}`

    const tags: Record<string, string> = {
        timestamp: "TIMESTAMP",
        index: "INDEX",

        [`${prefix}status`]: `${prefix}ST${suffix}`,
        [`${prefix}actualAngle`]: `${prefix}ANG${suffix}`,
        [`${prefix}projectedAngle`]: `${prefix}PANG${suffix}`,
        [`${prefix}slaveNo`]: `${prefix}SL${suffix}`,
    };

    const soft_tags: Record<string, string> = {
        [`${prefix}angleDeviation`]: `${prefix}projectedAngle - ${prefix}actualAngle`,

        [`${prefix}absoluteAngleDeviation`]:
            `Math.abs(${prefix}projectedAngle - ${prefix}actualAngle)`,

        [`${prefix}isTracking`]:
            `${prefix}status > 0`,

        [`${prefix}trackerOk`]:
            `Math.abs(${prefix}projectedAngle - ${prefix}actualAngle) <= 5`,

        [`${prefix}trackerAlarm`]:
            `Math.abs(${prefix}projectedAngle - ${prefix}actualAngle) > 5 && Math.abs(${prefix}projectedAngle - ${prefix}actualAngle) <= 20`,

        [`${prefix}trackerAlert`]:
            `Math.abs(${prefix}projectedAngle - ${prefix}actualAngle) > 20`,

        [`${prefix}angleCorrectionRequired`]:
            `Math.abs(${prefix}projectedAngle - ${prefix}actualAngle) > 5`
    };
    return {
        ...tags,
        soft_tag: soft_tags
    }
}