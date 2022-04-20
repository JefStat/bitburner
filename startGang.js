/** @param {NS} ns */
export async function main(ns) {
    ns.gang.createGang('Slum Snakes');
    await ns.write('/tmp/ingang.txt', ns.gang.getGangInformation().faction, 'w');
    ns.exec('gangum.js', 'home');
}