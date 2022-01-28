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
	const serversForExecution = ns.getPurchasedServers().concat(openedServers);
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
	for (const host of serversForExecution) {
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