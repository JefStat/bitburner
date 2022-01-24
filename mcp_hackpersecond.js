import { list_servers } from 'opened_servers.js';
import {getCores} from 'utils.js';
let ns;
const weaken_script = "weaken2.js";
const grow_script = "grow2.js";
const hack_script = "hack2.js";
let weaken_scriptRam, grow_scriptRam, hack_scriptRam = 1.70;
let serversForExecution = [];
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
async function run() {
	let i = 0;
	const host = 'home';
	while (true) {
		const state = hackStatus[i];
		let growThreads = await runGrow(host, state.server);
		let hackThreads = await runHack(host, state.server);
		let pid = await runWeaken(host, state.server, growThreads, hackThreads);
		i = (i + 1) % hackStatus.length;
		await ns.sleep(1);
	}
}

async function runWeaken(host, target, growThreads, hackThreads) {
	const server = ns.getServer(target);
	let threadToUse = 1;
	const owk = ns.weakenAnalyze(1, getCores(host));
	const threadsNeeded = Math.max(Math.ceil(server.minDifficulty / owk), 1);
	// have the weaken spam work at the maximum between hack or grow security increases
	server.hackDifficulty = Math.max(ns.growthAnalyzeSecurity(growThreads), ns.hackAnalyzeSecurity(hackThreads));
	const time = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
	const hertz = 1000 / time;
	threadToUse = Math.ceil(threadsNeeded / hertz);

	if (!ns.fileExists(weaken_script, host)) {
		await ns.scp(weaken_script, host);
	}
	const pid = await ns.exec(weaken_script, host, threadToUse, target, threadsNeeded);
	if (pid > 0) {
		ns.tprint(`FAILED TO START WEAKEN SPAM ${host}[${threadToUse}] -> ${target}`);
	}
	return pid;
}

async function runGrow(host, target) {
	// try to grow a bit more than hacking to lazily reach equilibrium of 50% of max money hacking
	const growthFactor = 2.1;
	const threadsNeeded = Math.max(parseInt(ns.growthAnalyze(target, growthFactor, getCores(host)).toFixed(0)), 1);
	let threadToUse = 1;
	const server = ns.getServer(target);
	// weaken spam should be keeping this to be true
	server.hackDifficulty = server.minDifficulty;
	const time = ns.formulas.hacking.growTime(server, ns.getPlayer());
	// every 2 seconds we grow
	const hertz = 2 * 1000 / time;
	threadToUse = Math.ceil(threadsNeeded / hertz);
	if (!ns.fileExists(grow_script, host)) {
		await ns.scp(grow_script, host);
	}

	const pid = await ns.exec(grow_script, host, threadToUse, target, threadsNeeded);
	if (pid > 0) {
		ns.tprint(`FAILED TO START GROW SPAM ${host}[${threadToUse}] -> ${target}`);
	}
	return threadsNeeded;
}

async function runHack(host, target) {
	const threadsNeeded = Math.max(parseInt((.5 / ns.hackAnalyze(target)).toFixed(0)), 1);
	let threadToUse = 1;
	const server = ns.getServer(target);
	// weaken spam should be keeping this to be true
	server.hackDifficulty = server.minDifficulty;
	const time = ns.formulas.hacking.hackTime(server, ns.getPlayer());
	// hack a bit slower than grow, ensuring grow stays ahead of hack
	const hertz = 2.01 * 1000 / time;
	threadToUse = Math.ceil(threadsNeeded / hertz);
	if (!ns.fileExists(hack_script, host)) {
		await ns.scp(hack_script, host);
	}
	const pid = await ns.exec(hack_script, host, threadToUse, target, threadsNeeded);
	if (pid > 0) {
		ns.tprint(`FAILED TO START HACK SPAM ${host}[${threadToUse}] -> ${target}`);
	}
	return threadsNeeded;
}
const stateMap = {};
function getNextState(server) {
	let nextState = 'weaken';
	// readServerStateFile();
	const state = stateMap[server] || {};
	state.server = server;
	state.currentSecurity = parseFloat((ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server)).toFixed(2)); 
	state.currentCashPercent = parseFloat((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)).toFixed(2));

	state.batchRequireMemory = 0;
	state.nextBatchFinishedAt = Date.now();
	state.batchesInProgress = 0;
	state.hosts = [];
	







	if (sec > 1) {
		nextState = 'weaken';
	} else if (percentMoney < 0.95 && sec < 1) {
		nextState = 'grow';
	} else if (percentMoney > 0.95 && sec < 1 ) {
		nextState = 'hack';
	} else {
		ns.tprint(`Unknown state ${sec} ${percentMoney}`);
	}
	stateMap[server] = state;
	return {
		server: server,
		nextState: nextState,
		percentMoney: percentMoney,
		currentSecurity: sec,
		nextStateUpdateRequiredAt: 0,
		threadsCommitted: 0
	};
}
function readServerStateFile(server) {
	const stateLog = ns.read(server + '_state');


	//ns.write(handle: string, data?: string[] | number | string, mode?: "w" | "a"): Promise<void>;
}