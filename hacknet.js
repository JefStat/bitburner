import { boxTailSingleton, copyHackingFiles, tryGetBitNodeMultipliers } from "utils.js"
let haveHacknetServers = true; // Cached flag after detecting whether we do (or don't) have hacknet servers
const argsSchema = [
    ['max-payoff-time-second', 3600], // Controls how far to upgrade hacknet. Can be a number of seconds, or an expression of minutes/hours (e.g. '123m', '4h')
    ['continuous', true], // Set to true to run continuously, otherwise, it runs once
    ['interval', 10000], // Rate at which the program purchases upgrades when running continuously
    ['max-spend', Number.MAX_VALUE], // The maximum amount of money to spend on upgrades
    ['toast', true], // Set to true to toast purchases
];

export function autocomplete(data, _) {
    data.flags(argsSchema);
    return [];
}

/** @param {NS} ns **/
export async function main(ns) {
    const options = ns.flags(argsSchema);
    const continuous = options.continuous;
    const interval = options.interval;
    let maxSpend = options["max-spend"];
    const hacknetMoney = tryGetBitNodeMultipliers(ns).HacknetNodeMoney
    let maxPayoffTime = options['max-payoff-time-second'] * hacknetMoney;
    ns.disableLog('sleep');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('getServerMoneyAvailable');
    boxTailSingleton(ns, 'hacknet', '🖳', '100px');
    ns.clearLog();
    log(ns, `Starting hacknet-upgrade-manager with purchase payoff time limit of ${ns.tFormat(maxPayoffTime * 1000)} and ` +
        (maxSpend === Number.MAX_VALUE ? 'no spending limit' : `a spend limit of ${ns.nFormat(maxSpend, "0.0a")}`) +
        `. Current fleet: ${ns.hacknet.numNodes()} nodes...`);
    do {
        const moneySpent = await upgradeHacknet(ns, maxSpend, maxPayoffTime, options);
        // Using this method, we cannot know for sure that we don't have hacknet servers until we have purchased one
        if (haveHacknetServers && ns.hacknet.numNodes() > 0 && ns.hacknet.hashCapacity() === 0)
            haveHacknetServers = false;
        if (maxSpend && moneySpent === undefined) {
            log(ns, `Spending limit reached. Breaking...`);
            break; // Hack, but we return a non-number (false) when we've bought all we can for the current config
        }
        maxSpend -= moneySpent;
        if (continuous) await ns.sleep(interval);
    } while (continuous);
}

let lastUpgradeLog = "";
function log(ns, logMessage) { if (logMessage !== lastUpgradeLog) ns.print(lastUpgradeLog = logMessage); }

// Will buy the most effective hacknet upgrade, so long as it will pay for itself in the next {payoffTimeSeconds} seconds.
/** @param {NS} ns *
 * @param maxSpend
 * @param maxPayoffTimeSeconds
 * @param options
 */
export async function upgradeHacknet(ns, maxSpend, maxPayoffTimeSeconds = 3600 /* 3600 sec == 1 hour */, options) {
    const currentHacknetMult = ns.getPlayer().hacknet_node_money_mult;
    // Get the lowest cache level, we do not consider upgrading the cache level of servers above this until all have the same cache level
    const minCacheLevel = [...Array(ns.hacknet.numNodes()).keys()].reduce((min, i) => Math.min(min, ns.hacknet.getNodeStats(i).cache), Number.MAX_VALUE);
    const upgrades = [{ name: "none", cost: 0 }, {
        name: "level", upgrade: ns.hacknet.upgradeLevel, cost: (i, l = 1) => ns.hacknet.getLevelUpgradeCost(i, l), nextValue: (nodeStats, l = 1) => nodeStats.level + l,
        addedProduction: (nodeStats, l = 1) => ns.formulas.hacknetServers.hashGainRate(nodeStats.level + l, 0, nodeStats.ram, nodeStats.cores, currentHacknetMult)
    }, {
        name: "ram", upgrade: ns.hacknet.upgradeRam, cost: (i, l = 1) => ns.hacknet.getRamUpgradeCost(i, l), nextValue: (nodeStats, l = 1) => nodeStats.ram * 2 * l,
        addedProduction: (nodeStats, l = 1) => ns.formulas.hacknetServers.hashGainRate(nodeStats.level, 0, nodeStats.ram * 2 * l, nodeStats.cores, currentHacknetMult)
    }, {
        name: "cores", upgrade: ns.hacknet.upgradeCore, cost: (i, l = 1) => ns.hacknet.getCoreUpgradeCost(i, l), nextValue: (nodeStats, l = 1) => nodeStats.cores + l,
        addedProduction: (nodeStats, l = 1) => ns.formulas.hacknetServers.hashGainRate(nodeStats.level, 0, nodeStats.ram, nodeStats.cores + l, currentHacknetMult)
    }, {
        name: "cache", upgrade: ns.hacknet.upgradeCache, cost: (i, l = 1) => ns.hacknet.getCacheUpgradeCost(i, l), nextValue: (nodeStats, l = 1) => nodeStats.cache + l,
        addedProduction: (nodeStats, l = 1) => nodeStats.cache > minCacheLevel || !haveHacknetServers ? 0 : nodeStats.production * 0.01 / nodeStats.cache // Note: Does not actually give production, but it has "worth" to us so we can buy more things
    }];
    // Find the best upgrade we can make to an existing node
    let nodeToUpgrade = -1;
    let bestUpgrade;
    let bestUpgradePayoff = 0; // Hashes per second per dollar spent. Bigger is better.
    let cost = 0;
    let upgradedValue = 0;
    let worstNodeProduction = Number.MAX_VALUE; // Used to how productive a newly purchased node might be
    let worstNodeIndex;
    let worstNodeStats;
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        let nodeStats = ns.hacknet.getNodeStats(i);
        if (haveHacknetServers) { // When a hacknet server runs scripts, nodeStats.production lags behind what it should be for current ram usage. Get the "raw" rate
            nodeStats.production = ns.formulas.hacknetServers.hashGainRate(nodeStats.level, 0, nodeStats.ram, nodeStats.cores, currentHacknetMult);
        }
        worstNodeProduction = Math.min(worstNodeProduction, nodeStats.production);
        if (worstNodeProduction === nodeStats.production) {
            worstNodeIndex = i;
            worstNodeStats = nodeStats
        }
    }
    // Upgrade the worst node because it'll be cheaper too
    for (let up = 1; up < upgrades.length; up++) {
        let currentUpgradeCost = upgrades[up].cost(worstNodeIndex);
        let payoff = upgrades[up].addedProduction(worstNodeStats) / currentUpgradeCost; // Production (Hashes per second) per dollar spent
        if (payoff > bestUpgradePayoff) {
            nodeToUpgrade = worstNodeIndex;
            bestUpgrade = upgrades[up];
            bestUpgradePayoff = payoff;
            cost = currentUpgradeCost;
            upgradedValue = upgrades[up].nextValue(worstNodeStats);
            // await upgradeLookAhead(ns, payoff, upgrades, up, worstNodeIndex, worstNodeStats);
        }
    }

    // Compare this to the cost of adding a new node. This is an imperfect science. We are paying to unlock the ability to buy all the same upgrades our
    // other nodes have - all of which have been deemed worthwhile. Not knowing the sum total that will have to be spent to reach that same production,
    // the "most optimistic" case is to treat "price" of all that production to be just the cost of this server, but this is **very** optimistic.
    // In practice, the cost of new hacknet nodes scales steeply enough that this should come close to being true (cost of server >> sum of cost of upgrades)
    let newNodeCost = ns.hacknet.getPurchaseNodeCost();
    let newNodePayoff = ns.hacknet.numNodes() === ns.hacknet.maxNumNodes() ? 0 : worstNodeProduction / newNodeCost;
    let shouldBuyNewNode = newNodePayoff > bestUpgradePayoff;
    if (newNodePayoff === 0 && bestUpgradePayoff === 0) {
        log(ns, `All upgrades have no value (is hashNet income disabled in this BN?)`);
        return 0; // As long as maxSpend doesn't change, we will never purchase another upgrade
    }
    // If specified, only buy upgrades that will pay for themselves in {payoffTimeSeconds}.
    const hashDollarValue = haveHacknetServers ? 2.5e5 : 1; // Dollar value of one hash-per-second (0.25m dollars per production).
    let payoffTimeSeconds = 1 / (hashDollarValue * (shouldBuyNewNode ? newNodePayoff : bestUpgradePayoff));
    if (shouldBuyNewNode) cost = newNodeCost;

    // Prepare info about the next upgrade. Whether we end up purchasing or not, we will display this info.
    let strPurchase = (shouldBuyNewNode ? `a new node "hacknet-node-${ns.hacknet.numNodes()}"` :
        `hacknet-node-${nodeToUpgrade} ${bestUpgrade.name} ${upgradedValue}`) + ` for ${ns.nFormat(cost, '0.0a')}`;
    let strPayoff = `production ${((shouldBuyNewNode ? newNodePayoff : bestUpgradePayoff) * cost).toPrecision(3)} payoff time: ${ns.tFormat(1000 * payoffTimeSeconds)}`
    if (cost > maxSpend) {
        log(ns, `The next best purchase would be ${strPurchase}, but the cost exceeds the spending limit (${ns.nFormat(maxSpend, '0.0a')})`);
        return; // Shut-down. As long as maxSpend doesn't change, we will never purchase another upgrade
    }
    if (payoffTimeSeconds > maxPayoffTimeSeconds) {
        log(ns, `The next best purchase would be ${strPurchase}, but the ${strPayoff} is worse than the limit (${ns.tFormat(1000 * maxPayoffTimeSeconds)})`);
        return; // Shut-down. As long as maxPayoffTimeSeconds doesn't change, we will never purchase another upgrade
    }
    let success;
    if (shouldBuyNewNode) {
        const nodeIndex = ns.hacknet.purchaseNode();
        await copyHackingFiles(ns, { hostname: `hacknet-node-${nodeIndex}`, hasAdminRights: true });
        success = nodeIndex !== -1;
    } else success = bestUpgrade.upgrade(nodeToUpgrade, 1)

    if (success && options.toast) ns.toast(`Purchased ${strPurchase}`, 'success');
    log(ns, success ? `Purchased ${strPurchase} with ${strPayoff}` : `Insufficient funds to purchase the next best upgrade: ${strPurchase}`);
    return success ? cost : 0;
}

//todo figure out how to upgrade out of the local minumum
async function upgradeLookAhead(ns, payoff, upgrades, up, worstNodeIndex, worstNodeStats) {
    let l = 1;
    let nextPayoff = 0;
    log(ns, `payoff ${(payoff).toPrecision(3)} payoff time: ${ns.tFormat(1000 * (1 / (2.5e5 * payoff)))}`);
    let previousPayoffs = payoff;
    while (payoff > nextPayoff) {
        l++;
        upgrades[up].cost(worstNodeIndex, l);
        // Iterate on the number of levels checking if increasing the levels actually lowers the payoff.
        // perhaps the payoff will be worth it with more levels especially true of new nodes.
        let totalpayoff = upgrades[up].addedProduction(worstNodeStats, l) / upgrades[up].cost(worstNodeIndex, l);
        nextPayoff = totalpayoff - previousPayoffs;
        previousPayoffs = totalpayoff;
        log(ns, `nextPayoff ${(nextPayoff).toPrecision(3)} payoff time: ${ns.tFormat(1000 * (1 / (2.5e5 * nextPayoff)))}`);
        await ns.sleep(20);
    }
}