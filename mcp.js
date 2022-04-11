import { list_servers } from 'opened_servers.js';
import { boxTailSingleton, ramUsage } from 'utils.js';

let ns;
const weaken_script = "weaken.js";
const grow_script = "grow.js";
const hack_script = "hack.js";
let hack_scriptRam = 1.7;
let grow_scriptRam, weaken_scriptRam = 1.75;
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
	let res;
	await updateServerLists();
	let updateAfter = Date.now().valueOf() + 30 * 1000;
	while (true) {
		const state = getNextState(hackStatus[i].server, hackStatus[i].nextStateUpdateRequiredAt);
		if (state) {
			hackStatus[i] = state;

			switch (state.nextState) {
				case 'weaken':
					res = await runWeaken(state.server, state.currentSecurity, state.threadsCommitted);
					// ns.print(`Weak time ${ns.tFormat(res.time)}`);
					break;
				case 'grow':
					res = await runGrow(state.server, state.percentMoney, state.threadsCommitted);
					// ns.print(`Grow time ${ns.tFormat(res.time)}`);
					break;
				case 'hack':
					res = await runHack(state.server, state.threadsCommitted);
					// ns.print(`Hack time ${ns.tFormat(res.time)}`);
					break;
			}

			state.nextStateUpdateRequiredAt = Date.now() + res.time;
			// ns.print(`Next update at: ${new Date(state.nextStateUpdateRequiredAt).toTimeString()}`);
			state.threadsCommitted = res.threadsCommitted
		}
		i = (i + 1) % hackStatus.length;
		await ns.sleep(1000);
		if (updateAfter < Date.now()) {
			updateAfter = Date.now() + 30 * 1000;
			await updateServerLists();
			i = 0;
		}
	}
}
const getCores = (host) => ns.getServer(host).cpuCores;

async function runWeaken(target, currentSecurity, threads) {
	let time = 0;
	let threadsCommitted = 0;
	const { host, threads_available } = getHostAndThreads(weaken_scriptRam);
	if (!host) return { time, threadsCommitted };
	let threadToUse = threads_available;
	const owk = ns.weakenAnalyze(1, getCores(host));
	const threadsNeeded = Math.max(Math.ceil(currentSecurity / owk) - threads, 1);
	threadToUse = Math.min(threadToUse, threadsNeeded);
	if (!ns.fileExists(weaken_script, host)) {
		await ns.scp(weaken_script, host);
	}
	const pid = await ns.exec(weaken_script, host, threadToUse, target, Math.random());
	if (pid > 0) {
		if (hasFormulas() && threadsNeeded <= threadToUse) {
			time = ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer());
		}
		// ns.print(`Weaken ${host}[${threadToUse}] -> ${target}`);
		threadsCommitted = threadToUse;
	}
	return { time, threadsCommitted };
}

async function runGrow(target, percentMoney, threads) {
	let time = 0;
	let threadsCommitted = 0;
	const { host, threads_available } = getHostAndThreads(grow_scriptRam);
	if (!host) return { time, threadsCommitted };
	const growthFactor = 1 / (percentMoney || 0.0000001);
	const threadsNeeded = Math.max(Math.floor(ns.growthAnalyze(target, growthFactor, getCores(host))) - threads, 1);
	let threadToUse = Math.min(threads_available, threadsNeeded);
	if (!ns.fileExists(grow_script, host)) {
		await ns.scp(grow_script, host);
	}

	const pid = await ns.exec(grow_script, host, threadToUse, target, Math.random());
	if (pid > 0) {
		if (hasFormulas() && threadsNeeded <= threadToUse) {
			time = ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer());
		}
		// ns.print(`Grow ${host}[${threadToUse}] -> ${target}`);
		threadsCommitted = threadToUse;
	}
	const w = await runWeaken(target,ns.growthAnalyzeSecurity(threadsCommitted),0);
	return { time:w.time, threadsCommitted: w.threadsCommitted + threadsCommitted };
}

async function runHack(target, threads) {
	let time = 0;
	let threadsCommitted = 0;
	const { host, threads_available } = getHostAndThreads(hack_scriptRam);
	if (!host) return { time, threadsCommitted };
	const threadsNeeded = Math.max(parseInt((hackPercent / ns.hackAnalyze(target)).toFixed(0)) - threads, 1);
	let threadToUse = Math.min(threads_available, threadsNeeded);
	if (!ns.fileExists(hack_script, host)) {
		await ns.scp(hack_script, host);
	}

	const cashingOut = ns.hackAnalyze(target) * threadToUse * ns.getServerMoneyAvailable(target);
	const pid = await ns.exec(hack_script, host, threadToUse, target, Math.random());

	if (pid > 0) {
		if (hasFormulas() && threadsNeeded <= threadToUse) {
			time = ns.formulas.hacking.hackTime(ns.getServer(target), ns.getPlayer());
		}
		ns.print(`Hack ${host}[${threadToUse}] -> ${target}[${ns.nFormat(cashingOut, "($ 0.00 a)")}]`);
		threadsCommitted = threadToUse;
	}

	const w = await runWeaken(target,ns.hackAnalyzeSecurity(threadsCommitted),0);
	return { time:w.time, threadsCommitted: w.threadsCommitted + threadsCommitted };
}

function hasFormulas() {
	return ns.fileExists('Formulas.exe');
}
function getHostAndThreads(scriptRam) {
	const host = serversForExecution.find((host) => {
		let maxRam = ns.getServerMaxRam(host);
		// reserve some ram for other scripts
		if (host === 'home') {
			maxRam = Math.max(maxRam * .75, maxRam - 128);
		}
		const threads_available = Math.floor((maxRam - ns.getServerUsedRam(host)) / scriptRam);
		return threads_available >= 1;
	});
	if (!host) return { host: null, threads_available: 0 };
	let maxRam = ns.getServerMaxRam(host);
	// reserve some ram for other scripts
	if (host === 'home') {
		maxRam = Math.max(maxRam * .75, maxRam - 128);
	}
	const threads_available = Math.floor((maxRam - ns.getServerUsedRam(host)) / scriptRam);
	return { host, threads_available };
}
function getNextState(server, nextStateUpdateRequiredAt) {
	if (nextStateUpdateRequiredAt > Date.now()) return null;
	let nextState;
	const sec = parseFloat((ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server)).toFixed(2));
	const percentMoney = parseFloat((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)).toFixed(2));
	if (sec > 5) {
		nextState = 'weaken';
	} else if (percentMoney < 0.95) {
		nextState = 'grow';
	} else {
		nextState = 'hack';
	}
	// 	ns.print(`Next state for ${server} ${nextState} 
	//   $% : ${percentMoney * 100} 
	//   sec: +${sec.toFixed(2)} 
	//   at : ${new Date(nextStateUpdateRequiredAt ? nextStateUpdateRequiredAt : Date.now()).toTimeString()}`);
	return {
		server: server,
		nextState: nextState,
		percentMoney: percentMoney,
		currentSecurity: sec,
		nextStateUpdateRequiredAt: 0,
		threadsCommitted: 0
	};
}