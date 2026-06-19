export function generateNumericalRelayConfig(relayNumber: number | string = 1) {
    const suffix = String(relayNumber);

    const nr = `NR${suffix}`;
    const ann = `ANN${suffix}`;

    const tags: Record<string, string> = {
        timestamp: "TIMESTAMP",
        index: "INDEX",

        phaseOvercurrentStage1: `${nr}-51-1`,
        phaseInstantaneousOvercurrentStage1: `${nr}-50-1`,
        phaseOvercurrentStage2: `${nr}-51-2`,
        phaseInstantaneousOvercurrentStage2: `${nr}-50-2`,

        neutralOvercurrentStage1: `${nr}-51N-1`,
        neutralInstantaneousOvercurrentStage1: `${nr}-50N-1`,
        neutralOvercurrentStage2: `${nr}-51N-2`,
        neutralInstantaneousOvercurrentStage2: `${nr}-50N-2`,

        groundOvercurrentStage1: `${nr}-51G-1`,
        groundInstantaneousOvercurrentStage1: `${nr}-50G-1`,
        groundOvercurrentStage2: `${nr}-51G-2`,
        groundInstantaneousOvercurrentStage2: `${nr}-50G-2`,

        breakerFailStart: `${nr}-50BFST`,

        currentPrimaryR: `${nr}-Irp`,
        currentPrimaryY: `${nr}-Iyp`,
        currentPrimaryB: `${nr}-Ibp`,

        currentSecondaryR: `${nr}-IrS`,
        currentSecondaryY: `${nr}-IyS`,
        currentSecondaryB: `${nr}-IbS`,

        currentPrimaryNeutral: `${nr}-Inp`,
        currentSecondaryNeutral: `${nr}-Ins`,

        currentPrimaryGround: `${nr}-Igp`,
        currentSecondaryGround: `${nr}-Igs`,

        voltageSecondaryR: `${nr}-VrS`,
        voltageSecondaryY: `${nr}-VyS`,
        voltageSecondaryB: `${nr}-VbS`,

        phaseAngleR: `${nr}-Arp`,
        phaseAngleY: `${nr}-Ayp`,
        phaseAngleB: `${nr}-Abp`,

        annunciator1: `${ann}-BIT0`,
        annunciator2: `${ann}-BIT1`,
        annunciator3: `${ann}-BIT2`,
        annunciator4: `${ann}-BIT3`,
        annunciator5: `${ann}-BIT4`,
        annunciator6: `${ann}-BIT5`,
        annunciator7: `${ann}-BIT6`,
        annunciator8: `${ann}-BIT7`,
        annunciator9: `${ann}-BIT8`,
        annunciator10: `${ann}-BIT9`,
        annunciator11: `${ann}-BIT10`,
        annunciator12: `${ann}-BIT11`,
        annunciator13: `${ann}-BIT12`,
        annunciator14: `${ann}-BIT13`,
        annunciator15: `${ann}-BIT14`,
        annunciator16: `${ann}-BIT15`
    };

    const soft_tags: Record<string, string> = {
        // avgPrimaryCurrent:
        //     "(currentPrimaryR + currentPrimaryY + currentPrimaryB) / 3",

        // avgSecondaryCurrent:
        //     "(currentSecondaryR + currentSecondaryY + currentSecondaryB) / 3",

        // avgSecondaryVoltage:
        //     "(voltageSecondaryR + voltageSecondaryY + voltageSecondaryB) / 3",

        // currentUnbalancePercent:
        //     "avgPrimaryCurrent > 0 ? ((Math.max(currentPrimaryR, currentPrimaryY, currentPrimaryB) - Math.min(currentPrimaryR, currentPrimaryY, currentPrimaryB)) / avgPrimaryCurrent) * 100 : 0",

        // voltageUnbalancePercent:
        //     "avgSecondaryVoltage > 0 ? ((Math.max(voltageSecondaryR, voltageSecondaryY, voltageSecondaryB) - Math.min(voltageSecondaryR, voltageSecondaryY, voltageSecondaryB)) / avgSecondaryVoltage) * 100 : 0",

        // anyPhaseOvercurrentTrip:
        //     "phaseOvercurrentStage1 || phaseInstantaneousOvercurrentStage1 || phaseOvercurrentStage2 || phaseInstantaneousOvercurrentStage2",

        // anyNeutralOvercurrentTrip:
        //     "neutralOvercurrentStage1 || neutralInstantaneousOvercurrentStage1 || neutralOvercurrentStage2 || neutralInstantaneousOvercurrentStage2",

        // anyGroundOvercurrentTrip:
        //     "groundOvercurrentStage1 || groundInstantaneousOvercurrentStage1 || groundOvercurrentStage2 || groundInstantaneousOvercurrentStage2",

        // breakerFailActive:
        //     "breakerFailStart > 0",

        // protectionTripActive:
        //     "anyPhaseOvercurrentTrip || anyNeutralOvercurrentTrip || anyGroundOvercurrentTrip || breakerFailActive",

        // neutralCurrentRatio:
        //     "avgPrimaryCurrent > 0 ? currentPrimaryNeutral / avgPrimaryCurrent : 0",

        // groundCurrentRatio:
        //     "avgPrimaryCurrent > 0 ? currentPrimaryGround / avgPrimaryCurrent : 0",

        // annunciatorActiveCount:
        //     "annunciator1 + annunciator2 + annunciator3 + annunciator4 + annunciator5 + annunciator6 + annunciator7 + annunciator8 + annunciator9 + annunciator10 + annunciator11 + annunciator12 + annunciator13 + annunciator14 + annunciator15 + annunciator16",

        // anyAnnunciatorActive:
        //     "annunciator1 || annunciator2 || annunciator3 || annunciator4 || annunciator5 || annunciator6 || annunciator7 || annunciator8 || annunciator9 || annunciator10 || annunciator11 || annunciator12 || annunciator13 || annunciator14 || annunciator15 || annunciator16",

        // relayHealthy:
        //     "!protectionTripActive && !breakerFailActive"
        "Buchholz Alarm":"if((16 @& {{annunciator1}}),1,0)",
        "WTI Trip":"if((4 @& {{annunciator1}}),1,0)",
        "OTI Alm":"if((32 @& {{annunciator1}}),1,0)",
        "PRV Trip":"if((128 @& {{annunciator1}}),1,0)",
        "OTI Trip":"if((2 @& {{annunciator1}}),1,0)",
        "MOG Trip":"if((8 @& {{annunciator1}}),1,0)",
        "Buchhloz Trip":"if((1 @& {{annunciator1}}),1,0)",
        "WTI Alm":"if((64 @& {{annunciator1}}),1,0)"


    };

    return {
        ...tags,
        soft_tag: soft_tags
    };
}