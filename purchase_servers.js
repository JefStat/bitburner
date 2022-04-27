import { boxTailSingleton, copyHackingFiles, tryGetBitNodeMultipliers } from "utils.js"

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('fileExists');
    ns.disableLog('hacknet.upgradeLevel');
    ns.disableLog('hacknet.upgradeRam');
    ns.disableLog('hacknet.upgradeCore');
    ns.disableLog('hacknetNodes.coreUpgradeCost');
    ns.disableLog('hacknetNodes.ramUpgradeCost');
    ns.disableLog('hacknetNodes.levelUpgradeCost');
    ns.disableLog('getServer');
    ns.disableLog('getPurchasedServers');
    ns.disableLog('getPurchasedServerLimit');
    ns.disableLog('getPurchasedServerCost');
    ns.clearLog();
    //ns.tail();
    const multis = tryGetBitNodeMultipliers(ns);
    boxTailSingleton(ns, 'purchase pc', '🖳', '100px');
    let player = ns.getPlayer();
    const bitNodeN = player.bitNodeN;
    function purchasePortHacks(player) {
        if (!player.tor) return;
        // BruteSSH.exe - $500k - Opens up SSH Ports.
        // FTPCrack.exe - $1.500m - Opens up FTP Ports.
        // relaySMTP.exe - $5.000m - Opens up SMTP Ports.
        // HTTPWorm.exe - $30.000m - Opens up HTTP Ports.
        // SQLInject.exe - $250.000m - Opens up SQL Ports.
        if (!ns.fileExists("BruteSSH.exe") && player.money > 500000) {
            if (ns.purchaseProgram("BruteSSH.exe"))
                ns.print('purchased BruteSSH');
        }
        if (!ns.fileExists("FTPCrack.exe") && player.money > 1500000) {
            if (ns.purchaseProgram("FTPCrack.exe"))
                ns.print('purchased FTPCrack');
        }
        if (!ns.fileExists("relaySMTP.exe") && player.money > 5000000) {
            if (ns.purchaseProgram("relaySMTP.exe"))
                ns.print('purchased relaySMTP');
        }
        if (!ns.fileExists("HTTPWorm.exe") && player.money > 30000000) {
            if (ns.purchaseProgram("HTTPWorm.exe"))
                ns.print('purchased HTTPWorm');
        }
        if (!ns.fileExists("SQLInject.exe") && player.money > 250000000) {
            if (ns.purchaseProgram("SQLInject.exe"))
                ns.print('purchased SQLInject');
        }
    }
    function purchaseTor(player) {
        if (player.money > 200000 && !player.tor) {
            if (ns.purchaseTor())
                ns.print('purchased TOR');
        }
        purchasePortHacks(player);
    }
    purchaseTor(player);
    if (bitNodeN === 2 && player.hacking < 100) {
        ns.print('Not buying servers in bitnode 2... yet');
    } else {
        // PurchasedServerMaxRam
        const ram = Math.min(ns.getServer('home').maxRam / 2, 1048576 * multis.PurchasedServerMaxRam);
        ns.print(ns.nFormat(ram, '0.0a'));
        let i = ns.getPurchasedServers().length;
        while (i < ns.getPurchasedServerLimit()) {
            player = ns.getPlayer();
            purchaseTor(player);
            // Check if we have enough money to purchase a server
            const cost = ns.getPurchasedServerCost(ram);
            // ns.print(ns.nFormat(cost, '0.0a'));
            if (player.money > cost) {
                const name = "pserv-" + i;
                ns.purchaseServer(name, ram);
                await copyHackingFiles(ns, { hostname: name, hasAdminRights: true });
                ns.print(`purchased server ${name} ${ns.nFormat(cost, '$0.0a')}`)
                ++i;
            }
            await ns.sleep(3000);
        }
    }

    if (multis.HacknetNodeMoney < .8) {
        ns.print('Not buying hacknet servers in bitnode with money multi of ' + multis.HacknetNodeMoney);
        return;
    }

    //
    //  hashrate(h/s) / 4(h) * 1e6($) === $/s
    // if (hashdollar($/s) * 60(s/m) * 60(m/h) * 1 (h) > upgradecost($)) upgrade
    const maxCores = ns.formulas.hacknetNodes.coreUpgradeCost(1, 15);
    const maxRam = ns.formulas.hacknetNodes.ramUpgradeCost(1, 6);
    const maxLevel = ns.formulas.hacknetNodes.levelUpgradeCost(1, 199);
    const maxHackNetUpgradeCost_preAug = maxCores + maxLevel + maxRam;
    // Start the hacknet node purchases
    while (ns.hacknet.getPurchaseNodeCost() < 1000000) {
        player = ns.getPlayer();
        purchaseTor(player);
        let nodeCost = ns.hacknet.getPurchaseNodeCost();

        // Purchase the nodes when we have enough money to do so
        if (player.money > (nodeCost + maxHackNetUpgradeCost_preAug)) {

            const purchaseIndex = ns.hacknet.purchaseNode();
            ns.print(`purchased hacknet-${purchaseIndex}`)
            ns.hacknet.upgradeLevel(purchaseIndex, 199);
            ns.hacknet.upgradeRam(purchaseIndex, 6);
            ns.hacknet.upgradeCore(purchaseIndex, 15);
        }

        // wait a few seconds before we have them all
        await ns.sleep('5000');
    }
}