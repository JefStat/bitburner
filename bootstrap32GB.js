/*
New node init script must stay below 32GB
- make > $200k
- Hack Casino for $10b
- Upgrade home ram to 1TB
- Run init.js
 */
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

        //need a min of 1030 for corporation apis
        //bitnode 9 2tb of home ram > $10b
        //const ramWanted = 1024;
        const ramWanted = 2048;
        if (ns.getServerMaxRam('home') < ramWanted && player.money > ns.getUpgradeHomeRamCost()) {
            ns.upgradeHomeRam();
        }

        if (casinoBreakerPid === -1 && ns.getServerMaxRam('home') >= ramWanted) {
            //All done time to init
            ns.exec('init.js', 'home');
            return;
        }

        if (casinoBreakerPid !== 0) {
            casinoBreakerPid = ns.isRunning(casinoBreakerPid) ? casinoBreakerPid : -1;
            continue;
        }

        if (player.money > 200000 && casinoBreakerPid === 0) {
            while (ns.isBusy()) {
                // need to finish crime before hitting the casino
                await ns.sleep(20);
            }
            casinoBreakerPid = ns.exec('casinoBreaker.js', 'home');
            if (casinoBreakerPid === 0) {
                casinoBreakerPid = ns.getRunningScript('casinoBreaker.js', 'home').pid;
                ns.print(`casinoBreakerPid ${casinoBreakerPid}`);
            }
            continue;
        }

        if (ns.isBusy() || casinoBreakerPid !== 0) {
            continue;
        }
        ns.commitCrime('shoplift');
    }
}