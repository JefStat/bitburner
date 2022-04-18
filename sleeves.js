import {boxTailSingleton} from "./utils";

const interval = 5000; // Update (tick) this often
const minTaskWorkTime = 29000; // Sleeves assigned a new task should stick to it for at least this many milliseconds
const works = ['security', 'field', 'hacking']; // When doing faction work, we prioritize physical work since sleeves tend towards having those stats be highest

let cachedCrimeStats, workByFaction; // Cache of crime statistics and which factions support which work
let task, lastStatusUpdateTime, lastPurchaseTime, lastPurchaseStatusUpdate, availableAugs, cacheExpiry, lastReassignTime; // State by sleeve
let playerInfo, numSleeves, ownedSourceFiles;
let options;

const argsSchema = [
    ['min-shock-recovery', 97], // Minimum shock recovery before attempting to train or do crime (Set to 100 to disable, 0 to recover fully)
    ['shock-recovery', 0.05], // Set to a number between 0 and 1 to devote that ratio of time to periodic shock recovery (until shock is at 0)
    ['crime', null], // If specified, sleeves will perform only this crime regardless of stats
    ['homicide-chance-threshold', 0.45], // Sleeves will automatically start homicide once their chance of success exceeds this ratio
    ['aug-budget', 0.1], // Spend up to this much of current cash on augs per tick (Default is high, because these are permanent for the rest of the BN)
    ['buy-cooldown', 60 * 1000], // Must wait this may milliseconds before buying more augs for a sleeve
    ['min-aug-batch', 20], // Must be able to afford at least this many augs before we pull the trigger (or fewer if buying all remaining augs)
];

export function autocomplete(data, _) {
    data.flags(argsSchema);
    return [];
}

/** @param {NS} ns **/
export async function main(ns) {
    options = ns.flags(argsSchema);
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('asleep');
    ns.clearLog();
    boxTailSingleton(ns, 'sleeves', '⛹⛹⛹⛹⛹⛹⛹', '200px');
    // Ensure the global state is reset (e.g. after entering a new bitnode)
    task = [];
    lastStatusUpdateTime = [];
    lastPurchaseTime = [];
    lastPurchaseStatusUpdate = [];
    availableAugs = [];
    cacheExpiry = [];
    lastReassignTime = [];
    workByFaction = {};
    cachedCrimeStats = {};
    // Start the main loop
    while (true) {
        try { await mainLoop(ns); }
        catch (error) {
            ns.print(`WARNING: An error was caught (and suppressed) in the main loop: ${error?.toString() || String(error)}`, false, 'warning');
        }
        await ns.asleep(interval);
    }
}

/** @param {NS} ns
 * Main loop that gathers data, checks on all sleeves, and manages them. */
async function mainLoop(ns) {
    try {
        const sleeveData = JSON.parse(ns.read('/tmp/sleeves_static.txt'));
        numSleeves = sleeveData.getNumSleeves;
    } catch { }
    // Update info
    numSleeves = numSleeves || 7;
    playerInfo = ns.getPlayer();
    let budget = playerInfo.money * options['aug-budget'];

    // Update all sleeve stats and loop over all sleeves to do some individual checks and task assignments
    let sleeveStats = [];
    let sleeveInfo = [];
    for (let i = 0; i < numSleeves; i++) {
        sleeveStats.push(ns.sleeve.getSleeveStats(i));
        sleeveInfo.push(ns.sleeve.getInformation(i));
    }
    for (let i = 0; i < numSleeves; i++) {
        let sleeve = { ...sleeveStats[i], ...sleeveInfo[i] }; // For convenience, merge all sleeve stats/info into one object
        // MANAGE SLEEVE AUGMENTATIONS
        if (sleeve.shock === 0) // No augs are available augs until shock is 0
            budget -= await manageSleeveAugs(ns, i, budget);

        // ASSIGN SLEEVE TASK
        // These tasks should be immediately discontinued in certain conditions, even if it hasn't been 'minTaskWorkTime'
        if (task[i] === "recover from shock" && sleeve.shock === 0 ||
            task[i] === "synchronize" && sleeve.sync === 100)
            lastReassignTime[i] = 0;
        // Otherwise, don't change tasks if we've changed tasks recently (avoids e.g. disrupting long crimes too frequently)
        if (Date.now() - (lastReassignTime[i] || 0) < minTaskWorkTime) continue;

        // Decide what we think the sleeve should be doing for the next little while
        let [designatedTask, command, args, statusUpdate] = await pickSleeveTask(ns, i, sleeve);

        // Start the clock, this sleeve should stick to this task for minTaskWorkTime
        lastReassignTime[i] = Date.now();
        // Set the sleeve's new task if it's not the same as what they're already doing.
        if (task[i] !== designatedTask)
            await setSleeveTask(ns, i, designatedTask, command, args);

        // For certain tasks, log a periodic status update.
        if (statusUpdate && Date.now() - (lastStatusUpdateTime[i] ?? 0) > minTaskWorkTime) {
            ns.print(`INFO: Sleeve ${i} is ${statusUpdate} `);
            lastStatusUpdateTime[i] = Date.now();
        }
    }
}

/** @param {NS} ns
 * @param i
 * @param budget
 * Purchases augmentations for sleeves */
async function manageSleeveAugs(ns, i, budget) {
    // Retrieve and cache the set of available sleeve augs (cached temporarily, but not forever, in case rules around this change)
    if (availableAugs[i] == null || Date.now() > cacheExpiry[i]) {
        cacheExpiry[i] = Date.now() + 60000;
        availableAugs[i] = (ns.sleeve.getSleevePurchasableAugs(i)).sort((a, b) => a.cost - b.cost);
    }
    if (availableAugs[i].length === 0) return 0;

    const cooldownLeft = Math.max(0, options['buy-cooldown'] - (Date.now() - (lastPurchaseTime[i] || 0)));
    const [batchCount, batchCost] = availableAugs[i].reduce(([n, c], aug) => c + aug.cost <= budget ? [n + 1, c + aug.cost] : [n, c], [0, 0]);
    const purchaseUpdate = `sleeve ${i} can afford ${batchCount.toFixed(0).padStart(2)}/${availableAugs[i].length.toFixed(0).padEnd(2)} remaining augs ` +
        `(cost ${ns.nFormat(batchCost, '0.0a')} of ${ns.nFormat(availableAugs[i].reduce((t, aug) => t + aug.cost, 0), '0.0a')}).`;
    if (lastPurchaseStatusUpdate[i] !== purchaseUpdate)
        ns.print(`INFO: With budget ${ns.nFormat(budget, '0.0a')}, ${(lastPurchaseStatusUpdate[i] = purchaseUpdate)} ` +
            `(Min batch size: ${options['min-aug-batch']}, Cooldown: ${ns.tFormat(cooldownLeft)})`);
    if (cooldownLeft === 0 && batchCount > 0 && ((batchCount >= availableAugs[i].length - 1) || batchCount >= options['min-aug-batch'])) { // Don't require the last aug it's so much more expensive
        let strAction = `Purchase ${batchCount} augmentations for sleeve ${i} at total cost of ${ns.nFormat(batchCost, '0.0.a')}`;
        let toPurchase = availableAugs[i].splice(0, batchCount);
        // if (await getNsDataThroughFile(ns, `ns.args.slice(1).reduce((s, aug) => s && ns.sleeve.purchaseSleeveAug(ns.args[0], aug), true)`,
        //     '/Temp/sleeve-purchase.txt', [i, ...toPurchase.map(a => a.name)])) {
        if (await [i, ...toPurchase.map(a => a.name)].slice(1).reduce((s, aug) => s && ns.sleeve.purchaseSleeveAug(i, aug), true)) {
            ns.print(`SUCCESS: ${strAction}`, true, 'success');
        } else ns.print(`ERROR: Failed to ${strAction}`, true, 'error');
        lastPurchaseTime[i] = Date.now();
        return batchCost; // Even if we think we failed, return the predicted cost so if the purchase did go through, we don't end up over-budget
    }
    return 0;
}

/** @param {NS} ns
 * @param i
 * @param sleeve
 * Picks the best task for a sleeve, and returns the information to assign and give status updates for that task. */
async function pickSleeveTask(ns, i, sleeve) {
    // Must synchronize first iif you haven't maxed memory on every sleeve.
    if (sleeve.sync < 100)
        return ["synchronize", ns.sleeve.setToSynchronize, [i], `syncing... ${sleeve.sync.toFixed(2)}%`];
    // Opt to do shock recovery if above the --min-shock-recovery threshold, or if above 0 shock, with a probability of --shock-recovery
    if (sleeve.shock > options['min-shock-recovery'] || sleeve.shock > 0 && options['shock-recovery'] > 0 && Math.random() < options['shock-recovery'])
        return ["recover from shock", ns.sleeve.setToShockRecovery, [i], `recovering from shock... ${sleeve.shock.toFixed(2)}%`];
    // If player is currently working for faction or company rep, sleeves 0 can help him out (Note: Only one sleeve can work for a faction)
    if (i === 0 && playerInfo.isWorking && playerInfo.workType === "Working for Faction") {
        // TODO: We should be able to borrow logic from work-for-factions.js to have more sleeves work for useful factions / companies
        // We'll cycle through work types until we find one that is supported. TODO: Auto-determine the most productive faction work to do.
        const faction = playerInfo.currentWorkFactionName;
        const work = works[workByFaction[faction] || 0];
        return [`work for faction '${faction}' (${work})`, ns.sleeve.setToFactionWork, [i, faction, work],
            /*   */ `helping earn rep with faction ${faction} by doing ${work}.`];
    }
    if (i === 0 && playerInfo.isWorking && playerInfo.workType === "Working for Company") { // If player is currently working for a company rep, sleeves 0 shall help him out (only one sleeve can work for a company)
        return [`work for company '${playerInfo.companyName}'`, ns.sleeve.setToCompanyWork, [i, playerInfo.companyName],
            /*   */ `helping earn rep with company ${playerInfo.companyName}.`];
    }
    // Finally, do crime for Karma. Homicide has the rate gain, if we can manage a decent success rate.
    // TODO: This is less useful after gangs are unlocked, can we think of better things to do afterwards?
    let crime = options.crime || (await calculateCrimeChance(ns, sleeve, "homicide")) >= options['homicide-chance-threshold'] ? 'homicide' : 'mug';
    return [`commit ${crime} `, ns.sleeve.setToCommitCrime, [i, crime],
        /*   */ `committing ${crime} with chance ${((await calculateCrimeChance(ns, sleeve, crime)) * 100).toFixed(2)}% ` +
        /*   */ (options.crime || crime === "homicide" ? '' : // If auto-criming, user may be curious how close we are to switching to homicide
            /*   */     ` (Note: Homicide chance would be ${((await calculateCrimeChance(ns, sleeve, "homicide")) * 100).toFixed(2)}% `)];
}

/** @param {NS} ns
 * @param i
 * @param designatedTask
 * @param command
 * @param args
 * Sets a sleeve to its designated task, with some extra error handling logic for working for factions. */
async function setSleeveTask(ns, i, designatedTask, command, args) {
    let strAction = `Set sleeve ${i} to ${designatedTask} `;
    if (await command(...args)) {
        task[i] = designatedTask;
        ns.print(`SUCCESS: ${strAction} `);
        return true;
    }
    // If assigning the task failed...
    lastReassignTime[i] = 0;
    // If working for a faction, it's possible he current work isn't supported, so try the next one.
    if (designatedTask.startsWith('work for faction')) {
        ns.print(`WARN: Failed to ${strAction} - work type may not be supported.`, false, 'warning');
        workByFaction[playerInfo.currentWorkFactionName] = (workByFaction[playerInfo.currentWorkFactionName] || 0) + 1;
    } else
        ns.print(`ERROR: Failed to ${strAction} `, true, 'error');
    return false;
}

/** @param {NS} ns
 * @param sleeve
 * @param crimeName
 * Calculate the chance a sleeve has of committing homicide successfully. */
async function calculateCrimeChance(ns, sleeve, crimeName) {
    // If not in the cache, retrieve this crime's stats
    const crimeStats = cachedCrimeStats[crimeName] ?? (cachedCrimeStats[crimeName] = ns.getCrimeStats(crimeName));
    let chance =
        (crimeStats.hacking_success_weight || 0) * sleeve.hacking +
        (crimeStats.strength_success_weight || 0) * sleeve.strength +
        (crimeStats.defense_success_weight || 0) * sleeve.defense +
        (crimeStats.dexterity_success_weight || 0) * sleeve.dexterity +
        (crimeStats.agility_success_weight || 0) * sleeve.agility +
        (crimeStats.charisma_success_weight || 0) * sleeve.charisma;
    chance /= 975;
    chance /= crimeStats.difficulty;
    return Math.min(chance, 1);
}