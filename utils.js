import { list_servers } from 'opened_servers.js';

/** @param {NS} ns **/
export async function runHackScript(ns, script, host, threads, target) {
	if (!ns.fileExists(script, host)) {
		await ns.scp(script, host);
	}
	return Promise.resolve(ns.exec(script, host, threads, target, Math.random()));
}

/** @param {NS} ns **/
export function getHosts(ns, scriptRam) {
	const openedServers = list_servers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 1);
	const s = ns.getServer('home');
	// reserve some ram for other scripts
	if (s.maxRam >= 64) {
		s.maxRam = s.maxRam - 32;
	} else if (host === 'home' && s.maxRam === 32) {
		s.maxRam = s.maxRam - 16;
	}
	const hostServers = [{
		server: s,
		cpuCores: s.cpuCores,
		threadsAvailable: Math.max(Math.floor((s.maxRam - s.ramUsed) / scriptRam), 0)
	}];
	for (const host of openedServers) {
		const s = ns.getServer(host);
		const threadsAvailable = Math.max(Math.floor((s.maxRam - s.ramUsed) / scriptRam), 0);
		hostServers.push({
			server: s,
			cpuCores: s.cpuCores,
			threadsAvailable
		});
	}
	return hostServers;
}

let hackList = ['n00dles']
let lastUpdate = Date.now();
export function getHackList(forceRefresh) {
	if (!forceRefresh && lastUpdate < Date.now() - 60 * 1000) {
		return hackList;
	}
	const beforeHackList = hackStatus.length;
	const serversToHack = list_servers(ns).filter(s => ns.hasRootAccess(s)
		&& ns.getServerMaxMoney(s) > 0
		&& ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel());
	hackList = [];
	const player = ns.getPlayer();
	for (const server of serversToHack) {
		const s = ns.getServer(server);
		s.hackDifficulty = s.minDifficulty;
		// check that hacks will succeed.
		const hackChance = ns.formulas.hacking.hackChance(s, player);
		if (hackChance < .9) {
			//ns.print(`Hack chance to low ${s} ${(hackChance * 100).toFixed(2)}%`)
			continue;
		}
		// waste of resources to do expensive ram costs on grow
		if (s.serverGrowth < 40) {
			//ns.print(`Growth is to low ${s} ${s.serverGrowth}%`)
			continue;
		}
		// ns.exec('monitor.js', 'home', 1, server);
		hackList.push({ server: server });
	}
	// after aug install just start hacking on n00dles
	if (hackList.length === 0) hackStatus.push({ server: 'n00dles' });
	if (beforeHackList < hackList.length) ns.tprint(`Servers to hack ${hackStatus.length} ${hackStatus.map(o => o.server).join(',')}`);
	lastUpdate = Date.now();
	return hackList;
}

export function ramUsage(ns) {
	const serversWithRam = ns.getPurchasedServers().concat(
		list_servers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 1));
	return serversWithRam.map(o => ns.getServerUsedRam(o) / ns.getServerMaxRam(o)).reduce((a, b) => a + b, 0) / serversWithRam.length;
}