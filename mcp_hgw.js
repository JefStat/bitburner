import { list_servers } from 'opened_servers.js';
import { boxTailSingleton, ramUsage } from 'utils.js';
import { calculateGrowThreads } from './growthFunctions.js';

let ns;
const weaken_script = "weaken.js";
const grow_script = "grow.js";
const hack_script = "hack.js";
let hack_scriptRam = 1.7;
let grow_scriptRam, weaken_scriptRam = 1.75;
let ServerGrowthRate = 1;
let serversForExecution = [];
let hackStatus = [];
/** @param {NS} pns **/
export async function main(pns) {
    ns = pns;
    ns.disableLog('ALL');
    ns.enableLog('exec')
    ns.clearLog();
    ns.tail();
    boxTailSingleton(ns, 'mcp', '🥾', '200px');
    weaken_scriptRam = ns.getScriptRam(weaken_script, "home");
    grow_scriptRam = ns.getScriptRam(grow_script, "home");
    hack_scriptRam = ns.getScriptRam(hack_script, "home");
    ; ({ ServerGrowthRate } = JSON.parse(ns.read('/tmp/getBitNodeMultipliers.txt')))
    await run();
}
let hackPercent = .5;
let bonusServers = 0;
async function updateServerLists() {
    serversForExecution = ['home'].concat(list_servers(ns).filter(s => ns.hasRootAccess(s)));
    const beforeHackStatusLength = hackStatus.length;
    const serversToHack = list_servers(ns).filter(s => ns.hasRootAccess(s)
        && ns.getServerMaxMoney(s) > 0
        && ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel() / 2);

    hackStatus = [];
    const skippedServer = []
    const player = ns.getPlayer();
    for (const server of serversToHack) {
        const s = ns.getServer(server);
        s.hackDifficulty = s.minDifficulty;
        // check that hacks will succeed. Could be redundant check
        const hackChance = ns.formulas.hacking.hackChance(s, player);
        if (hackChance < .99) {
            //ns.print(`Hack chance to low ${s} ${(hackChance * 100).toFixed(2)}%`)
            continue;
        }
        if (s.serverGrowth < 40) {
            //ns.print(`Growth is to low ${s} ${s.serverGrowth}%`)
            skippedServer.push({ server: server });
            continue;
        }
        hackStatus.push({ server: server });
    }
    const lowRamUse = ramUsage(ns) < .5;
    const oldHackPercent = hackPercent;
    const oldBonusServers = bonusServers;
    if (lowRamUse) {
        hackPercent = Math.min(hackPercent + .1, .95);
        if (hackPercent === .95) {
            bonusServers = Math.min(bonusServers + 1, skippedServer.length);
            hackStatus.push(...skippedServer.slice(0, bonusServers));
        }
    } else {
        bonusServers = Math.max(bonusServers - 1, 0);
        if (bonusServers <= 0) hackPercent = Math.max(hackPercent - .1, .5);
    }
    if (oldHackPercent !== hackPercent || oldBonusServers !== bonusServers) ns.tprint(`BonusServers added ${bonusServers} Hack percent ${hackPercent}`);
    // after aug install just start hacking on n00dles fist
    if (hackStatus.length === 0) hackStatus.push({ server: 'n00dles' });
    if (beforeHackStatusLength < hackStatus.length) ns.tprint(`Servers to hack ${hackStatus.length} ${hackStatus.map(o => o.server).join(',')}`);
}

async function run() {
    let i = 0;
    await updateServerLists();
    let updateAfter = Date.now().valueOf() + 30 * 1000;
    while (true) {
        if (!hackStatus[i].pid || (hackStatus[i].pid && !ns.isRunning(hackStatus[i].pid.weaken))) {
            const ret = await runHGW(hackStatus[i].server);
            hackStatus[i] = ret;
        }
        i = (i + 1) % hackStatus.length;
        await ns.sleep(20);
        if (updateAfter < Date.now()) {
            updateAfter = Date.now() + 30 * 1000;
            await updateServerLists();
            i = 0;
        }
    }
}

async function runHGW(target) {
    const currentSec = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
    if (currentSec > 2) {
        const weaken = await runWeaken(target, 1, 1);
        return { server: target, promise: ns.asleep(weaken.time + 200), pid: { weaken: weaken.pid } };
    }
    const hack = await runHack(target);
    const grow = await runGrow(target, hack.amount);
    const weaken = await runWeaken(target, hack.threadsCommitted, grow.threadsCommitted);
    return { server: target, promise: ns.asleep(weaken.time + 200), pid: { weaken: weaken.pid, hack: hack.pid, grow: grow.pid } };
}

//TODO move thread planning for HGW all together before exec
async function runWeaken(target, hackThreads, growThreads) {
    const ret = { time: 0, threadsCommitted: 0, pid: 0 };
    let security = ns.growthAnalyzeSecurity(growThreads);
    security += ns.hackAnalyzeSecurity(hackThreads);
    // slash the security if not at min to prep it
    const currentSec = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
    if (currentSec > 0) {
        security += currentSec
    }
    const threadsNeeded = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
    const homeThreadsNeeded = Math.max(Math.ceil(security / ns.weakenAnalyze(1, getCores('home'))), 1);
    const { host, threads_available } = getHostAndThreads(weaken_scriptRam, threadsNeeded, homeThreadsNeeded);
    if (!host) return ret;
    let threadToUse = Math.min(threads_available, threadsNeeded);
    if (host === 'home') { //hurray home for grow
        threadToUse = Math.min(threads_available, homeThreadsNeeded);
    }
    ret.pid = await ns.exec(weaken_script, host, threadToUse, target, Math.random());
    ret.time = ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer());
    const message = `Weak ${host}[${threadToUse}] -> ${target} in ${ns.tFormat(ret.time)}]`;
    if (ret.pid === 0) {
        ns.tprint('FAILED ' + message);
        ns.print('FAILED ' + message);
        return ret;
    }
    ret.threadsCommitted = threadToUse;
    return ret;
}

async function runGrow(target, hackAmount) {
    const ret = { time: 0, threadsCommitted: 0, pid: 0 };
    // grow to counter the hack or just to fill up the server with money
    const moneyToGrow = Math.max(hackAmount, ns.getServerMaxMoney(target) - ns.getServerMoneyAvailable(target));
    const homeThreadsNeeded = Math.floor(calculateGrowThreads(ns, target, moneyToGrow, getCores('home'), { ServerGrowthRate }));
    const threadsNeeded = Math.floor(calculateGrowThreads(ns, target, moneyToGrow, 1, { ServerGrowthRate }));
    const { host, threads_available } = getHostAndThreads(grow_scriptRam, threadsNeeded, homeThreadsNeeded);
    if (!host) return ret;
    let threadToUse = Math.min(threads_available, threadsNeeded);
    if (host === 'home') { //hurray home for grow
        threadToUse = Math.min(threads_available, homeThreadsNeeded);
    }
    if (threadToUse < 1) {
        return ret;
    }
    ret.pid = await ns.exec(grow_script, host, threadToUse, target, Math.random());
    ret.time = ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer());
    const message = `Grow ${host}[${threadToUse}] -> ${target} in ${ns.tFormat(ret.time)}]`;
    if (ret.pid === 0) {
        ns.tprint('FAILED ' + message);
        ns.print('FAILED ' + message);
        return ret;
    }
    ret.threadsCommitted = threadToUse;
    return ret;
}

async function runHack(target) {
    const ret = { time: 0, threadsCommitted: 0, pid: 0, amount: 0 };
    const threadsNeeded = Math.max(Math.floor(hackPercent / ns.formulas.hacking.hackPercent(ns.getServer(target), ns.getPlayer())), 1);
    const { host, threads_available } = getHostAndThreads(hack_scriptRam, threadsNeeded, threadsNeeded * 1.1 /*try to dissuade hacks on home*/);
    if (!host) return ret;
    let threadToUse = Math.min(threads_available, threadsNeeded);
    if (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target) < .9) {
        threadToUse = 1; // 0 or 1 just don't hack if server is not prepped
    }

    const cashingOut = ns.hackAnalyze(target) * threadToUse * ns.getServerMoneyAvailable(target);
    ret.pid = await ns.exec(hack_script, host, threadToUse, target, Math.random());
    ret.time = ns.formulas.hacking.hackTime(ns.getServer(target), ns.getPlayer());
    const message = `Hack ${host}[${threadToUse}] -> ${target}[${ns.nFormat(cashingOut, "($ 0.00 a)")} in ${ns.tFormat(ret.time)}]`;
    if (ret.pid === 0) {
        ns.tprint('FAILED ' + message);
        ns.print('FAILED ' + message);
        return ret;
    }
    ret.amount = cashingOut;
    ns.print(message);
    ret.threadsCommitted = threadToUse;
    return ret;
}

const getCores = (host) => ns.getServer(host).cpuCores;
function getHostAndThreads(scriptRam, threadsNeeded, threadsNeededOnHome) {
    threadsNeededOnHome = threadsNeededOnHome || threadsNeeded;
    const hosts = serversForExecution.map((host) => {
        let maxRam = ns.getServerMaxRam(host);
        // reserve some ram for other scripts
        if (host === 'home') {
            maxRam = Math.max(maxRam * .75, maxRam - 128);
        }
        const threads_available = Math.floor((maxRam - ns.getServerUsedRam(host)) / scriptRam);
        const threadsAvailMinusNeed = host === 'home' ? threads_available - threadsNeededOnHome : threads_available - threadsNeeded;
        return { threads_available, host, threadsAvailMinusNeed };
    }).filter((hostO) => hostO.threads_available >= 1);
    if (hosts.length <= 0) return { host: null, threads_available: 0 };
    hosts.sort((a, b) => a.threadsAvailMinusNeed - b.threadsAvailMinusNeed);
    // take the closet fit from front of the array or just the biggest threads available from the end
    return hosts.filter(o => o.threadsAvailMinusNeed >= 0).shift() || hosts.pop();
}