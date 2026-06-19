export const kusumMeterToInverterWithApparentPowerTemplate = {
    timestamp: "MAX(timestamp)",
    index: "MAX(index)",

    voltageR: "AVG(voltageR)",
    voltageY: "AVG(voltageY)",
    voltageB: "AVG(voltageB)",

    currentR: "SUM(currentR)",
    currentY: "SUM(currentY)",
    currentB: "SUM(currentB)",

    activePower: "SUM(power)",

    reactivePower: "SUM(reactivePower)",

    apparentPower: "SUM(apparentPower)",

    powerFactor:
        "IF(SUM(apparentPower), DIV(SUM(power), SUM(apparentPower)), 0)",

    powerFactorR: "0",
    powerFactorY: "0",
    powerFactorB: "0",

    powerR: "0",
    powerY: "0",
    powerB: "0",

    frequency: "AVG(frequency)",

    importEnergy: "SUM(totalGeneration)",
    exportEnergy: "0",

    apparentImportEnergy: "0",
    apparentExportEnergy: "0",

    kvarhQ1: "0",
    kvarhQ2: "0",
    kvarhQ3: "0",
    kvarhQ4: "0",

    dayFirstImport: "SUM(dayFirstGeneration)",
    dayFirstExport: "0",

    setPoint1: "0",
    setPoint2: "0",
    setPoint3: "0",
};

export const kusumInverterToMeterSoftTags = {
    avgVoltage:
        "DIV(ADD(voltageR, voltageY, voltageB), 3)",

    avgCurrent:
        "DIV(ADD(currentR, currentY, currentB), 3)",

    calculatedActivePower:
        "DIV(MUL(SQRT(3), avgVoltage, avgCurrent, powerFactor), 1000)",

    powerFactorCalc:
        "IF(apparentPower, DIV(activePower, apparentPower), 0)",

    todayImportEnergy:
        "SUB(importEnergy, dayFirstImport)",

    todayExportEnergy:
        "SUB(exportEnergy, dayFirstExport)",

    netEnergy:
        "SUB(exportEnergy, importEnergy)",

    todayNetEnergy:
        "SUB(todayExportEnergy, todayImportEnergy)",

    voltageImbalancePercent:
        "MUL(DIV(SUB(MAX(voltageR, voltageY, voltageB), MIN(voltageR, voltageY, voltageB)), avgVoltage), 100)",

    currentImbalancePercent:
        "MUL(DIV(SUB(MAX(currentR, currentY, currentB), MIN(currentR, currentY, currentB)), avgCurrent), 100)",

    maxPhasePower:
        "MAX(powerR, powerY, powerB)",

    minPhasePower:
        "MIN(powerR, powerY, powerB)",

    totalReactiveEnergy:
        "ADD(kvarhQ1, kvarhQ2, kvarhQ3, kvarhQ4)",

    powerQualityIndex:
        "MUL(powerFactor, 100)",
};