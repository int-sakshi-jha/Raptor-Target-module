type KusumInverterConfigInput = {
  inverterId: number;
};

export function generateKusumInverterConfig(input: KusumInverterConfigInput) {
  const { inverterId } = input;
  /** Inverter index suffix in device tags (same role as `prefix` in captive inverter). */
  const prefix = inverterId;

  const tags: Record<string, string> = {
    timestamp: "TIMESTAMP",
    index: "INDEX",

    voltageR: `IRPHV${prefix}`,
    voltageY: `IYPHV${prefix}`,
    voltageB: `IBPHV${prefix}`,

    currentR: `IRPHI${prefix}`,
    currentY: `IYPHI${prefix}`,
    currentB: `IBPHI${prefix}`,

    powerFactor: `IPF${prefix}`,
    power: `IKW${prefix}`,
    reactivePower: `IKVAR${prefix}`,
    apparentPower: `IKVA${prefix}`,
    frequency: `IFREQ${prefix}`,

    totalGeneration: `ILKWH${prefix}`,
    todayGeneration: `ITKWH${prefix}`,
    generationTime: `ILON${prefix}`,
    dayFirstGenerationTime: `ITON${prefix}`,

    dcVoltage: `IDCV${prefix}`,
    dcPower: `IDCKW${prefix}`,

    status: `IST${prefix}`,

    alarm1: `IFT1${prefix}`,
    alarm2: `IFT2${prefix}`,
    alarm3: `IFT3${prefix}`,
    alarm4: `IFT4${prefix}`,
    alarm5: `IFT5${prefix}`,
    temperature: `ITMP${prefix}`,

    dayFirstGeneration: `I${prefix}-FKWH`,
  };

  const soft_tags: Record<string, string> = {
    alarmStatus:
      "if(({{alarm1}} = 0 && {{alarm2}} = 0 && {{alarm3}} = 0 && {{alarm4}} = 0),0,1)",
    efficiency: "{{activePower}}/{{dcPower}}*100",

    sleepStatus: "if(({{status}} = 5120),1,0)",

    onStatus: "if(({{status}} = 5120),0,1)",

    todayGeneration: "{{totalGeneration}} - {{dayFirstGeneration}}",

    SLTS: "IF(EQ(status,5120),1,0)",

    // avgVoltage: "(voltageR + voltageY + voltageB) / 3",
    // avgCurrent: "(currentR + currentY + currentB) / 3",

    // apparentPowerKVA: "sqrt(3) * avgVoltage * avgCurrent / 1000",

    // calculatedActivePowerKW:
    //     "sqrt(3) * avgVoltage * avgCurrent * powerFactor / 1000",

    // dcCurrentApprox: "(dcPower * 1000) / dcVoltage",

    // acVsDcEfficiency: "(power / dcPower) * 100",

    // performanceRatioApprox: "(power / dcPower) * 100",

    // todayEnergy: "totalGeneration - dayFirstGeneration",

    // intervalHours: "samplingInterval / 3600",

    // powerLossKW: "dcPower - power",

    // isRunning: "power > 0",
    // isGenerating: "dcPower > 0",
    // isFault: "false",

    // voltageImbalancePercent:
    //     "((max(voltageR, voltageY, voltageB) - min(voltageR, voltageY, voltageB)) / avgVoltage) * 100",

    // currentImbalancePercent:
    //     "((max(currentR, currentY, currentB) - min(currentR, currentY, currentB)) / avgCurrent) * 100",
  };

  return {
    ...tags,
    soft_tag: soft_tags,
  };
}
