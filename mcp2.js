import { list_servers } from 'opened_servers.js';
import {getCores} from 'utils.js';
let ns;
const weaken_script = "weaken2.js";
const grow_script = "grow2.js";
const hack_script = "hack2.js";
const delay = 250;
let weaken_scriptRam, grow_scriptRam, hack_scriptRam = 1.70;
let serversForExecution = [];
let hackStatus = [];
/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	// ns.disableLog('getServerNumPortsRequired');
	// ns.disableLog('getServerMaxRam');
	// ns.disableLog('getServerUsedRam');
	// ns.disableLog('sleep');
	// ns.disableLog('getServerSecurityLevel');
	// ns.disableLog('getServerMinSecurityLevel');
	// ns.disableLog('getServerMaxMoney');
	// ns.disableLog('getServerMoneyAvailable');
	// ns.disableLog('scan');
	ns.tail();
	ns.disableLog('ALL');
	weaken_scriptRam = ns.getScriptRam(weaken_script, "home");
	grow_scriptRam = ns.getScriptRam(grow_script, "home");
	hack_scriptRam = ns.getScriptRam(hack_script, "home");
	await run();
}
async function updateServerLists() {
	const openedServers = (await list_servers(ns)).filter(s => ns.hasRootAccess(s))
	serversForExecution = ['home'].concat(ns.getPurchasedServers()).concat(openedServers);
	const beforeHackStatuslength = hackStatus.length;
	const serversToHack = (await list_servers(ns)).filter(s => ns.hasRootAccess(s)
		&& ns.getServerMaxMoney(s) > 0
		&& ns.hackAnalyze(s) > 0);
	const preppedServers = serversToHack.filter((s) => ns.fileExists('prepped.txt', host));
	const serversToPrep = serversToHack.filter((s) => !ns.fileExists('prepped.txt', host));
	await runPrep(serversToPrep);
	hackStatus = [];
	for (const server of preppedServers) {
		hackStatus.push(initServerState(server));
		await ns.sleep(1);
	}
	if (beforeHackStatuslength < hackStatus.length) ns.tprint(`Servers to hack ${serversToHack.length}`);
}
async function runPrep() {
	await ns.exec(weaken_script, host, threads, target, Math.random());
		setTimeout(async () =>await ns.exec(grow_script, host, threads, target, Math.random());
		setTimeout(async () =>await ns.exec(weaken_script, host, threads, target, Math.random());
}


async function run() {
	let i = 0;
	await updateServerLists();
	while (true) {
		const host = getHost(hackStatus[i]);
		const prevBatch = hackStatus[i].batchWindowClosed;
		const state = refreshState(hackStatus[i], host);
		if (state.batchWindowOpened < prevBatch)
		{
			ns.tprint(`${state.batchWindowOpened} < ${prevBatch}`);
			continue;
		}
		await runWeaken(host, state.server, state.weakHackThreadsNeeded);
		setTimeout(async () => await runHack(host, state.server, state.hackThreadsNeeded), state.currentWeakTime - delay - state.currentHackTime);
		setTimeout(async () => await runGrow(host, state.server, state.growThreadsNeeded), state.currentWeakTime + delay - state.currentGrowTime);
		setTimeout(async () => await runWeaken(host, state.server, state.weakGrowThreadsNeeded), state.currentWeakTime + delay + delay - state.currentWeakTime);
		state.batchHosts.push({
			host, hackStart: state.batchWindowOpened, hackEnd: state.batchWindowClosed
		});
		hackStatus[i] = state;
		i = (i + 1) % hackStatus.length;
		await ns.sleep(1);
	}
}
function getHost(state) {
	return serversForExecution.find((host) => {
		let ramReq = getRamRequirements(host, state,server, state.hackSecurityInc);
		let maxRam = ns.getServerMaxRam(host);
		// reserve some ram on home for other scripts
		if (host === 'home' && maxRam >= 128) {
			maxRam = maxRam - 64;
		}
		return  maxRam  >= ramReq;
	});
}


async function runWeaken(host, target, threads) {
	if (!ns.fileExists(weaken_script, host)) {
		await ns.scp(weaken_script, host);
	}
	const pid = await ns.exec(weaken_script, host, threads, target, Math.random());
	if (pid > 0) {
		ns.tprint(`FAILED TO START WEAKEN ${host}[${threadToUse}] -> ${target}`);
	}
	return pid;
}

async function runGrow(host, target, threads) {
	if (!ns.fileExists(grow_script, host)) {
		await ns.scp(grow_script, host);
	}

	const pid = await ns.exec(grow_script, host, threads, target, Math.random());
	if (pid > 0) {
		ns.tprint(`FAILED TO START GROW ${host}[${threadToUse}] -> ${target}`);
	}
	return pid;
}

async function runHack(host, target, threads) {
	if (!ns.fileExists(hack_script, host)) {
		await ns.scp(hack_script, host);
	}
	const pid = await ns.exec(hack_script, host, threads, target, Math.random());
	if (pid > 0) {
		ns.tprint(`FAILED TO START HACK ${host}[${threadToUse}] -> ${target}`);
	}
	return pid;
}

function refreshState(state, host) {
	const s = ns.getServer(state.server);
	const player = ns.getPlayer();
	
	state.currentSecurity = parseFloat((ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server)).toFixed(2)); 
	state.currentCashPercent = parseFloat((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)).toFixed(2));
	
	// Host independent hacking values
	s.moneyAvailable = s.moneyMax;
	s.hackDifficulty = s.minDifficulty;
	// servers that can be hacked for more than 50% money with a single thread will just go off the rails... oh well
	state.hackThreadsNeeded = Math.max(Math.ceil(.5 / ns.formulas.hacking.hackPercent(s, player)), 1);
	state.hackSecurityInc = ns.hackAnalyzeSecurity(state.hackThreadsNeeded)
	state.currentHackTime = ns.formulas.hacking.hackTime(s, player);// hacks must start with security at min

	// Host independent growing values
	server.hackDifficulty = server.minDifficulty;
	state.currentGrowTime = ns.formulas.hacking.growTime(s, player); // grow must start with security at min

	// Host independent weakening values
	// Weaken time is independent of security value
	state.currentWeakTime = ns.formulas.hacking.weakenTime(s, player); 
	
	// Batch values
	// Times are only affected by hack skill and player augs
	// weak time is always longest the hack should finish delay milliseconds before the weakend happens 
	state.batchWindowOpened = Date.now() + state.currentWeakTime - delay; 
	state.batchWindowClosed = Date.now() + state.batchWindowDuration
}

function getRamRequirements(target, host, hackSecurityInc, state) {
	const h = ns.getServer(host);
	const server = ns.getServer(target)
	server.hackDifficulty = server.minDifficulty;
	let percent = 0;
	let growThreadsNeeded = 1;
	const player = ns.getPlayer();
	while (percent < 2.1) {
		percent = ns.formulas.hacking.growPercent(server, growThreadsNeeded++, player, h.cpuCores);
	}
	const growSecurityInc = ns.growthAnalyzeSecurity(growThreadsNeeded);

	const owk = ns.weakenAnalyze(1, h.cpuCores);
	const weakGrowThreadsNeeded = Math.max(Math.ceil(growSecurityInc / owk), 1);
	const weakHackThreadsNeeded = Math.max(Math.ceil(hackSecurityInc / owk), 1);
	if (state) {
		state.growThreadsNeeded = growThreadsNeeded;
		state.weakGrowThreadsNeeded = weakGrowThreadsNeeded;
		state.weakHackThreadsNeeded = weakHackThreadsNeeded;
	}

	return state.hackThreadsNeeded * hack_scriptRam 
		+ state.growThreadsNeeded * grow_scriptRam 
		+ (state.weakGrowThreadsNeeded + state.weakHackThreadsNeeded) * weak_scriptRam;
}

function initServerState(server) {
	return {
		server,
		batchHosts: [], 
		batchWindowDuration: 250 + 250 + 250 + 250 // buffer between each operation and the end
		batchesInProgress: 0
		isBatchReady: false
	};
}

function readServerStateFile(server) {
	// const stateLog = ns.read(`state_${server}_${bitnode}_${augNum}`);
	// ns.write(handle: string, data?: string[] | number | string, mode?: "w" | "a"): Promise<void>;
}