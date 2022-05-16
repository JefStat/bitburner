// import { boxTailSingleton } from 'utils.js';
let ns;
let farmIntPid = 0;
/** @param {NS} pns **/
export async function main(pns) {
    ns = pns
    ns.disableLog('getServerMaxRam');
    ns.disableLog('sleep');
    // ns.clearLog();
    // boxTailSingleton(ns, 'player', '⛹', '200px');
    ns.atExit(() => {
        if (farmIntPid !== 0) ns.kill(farmIntPid);
    });
    const money = [];
    let moneyLastTick = ns.getPlayer().money;
    let lastSolverRun = Date.now();
    while (true) {
        await ns.sleep(1000);
        if (ns.getServerMaxRam('home') >= 128 && (Date.now() - lastSolverRun > 5 * 60 * 1000)) {
            if (ns.exec('autosolver.js', 'home') > 0)
                lastSolverRun = Date.now();
        }

        if (ns.heart.break() < -54000 && !ns.fileExists('/tmp/ingang.txt')) {
            ns.exec('startGang.js', 'home');
        }
        if (!ns.fileExists('/tmp/incorp.txt') && ns.getServerMoneyAvailable('home') > 150_000_000_000) {
            ns.exec('megacorp.js', 'home');
        }
        const player = ns.getPlayer();
        if (!player.factions.includes("Bladeburners")
            && (player.strength > 100 && player.defense > 100 && player.dexterity > 100 || player.agility > 100)) {
            ns.exec('joinBladeburners.js', 'home');
        }
        // bug augs and reset every 2 hours after gangs are unlocked
        if (ns.getTimeSinceLastAug() > 2 * 60 * 60 * 1000 && ns.heart.break() < -54000) {
            ns.exec('spend-hacknet-hash.js', 'home', 1, '--liquidate');
            await ns.sleep(10000);
            ns.exec('aug_buyer.js', 'home', 1, '--no-soft-reset');
        }

        money.push(player.money - moneyLastTick);
        if (money.length > 600) money.shift();
        moneyLastTick = player.money;
        const moneyPerSec = money.reduce((a, b) => a + b, 0) / money.length;
        if (moneyPerSec > 1e12 && farmIntPid === 0) {
            farmIntPid = ns.exec('farm_int.js', 'home');
        } else if (moneyPerSec < 1e12 && farmIntPid !== 0) {
            ns.kill(farmIntPid);
            farmIntPid = 0;
        }
    }
}