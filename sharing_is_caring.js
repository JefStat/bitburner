import { list_servers } from 'opened_servers.js';
const share_script = "share.js";
let share_scriptRam = 4;
/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('getServerMaxRam');
	ns.disableLog('getServerUsedRam');
	ns.disableLog('sleep');
	share_scriptRam = ns.getScriptRam(share_script, "home");
	const openedServers = (await list_servers(ns)).filter(s => ns.hasRootAccess(s))
	let serversForExecution = ns.getPurchasedServers().concat(openedServers);
	while (true) {
		for (const host of serversForExecution) {
			const threadsAvailable = Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / share_scriptRam);
			if (threadsAvailable <= 0) continue;
			if (!ns.fileExists(share_script, host)) {
				await ns.scp(share_script, host);
			}
			await ns.exec(share_script, host, threadsAvailable);
			await ns.sleep(0);
		}
		// only use max 50% of home for sharing 
		const threadsAvailable = Math.floor(((ns.getServerMaxRam('home') / 2) - ns.getServerUsedRam('home')) / share_scriptRam);
		if (threadsAvailable > 0) {
			await ns.exec(share_script, 'home', threadsAvailable, Math.random());
		}
		await ns.sleep(0);
	}
}