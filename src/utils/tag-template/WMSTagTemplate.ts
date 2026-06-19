

export type WMSConfigInput = {
  /**
   * How many DI/DO/AI channels should be included in `tag_map`.
   * Note: CDTs/DTs/FDs are currently generated only for DI1 and DI2.
   */
  diCount?: number;
  doCount?: number;
  aiCount?: number;
  includeSoftTags?: boolean;
};

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

export function generateWMSConfig(input: WMSConfigInput = {}) {
  const diCount = clampInt(input.diCount, 16, 1, 16);
  const doCount = clampInt(input.doCount, 6, 1, 6);
  const aiCount = clampInt(input.aiCount, 6, 1, 6);
  const includeSoftTags = input.includeSoftTags ?? true;

  const tags: Record<string, string> = {
    timestamp: "TIMESTAMP",
    index: "INDEX",

    poaInstant: "W-POA",
    poaDay: "W-YLDPOA",
    poaTotal: "W-THRPOA",
    poaFirst: "W-FHRPOA",
    poaToday: "W-DHRPOA",

    ghiInstant: "W-GHI",
    ghiDay: "W-YLDGHI",
    ghiTotal: "W-THRGHI",
    ghiFirst: "W-FHRGHI",
    ghiToday: "W-DHRGHI",

    windSpeed: "W-WSPD",
    windDirection: "W-WDIR",
    ambientTemp: "W-AMBTMP",
    moduleTemp1: "W-MODTMP1",
    moduleTemp2: "W-MODTMP2",
    humidity: "W-HMD",
    rain: "W-RAIN",

    qos: "QOS-11",
    samplingInterval: "STINTERVAL",
  };

  for (let i = 1; i <= diCount; i++) {
    // Existing mapping: DI1 -> DI11, DI2 -> DI21, ..., DI10 -> DI101, ...
    tags[`DI${i}`] = `DI${i * 10 + 1}`;
  }

  for (let i = 1; i <= doCount; i++) {
    tags[`DO${i}`] = `DO${i}`;
  }

  for (let i = 1; i <= aiCount; i++) {
    // Existing mapping: AI1 -> AI11, AI2 -> AI21, ..., AI6 -> AI61
    tags[`AI${i}`] = `AI${i * 10 + 1}`;
  }

  // Existing template includes CDTs/DTs/FDs only for DI1 and DI2.
  if (diCount >= 1) {
    tags.DI1_CDT = "DI11-CDT";
    tags.DI1_DT = "DI11-DT";
    tags.DI1_FDT = "DI11-FDT";
  }
  if (diCount >= 2) {
    tags.DI2_CDT = "DI21-CDT";
    tags.DI2_DT = "DI21-DT";
    tags.DI2_FDT = "DI21-FDT";
  }

  if (!includeSoftTags) return { ...tags };

  // const diTerms = Array.from({ length: diCount }, (_, idx) => `DI${idx + 1}`);

  const soft_tags: Record<string, string> = {
    // totalIrradiance: "poaInstant + ghiInstant",
    // irradianceAvg: "(poaInstant + ghiInstant) / 2",
    // todayPOA: "poaTotal - poaFirst",
    // todayGHI: "ghiTotal - ghiFirst",

    // isSunAvailable: "poaInstant > 50",
    // isDayTime: "poaInstant > 20",

    // plantStartCondition: "poaInstant > 4",

    // avgModuleTemp: "(moduleTemp1 + moduleTemp2) / 2",
    // tempDifference: "moduleTemp1 - ambientTemp",

    // isWindHigh: "windSpeed > 10",
    // isRaining: "rain > 0",

    // activeDIcount: diTerms.join(" + "),
    // anyDIActive: diTerms.join(" || "),

    // intervalHours: "samplingInterval / 3600",
  };

  return { ...tags, soft_tag: soft_tags };
}