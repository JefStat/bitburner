import { list_servers } from 'opened_servers.js';
import { createSidebarItem, sidebar } from "/box/box.js"

export const boxTailSingleton = (ns, title, icon, height) => {
	var res = [];
	sidebar.querySelectorAll('div.sbitem').forEach(sbitem => res.push({ sbitem, title: sbitem.querySelector('div.head > span').innerText }));
	let box = res.find(o => o.title === title);
	if (box) {
		box = box.sbitem;
	} else {
		box = createSidebarItem(title, "<div/>", icon);
	}
	if (height) box.style.height = height;

	const _print = ns.print;
	ns.print = (m) => {
		box.log(`<span>${m}</span>`);
		_print(m);
		box.logDiv = box.body.querySelector('div.log');
		if (box.logDiv.childElementCount > 500) {
			box.logDiv.replaceChildren(...Array.from(box.logDiv.children).slice(-100))
		}
	}
}

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
/** @param {NS} ns **/
export function ramUsage(ns) {
	const serversWithRam = ['home'].concat(list_servers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 1));
	return serversWithRam.map(o => ns.getServerUsedRam(o) / ns.getServerMaxRam(o)).reduce((a, b) => a + b, 0) / serversWithRam.length;
}