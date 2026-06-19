export const meterFromInverterBotTemplate = {
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
    frequency: "AVG(frequency)",

    powerFactor: "IF(SUM(power), DIV(SUM(MUL(power, powerFactor)), SUM(power)), 0)",

    importEnergy: "SUM(totalGeneration)",
    exportEnergy: "0",

    dayFirstImport: "SUM(dayFirstGeneration)",
    dayFirstExport: "0",

    apparentPower: "IF(powerFactor, DIV(activePower, powerFactor), 0)",
    apparentImportEnergy: "0",
    apparentExportEnergy: "0",

    kvarhQ1: "0",
    kvarhQ2: "0",
    kvarhQ3: "0",
    kvarhQ4: "0",

    powerR: "0",
    powerY: "0",
    powerB: "0",

    powerFactorR: "0",
    powerFactorY: "0",
    powerFactorB: "0",

    qos: "MIN(qos)"
};

export const meterFromInverterSoftTags = {
    avgVoltage: "DIV(ADD(voltageR, voltageY, voltageB), 3)",
    avgCurrent: "DIV(ADD(currentR, currentY, currentB), 3)",

    powerFactorCalc: "IF(apparentPower, DIV(activePower, apparentPower), 0)",

    todayImportEnergy: "SUB(importEnergy, dayFirstImport)",

    voltageImbalancePercent: "MUL(DIV(SUB(MAX(voltageR, voltageY, voltageB), MIN(voltageR, voltageY, voltageB)), avgVoltage), 100)",
    
    currentImbalancePercent: "MUL(DIV(SUB(MAX(currentR, currentY, currentB), MIN(currentR, currentY, currentB)), avgCurrent), 100)"
};