import { boxTailSingleton } from 'utils.js';

const aug_want_list = ["NeuroFlux Governor", "Wired Reflexes", "NutriGen Implant", "Neurotrainer I",
    "LuminCloaking-V1 Skin Implant", "Augmented Targeting I", "Combat Rib I", "INFRARET Enhancement",
    "LuminCloaking-V2 Skin Implant", "Augmented Targeting II", "Neurotrainer II", "HemoRecirculator",
    "DermaForce Particle Barrier", "Combat Rib II", "SmartSonar Implant", "BrachiBlades", "Augmented Targeting III",
    "Combat Rib III", "Nanofiber Weave", "Bionic Spine", "Neurotrainer III", "EsperTech Bladeburner Eyewear",
    "Power Recirculation Core", "Bionic Arms", "Bionic Legs", "The Black Hand", "ORION-MKIV Shoulder",
    "FocusWire", "Synfibril Muscle", "BLADE-51b Tesla Armor", "nextSENS Gene Modification", "Graphene BrachiBlades Upgrade",
    "HyperSight Corneal Implant", "Photosynthetic Cells", "Vangelis Virus", "Synthetic Heart",
    "Neotra", "NEMEAN Subdermal Weave", "Graphene Bionic Arms Upgrade", "Graphene Bone Lacings",
    "Xanipher", "Graphene Bionic Legs Upgrade", "SPTN-97 Gene Modification", "CordiARC Fusion Reactor",
    "Unstable Circadian Modulator", "I.N.T.E.R.L.I.N.K.E.D", "BLADE-51b Tesla Armor: Energy Shielding Upgrade",
    "Graphene Bionic Spine Upgrade", "Blade's Runners", "GOLEM Serum", "Vangelis Virus 3.0", "The Blade's Simulacrum",
    "Hydroflame Left Arm"
];

import { getOwnedAugmentationsStatic, getAugmentsPerFaction, getAllAugmentStats, hasStat } from 'augments.js';
function wantListGenerator() {
    const augmentStats = getAllAugmentStats(ns);
    // const bladeburnerDesiredStats = ['agi', 'dex', 'str', 'def', 'faction_rep', 'company_rep', 'hacknet'];
    const bladeburnerDesiredStats = ['agi', 'dex', 'str', 'def',];
    const anauglist = Object.entries(augmentStats)
        .filter(([name, augstats]) =>
            bladeburnerDesiredStats.filter((stat) => hasStat(stat, augstats)).length > 0)
        .sort(([, augstatsa], [, augstatsb]) => augstatsa.price - augstatsb.price)
        .map(([name, augstats]) => name);
    ns.print(JSON.stringify(anauglist, null, 2));
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('singularity.purchaseAugmentation');
    ns.clearLog();
    boxTailSingleton(ns, 'Purchase Augs', 'A', '100px');
    ns.tail();
    const playerAugs = getOwnedAugmentationsStatic(ns);
    let needed_augs = aug_want_list.filter(aug => !playerAugs.includes(aug)).reverse();
    const factionAugs = Object.entries(getAugmentsPerFaction(ns));
    for (const needed_aug of needed_augs) {
        const factions = factionAugs.filter(([, augs]) => augs.includes(needed_aug)).map(([faction]) => faction);
        for (const faction of factions) {
            let isPurchased = ns.purchaseAugmentation(faction, needed_aug);
            while (needed_aug === 'NeuroFlux Governor' && isPurchased) {
                isPurchased = ns.purchaseAugmentation(faction, needed_aug);
            }
            if (isPurchased) {
                ns.print(`bought ${needed_aug} from ${faction}`);
                break;
            } else {
                //ns.print(`Failed to buy ${needed_aug} from ${faction}`);
            }
        }
    }
    ns.print('Finished purchasing');
    ns.softReset('bootstrap32GB.js');
}