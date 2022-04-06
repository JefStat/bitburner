/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('fileExists');
    ns.disableLog('purchaseProgram');
    ns.disableLog('purchaseTor');
    ns.clearLog();
    let player = ns.getPlayer();
    const bitNodeN = player.bitNodeN;
    function purchasePortHacks() {
        if (!player.tor) return;
        // BruteSSH.exe - [OWNED] - Opens up SSH Ports.
        // FTPCrack.exe - [OWNED] - Opens up FTP Ports.
        // relaySMTP.exe - $5.000m - Opens up SMTP Ports.
        // HTTPWorm.exe - $30.000m - Opens up HTTP Ports.
        // SQLInject.exe - $250.000m - Opens up SQL Ports.
        if (!ns.fileExists("BruteSSH.exe") && player.money > 500000) {
            if (ns.purchaseProgram("BruteSSH.exe")) {
                ns.tprint('BruteSSH purchased');
            }
        }
        if (!ns.fileExists("FTPCrack.exe") && player.money > 1500000) {
            if (ns.purchaseProgram("FTPCrack.exe")) {
                ns.tprint('FTPCrack purchased');
            }
        }
        if (!ns.fileExists("relaySMTP.exe") && player.money > 5000000) {
            if (ns.purchaseProgram("relaySMTP.exe")) {
                ns.tprint('relaySMTP purchased');
            }
        }
        if (!ns.fileExists("HTTPWorm.exe") && player.money > 30000000) {
            if (ns.purchaseProgram("HTTPWorm.exe")) {
                ns.tprint('HTTPWorm purchased');
            }
        }
        if (!ns.fileExists("SQLInject.exe") && player.money > 250000000) {
            if (ns.purchaseProgram("SQLInject.exe")) {
                ns.tprint('SQLInject purchased');
            }
        }
    }
    function purchaseTor() {
        player = ns.getPlayer();
        if (player.money > 200000 && !player.tor) {
            if (ns.purchaseTor()) {
                ns.tprint('TOR purchased');
            }
        }
        purchasePortHacks();
    }
    purchaseTor();
    if (bitNodeN === 2 && player.hacking < 100) {
        ns.tprint('Not buying servers in bitnode 2... yet');
    } else {
        // const ram = 32768;
        const ram = ns.getServer('home').maxRam / 2;
        // const maxRam = 1048576;
        let i = ns.getPurchasedServers().length;
        while (i < ns.getPurchasedServerLimit()) {
            purchaseTor();
            // Check if we have enough money to purchase a server
            if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
                const hostname = ns.purchaseServer("pserv-" + i, ram);
                ns.tprint('private server purchased, hostname[' + hostname + ']');
                ++i;
            }
            await ns.sleep(3000);
        }
    }
    const multis = JSON.parse(ns.read('/tmp/getBitNodeMultipliers.txt'));
    if (multis.HacknetNodeMoney < .8) {
        ns.tprint('Not buying hacknet servers in bitnode with money multi of ' + multis.HacknetNodeMoney);
        return;
    }
    const maxCores = ns.formulas.hacknetNodes.coreUpgradeCost(1, 15);
    const maxRam = ns.formulas.hacknetNodes.ramUpgradeCost(1, 6);
    const maxLevel = ns.formulas.hacknetNodes.levelUpgradeCost(1, 199);
    const maxHackNetUpgradeCost_preAug = maxCores + maxLevel + maxRam;
    // Start the hacknet node purchases
    while (ns.hacknet.getPurchaseNodeCost() < 1000000) {
        purchaseTor();
        let nodeCost = ns.hacknet.getPurchaseNodeCost();

        // Purchase the nodes when we have enough money to do so
        if (ns.getServerMoneyAvailable("home") > (nodeCost + maxHackNetUpgradeCost_preAug)) {

            const purchaseIndex = ns.hacknet.purchaseNode();
            ns.hacknet.upgradeLevel(purchaseIndex, 199);
            ns.hacknet.upgradeRam(purchaseIndex, 6);
            ns.hacknet.upgradeCore(purchaseIndex, 15);

            ns.tprint('Hacknet node purchased, index[' + purchaseIndex + ']');
        }

        // wait a few seconds before we have them all
        await ns.sleep('5000');
    }
}