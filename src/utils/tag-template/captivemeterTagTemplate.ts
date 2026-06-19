type MeterConfigInput = {
    meterId: number
}

export function generateCaptiveMeterConfig(
    input: MeterConfigInput
) {
    const { meterId } = input
    const prefix = `M${meterId}`

    const tags: Record<string, string> = {
        timestamp: "TIMESTAMP",
        index: "INDEX",

        voltageR: `${prefix}-VR`,
        voltageY: `${prefix}-VY`,
        voltageB: `${prefix}-VB`,

        currentR: `${prefix}-IR`,
        currentY: `${prefix}-IY`,
        currentB: `${prefix}-IB`,

        activePower: `${prefix}-PW`,
        reactivePower: `${prefix}-RPW`,
        apparentPower: `${prefix}-APW`,

        powerFactor: `${prefix}-PF`,
        powerFactorR: `${prefix}-PFR`,
        powerFactorY: `${prefix}-PFY`,
        powerFactorB: `${prefix}-PFB`,

        powerR: `${prefix}-PWR`,
        powerY: `${prefix}-PWY`,
        powerB: `${prefix}-PWB`,

        frequency: `${prefix}-FR`,

        importEnergy: `${prefix}-IKWH`,
        exportEnergy: `${prefix}-EKWH`,

        apparentImportEnergy: `${prefix}-KVAHIMP`,
        apparentExportEnergy: `${prefix}-KVAHEXP`,

        kvarhQ1: `${prefix}-KVARHQ1`,
        kvarhQ2: `${prefix}-KVARHQ2`,
        kvarhQ3: `${prefix}-KVARHQ3`,
        kvarhQ4: `${prefix}-KVARHQ4`,

        dayFirstImport: `${prefix}-FIKWH`,
        dayFirstExport: `${prefix}-FEKWH`,

        qos: `QOS-${meterId + 4}` // VD mapping logic
    }

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

        intervalHours: "samplingInterval / 3600"
    }

    return {
        ...tags,
        soft_tag: soft_tags
    }
}