export function generateABTMeterConfig(meterId: number | string = 1) {
  const suffix = String(meterId);

  const tags: Record<string, string> = {
      timestamp: "TIMESTAMP",
      index: "INDEX",

      voltageRN: `VRN${suffix}`,
      voltageYN: `VYN${suffix}`,
      voltageBN: `VBN${suffix}`,

      voltageRY: `VRY${suffix}`,
      voltageYB: `VYB${suffix}`,
      voltageBR: `VBR${suffix}`,

      currentR: `IR${suffix}`,
      currentY: `IY${suffix}`,
      currentB: `IB${suffix}`,

      powerFactor: `PF${suffix}`,
      powerFactorR: `PFR${suffix}`,
      powerFactorY: `PFY${suffix}`,
      powerFactorB: `PFB${suffix}`,

      activePower: `POW${suffix}`,
      activePowerR: `POWR${suffix}`,
      activePowerY: `POWY${suffix}`,
      activePowerB: `POWB${suffix}`,

      reactivePower: `RPOW${suffix}`,
      reactivePowerR: `RPOWR${suffix}`,
      reactivePowerY: `RPOWY${suffix}`,
      reactivePowerB: `RPOWB${suffix}`,

      apparentPower: `APOW${suffix}`,
      apparentPowerR: `APOWR${suffix}`,
      apparentPowerY: `APOWY${suffix}`,
      apparentPowerB: `APOWB${suffix}`,

      frequency: `FRQ${suffix}`,

      energyImport: `KWHIMP${suffix}`,
      energyExport: `KWHEXP${suffix}`,
      netEnergy: `KWHNET${suffix}`,

      apparentEnergyImport: `KVAHIMP${suffix}`,
      apparentEnergyExport: `KVAHEXP${suffix}`,
      netApparentEnergy: `KVAHNET${suffix}`,

      maxDemandImport: `MDKWIMP${suffix}`,
      maxDemandExport: `MDKWEXP${suffix}`,

      presentMaxDemandImportKVA: `PMDKVAIMP${suffix}`,
      presentMaxDemandExportKVA: `PMDKVAEXP${suffix}`,

      lastBillingNetEnergy: `LBKWHNET${suffix}`,
      lastBillingImportEnergy: `LBKWHIMP${suffix}`,
      lastBillingExportEnergy: `LBKWHEXP${suffix}`,

      lastBillingMaxDemandImportKW: `LBMDKWIMP${suffix}`,
      lastBillingMaxDemandExportKW: `LBMDKWEXP${suffix}`,

      lastBillingMaxDemandImportKVA: `LBMDKVAIMP${suffix}`,
      lastBillingMaxDemandExportKVA: `LBMDKVAEXP${suffix}`,

      maxDemandResetCount: `MDRSTC${suffix}`,
      tamperCount: `TC${suffix}`
  };

  const soft_tags: Record<string, string> = {
      avgPhaseVoltage: "(voltageRN + voltageYN + voltageBN) / 3",
      avgLineVoltage: "(voltageRY + voltageYB + voltageBR) / 3",
      avgPhaseCurrent: "(currentR + currentY + currentB) / 3",

      voltageUnbalancePercent:
          "((Math.max(voltageRN, voltageYN, voltageBN) - Math.min(voltageRN, voltageYN, voltageBN)) / avgPhaseVoltage) * 100",

      currentUnbalancePercent:
          "((Math.max(currentR, currentY, currentB) - Math.min(currentR, currentY, currentB)) / avgPhaseCurrent) * 100",

      totalPhaseActivePower:
          "activePowerR + activePowerY + activePowerB",

      totalPhaseReactivePower:
          "reactivePowerR + reactivePowerY + reactivePowerB",

      totalPhaseApparentPower:
          "apparentPowerR + apparentPowerY + apparentPowerB",

      calculatedPowerFactor:
          "apparentPower !== 0 ? activePower / apparentPower : 0",

      systemLosses:
          "energyImport - energyExport",

      exportImportRatio:
          "energyImport > 0 ? energyExport / energyImport : 0",

      apparentExportImportRatio:
          "apparentEnergyImport > 0 ? apparentEnergyExport / apparentEnergyImport : 0",

      demandUtilizationPercent:
          "maxDemandImport > 0 ? (activePower / maxDemandImport) * 100 : 0",

      isExportingPower:
          "activePower < 0 || energyExport > 0",

      isImportingPower:
          "activePower > 0",

      powerFactorHealthy:
          "powerFactor >= 0.95",

      frequencyHealthy:
          "frequency >= 49.5 && frequency <= 50.5",

      voltageHealthy:
          "avgPhaseVoltage >= 210 && avgPhaseVoltage <= 250",

      currentHealthy:
          "currentR >= 0 && currentY >= 0 && currentB >= 0"
  };

  return {
      ...tags,
      soft_tag: soft_tags
  };
}