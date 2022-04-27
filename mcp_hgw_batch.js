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
	boxTailSingleton(ns, 'mcp_batch', '🥾', '200px');
	weaken_scriptRam = ns.getScriptRam(weaken_script, "home");
	grow_scriptRam = ns.getScriptRam(grow_script, "home");
	hack_scriptRam = ns.getScriptRam(hack_script, "home");
	; ({ ServerGrowthRate } = JSON.parse(ns.read('/tmp/getBitNodeMultipliers.txt')))
	await run();
}
let hackPercent = .5;
let bonusServers = 0;
function updateServerLists() {
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
	if (oldHackPercent !== hackPercent || oldBonusServers !== bonusServers) ns.print(`BonusServers added ${bonusServers} Hack percent ${hackPercent}`);
	// after aug install just start hacking on n00dles fist
	if (hackStatus.length === 0) hackStatus.push({ server: 'n00dles' });
	if (beforeHackStatusLength < hackStatus.length) ns.print(`Servers to hack ${hackStatus.length} ${hackStatus.map(o => o.server).join(',')}`);
}
let batches = [];
let target = 'n00dles';
async function run() {
	let i = 0;
	updateServerLists();
	let updateAfter = Date.now().valueOf() + 30 * 1000;
	while (true) {

		//todo prep logic

		// const currentSec = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
		// if (currentSec > 0) { // weaken prep
		// 	const weaken = await runWeaken(target);
		// 	return { server: target, promise: ns.asleep(weaken.time + 200), pid: { weaken: weaken.pid } };
		// }

		// todo run this check the moment before the hack lands, kill the PID if check fails
		// if (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target) < .9) {
		// 	return 0; // don't hack if server is not max money
		// }

		ns.print('planBatchRam');
		let newBatchPlan = await planBatchRam(target);
		while (newBatchPlan && batches.length < 50) {
			batches.push(newBatchPlan);
			newBatchPlan = await planBatchRam(target);
			// await ns.sleep(1);
		}
		ns.print('executeBatchParts');
		for (const batch of batches) {
			await executeBatchParts(batch);
		}
		// remove completed batches
		batches = batches.filter(o => o.weakenHosts || o.hackHost || o.growHost);

		// if (!hackStatus[i].pid || (hackStatus[i].pid && !ns.isRunning(hackStatus[i].pid.weaken))) {
		// 	const ret = await runHGW(hackStatus[i].server);
		// 	hackStatus[i] = ret;
		// }
		// i = (i + 1) % hackStatus.length;
		await ns.sleep(50);
		if (updateAfter < Date.now()) {
			updateAfter = Date.now() + 30 * 1000;
			updateServerLists();
			i = 0;
		}
		return; //run once testing
	}
}
async function executeBatchParts(batch) {
	/*
	.weakenHosts []
	.hackHost
		threads_available, host, threadsAvailMinusNeed, ramUsed
	.growHost
	 */

	const server = ns.getServer(batch.target);
	server.hackDifficulty = server.minDifficulty;
	server.moneyAvailable = server.moneyMax;

	// (hackStart - 200) < NO_START_BATCH < (weakenEnd + 200)
	const canRun = (date) => {
		const hacksOnSameTarget = batches.filter(o => o.target === batch.target && o.weakenEnd > 0);
		const batchesDuringDate = hacksOnSameTarget.filter(o => (o.hackEnd - 200) < date && date < (o.weakenEnd + 200));
		return batchesDuringDate.length === 0;
	}

	if (batch.growEnd && batch.growHost && canRun(Date.now())) {
		const growTime = ns.formulas.hacking.growTime(server, ns.getPlayer());
		const newGrowEnd = Date.now() + growTime;
		if (Math.abs(batch.growEnd - newGrowEnd) <= 100) {
			const pid = await runGrow(batch.target, batch.growHost);
			if (pid === 0) {
				ns.tprint('FAILED ' + 'to start grow');
			} else {
				batch.growStart = Date.now();
				batch.growEnd = newGrowEnd;
				delete batch.growHost;
			}
		} else if ((newGrowEnd - batch.growEnd) > 100) {
			ns.tprint('GROW START WINDOW MISSED');
			removeExclusion(batch.growHost.host, batch.growHost.ramUsed);
			delete batch.growHost;
		}
	}
	if (batch.hackEnd && batch.hackHost && canRun(Date.now())) {
		const hackTime = ns.formulas.hacking.hackTime(server, ns.getPlayer());
		const newHackEnd = Date.now() + hackTime;
		if (Math.abs(batch.hackEnd - newHackEnd) <= 100) {
			const pid = await runHack(batch.target, batch.hackHost);
			if (pid === 0) {
				ns.tprint('FAILED ' + 'to start hack');
			} else {
				batch.hackStart = Date.now();
				batch.hackEnd = newHackEnd;
				delete batch.hackHost;
			}
		} else if ((newHackEnd - batch.hackEnd) > 100) {
			ns.tprint('HACK START WINDOW MISSED');
			removeExclusion(batch.hackHost.host, batch.hackHost.ramUsed);
			delete batch.hackHost;
		}
	}

	if (batch.weakenHosts && canRun(Date.now())) {
		batch.weakenStart = Date.now();
		const pids = await runWeaken(batch.target, batch.weakenHosts);
		if (pids.filter(o => o === 0)) {
			ns.tprint('FAILED ' + 'to start all weakens');
		} else {
			batch.weakenEnd = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
			batch.growEnd = batch.weakenEnd - 200;
			batch.hackEnd = batch.growEnd - 200;
			delete batch.weakenHosts;
		}
	}
}

async function planBatchRam(target) {
	const server = ns.getServer(target);
	server.hackDifficulty = server.minDifficulty;
	server.moneyAvailable = server.moneyMax;
	const hackThreadsNeeded = () => {
		return Math.max(Math.floor(hackPercent / ns.formulas.hacking.hackPercent(server, ns.getPlayer())), 1);
	}
	const growThreadsNeeded = (host, hackThreads) => {
		const hackAmount = ns.hackAnalyze(target) * hackThreads * ns.getServerMaxMoney(target);
		return Math.ceil(calculateGrowThreads(ns, target, hackAmount, getCores(host), { ServerGrowthRate }));
	}
	const weakenThreadsNeeded = (host, hackThreads, growThreads) => {
		let security = ns.growthAnalyzeSecurity(growThreads);
		security += ns.hackAnalyzeSecurity(hackThreads);
		return Math.max(Math.ceil(security / ns.weakenAnalyze(1, getCores(host))), 1);
	}

	const batchPlan = getHostsAndThreads(hackThreadsNeeded, growThreadsNeeded, weakenThreadsNeeded);
	if (!batchPlan.weakenHosts || !batchPlan.hackHost || !batchPlan.growHost) {
		ns.print('No room to plan another batch');
		return;
	}
	batchPlan.target = target;
	return batchPlan;
}

async function runWeaken(target, hosts) {
	let pids = [];
	for (const host of hosts) {
		pids.push(await ns.exec(weaken_script, host.host, host.threads_available, target, Math.random()));
		removeExclusion(host.host, host.ramUsed);
	}
	return pids;
}

async function runGrow(target, host) {
	const pid = await ns.exec(grow_script, host.host, host.threads_available, target, Math.random());
	removeExclusion(host.host, host.ramUsed);
	return pid;
}

async function runHack(target, host) {
	const pid = await ns.exec(hack_script, host.host, host.threads_available, target, Math.random());
	removeExclusion(host.host, host.ramUsed);
	return pid;
}

const getCores = (host) => ns.getServer(host).cpuCores;

function getHostsAndThreads(hackThreadFunction, growThreadFunction, weakThreadFunction) {
	let hackHost;
	let growHost;
	let weakenHosts;
	hackHost = getHostAndThreadsFunc(hack_scriptRam, hackThreadFunction);
	if (hackHost.host) addExclusion(hackHost.host, hackHost.ramUsed);
	growHost = getHostAndThreadsFunc(grow_scriptRam, (host) => growThreadFunction(host, hackHost.threads_available));
	if (growHost.host) addExclusion(growHost.host, growHost.ramUsed);
	weakenHosts = getHostAndThreadsFunc(weaken_scriptRam, (host) => weakThreadFunction(host, hackHost.threads_available, growHost.threads_available), true);

	if (!hackHost.host || !growHost.host || weakenHosts.length <= 0) {
		removeExclusion(hackHost.host, hackHost.ramUsed);
		removeExclusion(growHost.host, growHost.ramUsed);
	} else {
		for (const weakenHost of weakenHosts) {
			addExclusion(weakenHost.host, weakenHost.ramUsed);
		}
	}
	return { hackHost, growHost, weakenHosts };
}

function getHostAndThreadsFunc(scriptRam, threadFunction, hostSplit) {
	const emptyRet = { threads_available: 0, host: null, threadsAvailMinusNeed: 0, ramUsed: 0 };
	const hosts = serversForExecution.map((host) => {
		let maxRam = ns.getServerMaxRam(host);
		// reserve some ram for other scripts
		if (host === 'home') {
			maxRam = Math.max(maxRam * .75, maxRam - 128);
		}
		const threads_available = Math.floor((maxRam - ns.getServerUsedRam(host) - excludedHostRam(host)) / scriptRam);
		let threadsNeeded = threadFunction(host);
		const ramUsed = parseFloat((threadsNeeded * scriptRam).toFixed(3));
		const threadsAvailMinusNeed = threads_available - threadsNeeded;
		return { threads_available, host, threadsAvailMinusNeed, ramUsed };
	}).filter((hostO) => hostO.threads_available >= 1);
	if (hosts.length <= 0) return emptyRet;
	hosts.sort((a, b) => a.threadsAvailMinusNeed - b.threadsAvailMinusNeed);
	if (hostSplit) {
		const threadsNeeded = threadFunction('n00dles');
		const serversWithRamFree = hosts.filter(o => o.threads_available > 0);
		let acc = 0;
		let hostsAcc = [];
		while (acc < threadsNeeded) {
			const s = serversWithRamFree.shift();
			if (!s) {
				// not enough servers with threads_available to fill need
				return [];
			}
			acc += s.threads_available;
			hostsAcc.push(s);
		}
		return hostsAcc;
	}
	// take the closet fit from front of the array or return empty
	return hosts.filter(o => o.threadsAvailMinusNeed >= 0).shift() || emptyRet;
}

const exclusionMap = {};
function addExclusion(host, ram) {
	exclusionMap[host] = exclusionMap[host] || 0;
	exclusionMap[host] = Math.min(exclusionMap[host] + ram, ns.getServerMaxRam(host))
}
function removeExclusion(host, ram) {
	exclusionMap[host] = exclusionMap[host] || 0;
	exclusionMap[host] = Math.max(exclusionMap[host] - ram, 0);
}
function excludedHostRam(host) {
	return exclusionMap[host] || 0;
}