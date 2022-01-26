import { runHackScript } from 'utils.js';
import { list_servers } from 'opened_servers.js';
import { hackFactor, growthFactor } from 'config.js';
let ns;
const weaken_script = "weaken.js";
const grow_script = "grow.js";
const hack_script = "hack.js";
let hack_scriptRam = 1.7;
let weaken_scriptRam = 1.75;
let grow_scriptRam = 1.75;
let hostServers = [];
let hackServers = [];
let importantStuff = {};
/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	ns.disableLog('getServerMaxRam');
	ns.disableLog('sleep');
	ns.disableLog('scan');
	ns.disableLog('getHackingLevel');
	ns.disableLog('getServerMaxMoney');
	ns.disableLog('getServerRequiredHackingLevel');

	ns.tail();
	while (true) {
		await updateHosts();
		await updateTargets();
		for (const target of hackServers) {
			await tryAgain(target)
			ns.print(`${target.server.hostname} is: ` + JSON.stringify(importantStuff[target.server.hostname], (k, v) => typeof v === 'number' ? ns.tFormat(Math.ceil(v - Date.now())) : v, 2));
			await ns.sleep(0);
		}
		await ns.sleep(10);
	}
}

async function tryAgain(target) {
	importantStuff[target.server.hostname] = importantStuff[target.server.hostname] || {
		weakLookAhead: [],
		growLookAhead: [],
		hackLookAhead: [],
		mostRecentWeakFinish: Date.now()
	};
	const is = importantStuff[target.server.hostname];
	// filter out any dates in the past
	is.weakLookAhead = is.weakLookAhead.filter(t => t > Date.now());
	is.growLookAhead = is.growLookAhead.filter(t => t > Date.now());
	is.hackLookAhead = is.hackLookAhead.filter(t => t > Date.now());

	const player = ns.getPlayer();
	// Start with adding a weaken its the slowest part of hack
	// Weaken strength of security increase from a growth factor on a single core host.
	// No harm to over weaken a server, inefficiency for algorithm simplicity.
	// Weaken should finish 10s apart so a grow or hack can occur reliably between them
	// Max 2 weaken calls in weakLookAhead to be popped off by a grow or hack
	const weakAt = ns.formulas.hacking.weakenTime(target.server, player) + Date.now();
	const weakWeakDelta = weakAt - is.mostRecentWeakFinish;
	const weakMinDelta = 2000;
	if (weakMinDelta > weakWeakDelta && is.weakLookAhead.length < 4) {
		ns.print(`Next weak in ${ns.tFormat(weakWeakDelta - weakMinDelta)}`);
	} else {
		const currentSecurity = Math.ceil(ns.growthAnalyze(target.server.hostname, growthFactor))
		// too frustrated to make a multiple host lookup with different cores
		const owk = ns.weakenAnalyze(1, 1);
		const threads = Math.max(Math.ceil(currentSecurity / owk), 1);
		const hosts = findHostsForThreads(currentSecurity);
		if (!hosts.length) {
			ns.print(`No host available for a weaken of ${target.server.hostname}[${threads}] +${currentSecurity}`);
		} else {
			let started = true;
			for (const host of hosts) {
				const pid = await runHackScript(ns, weaken_script, host.host, host.threads, target.server.hostname);
				if (pid <= 0) {
					ns.tprint(`FAILED TO START ${weaken_script} ${host.host}[${host.threads}] -> ${target.server.hostname}`);
					started = false;
					break;
				}
			}
			if (started) {
				is.mostRecentWeakFinish = weakAt;
				is.weakLookAhead.push(is.mostRecentWeakFinish);
			}
		}
	}
	const currentSecurity = target.server.hackDifficulty - target.server.minDifficulty;
	// wait till security is at minimum before starting the hack grow cycle
	if (currentSecurity > 0) {
		ns.print(`Waiting to weaken ${target.server.hostname}+${currentSecurity}`);
		return;
	}
	// security is at min to start hack or grow
	if (is.weakLookAhead.length > 0 && is.growLookAhead.length == 0) {
		const growAt = Date.now() + target.growTime;
		const growWeakDelta = is.weakLookAhead[0] - growAt;

		if (500 < growWeakDelta && growWeakDelta < 2000) {
			ns.print(`Next grow window in ${ns.tFormat(growWeakDelta - 500)} growAt ${ns.tFormat(growAt)} weakAt ${ns.tFormat(is.weakLookAhead[0])}`);
		} else {
			const threads = Math.ceil(ns.growthAnalyze(target.server.hostname, growthFactor));
			const hosts = findHostsForThreads(threads);
			if (!hosts.length) {
				ns.print(`No host available for a grow of ${target.server.hostname}[${threads}] +${ns.growthAnalyzeSecurity(threads)}`);
			} else {
				let started = true;
				for (const host of hosts) {
					const pid = await runHackScript(ns, grow_script, host.host, host.threads, target.server.hostname);
					if (pid <= 0) {
						ns.tprint(`FAILED TO START ${grow_script} ${host.host}[${host.threads}] -> ${target.server.hostname}`);
						started = false;
						break;
					}
				}
				if (started) {
					is.weakLookAhead.shift();
					is.growLookAhead.push(Date.now() + target.growTime);
				}
			}
		}
	}
	if (is.weakLookAhead.length > 0 && is.growLookAhead.length > 0) {
		const hackAt = Date.now() + target.hackTime;
		const hackWeakDelta = is.weakLookAhead[0] - hackAt;
		if (500 < hackWeakDelta && hackWeakDelta < 2000) {
			ns.print(`Next hack window in ${ns.tFormat(hackWeakDelta - 500)} growAt ${ns.tFormat(hackAt)} weakAt ${ns.tFormat(is.weakLookAhead[0])}`);
		} else {
			const threads = Math.max(Math.floor(hackFactor / ns.hackAnalyze(target.server.hostname)), 1);
			const hosts = findHostsForThreads(threads, true);
			for (const host of hosts) {
				const pid = await runHackScript(ns, hack_script, host.host, host.threads, target.server.hostname);
				if (pid <= 0) {
					ns.tprint(`FAILED TO START ${hack_script} ${host.host}[${host.threads}] -> ${target.server.hostname}`);
					return;
				}
			}
			is.hackLookAhead.push(Date.now() + target.hackTime);
			is.growLookAhead.shift();
			is.weakLookAhead.shift();
		}
	}
}

function findHostsForThreads(threads, returnPartial) {
	let threadAcc = threads;
	const hosts = [];
	for (const host of hostServers) {
		if (threadAcc <= 0) break;
		const useThreads = Math.min(threadAcc, host.threadsAvailable);
		if (useThreads > 0) {
			hosts.push({ host: host.server.hostname, threads: useThreads });
			host.threadsAvailable -= useThreads;
		}
		threadAcc -= useThreads;
	}
	// ns.print(`threads${threads} threadAcc ${threadAcc}`);
	if (threadAcc > 0 && !returnPartial) return [];
	return hosts;
}

async function updateHosts() {
	const openedServers = (await list_servers(ns)).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 1)
	const serversForExecution = ['home'].concat(ns.getPurchasedServers()).concat(openedServers);
	hostServers = [];
	for (const host of serversForExecution) {
		const s = ns.getServer(host);
		// reserve some ram for other scripts
		if (host === 'home' && s.maxRam >= 64) {
			s.maxRam = s.maxRam - 32;
		} else if (host === 'home' && s.maxRam === 32) {
			s.maxRam = s.maxRam - 16;
		}
		const threadsAvailable = Math.max(Math.floor((s.maxRam - s.ramUsed) / weaken_scriptRam), 0);
		hostServers.push({
			server: s,
			cpuCores: s.cpuCores,
			threadsAvailable
		});
		await ns.sleep(0);
	}
}

async function updateTargets() {
	const player = ns.getPlayer();
	const beforeHackStatuslength = hackServers.length;
	// const serversToHack = (await list_servers(ns)).filter(s => ns.hasRootAccess(s)
	// 	&& ns.getServerMaxMoney(s) > 0
	// 	&& ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel());
	const serversToHack = ['n00dles'];
	hackServers = [];
	for (const s of serversToHack) {
		const server = ns.getServer(s);
		server.hackDifficulty = server.minDifficulty;
		// check that hacks will succeed. Could be redundant check
		const hackChance = ns.formulas.hacking.hackChance(server, player);
		if (hackChance < .95) {
			ns.print(`Hack chance to low ${s} ${(hackChance * 100).toFixed(2)}%`)
			continue;
		}
		if (server.serverGrowth < 40) {
			ns.print(`Growth is to low ${s} ${server.serverGrowth}%`)
			continue;
		}

		hackServers.push({
			server,
			// times are consistent on starting hack and grow when security is minimum
			// weaken is never started at security minmum
			// weakTime: ns.formulas.hacking.weakenTime(s, player), 
			growTime: ns.formulas.hacking.growTime(server, player),
			hackTime: ns.formulas.hacking.hackTime(server, player)
		});
		await ns.sleep(0);
	}
	if (beforeHackStatuslength < hackServers.length) ns.print(`Servers to hack ${hackServers.length}`);
}