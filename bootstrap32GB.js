/*
New node init script must stay below 32GB
- make > $200k
- Hack Casino for $10b
- Upgrade home ram to 1TB
- Run init.js
 */
import { getBestCrime } from "player.js";
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getUpgradeHomeRamCost');
    ns.disableLog('getPlayer');
    ns.clearLog();
    ns.tail();
    let casinoBreakerPid = 0;
    while (true) {
        await ns.sleep(100);
        const player = ns.getPlayer();

        if (ns.getServerMaxRam('home') <= 512 && player.money > ns.getUpgradeHomeRamCost()) {
            ns.upgradeHomeRam();
        }

        if (casinoBreakerPid === -1 && ns.getServerMaxRam('home') > 512) {
            //All done time to init
            ns.exec('init.js', 'home');
            return;
        }

        if (casinoBreakerPid !== 0) {
            casinoBreakerPid = ns.isRunning(casinoBreakerPid) ? casinoBreakerPid : -1;
            continue;
        }

        if (player.money > 200000 && casinoBreakerPid === 0) {
            casinoBreakerPid = ns.exec('casinoBreaker.js', 'home');
            if (casinoBreakerPid === 0)
                casinoBreakerPid = ns.getRunningScript('casinoBreaker.js', 'home').pid;
            continue;
        }

        if (player.isWorking && casinoBreakerPid === 0) {
            continue;
        }
        let { doThisCrime } = getBestCrime(ns, false);
        ns.commitCrime(doThisCrime);
    }
}