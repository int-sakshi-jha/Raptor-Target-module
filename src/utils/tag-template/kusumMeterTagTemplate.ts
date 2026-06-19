type KusumMeterConfigInput = {
    meterId: number;
};

export function generateKusumMeterConfig(input: KusumMeterConfigInput) {
    const { meterId } = input;

    const prefix = meterId;
    const m = `M${meterId}`;

    const tags: Record<string, string> = {
        timestamp: "TIMESTAMP",
        index: "INDEX",

        voltageR: `VRN${prefix}`,
        voltageY: `VYN${prefix}`,
        voltageB: `VBN${prefix}`,

        currentR: `IR${prefix}`,
        currentY: `IY${prefix}`,
        currentB: `IB${prefix}`,

        activePower: `POW${prefix}`,
        reactivePower: `RPOW${prefix}`,
        apparentPower: `APOW${prefix}`,

        powerFactor: `PF${prefix}`,
        powerFactorR: `PFR${prefix}`,
        powerFactorY: `PFY${prefix}`,
        powerFactorB: `PFB${prefix}`,

        powerR: `POWR${prefix}`,
        powerY: `POWY${prefix}`,
        powerB: `POWB${prefix}`,

        frequency: `FRQ${prefix}`,

        importEnergy: `KWHIMP${prefix}`,
        exportEnergy: `KWHEXP${prefix}`,

        apparentImportEnergy: `KVAHIMP${prefix}`,
        apparentExportEnergy: `KVAHEXP${prefix}`,

        /** Quadrant registers (naming is per device spec; not meter-index suffixed like VRN1). */
        kvarhQ1: "KVARHQ1",
        kvarhQ2: "KVARHQ2",
        kvarhQ3: "KVARHQ3",
        kvarhQ4: "KVARHQ4",

        dayFirstImport: `${m}-FIKWH`,
        dayFirstExport: `${m}-FEKWH`,

        setPoint1: `${m}-SP1`,
        setPoint2: `${m}-SP2`,
        setPoint3: `${m}-SP3`,
    };

    const soft_tags: Record<string, string> = {
        avgVoltage: "(voltageR + voltageY + voltageB) / 3",
        avgCurrent: "(currentR + currentY + currentB) / 3",

        calculatedActivePower:
            "sqrt(3) * avgVoltage * avgCurrent * powerFactor / 1000",

        powerFactorCalc:
            "apparentPower != 0 ? activePower / apparentPower : 0",

        todayImportEnergy: "importEnergy - dayFirstImport",
        todayExportEnergy: "exportEnergy - dayFirstExport",

        netEnergy: "exportEnergy - importEnergy",
        todayNetEnergy: "todayExportEnergy - todayImportEnergy",

        isImporting: "activePower > 0",
        isExporting: "activePower < 0",
        isIdle: "activePower == 0",

        voltageImbalancePercent:
            "((max(voltageR, voltageY, voltageB) - min(voltageR, voltageY, voltageB)) / avgVoltage) * 100",

        currentImbalancePercent:
            "((max(currentR, currentY, currentB) - min(currentR, currentY, currentB)) / avgCurrent) * 100",

        maxPhasePower: "max(powerR, powerY, powerB)",
        minPhasePower: "min(powerR, powerY, powerB)",

        totalReactiveEnergy:
            "kvarhQ1 + kvarhQ2 + kvarhQ3 + kvarhQ4",

        powerQualityIndex: "powerFactor * 100",

        intervalHours: "samplingInterval / 3600",
    };

    return {
        ...tags,
        soft_tag: soft_tags,
    };
}