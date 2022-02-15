let ns;

let queueDelay = 100; // the delay that it can take for a script to start, used to pessimistically schedule things in advance
let maxBatches = 40; // the max number of batches this daemon will spool up to avoid running out of IRL ram
// the number of milliseconds to delay the grow execution after theft to ensure it doesn't trigger too early and have no effect.
// For timing reasons the delay between each step should be *close* 1/4th of this number, but there is some imprecision
let cycleTimingDelay = 1600;
let hack_percent = .5;
let verbose = true;

let rootedServers;
let player;
let ram_total = 64;
let bitnodeMults = {
  'HackingLevelMultiplier': 1,
  'StrengthLevelMultiplier': 1,
  'DefenseLevelMultiplier': 1,
  'DexterityLevelMultiplier': 1,
  'AgilityLevelMultiplier': 1,
  'CharismaLevelMultiplier': 1,
  'ServerGrowthRate': 1,
  'ServerMaxMoney': 2,
  'ServerStartingMoney': 0.5,
  'ServerStartingSecurity': 2,
  'ServerWeakenRate': 1,
  'HomeComputerRamCost': 1,
  'PurchasedServerCost': 1,
  'PurchasedServerSoftcap': 1.2,
  'PurchasedServerLimit': 1,
  'PurchasedServerMaxRam': 1,
  'CompanyWorkMoney': 1,
  'CrimeMoney': 0.5,
  'HacknetNodeMoney': 0.2,
  'ManualHackMoney': 1,
  'ScriptHackMoney': 0.15,
  'ScriptHackMoneyGain': 1,
  'CodingContractMoney': 1,
  'ClassGymExpGain': 1,
  'CompanyWorkExpGain': 1,
  'CrimeExpGain': 1,
  'FactionWorkExpGain': 1,
  'HackExpGain': 0.5,
  'FactionPassiveRepGain': 1,
  'FactionWorkRepGain': 1,
  'RepToDonateToFaction': 1,
  'AugmentationMoneyCost': 2,
  'AugmentationRepCost': 1,
  'InfiltrationMoney': 1.5,
  'InfiltrationRep': 1.5,
  'FourSigmaMarketDataCost': 1,
  'FourSigmaMarketDataApiCost': 1,
  'CorporationValuation': 0.5,
  'CorporationSoftCap': 1,
  'BladeburnerRank': 1,
  'BladeburnerSkillCost': 1,
  'GangSoftcap': 1,
  'DaedalusAugsRequirement': 1,
  'StaneksGiftPowerMultiplier': 1.3,
  'StaneksGiftExtraSize': 0,
  'WorldDaemonDifficulty': 1.5
};

function log(m) {
  ns.print ? ns.print(m) : console.log(m);
}

function formatMoney(m) {
  return ns.nFormat ? ns.nFormat(m, '($0.00a)') : m;
}

export function fakeInit(pns, rServers, pplayer) {
  ns = pns;
  rootedServers = rServers;
  player = pplayer;
}

/** @param {NS} ns **/
export async function main(pns) {
  ns = pns;
  player = ns.getPlayer();
  let performanceSnapshot = optimizePerformanceMetrics(server); // Adjust the percentage to steal for optimal scheduling
  await performScheduling(server, performanceSnapshot);
}

export async function performScheduling(currentTarget, snapshot) {
  const start = Date.now();
  const scheduledTasks = [];
  const maxCycles = Math.min(snapshot.optimalPacedCycles, snapshot.maxCompleteCycles);
  if (!snapshot)
    return;
  if (maxCycles === 0) {
    log(`WARNING: Attempt to schedule ${getTargetSummary(currentTarget)} returned 0 max cycles? ${JSON.stringify(snapshot)}`, false, 'warning');
    return;
  } else if (currentTarget.getHackThreadsNeeded() === 0) {
    log(`WARNING: Attempted to schedule empty cycle ${maxCycles} x ${getTargetSummary(currentTarget)}? ${JSON.stringify(snapshot)}`, false, 'warning');
    return;
  }
  let firstEnding = null, lastStart = null, lastBatch = 0, cyclesScheduled = 0;
  while (cyclesScheduled < maxCycles) {
    const newBatchStart = new Date((cyclesScheduled === 0) ? Date.now() + queueDelay : lastBatch.getTime() + cycleTimingDelay);
    lastBatch = new Date(newBatchStart.getTime());
    const batchTiming = getScheduleTiming(newBatchStart, currentTarget);
    const newBatch = getScheduleObject(batchTiming, currentTarget, scheduledTasks.length);
    if (firstEnding === null) { // Can't start anything after this first hack completes (until back at min security), or we risk throwing off timing
      firstEnding = new Date(newBatch.hackEnd.valueOf());
    }
    if (lastStart === null || lastStart < newBatch.firstFire) {
      lastStart = new Date(newBatch.lastFire.valueOf());
    }
    if (cyclesScheduled > 0 && lastStart >= firstEnding) {
      if (verbose)
        log(`Had to stop scheduling at ${cyclesScheduled} of ${maxCycles} desired cycles (lastStart: ${lastStart} >= firstEnding: ${firstEnding}) ${JSON.stringify(snapshot)}`);
      break;
    }
    scheduledTasks.push(newBatch);
    cyclesScheduled++;
  }

  for (const schedObj of scheduledTasks) {
    for (const schedItem of schedObj.scheduleItems) {
      const discriminationArg = `Batch ${schedObj.batchNumber}-${schedItem.description}`;
      // Args spec: [0: Target, 1: DesiredStartTime (used to delay tool start), 2: ExpectedEndTime (informational), 3: Duration (informational), 4: DoStockManipulation, 5: DisableWarnings]
      const args = [currentTarget.name, schedItem.start.getTime(), schedItem.end.getTime(), schedItem.end - schedItem.start, discriminationArg];
      if (['hack', 'grow'].includes(schedItem.toolShortName)) // Push an arg used by remote hack/grow tools to determine whether it should manipulate the stock market
        args.push(stockMode && (schedItem.toolShortName == 'hack' && shouldManipulateHack[currentTarget.name] || schedItem.toolShortName == 'grow' && shouldManipulateGrow[currentTarget.name]) ? 1 : 0);
      if (['hack', 'weak'].includes(schedItem.toolShortName))
        args.push(options['silent-misfires'] || // Optional arg to disable toast warnings about a failed hack if hacking money gain is disabled
        (schedItem.toolShortName == 'hack' && (bitnodeMults.ScriptHackMoneyGain == 0 || playerStats.bitNodeN == 8)) ? 1 : 0); // Disable automatically in BN8 (hack income disabled)
      args.push(loopingMode ? 1 : 0); // Argument to indicate whether the cycle should loop perpetually
      if (recoveryThreadPadding > 1 && ['weak', 'grow'].includes(schedItem.toolShortName))
        schedItem.threadsNeeded *= recoveryThreadPadding; // Only need to pad grow/weaken threads
      if (options.i && currentTerminalServer?.name == currentTarget.name && schedItem.toolShortName == 'hack')
        schedItem.toolShortName = 'manualhack';
      const result = await arbitraryExecution(ns, getTool(schedItem.toolShortName), schedItem.threadsNeeded, args);
      if (result == false) { // If execution fails, we have probably run out of ram.
        log(`WARNING: Scheduling failed for ${getTargetSummary(currentTarget)} ${discriminationArg} of ${cyclesScheduled} Took: ${Date.now() - start}ms`, false, 'warning');
        currentTarget.previousCycle = `INCOMPLETE. Tried: ${cyclesScheduled} x ${getTargetSummary(currentTarget)}`;
        return false;
      }
    }
  }
  if (verbose)
    log(`Scheduled ${cyclesScheduled} x ${getTargetSummary(currentTarget)} Took: ${Date.now() - start}ms`);
  currentTarget.previousCycle = `${cyclesScheduled} x ${getTargetSummary(currentTarget)}`;
  return true;
}

// returns an object that contains all 4 timed events start and end times as dates
function getScheduleTiming(fromDate, currentTarget) {
  const delayInterval = cycleTimingDelay / 4; // spacing interval used to pace our script resolution
  const hackTime = currentTarget.timeToHack(); // first to fire
  const weakenTime = currentTarget.timeToWeaken(); // second to fire
  const growTime = currentTarget.timeToGrow(); // third to fire
  const slowestTool = Math.max(hackTime, weakenTime, growTime);
  // Determine the times we want tasks to complete at, working backwards, and plan the execution start time accordingly
  const t4_secondWeakenResolvesAt = new Date(fromDate.getTime() + slowestTool + delayInterval * 3); // step 4 - weaken after grow fires last
  const t4_fireSecondWeakenAt = new Date(t4_secondWeakenResolvesAt.getTime() - weakenTime);
  const t3_growResolvesAt = new Date(t4_secondWeakenResolvesAt.getTime() - delayInterval); // step 3 (grow back) should resolve "delay" before the final weaken
  const t3_fireGrowAt = new Date(t3_growResolvesAt.getTime() - growTime);
  const t2_firstWeakenResolvesAt = new Date(t3_growResolvesAt.getTime() - delayInterval); // step 2 (weaken after hack) should resolve "delay" before the grow.
  const t2_fireFirstWeakenAt = new Date(t2_firstWeakenResolvesAt.getTime() - weakenTime);
  const t1_hackResolvesAt = new Date(t2_firstWeakenResolvesAt.getTime() - delayInterval); // step 1 (steal a bunch of money) should resolve "delay" before its respective weaken.
  const t1_fireHackAt = new Date(hackOnly ? fromDate.getTime() : t1_hackResolvesAt.getTime() - hackTime);
  // Track when the last task would be start (we need to ensure this doesn't happen after a prior batch has begun completing tasks)
  const lastThingThatFires = new Date(Math.max(t4_fireSecondWeakenAt.getTime(), t3_fireGrowAt.getTime(), t2_fireFirstWeakenAt.getTime(), t1_fireHackAt.getTime()));
  let schedule = {
    batchStart: fromDate,
    lastFire: lastThingThatFires,
    hackStart: t1_fireHackAt,
    hackEnd: t1_hackResolvesAt,
    firstWeakenStart: t2_fireFirstWeakenAt,
    firstWeakenEnd: t2_firstWeakenResolvesAt,
    growStart: t3_fireGrowAt,
    growEnd: t3_growResolvesAt,
    secondWeakenStart: t4_fireSecondWeakenAt,
    secondWeakenEnd: t4_secondWeakenResolvesAt
  };
  if (verbose && runOnce) {
    log(`Current Time: ${formatDateTime(new Date())} Established a schedule for ${getTargetSummary(currentTarget)} from requested startTime ${formatDateTime(fromDate)}:` +
      `\n  Hack - End: ${formatDateTime(schedule.hackEnd)}  Start: ${formatDateTime(schedule.hackStart)}  Time: ${formatDuration(hackTime)}` +
      `\n  Weak1- End: ${formatDateTime(schedule.firstWeakenEnd)}  Start: ${formatDateTime(schedule.firstWeakenStart)}  Time: ${formatDuration(weakenTime)}` +
      `\n  Grow - End: ${formatDateTime(schedule.growEnd)}  Start: ${formatDateTime(schedule.growStart)}  Time: ${formatDuration(growTime)}` +
      `\n  Weak2- End: ${formatDateTime(schedule.secondWeakenEnd)}  Start: ${formatDateTime(schedule.secondWeakenStart)}  Time: ${formatDuration(weakenTime)}`);
  }
  return schedule;
}

function getScheduleObject(batchTiming, currentTarget, batchNumber) {
  var schedItems = [];

  var schedHack = getScheduleItem('hack', 'hack', batchTiming.hackStart, batchTiming.hackEnd, currentTarget.getHackThreadsNeeded());
  var schedWeak1 = getScheduleItem('weak1', 'weak', batchTiming.firstWeakenStart, batchTiming.firstWeakenEnd, currentTarget.getWeakenThreadsNeededAfterTheft());
  // Special end-game case, if we have no choice but to hack a server to zero money, schedule back-to-back grows to restore money
  if (currentTarget.percentageStolenPerHackThread() >= 1) {
    // Use math and science to minimize total threads required to inject 1 dollar per threads, then grow that to max.
    let calcThreadsForGrow = money => Math.ceil(((Math.log(1 / (money / currentTarget.getMaxMoney())) / Math.log(currentTarget.adjustedGrowthRate()))
      / currentTarget.serverGrowthPercentage()).toPrecision(14));
    let stepSize = Math.floor(currentTarget.getMaxMoney() / 4), injectThreads = stepSize,
      schedGrowThreads = calcThreadsForGrow(injectThreads);
    for (let i = 0; i < 100 && stepSize > 0; i++) {
      if (injectThreads + schedGrowThreads > (injectThreads + stepSize) + calcThreadsForGrow(injectThreads + stepSize))
        injectThreads += stepSize;
      else if (injectThreads + schedGrowThreads > (injectThreads - stepSize) + calcThreadsForGrow(injectThreads - stepSize))
        injectThreads -= stepSize;
      schedGrowThreads = calcThreadsForGrow(injectThreads);
      stepSize = Math.floor(stepSize / 2);
    }
    schedItems.push(getScheduleItem('grow-from-zero', 'grow', new Date(batchTiming.growStart.getTime() - (cycleTimingDelay / 8)),
      new Date(batchTiming.growEnd.getTime() - (cycleTimingDelay / 8)), injectThreads)); // Will put $injectThreads on the server
    // This will then grow from whatever % $injectThreads is back to 100%
    var schedGrow = getScheduleItem('grow', 'grow', batchTiming.growStart, batchTiming.growEnd, schedGrowThreads);
    var schedWeak2 = getScheduleItem('weak2', 'weak', batchTiming.secondWeakenStart, batchTiming.secondWeakenEnd,
      Math.ceil(((injectThreads + schedGrowThreads) * growthThreadHardening / actualWeakenPotency()).toPrecision(14)));
    if (verbose)
      log(`INFO: Special grow strategy since percentage stolen per hack thread is 100%: G1: ${injectThreads}, G1: ${schedGrowThreads}, W2: ${schedWeak2.threadsNeeded} (${currentTarget.name})`);
  } else {
    var schedGrow = getScheduleItem('grow', 'grow', batchTiming.growStart, batchTiming.growEnd, currentTarget.getGrowThreadsNeededAfterTheft());
    var schedWeak2 = getScheduleItem('weak2', 'weak', batchTiming.secondWeakenStart, batchTiming.secondWeakenEnd, currentTarget.getWeakenThreadsNeededAfterGrowth());
  }

  if (hackOnly) {
    schedItems.push(schedHack);
  } else {
    // Schedule hack/grow first, because they cannot be split, and start with whichever requires the biggest chunk of free RAM
    schedItems.push(...(schedHack.threadsNeeded > schedGrow.threadsNeeded ? [schedHack, schedGrow] : [schedGrow, schedHack]));
    // Scheduler should ensure there's room for both, but splitting threads is annoying, so schedule the biggest first again to avoid fragmentation
    schedItems.push(...(schedWeak1.threadsNeeded > schedWeak2.threadsNeeded ? [schedWeak1, schedWeak2] : [schedWeak2, schedWeak1]));
  }

  var scheduleObject = {
    batchNumber: batchNumber,
    batchStart: batchTiming.batchStart,
    lastFire: batchTiming.lastFire,
    hackEnd: batchTiming.hackEnd,
    batchFinish: hackOnly ? batchTiming.hackEnd : batchTiming.secondWeakenEnd,
    scheduleItems: schedItems
  };
  return scheduleObject;
}

// initialize a new incomplete schedule item
function getScheduleItem(description, toolShortName, start, end, threadsNeeded) {
  var schedItem = {
    description: description,
    toolShortName: toolShortName,
    start: start,
    end: end,
    threadsNeeded: threadsNeeded
  };
  return schedItem;
}


// Adjusts the "percentage to steal" for a target based on its respective cost and the current network RAM available
export function optimizePerformanceMetrics(currentTarget) {
  const maxAdjustments = 1000;
  const start = Date.now();
  const networkStats = getNetworkStats();
  const percentPerHackThread = currentTarget.percentageStolenPerHackThread();
  const oldHackThreads = currentTarget.getHackThreadsNeeded();
  const oldActualPercentageToSteal = currentTarget.percentageToSteal = currentTarget.actualPercentageToSteal();

  if (percentPerHackThread >= 1) {
    currentTarget.percentageToSteal = percentPerHackThread;
    currentTarget.percentageToSteal = 1;
    return getPerformanceSnapshot(currentTarget, networkStats);
  }

  let lastAdjustmentSign = 1;
  let attempts = 0;
  let increment = Math.ceil((0.01 / percentPerHackThread).toPrecision(14)); // Initialize the adjustment increment to be the number of hack threads to steal roughly 1%
  let newHackThreads = oldHackThreads;
  currentTarget.percentageToSteal = Math.max(currentTarget.percentageToSteal, percentPerHackThread); // If the initial % to steal is below the minimum, raise it
  // Make adjustments to the number of hack threads until we zero in on the best amount
  while (++attempts < maxAdjustments) {
    let performanceSnapshot = getPerformanceSnapshot(currentTarget, networkStats);
    const adjustment = analyzeSnapshot(performanceSnapshot, currentTarget, networkStats, increment);
    if (runOnce && verbose)
      log(`Adjustment ${attempts} (increment ${increment}): ${adjustment} to ${newHackThreads} hack threads ` +
        `(from ${formatNumber(currentTarget.actualPercentageToSteal() * 100)}% or ${currentTarget.getHackThreadsNeeded()} hack threads)`);
    if (adjustment === 0.00 && increment === 1) break; // We've zeroed in on the exact number of hack threads we want
    if (adjustment === 0.00 || Math.sign(adjustment) !== lastAdjustmentSign) { // Each time we change the direction of adjustments, slow the adjustment rate
      increment = Math.max(1, Math.floor((increment / 2.0).toPrecision(14)));
      lastAdjustmentSign = adjustment === 0.00 ? lastAdjustmentSign : Math.sign(adjustment);
    }
    newHackThreads = Math.max(newHackThreads + adjustment, 0); // Adjust the percentage to steal with pefect precision by actually adjusting the number of hack threads
    currentTarget.percentageToSteal = Math.max(0, newHackThreads * percentPerHackThread);
  }
  if (attempts >= maxAdjustments || verbose && currentTarget.actualPercentageToSteal() != oldActualPercentageToSteal) {
    log(`Tuned % to steal from ${formatNumber(oldActualPercentageToSteal * 100)}% (${oldHackThreads} threads) to ` +
      `${formatNumber(currentTarget.actualPercentageToSteal() * 100)}% (${currentTarget.getHackThreadsNeeded()} threads) ` +
      `(${currentTarget.name}) Iterations: ${attempts} Took: ${Date.now() - start} ms`);
  }
  if (verbose && currentTarget.actualPercentageToSteal() == 0) {
    currentTarget.percentageToSteal = percentPerHackThread;
    log(`Insufficient RAM for min cycle: ${getTargetSummary(currentTarget)}`);
    currentTarget.percentageToSteal = 0.0;
  }
  if (currentTarget.percentageToSteal != 0 && (currentTarget.actualPercentageToSteal() == 0 ||
    Math.abs(currentTarget.actualPercentageToSteal() - currentTarget.percentageToSteal) / currentTarget.percentageToSteal > 0.5))
    log(`WARNING: Big difference between %ToSteal (${formatNumber(currentTarget.percentageToSteal * 100)}%) ` +
      `and actual%ToSteal (${formatNumber(currentTarget.actualPercentageToSteal() * 100)}%) after ${attempts} attempts. ` +
      `Min is: ${formatNumber(currentTarget.percentageStolenPerHackThread() * 100)}%`, false, 'warning');
  return performanceSnapshot;
}

// Suggests an adjustment to the percentage to steal based on how much ram would be consumed if attempting the current percentage.
function analyzeSnapshot(snapshot, currentTarget, networkStats, incrementalHackThreads) {
  const maxPercentageToSteal = options['max-steal-percentage'];
  const lastP2steal = currentTarget.percentageToSteal;
  // Priority is to use as close to the target ram as possible overshooting.
  const isOvershot = s => !s.canBeScheduled || s.maxCompleteCycles < s.optimalPacedCycles;
  if (verbose && runOnce)
    log(`canBeScheduled: ${snapshot.canBeScheduled},  maxCompleteCycles: ${snapshot.maxCompleteCycles}, optimalPacedCycles: ${snapshot.optimalPacedCycles}`);
  if (isOvershot(snapshot)) {
    return -incrementalHackThreads;
  } else if (snapshot.maxCompleteCycles > snapshot.optimalPacedCycles && lastP2steal < maxPercentageToSteal) {
    // Test increasing by the increment, but if it causes us to go over maximum desired utilization, do not suggest it
    currentTarget.percentageToSteal = (currentTarget.getHackThreadsNeeded() + incrementalHackThreads) * currentTarget.percentageStolenPerHackThread();
    var comparisonSnapshot = getPerformanceSnapshot(currentTarget, networkStats);
    currentTarget.percentageToSteal = lastP2steal;
    return isOvershot(comparisonSnapshot) ? 0.00 : incrementalHackThreads;
  }
  return 0.00;
}

// Helpers to get slices of info / cumulative stats across all rooted servers
function getNetworkStats() {
  const listOfServersFreeRam = rootedServers.map(s => s.ramAvailable()).filter(ram => ram > 1.6); // Servers that can't run a script don't count
  const totalMaxRam = rootedServers.map(s => s.totalRam()).reduce((a, b) => a + b, 0);
  const totalFreeRam = listOfServersFreeRam.reduce((a, b) => a + b, 0);
  return {
    listOfServersFreeRam: listOfServersFreeRam,
    totalMaxRam: totalMaxRam,
    totalFreeRam: totalFreeRam,
    totalUsedRam: totalMaxRam - totalFreeRam
  };
}

const playerHackSkill = () => player.hacking;
const getPlayerHackingGrowMulti = () => player.hacking_grow_mult;


// initial potency of weaken threads before multipliers
const weakenThreadPotency = 0.05;
// Pad weaken thread counts to account for undershooting. (Shouldn't happen. And if this is a timing issue, padding won't help)
const weakenThreadPadding = 0; //0.01;
// How much a weaken thread is expected to reduce security by
let actualWeakenPotency = () => bitnodeMults.ServerWeakenRate * weakenThreadPotency * (1 - weakenThreadPadding);

export function buildServerObject(ns, hostname) {
  const s = ns.getServer();
  // track how costly (in security) a growth/hacking thread is.
  const growthThreadHardening = 0.004;
  const hackThreadHardening = 0.002;
  // unadjusted server growth rate, this is way more than what you actually get
  const unadjustedGrowthRate = 1.03;
  // max server growth rate, growth rates higher than this are throttled.
  const maxGrowthRate = 1.0035;
  const so = {
    ns: ns,
    name: hostname,
    minDifficulty: s.minDifficulty,
    moneyMax: s.moneyMax,
    getMoneyPerRamSecond: () => getRatesAtHackLevel(ns, s, player, playerHackSkill(), ram_total),
    percentageToSteal: 1.0 / 16.0, // This will get tweaked automatically based on RAM available and the relative value of this server
    getMoney: () => ns.getServerMoneyAvailable(hostname),
    getSecurity: () => ns.getServerSecurityLevel(hostname),
    // canCrack: function () { return getNumPortCrackers() >= s.numOpenPortsRequired; },
    canHack: () => s.requiredHackingSkill <= playerHackSkill(),
    shouldHack: () => s.moneyMax > 0 && hostname !== 'home' && !hostname.startsWith('hacknet-node-'),
    previouslyPrepped: false,
    prepRegressions: 0,
    previousCycle: null,
    isPrepped: () => (ns.getServerSecurityLevel(hostname) === 0 || ((s.minDifficulty / ns.getServerSecurityLevel(hostname)) >= 0.99)) &&
      (s.moneyMax !== 0 && (ns.getServerMoneyAvailable(hostname) / s.moneyMax) >= 0.99),
    serverGrowthPercentage: () => s.serverGrowth * bitnodeMults.ServerGrowthRate * getPlayerHackingGrowMulti() / 100,
    adjustedGrowthRate: () => Math.min(maxGrowthRate, 1 + ((unadjustedGrowthRate - 1) / s.minDifficulty)),
    // this is the target growth coefficient *immediately*
    targetGrowthCoefficient: () => s.moneyMax / Math.max(ns.getServerMoneyAvailable(hostname), 1),
    percentageStolenPerHackThread: () => ns.formulas.hacking.hackPercent({
      hackDifficulty: s.minDifficulty,
      requiredHackingSkill: s.requiredHackingSkill
    }, player),
    hasRoot: () => ns.hasRootAccess(hostname),
    maxRam: s.maxRam,
    usedRam: () => ns.getServerUsedRam(hostname),
    ramAvailable: () => s.maxRam - ns.getServerUsedRam(hostname),
    growDelay: () => ns.getWeakenTime(hostname) - ns.getGrowTime(hostname) + cycleTimingDelay,
    hackDelay: () => ns.getWeakenTime(hostname) - ns.getHackTime(hostname),
    timeToWeaken: () => ns.getWeakenTime(hostname),
    timeToGrow: ns.getGrowTime(hostname),
    timeToHack: ns.getHackTime(hostname),
    weakenThreadsNeeded: () => Math.ceil(((ns.getServerSecurityLevel(hostname) - s.minDifficulty) / actualWeakenPotency()).toPrecision(14))
  };
  // Force rounding of low-precision digits before taking the floor, to avoid double imprecision throwing us way off.
  so.getHackThreadsNeeded = () => Math.floor((this.percentageToSteal / so.percentageStolenPerHackThread()).toPrecision(14));
  so.cyclesNeededForGrowthCoefficient = () => Math.log(so.targetGrowthCoefficient()) / Math.log(so.adjustedGrowthRate());
  so.cyclesNeededForGrowthCoefficientAfterTheft = () => Math.log(so.targetGrowthCoefficientAfterTheft()) / Math.log(so.adjustedGrowthRate());
  so.actualServerGrowthRate = () => Math.pow(so.adjustedGrowthRate(), so.serverGrowthPercentage());
  // this is the target growth coefficient per cycle, based on theft
  so.targetGrowthCoefficientAfterTheft = () => 1 / (1 - (so.getHackThreadsNeeded() * so.percentageStolenPerHackThread()));
  so.actualPercentageToSteal = () => so.getHackThreadsNeeded() * so.percentageStolenPerHackThread();
  so.getGrowThreadsNeeded = () => Math.min(s.moneyMax, Math.ceil((so.cyclesNeededForGrowthCoefficient() / so.serverGrowthPercentage()).toPrecision(14)));
  so.getGrowThreadsNeededAfterTheft = () => Math.min(s.moneyMax, Math.ceil((so.cyclesNeededForGrowthCoefficientAfterTheft() / so.serverGrowthPercentage()).toPrecision(14)));
  so.getWeakenThreadsNeededAfterTheft = () => Math.ceil((so.getHackThreadsNeeded() * hackThreadHardening / actualWeakenPotency()).toPrecision(14));
  so.getWeakenThreadsNeededAfterGrowth = () => Math.ceil((so.getGrowThreadsNeededAfterTheft() * growthThreadHardening / actualWeakenPotency()).toPrecision(14));
  return so;
}

const weaken_ram = 1.75;
const grow_ram = 1.75;
const hack_ram = 1.7;

// Helper to compute server gain/exp rates at a specific hacking level
export function getRatesAtHackLevel(ns, server, player, hackLevel, ram_total) {
  // Assume we will have weaken the server to min-security and taken it to max money
  const real_hackDifficulty = server.hackDifficulty;
  const real_moneyAvailable = server.moneyAvailable;
  server.hackDifficulty = server.minDifficulty;
  server.moneyAvailable = server.moneyMax;
  // Temporarily change the hack level on the player object to the requested level
  const real_player_hacking = player.hacking;
  player.hacking = hackLevel;
  // Compute the cost (ram*seconds) for each tool
  const weakenCost = weaken_ram * ns.formulas.hacking.weakenTime(server, player);
  const growCost = grow_ram * ns.formulas.hacking.growTime(server, player) + weakenCost * 0.004 / 0.05;
  const hackCost = hack_ram * ns.formulas.hacking.hackTime(server, player) + weakenCost * 0.002 / 0.05;

  // Compute the growth and hack gain rates
  const growGain = Math.log(ns.formulas.hacking.growPercent(server, 1, player, 1));
  const hackGain = ns.formulas.hacking.hackPercent(server, player);
  const grows_per_cycle = -Math.log(1 - hack_percent) / growGain;
  const hacks_per_cycle = hack_percent / hackGain;
  const hackProfit = server.moneyMax * hack_percent * ns.formulas.hacking.hackChance(server, player);
  // Compute the relative monetary gain
  const theoreticalGainRate = hackProfit / (growCost * grows_per_cycle + hackCost * hacks_per_cycle) * 1000 /* Convert per-millisecond rate to per-second */;
  const expRate = ns.formulas.hacking.hackExp(server, player) * (1 + 0.002 / 0.05) / (hackCost) * 1000;
  // The practical cap on revenue is based on your hacking scripts. For my hacking scripts this is about 20% per second, adjust as needed
  // No idea why we divide by ram_total - Basically ensures that as our available RAM gets larger, the sort order merely becomes "by server max money"
  const cappedGainRate = Math.min(theoreticalGainRate, hackProfit / ram_total);
  log(`At hack level ${hackLevel} and steal ${(hack_percent * 100).toPrecision(3)}%: Theoretical ${formatMoney(theoreticalGainRate)}, ` +
    `Limit: ${formatMoney(hackProfit / ram_total)}, Exp: ${expRate.toPrecision(3)}, Hack Chance: ${(ns.formulas.hacking.hackChance(server, player) * 100).toPrecision(3)}% (${server.hostname})`);
  // Restore values
  player.hacking = real_player_hacking;
  server.hackDifficulty = real_hackDifficulty;
  server.moneyAvailable = real_moneyAvailable;
  return [theoreticalGainRate, cappedGainRate, expRate];
}
