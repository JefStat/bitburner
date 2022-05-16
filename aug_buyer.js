import { boxTailSingleton } from 'utils.js';
const aug_want_list = ["The Red Pill", "NeuroFlux Governor",
    "Hacknet Node NIC Architecture Neural-Upload",
    "Hacknet Node Cache Architecture Neural-Upload",
    "Hacknet Node CPU Architecture Neural-Upload",
    "Hacknet Node Kernel Direct-Neural Interface",
    "Hacknet Node Core Direct-Neural Interface",
    "Wired Reflexes", "NutriGen Implant", "Neurotrainer I",
    "LuminCloaking-V1 Skin Implant", "Augmented Targeting I", "ADR-V1 Pheromone Gene", "Combat Rib I", "INFRARET Enhancement",
    "LuminCloaking-V2 Skin Implant", "Social Negotiation Assistant (S.N.A)", "Augmented Targeting II", "Neurotrainer II",
    "HemoRecirculator", "DermaForce Particle Barrier", "Combat Rib II", "SmartSonar Implant", "BrachiBlades",
    "Augmented Targeting III", "Combat Rib III", "Nanofiber Weave", "Bionic Spine", "Neurotrainer III", "EsperTech Bladeburner Eyewear",
    "Power Recirculation Core", "Bionic Arms", "Bionic Legs", "The Shadow's Simulacrum", "ADR-V2 Pheromone Gene",
    "The Black Hand", "ORION-MKIV Shoulder", "FocusWire", "Synfibril Muscle", "BLADE-51b Tesla Armor", "nextSENS Gene Modification",
    "PCMatrix", "Graphene BrachiBlades Upgrade", "SmartJaw", "HyperSight Corneal Implant", "Photosynthetic Cells",
    "Vangelis Virus", "Synthetic Heart", "Neotra", "NEMEAN Subdermal Weave", "Graphene Bionic Arms Upgrade",
    "Graphene Bone Lacings", "Xanipher", "Graphene Bionic Legs Upgrade", "SPTN-97 Gene Modification", "CordiARC Fusion Reactor",
    "I.N.T.E.R.L.I.N.K.E.D", "BLADE-51b Tesla Armor: Energy Shielding Upgrade", "Graphene Bionic Spine Upgrade",
    "Blade's Runners", "GOLEM Serum", "Vangelis Virus 3.0", "The Blade's Simulacrum", "Hydroflame Left Arm",
    "Neuroreceptor Management Implant"
]

import { getOwnedAugmentationsStatic, getAugmentsPerFaction, getAllAugmentStats, hasStat } from 'augments.js';
function wantListGenerator() {
    const augmentStats = getAllAugmentStats(ns);
    // const bladeburnerDesiredStats = ['agi', 'dex', 'str', 'def', 'faction_rep', 'company_rep', 'hacknet'];
    const bladeburnerDesiredStats = ['agi', 'dex', 'str', 'def', 'faction_rep'];
    const anauglist = Object.entries(augmentStats)
        .filter(([name, augstats]) =>
            bladeburnerDesiredStats.filter((stat) => hasStat(stat, augstats)).length > 0)
        .sort(([, augstatsa], [, augstatsb]) => augstatsa.price - augstatsb.price)
        .map(([name, augstats]) => name);
    ns.print(JSON.stringify(anauglist, null, 2));
}

const argsSchema = [
    ['no-soft-reset', false], // if this should reset after attempting to buy
];
let options;
/** @param {NS} ns */
export async function main(ns) {
    options = ns.flags(argsSchema);
    ns.disableLog('singularity.purchaseAugmentation');
    ns.clearLog();
    boxTailSingleton(ns, 'Purchase Augs', 'A', '100px');
    // ns.tail();
    const playerAugs = getOwnedAugmentationsStatic(ns);
    let needed_augs = aug_want_list.filter(aug => !playerAugs.includes(aug))
        .reverse(); // highest to lowest price the want list is presorted low to high
    needed_augs.push("NeuroFlux Governor"); //always need NF
    const factionAugs = Object.entries(getAugmentsPerFaction(ns));
    let augsPurchased = parseInt(ns.read('/tmp/augsPurchased.txt') || '0');
    for (const needed_aug of needed_augs) {
        const factions = factionAugs.filter(([, augs]) => augs.includes(needed_aug)).map(([faction]) => faction);
        for (const faction of factions) {
            let isPurchased = ns.purchaseAugmentation(faction, needed_aug);
            if (isPurchased) {
                augsPurchased++;
                ns.print(`bought ${needed_aug} from ${faction}`);
            }
            while (needed_aug === 'NeuroFlux Governor' && isPurchased) {
                isPurchased = ns.purchaseAugmentation(faction, needed_aug);
                if (isPurchased) {
                    augsPurchased++;
                    ns.print(`bought ${needed_aug} from ${faction}`);
                }
            }
            if (!isPurchased) {
                //ns.print(`Failed to buy ${needed_aug} from ${faction}`);
            }
        }
    }
    await ns.write('/tmp/augsPurchased.txt', augsPurchased, 'w');
    // ns.print('Finished purchasing');
    if (options['no-soft-reset']) {
        if (augsPurchased >= 3) {
            ns.softReset('bootstrap32GB.js');
        }
    } else {
        ns.softReset('bootstrap32GB.js');
    }
}