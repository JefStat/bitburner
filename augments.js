export const factions = {Illuminati:"Illuminati", Daedalus:"Daedalus", TheCovenant:"The Covenant", ECorp:"ECorp", MegaCorp:"MegaCorp",
    BachmanAssociates:"Bachman & Associates",BladeIndustries:"Blade Industries", NWO:"NWO", Clarke:"Clarke Incorporated",
    OmniTek:"OmniTek Incorporated", FourSigma:"Four Sigma", KuaiGong:"KuaiGong International", Fulcrum:"Fulcrum Secret Technologies",
    BitRunners:"BitRunners", TheBlackHand:"The Black Hand", NiteSec:"NiteSec", Aevum:"Aevum", Chongqing:"Chongqing", Ishima:"Ishima",
    NewTokyo:"New Tokyo", Sector12:"Sector-12", Volhaven:"Volhaven", SpeakersfortheDead:"Speakers for the Dead", TheDarkArmy:"The Dark Army",
    TheSyndicate:"The Syndicate", Silhouette:"Silhouette", Tetrads:"Tetrads", SlumSnakes:"Slum Snakes", Netburners:"Netburners",
    TianDiHui:"Tian Di Hui", CyberSec:"CyberSec", Bladeburners:"Bladeburners"};

let augmentationNames;
/** @param {NS} ns **/
export async function initAugments(ns) {
    await writeAugmentsPerFaction(ns);
    await ns.write(`/tmp/getOwnedAugmentations.txt`, JSON.stringify(ns.getOwnedAugmentations(true), null, 2), 'w');
    await initAllAugmentRepReq(ns);
}
/** @param {NS} ns **/
async function writeAugmentsPerFaction(ns){
    const factionNames = Object.values(factions);
    const data = {};
    for (let factionName of factionNames) {
        data[factionName] = ns.getAugmentationsFromFaction(factionName);
    }
    augmentationNames = [...new Set(Object.values(data).flat())]
    await ns.write(`/tmp/factionAugs.txt`, JSON.stringify(data, null, 2), 'w');
}
/** @param {NS} ns **/
export function getAugmentsPerFaction(ns){
    return JSON.parse(ns.read(`/tmp/factionAugs.txt`));
}
export function getAugmentationNames() {
    return augmentationNames;
}
const augRepReq = {};
const augStats= {};
/** @param {NS} ns **/
async function initAllAugmentRepReq(ns) {
    for(let augmentationName of getAugmentationNames()) {
        augRepReq[augmentationName] = ns.getAugmentationRepReq(augmentationName);
        augStats[augmentationName] = ns.getAugmentationStats(augmentationName);
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

// await getNsDataThroughFile(ns, 'Object.keys(ns.gang.getOtherGangInformation())')