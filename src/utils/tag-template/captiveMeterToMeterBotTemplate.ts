export const meterToMeterBotTemplate = {
    timestamp: "MAX(timestamp)",
    index: "MAX(index)",

    voltageR: "AVG(voltageR)",
    voltageY: "AVG(voltageY)",
    voltageB: "AVG(voltageB)",

    currentR: "SUM(currentR)",
    currentY: "SUM(currentY)",
    currentB: "SUM(currentB)",

    activePower: "SUM(activePower)",
    reactivePower: "SUM(reactivePower)",
    apparentPower: "SUM(apparentPower)",

    powerFactor: "IF(apparentPower, DIV(activePower, apparentPower), 0)",

    powerFactorR: "AVG(powerFactorR)",
    powerFactorY: "AVG(powerFactorY)",
    powerFactorB: "AVG(powerFactorB)",

    powerR: "SUM(powerR)",
    powerY: "SUM(powerY)",
    powerB: "SUM(powerB)",

    frequency: "AVG(frequency)",

    importEnergy: "SUM(importEnergy)",
    exportEnergy: "SUM(exportEnergy)",

    apparentImportEnergy: "SUM(apparentImportEnergy)",
    apparentExportEnergy: "SUM(apparentExportEnergy)",

    kvarhQ1: "SUM(kvarhQ1)",
    kvarhQ2: "SUM(kvarhQ2)",
    kvarhQ3: "SUM(kvarhQ3)",
    kvarhQ4: "SUM(kvarhQ4)",

    dayFirstImport: "SUM(dayFirstImport)",
    dayFirstExport: "SUM(dayFirstExport)",

    qos: "MIN(qos)"
};

export const meterBotSoftTags = {
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
        "MUL(powerFactor, 100)"
};