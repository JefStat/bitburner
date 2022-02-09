import { getHosts, runHackScript } from 'utils.js';
/** @param {NS} ns **/
export async function main(ns) {
	const target = 'foodnstuff';
	while (true) {
		const hosts = getHosts(ns, 1.7);
		for (const host of hosts) {
			if (!host.threadsAvailable) continue;
			await runHackScript(ns, 'hack.js', host.server.hostname, host.threadsAvailable, target);
		}
		await ns.sleep(ns.formulas.hacking.hackTime(ns.getServer(target), ns.getPlayer()) + 100);
	}
}