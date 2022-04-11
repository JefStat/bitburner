import { boxTailSingleton } from 'utils.js';
const crimes = ["shoplift", "rob store", "mug", "larceny", "deal drugs", "bond forgery", "traffick arms", "homicide", "grand theft auto", "kidnap", "assassinate", "heist"]
const factions = { SlumSnakes: 'Slum Snakes', TianDiHui: `Tian Di Hui`, Aevum: 'Aevum', Sector12: 'Sector-12', Daedalus: 'Daedalus', TheSyndicate:'The Syndicate' };
const cities = { Chongqing: 'Chongqing', Aevum: 'Aevum', Sector12: 'Sector-12' }
let ns;

export function getBestCrime(ns, getKarma) {
    let doThisCrime = crimes[0];
    let crimeRate = -1;
    for (const crime of crimes) {
        const crimeStats = ns.getCrimeStats(crime);
        const chance = ns.getCrimeChance(crime);
        const nextRate = chance * (getKarma ? crimeStats.karma : crimeStats.money) / crimeStats.time * 1000;
        // ns.print(nextRate.toPrecision(2));
        if (chance > .5 && nextRate > crimeRate) {
            crimeRate = nextRate;
            doThisCrime = crime;
            //ns.print(`next crime ${doThisCrime} @ ${(getKarma ? doThisCrimeRate.toPrecision(2) : ns.nFormat(doThisCrimeRate, '0.0'))} ${(getKarma ? 'karma' : '$')}/s`);
        }
    }
    return {doThisCrime, crimeRate};
}

/** @param {NS} pns **/
export async function main(pns) {
    ns = pns
    ns.disableLog('ALL');
    ns.clearLog();
    ns.enableLog('commitCrime');
    ns.enableLog('travelToCity');
    ns.enableLog('upgradeHomeRam');
    ns.tail();
    boxTailSingleton(ns, 'player', '⛹', '200px');
    let lastSolverRun = Date.now();
    let getKarma = () => ns.heart.break() > -54000;
    while (true) {
        await ns.sleep(100);
        const player = ns.getPlayer();
        function isInFaction(name) {
            return player.factions.includes(name);
        }

        //todo fix this horrible state flow machine of faction joining also wait around in aevum to join the syndicate
        if (!isInFaction(factions.TianDiHui)
            && player.hacking >= 50
            && player.money > 1200000
            && player.city !== cities.Chongqing) {
            ns.travelToCity(cities.Chongqing)
            ns.print(`Waiting to join ${factions.TianDiHui}`);
        } else if (!isInFaction(factions.TianDiHui)
            && !isInFaction(factions.Sector12)
            && player.money > 15200000
            && player.city !== cities.Sector12) {
            ns.travelToCity(cities.Sector12)
            ns.print(`Waiting to join ${factions.Sector12}`);
        } else if (!isInFaction(factions.TianDiHui)
            && !isInFaction(factions.Sector12)
            && !isInFaction(factions.Aevum)
            && player.money > 40200000
            && player.city !== cities.Aevum) {
            ns.travelToCity(cities.Aevum)
            ns.print(`Waiting to join ${factions.Aevum}`);
        }

        if (ns.getServerMaxRam('home') >= 128 && (Date.now() - lastSolverRun > 5 * 60 * 1000)) {
            if (ns.exec('autosolver.js', 'home') > 0)
                lastSolverRun = Date.now();
        }
        let invites = ns.checkFactionInvitations();
        while (invites.length > 0) {
            ns.joinFaction(invites[0]);
            ns.print(`Joined ${invites[0]}`);
            //await ns.write(factionNameToFile(invites[0]), 'true');
            invites = ns.checkFactionInvitations();
        }
        //"isWorking":true,
        //"workType":"Working for Faction",
        //"currentWorkFactionName":"Daedalus",
        //"currentWorkFactionDescription":"carrying out hacking contracts"
        function expectedFaction() {
            if (isInFaction(factions.Daedalus)) return factions.Daedalus;
            else if (isInFaction(factions.Sector12)) return factions.Sector12;
            else if (isInFaction(factions.TianDiHui)) return factions.TianDiHui;
        }
        if (!getKarma() && isInFaction(factions.SlumSnakes)) {
            if (player.isWorking && player.currentWorkFactionName === expectedFaction()) {
                continue;
            } else if (expectedFaction()) {
                ns.workForFaction(expectedFaction(), 'hacking contracts', false);
                continue;
            }
        }

        if (player.isWorking) {
            continue;
        }
        let {doThisCrime, crimeRate} = getBestCrime(ns, getKarma());
        ns.commitCrime(doThisCrime);
        ns.print(`Attempting to commit ${doThisCrime}... @ ${(getKarma() ? crimeRate.toPrecision(2) : ns.nFormat(crimeRate, '0.0'))} ${(getKarma() ? 'karma' : '$')}/s`);
    }
}