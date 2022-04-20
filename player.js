// import { boxTailSingleton } from 'utils.js';
let ns;

/** @param {NS} pns **/
export async function main(pns) {
    ns = pns
    // ns.disableLog('ALL');
    // ns.clearLog();
    // boxTailSingleton(ns, 'player', '⛹', '200px');
    let lastSolverRun = Date.now();
    while (true) {
        await ns.sleep(100);

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
    }
}