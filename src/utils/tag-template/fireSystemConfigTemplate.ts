export function generateFireSystemConfig(systemNumber: number | string = 1) {
    const suffix = String(systemNumber);
    const prefix = `B${suffix}NIFPS`;
    const dynamicPrefix = `NIFPS${suffix}`;

    const tags: Record<string, string> = {
        timestamp: "TIMESTAMP",
        index: "INDEX",
        samplingInterval: "STINTERVAL",

        systemStatus: `${prefix}-SY`,
        operationIndicator: `${prefix}-OI`,
        generalAlarm: `${prefix}-GA`,
        driveStatus: `${prefix}-DR`,

        zone6: `${dynamicPrefix}-6`,
        zone7: `${dynamicPrefix}-7`,
        zone8: `${dynamicPrefix}-8`,
        zone9: `${dynamicPrefix}-9`,
        zone10: `${dynamicPrefix}-10`
    };

    const soft_tags: Record<string, string> = {
        activeZoneCount:
            "zone6 + zone7 + zone8 + zone9 + zone10",

        anyZoneActive:
            "zone6 || zone7 || zone8 || zone9 || zone10",

        allZonesNormal:
            "!zone6 && !zone7 && !zone8 && !zone9 && !zone10",

        hasAlarm:
            "generalAlarm > 0",

        systemHealthy:
            "systemStatus > 0 && generalAlarm === 0",

        zoneAlarmPresent:
            "zone6 || zone7 || zone8 || zone9 || zone10",

        responseTimeHours:
            "samplingInterval / 3600"
    };

    return {
        ...tags,
        soft_tag: soft_tags
    };
}