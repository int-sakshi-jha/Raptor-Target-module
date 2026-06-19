type CaptiveConfigInput = {
  inverterId: number;
};

export function generateCaptiveInverterConfig(input: CaptiveConfigInput) {
  const { inverterId } = input;

  const prefix = `I${inverterId}`;

  const tags: Record<string, string> = {
    timestamp: "TIMESTAMP",
    index: "INDEX",

    status: `${prefix}-ST`,
    alarm1: `${prefix}-AL1`,
    alarm2: `${prefix}-AL2`,
    alarm3: `${prefix}-AL3`,

    voltageR: `${prefix}-VR`,
    voltageY: `${prefix}-VY`,
    voltageB: `${prefix}-VB`,

    currentR: `${prefix}-IR`,
    currentY: `${prefix}-IY`,
    currentB: `${prefix}-IB`,

    activePower: `${prefix}-PW`,
    reactivePower: `${prefix}-RPW`,
    powerFactor: `${prefix}-PF`,
    frequency: `${prefix}-FR`,

    dcVoltage: `${prefix}-DCV`,
    dcPower: `${prefix}-DCKW`,

    // efficiency: `${prefix}-EF`, // soft tag
    temperature: `${prefix}-TMP2`,
    // ohm: `${prefix}-OHM`,

    totalGeneration: `${prefix}-KWH`,
    dayFirstGeneration: `${prefix}-FKWH`,
    generationTime: `${prefix}-GT`,
    dayFirstGenerationTime: `${prefix}-FGT`,

    downTimeStatus1: `${prefix}-DST1`,
    downTimeStatus2: `${prefix}-DST2`,
    currentDowntime: `${prefix}-CDT`,
  };

  const soft_tags: Record<string, string> = {
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
    // isFault: "alarm1 || alarm2 || alarm3",

    // voltageImbalancePercent:
    //     "((max(voltageR, voltageY, voltageB) - min(voltageR, voltageY, voltageB)) / avgVoltage) * 100",

    // currentImbalancePercent:
    //     "((max(currentR, currentY, currentB) - min(currentR, currentY, currentB)) / avgCurrent) * 100",
    efficiency: "{{power}}/{{dcPower}}*100",
    excessivelyHighAmbientTemperature: "if(({{alarm1}} = 37),1,0)",
    outputOverload: "if(({{alarm1}} = 16),1,0)",
    pvInputConfigurationAbnormal: "if(({{alarm1}} = 47),1,0)",
    onStatus: "if((16777216 @& {{downTimeStatus1}}),0,1)",
    sleepStatus: "if(({{status}} = 5120),1,0)",
    dcElectricArcDetectionDisabled: "if(({{alarm1}} = 89),1,0)",
    excessivelyHighModuleTemperature: "if(({{alarm1}} = 36),1,0)",
    dcGridSideProtectionSelfCheckFailed: "if(({{alarm1}} = 105),1,0)",
    acSideSpdAlarm: "if(({{alarm1}} = 71),1,0)",
    gridTransientOvervoltage: "if(({{alarm1}} = 3),1,0)",
    dcGroundingCableFault: "if(({{alarm1}} = 106),1,0)",
    //vd2
    todayGeneration: "{{totalGeneration}} - {{dayFirstGeneration}}",
    dcElectricArcFault: "if(({{alarm1}} = 88),1,0)",
    dcSideSpdAlarm: "if(({{alarm1}} = 72),1,0)",
    gridPowerOutage: "if(({{alarm1}} = 10),1,0)",
    excessiveLeakageCurrent: "if(({{alarm1}} = 12),1,0)",
    alarmStatus:
      "if(({{alarm1}} = 0 && {{alarm2}} = 0 && {{alarm3}} = 0 && {{alarm4}} = 0),0,1)",
    fanAlarm: "if(({{alarm1}} = 70),1,0)",
    pvConnectionFault: "if(({{alarm1}} = 23),1,0)",
    lowSystemInsulationResistance: "if(({{alarm1}} = 39),1,0)",
  };

  return {
    ...tags,
    soft_tag: soft_tags,
  };
}
