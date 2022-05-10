export const factions = {
    Illuminati: "Illuminati", Daedalus: "Daedalus", TheCovenant: "The Covenant", ECorp: "ECorp", MegaCorp: "MegaCorp",
    BachmanAssociates: "Bachman & Associates", BladeIndustries: "Blade Industries", NWO: "NWO", Clarke: "Clarke Incorporated",
    OmniTek: "OmniTek Incorporated", FourSigma: "Four Sigma", KuaiGong: "KuaiGong International", Fulcrum: "Fulcrum Secret Technologies",
    BitRunners: "BitRunners", TheBlackHand: "The Black Hand", NiteSec: "NiteSec", Aevum: "Aevum", Chongqing: "Chongqing", Ishima: "Ishima",
    NewTokyo: "New Tokyo", Sector12: "Sector-12", Volhaven: "Volhaven", SpeakersfortheDead: "Speakers for the Dead", TheDarkArmy: "The Dark Army",
    TheSyndicate: "The Syndicate", Silhouette: "Silhouette", Tetrads: "Tetrads", SlumSnakes: "Slum Snakes", Netburners: "Netburners",
    TianDiHui: "Tian Di Hui", CyberSec: "CyberSec", Bladeburners: "Bladeburners"
};
export const factionsWork = {
    "Illuminati": ["field", "hacking contracts"],
    "Daedalus": ["field", "hacking contracts"],
    "The Covenant": ["field", "hacking contracts"],
    "ECorp": ["security", "field", "hacking contracts"],
    "MegaCorp": ["security", "field", "hacking contracts"],
    "Bachman & Associates": ["security", "field", "hacking contracts"],
    "Blade Industries": ["security", "field", "hacking contracts"],
    "NWO": ["security", "field", "hacking contracts"],
    "Clarke Incorporated": ["security", "field", "hacking contracts"],
    "OmniTek Incorporated": ["security", "field", "hacking contracts"],
    "Four Sigma": ["security", "field", "hacking contracts"],
    "KuaiGong International": ["security", "field", "hacking contracts"],
    "Fulcrum Secret Technologies": ["security", "field", "hacking contracts"],
    "BitRunners": ["hacking contracts"],
    "The Black Hand": ["field", "hacking contracts"],
    "NiteSec": ["hacking contracts"],
    "Aevum": ["security", "field", "hacking contracts"],
    "Chongqing": ["security", "field", "hacking contracts"],
    "Ishima": ["security", "field", "hacking contracts"],
    "New Tokyo": ["security", "field", "hacking contracts"],
    "Sector-12": ["security", "field", "hacking contracts"],
    "Volhaven": ["security", "field", "hacking contracts"],
    "Speakers for the Dead": ["security", "field", "hacking contracts"],
    "The Dark Army": ["security", "field", "hacking contracts"],
    "The Syndicate": ["security", "field", "hacking contracts"],
    "Silhouette": ["security", "field", "hacking contracts"],
    "Tetrads": ["security", "field"],
    "Slum Snakes": ["security", "field"],
    "Netburners": ["hacking contracts"],
    "Tian Di Hui": ["security", "hacking contracts"],
    "CyberSec": ["hacking contracts"],
    "Bladeburners": []
};
export const allGangFactions = ["Slum Snakes", "Tetrads", "The Black Hand", "The Syndicate", "The Dark Army", "Speakers for the Dead", "NiteSec"];

let augmentationNames;
/** @param {NS} ns **/
export async function initAugments(ns) {
    await writeAugmentsPerFaction(ns);
    await ns.write(`/tmp/getOwnedAugmentations.txt`, JSON.stringify(ns.getOwnedAugmentations(true), null, 2), 'w');
    await initAllAugmentRepReq(ns);
}
/** @param {NS} ns **/
async function writeAugmentsPerFaction(ns) {
    const factionNames = Object.values(factions);
    const data = {};
    for (let factionName of factionNames) {
        data[factionName] = ns.getAugmentationsFromFaction(factionName);
    }
    augmentationNames = [...new Set(Object.values(data).flat())]
    await ns.write(`/tmp/factionAugs.txt`, JSON.stringify(data, null, 2), 'w');
}
/** @param {NS} ns **/
export function getAugmentsPerFaction(ns) {
    return JSON.parse(ns.read(`/tmp/factionAugs.txt`));
}
export function getAugmentationNames() {
    return augmentationNames;
}
const augRepReq = {};
const augStats = {};
/** @param {NS} ns **/
async function initAllAugmentRepReq(ns) {
    for (let augmentationName of getAugmentationNames()) {
        augRepReq[augmentationName] = ns.getAugmentationRepReq(augmentationName);
        augStats[augmentationName] = ns.getAugmentationStats(augmentationName);
        augStats[augmentationName].price = ns.getAugmentationPrice(augmentationName);
    }
    await ns.write(`/tmp/augRepReq.txt`, JSON.stringify(augRepReq, null, 2), 'w');
    await ns.write(`/tmp/augStats.txt`, JSON.stringify(augStats, null, 2), 'w');
}
export const getAllAugmentRepReq = (ns) => JSON.parse(ns.read(`/tmp/augRepReq.txt`));
export const getAllAugmentStats = (ns) => JSON.parse(ns.read(`/tmp/augStats.txt`));

/** @param {NS} ns **/
export function getOwnedAugmentationsStatic(ns) {
    return JSON.parse(ns.read(`/tmp/getOwnedAugmentations.txt`));
}

export function getAugsRemainingAtFaction(ns) {
    const playerAugs = getOwnedAugmentationsStatic(ns);
    const factionAugs = getAugmentsPerFaction(ns);
    const factionAugsLeft = {};
    Object.entries(factionAugs)
        .forEach(([faction, augs]) => factionAugsLeft[faction] = augs.filter(aug => !playerAugs.includes(aug)));
    return factionAugsLeft;
}


export function hasStat(playerStat, augStats) {
    switch (playerStat) {
        case 'hack':
        // return augStats.hacking_chance_mult
        //     || augStats.hacking_exp_mult
        //     || augStats.hacking_grow_mult
        //     || augStats.hacking_money_mult
        //     || augStats.hacking_mult
        //     || augStats.hacking_speed_mult;
        case 'str':
        // return augStats.strength_exp_mult || augStats.strength_mult;
        case 'def':
        // return augStats.defense_exp_mult || augStats.defense_mult;
        case 'dex':
        //return augStats.dexterity_exp_mult || augStats.dexterity_mult;
        case 'agi':
        // return augStats.agility_exp_mult || augStats.agility_mult;
        case 'cha':
        //return augStats.charisma_exp_mult || augStats.charisma_mult;
        case 'crime':
        case 'faction_rep':
        case 'company_rep':
        case 'bladeburner':
        case 'work':
        default:
            return Object.keys(augStats).find(o => o.startsWith(playerStat)) !== undefined;
    }
}
const simulacrumAugName = "The Blade's Simulacrum"; // This augmentation lets you do bladeburner actions while busy
export const hasBladesSimulacrum = (ns) => getOwnedAugmentationsStatic(ns).includes(simulacrumAugName);