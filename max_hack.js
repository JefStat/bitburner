import { getHosts, runHackScript } from 'utils.js';
/** @param {NS} ns **/
export async function main(ns) {
	const target = 'joesguns';
	while (true) {
		const hosts = getHosts(ns, 1.75);
		for (const host of hosts) {
			if (host.server.hostname === 'home') continue;
			if (!host.threadsAvailable) continue;
			await runHackScript(ns, 'weaken.js', host.server.hostname, host.threadsAvailable, target);
		}
		await ns.sleep(ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer()) + 100);
	}
}