/** @param {NS} ns **/
export async function main(ns) {
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
    while (!ns.fileExists('Formulas.exe', 'home')) {
        await ns.sleep(5000);
    }
    const maxHackNetUpgradeCost_preAug = 331323997;
    let nodeCostLimit = maxHackNetUpgradeCost_preAug;
    // Start the hacknet node purchases
    while (ns.hacknet.getPurchaseNodeCost() < nodeCostLimit) {

        let nodeCost = ns.hacknet.getPurchaseNodeCost();

        // Purchase the nodes when we have enough money to do so
        if (ns.getServerMoneyAvailable("home") > (nodeCost + maxHackNetUpgradeCost_preAug)) {

            var purchaseIndex = ns.hacknet.purchaseNode();
            ns.hacknet.upgradeLevel(purchaseIndex, 199);
            ns.hacknet.upgradeRam(purchaseIndex, 6);
            ns.hacknet.upgradeCore(purchaseIndex, 15);

            ns.tprint('Hacknet node purchased, index[' + purchaseIndex + ']');
        }
        // limit the cost of purchasing a new node to the break even of purchase price after 1 hour 
        let nodeCostLimit = getNodeStats(0).production * 60 * 60;
        // wait a few seconds before we have them all
        await ns.sleep('5000');
    }

}