/** @param {NS} ns **/
export async function main(ns) {
    const player = ns.getPlayer();
    const bitNodeN = player.bitNodeN;
    if ( bitNodeN === 2 && player.hacking < 100) {
        ns.tprint('Not buying servers in bitnode 2... yet');
    } else {
        // const ram = 32768;
        const ram = ns.getServer('home').maxRam / 2;
        // const maxRam = 1048576;
        let i = ns.getPurchasedServers().length;
        while (i < ns.getPurchasedServerLimit()) {
            // Check if we have enough money to purchase a server
            if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
                var hostname = ns.purchaseServer("pserv-" + i, ram);
                ns.tprint('private server purchased, hostname[' + hostname + ']');
                ++i;
            }
            await ns.sleep(3000);
        }
    }
    if (bitNodeN === 5 || bitNodeN === 2) {
        ns.tprint('Not buying hacknet servers in bitnode 5 or 2');
        return;
    }
    const maxCores = ns.formulas.hacknetNodes.coreUpgradeCost(1, 15);
    const maxRam = ns.formulas.hacknetNodes.ramUpgradeCost(1, 6);
    const maxLevel = ns.formulas.hacknetNodes.levelUpgradeCost(1, 199);
    const maxHackNetUpgradeCost_preAug = maxCores + maxLevel + maxRam;
    // Start the hacknet node purchases
    while (ns.hacknet.getPurchaseNodeCost() < 1000000) {

        let nodeCost = ns.hacknet.getPurchaseNodeCost();

        // Purchase the nodes when we have enough money to do so
        if (ns.getServerMoneyAvailable("home") > (nodeCost + maxHackNetUpgradeCost_preAug)) {

            var purchaseIndex = ns.hacknet.purchaseNode();
            ns.hacknet.upgradeLevel(purchaseIndex, 199);
            ns.hacknet.upgradeRam(purchaseIndex, 6);
            ns.hacknet.upgradeCore(purchaseIndex, 15);

            ns.tprint('Hacknet node purchased, index[' + purchaseIndex + ']');
        }

        // wait a few seconds before we have them all
        await ns.sleep('5000');
    }

}