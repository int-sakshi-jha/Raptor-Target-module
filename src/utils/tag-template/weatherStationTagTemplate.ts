export type WeatherStationConfigInput = {
  includeSoftTags?: boolean;
};

export function generateWeatherStationConfig(input: WeatherStationConfigInput = {}) {
  const { includeSoftTags = true } = input;

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

  const soft_tags: Record<string, string> = {};

  if (!includeSoftTags) return { ...tags };

  return {
    ...tags,
    soft_tag: soft_tags,
  };
}
