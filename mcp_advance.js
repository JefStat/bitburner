import {runHackScript} from 'utils.js';
import {list_servers} from 'opened_servers.js';
let ns;
const weaken_script = "weaken.js";
const grow_script = "grow.js";
const hack_script = "hack.js";
let weaken_scriptRam, grow_scriptRam, hack_scriptRam = 1.7;
let hostServers = [];
let hackServers = [];
let importantStuff = {};
const delay = 250; // milliseconds
/** @param {NS} pns **/
export async function main(pns) {
		ns = pns;
	// Security increases scales lineraly with number of threads;
	// Refresh the amount every loop. Probably static every augment refresh.
	// tested 0.04 for grow 0.02 for hack
	const growSecurityInc = ns.growthAnalyzeSecurity(1);
	const hackSecurityInc = ns.hackAnalyzeSecurity(1);
	while(true){
		await updateHosts();
		await updateTargets();
		for (const target of hackServers) {
			await tryAgain(target)
			ns.sleep(0);
		}
		await ns.sleep(50);
	}
}

async function tryAgain(target) {
	importantStuff[target.server.hostname] = importantStuff[target.server.hostname] || {
		maxMoneyAt:[],
		weakLookAhead: [],
		mostRecentWeakFinish = Date.now(),
		percentMoney: target.server.moneyAvailable / target.server.moneyMax
	};
	const is = importantStuff[target.server.hostname];
	// trim out any weaklookahead times in the past
	is.weakLookAhead = is.weakLookAhead.filter(t => t < Date.now());
	is.weakLookAhead = is.weakLookAhead.filter(t => t < Date.now());
	const player = ns.getPlayer();
	// Start with adding a weaken its the slowest part of hack
	// Weaken strength of security increase from a 2.1 growth factor on a single core host.
	// No harm to over weaken a server, inefficiency for algorithm simplicity.
	// Weaken should finish delay*2 apart so a grow or hack can occur reliably between them
	const weakDelta = Date.now() - (is.mostRecentWeakFinish - ns.formulas.hacking.weakenTime(tserver, player));
	if (weakDelta > delay * 2) {
		const securityDelta = await computeGrowThreads(tserver, player, 1);
		const {host, threads} = findHostForWeaken(securityDelta);
		if (!host) {
			ns.tprint(`No host available for a weaken of ${target.server.hostname}[${threads}] +${currentSecurity}`);
			return;
		}
		const pid  = await runHackScript(weaken_script, host, threads, target.server.hostname);
		if (pid <= 0) {
			ns.tprint(`FAILED TO START ${weaken_script} ${host}[${threads}] -> ${target.server.hostname}`);
			return;
		}
		is.weakLookAhead.push(Date.now() + ns.formulas.hacking.weakenTime(tserver, player));
		return;
	}
	const currentSecurity = tserver.hackDifficulty - tserver.minDifficulty;
	if (currentSecurity > 0) {
		ns.tprint(`Waiting to weaken ${target.server.hostname}+${currentSecurity}`);
		// wait till security is at minimum before starting the hack grow cycle
		return;
	}
	// security is at min to start hack or grow
	if (is.weakLookAhead.length > 0
		// check if the next grow is going to push the server to max money
		&& is.percentMoney < 1) {
		const weakTime = is.weakLookAhead.shift();
		const growWindow = weakTime - Date.now() - target.growTime;
		if ( growWindow > 250) {
			const {host, threads} = findHostForGrow(tserver);
			if (!host) {
				ns.tprint(`No host available for a grow of ${target.server.hostname}[${threads}] +${currentSecurity}`);
				return;
			}
			const pid  = await runHackScript(grow_script, host.server.hostname, threads, target.server.hostname);
			if (pid <= 0) {
				ns.tprint(`FAILED TO START ${grow_script} ${host.server.hostname}[${threads}] -> ${target.server.hostname}`);
				return;
			}
			is.percentMoney = Math.min(1, is.percentMoney*ns.formulas.hacking.growPercent(target.server, threads, player, host.cpuCores));
			is.growLookAhead.push(Date.now() + target.growTime);
		} else {
			is.weakLookAhead.unshift(weakTime);
			ns.tprint(`Grow window missed ${growWindow} ${weakTime} ${Date.now()} ${target.growTime}`);
		}
	}
	if (is.weakLookAhead.length > 0 && is.percentMoney >= 1) {
		const weakTime = is.weakLookAhead.shift();
		const hackWindow = weakTime - Date.now() - target.hackTime;
		if ( hackWindow > 250) {
			const growLookAhead = is.growLookAhead.shift();
			const {host, threads} = findHostForHack(tserver);
			if (!host) {
				ns.tprint(`No host available for a hack of ${target.server.hostname}[${threads}] +${currentSecurity}`);
				return;
			}
			const pid  = await runHackScript(hack_script, host, threads, target.server.hostname);
			if (pid <= 0) {
				ns.tprint(`FAILED TO START ${hack_script} ${host}[${threads}] -> ${target.server.hostname}`);
				return;
			}
			is.percentMoney = .5;
		} else {
			const gla = is.weakLookAhead.unshift(weakTime);
			ns.tprint(`Hack window missed ${growWindow} ${weakTime} ${Date.now()} ${target.hackTime}`);
		}	
	}
}

async function computeGrowThreads(target, player, cpuCores) {
	let percent = 0;
	let threads = 1;
	// always grow by double + 10% and hack by 50%. 
	// this is done to avoid extra logic to prep servers to max money. 
	// also keeps the number of thread needed to a manageble number
	while (percent < 2.1) {
		// grow percents are not linear per thread this will be the most accurate value
		percent = ns.formulas.hacking.growPercent(target, threads++, player, cpuCores);
		await ns.sleep(0);
	}
	return threads;
}

function findHostForHack() {
	let threads = 1;
	const threadsNeeded = Math.max(parseInt((.5 / ns.hackAnalyze(target)).toFixed(0)) - threads, 1);
	const host = hostServers.find(s => s.threadsAvailable >= threadsNeeded);
	return {host, threads};
}

async function findHostForGrow(target) {
	let threads = 1;
	const player = ns.getPlayer();
	const host = hostServers.find(s => {
		let percent = 0;
		threads = computeGrowThreads(target, player, s.cpuCores);
		return s.threadsAvailable >= threads;
	});
	return {host, threads};
}

function findHostForWeaken(currentSecurity) {
	let threads = 1;
	const host = hostServers.find(s => {
		const owk = ns.weakenAnalyze(1, s.cpuCores);
		threads = Math.max(Math.ceil(currentSecurity / owk), 1);
		return s.threadsAvailable >= threads;
	});
	return {host, threads};
}

async function updateHosts() {
	const openedServers = (await list_servers(ns)).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 1)
	const serversForExecution = ['home'].concat(ns.getPurchasedServers()).concat(openedServers);
	hostServers = [];
	for (const server of serversToHack) {
		const s = ns.getServer(server);
		// reserve some ram for other scripts
		if (host === 'home' && s.maxRam >= 128) {
			maxRam = maxRam - 64;
		}
		const threadsAvailable = Math.floor((s.maxRam - s.ramUsed) / hack_scriptRam);
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
	const serversToHack = (await list_servers(ns)).filter(s => {
	return ns.hasRootAccess(s)
		&& ns.getServerMaxMoney(s) > 0
		&& ns.hackAnalyze(s) > 0});
	hackServers = [];
	for (const server of serversToHack) {
		const s = ns.getServer(server); 
		server.hackDifficulty = server.minDifficulty;
		// check that hacks will succeed. Could be redundant check
		const hackChance =ns.formulas.hacking.hackChance(server,player);
		if (hackChance < .95) 
		{
			ns.tprint(`Hack chance to low ${server} ${(hackChance *100).toFixed(2)}%`)
			continue;
		}

		hackServers.push({ 
			server,
			// times are consistent on starting hack and grow when security is minimum
			// weaken is never started at security minmum
			// weakTime: ns.formulas.hacking.weakenTime(s, player), 
			growTime: ns.formulas.hacking.growTime(s, player),
			hackTime: ns.formulas.hacking.hackTime(s, player)

		});
		await ns.sleep(1);
	}
	if (beforeHackStatuslength < hackStatus.length) ns.tprint(`Servers to hack ${serversToHack.length}`);
}