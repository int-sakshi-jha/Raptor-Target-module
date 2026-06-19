import type { TagMapStaticRow } from "@/components/common/JsonFields";

const HEALTH_TAG_ENTRIES: readonly {
    key: string;
    tag: string;
    description: string;
}[] = [
    { key: "date", tag: "DATE", description: "Device date field" },
    { key: "cotp", tag: "COTP", description: "COTP" },
    { key: "potp", tag: "POTP", description: "POTP" },
    { key: "imei", tag: "IMEI", description: "Device IMEI identifier" },
    { key: "index", tag: "INDEX", description: "Packet / sample index" },
    { key: "timestamp", tag: "TIMESTAMP", description: "Packet timestamp" },
    { key: "samplingInterval", tag: "STINTERVAL", description: "Sampling / send interval" },
    { key: "lifeMin", tag: "LIFEMIN", description: "Lifetime minutes" },
    { key: "rssi", tag: "RSSI", description: "Cellular / modem RSSI" },
    { key: "wifiRssi", tag: "WIFIRSSI", description: "Wi-Fi signal strength (RSSI)" },
    { key: "sd", tag: "SD", description: "SD card status / presence" },
    { key: "online", tag: "ONLINE", description: "Online / connectivity flag" },
    { key: "wifiCount", tag: "WIFICOUNT", description: "Wi-Fi network count" },
    { key: "brokenCount", tag: "BROKCOUNT", description: "Broken connection / broker error count" },
    { key: "uptime", tag: "UPTIME", description: "Device uptime" },
    { key: "rtcDate", tag: "RTCDATE", description: "RTC date" },
    { key: "rtcTime", tag: "RTCTIME", description: "RTC time" },
    { key: "devOnTime", tag: "DEVONTIME", description: "Device on-time" },
    { key: "lastStErr", tag: "LASTSTERR", description: "Last state / stream error" },
    { key: "flash", tag: "FLASH", description: "Flash memory status" },
    { key: "battSt", tag: "BATTST", description: "Battery status" },
    { key: "vbatt", tag: "VBATT", description: "Battery voltage" },
    { key: "pst", tag: "PST", description: "PST" },
    { key: "wd", tag: "WD", description: "Watchdog" },
    { key: "pollReq1", tag: "POLL-REQ1", description: "Poll request counter 1" },
    { key: "pollErr1", tag: "POLL-ERR1", description: "Poll error counter 1" },
    { key: "pollReq2", tag: "POLL-REQ2", description: "Poll request counter 2" },
    { key: "pollErr2", tag: "POLL-ERR2", description: "Poll error counter 2" },
    { key: "pollReq3", tag: "POLL-REQ3", description: "Poll request counter 3" },
    { key: "pollErr3", tag: "POLL-ERR3", description: "Poll error counter 3" },
    { key: "p1Status", tag: "P1-STATUS", description: "Port / phase 1 status" },
    { key: "p2Status", tag: "P2-STATUS", description: "Port / phase 2 status" },
    { key: "p3Status", tag: "P3-STATUS", description: "Port / phase 3 status" },
    { key: "flUsed", tag: "FLUSED", description: "Flash used" },
    { key: "flSize", tag: "FLSIZE", description: "Flash size" },
    { key: "freeHesp", tag: "FREEHESP", description: "Free heap / HESP (device-specific)" },
    { key: "firmware", tag: "FIRMWARE", description: "Firmware version" },
    { key: "frwd", tag: "FRWD", description: "Forward / FRWD (device-specific)" },
    { key: "uuid", tag: "UUID", description: "Device / session UUID" },
    { key: "req", tag: "REQ", description: "Request field" },
    { key: "dev", tag: "DEV", description: "Device identifier field" },
    { key: "qos0", tag: "QOS-0", description: "QoS level 0" },
    { key: "simSlot", tag: "SIMSLOT", description: "" },
    { key: "simno", tag: "SIMNO", description: "" },
    { key: "gsm", tag: "GSM", description: "" },
    { key: "net", tag: "NET", description: "" },
    { key: "sim", tag: "SIM", description: "" },
    { key: "modcnt", tag: "MODCNT", description: "" },
    { key: "simChngCnt", tag: "SIMCHNGCNT", description: "" },
    { key: "gprs", tag: "GPRS", description: "" },
    { key: "gprswd", tag: "GPRSWD", description: "" },
] as const;

/** Rows for tag template forms (`health` category). */
export const HEALTH_TAG_TEMPLATE_STATIC_ROWS: TagMapStaticRow[] = HEALTH_TAG_ENTRIES.map(
    ({ key, tag, description }) => ({
        key,
        defaultValue: tag,
        description,
    }),
);

export function generateHealthTagTemplateConfig() {
    const tags: Record<string, string> = {};
    for (const { key, tag } of HEALTH_TAG_ENTRIES) {
        tags[key] = tag;
    }

    const soft_tags: Record<string, string> = {
        intervalHours: "samplingInterval / 3600",
    };

    return {
        ...tags,
        soft_tag: soft_tags,
    };
}