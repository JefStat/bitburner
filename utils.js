import { list_servers } from 'opened_servers.js';
import { createSidebarItem, sidebar } from "/box/box.js"

export const sleevesPortNumber = 15;

export const findBox = (title) => {
	let res = [];
	sidebar.querySelectorAll('div.sbitem').forEach(sbitem => res.push({ sbitem, title: sbitem.querySelector('div.head > span').innerText }));
	let box = res.find(o => o.title === title);
	return box ? box.sbitem : box;
}

export const boxTailSingleton = (ns, title, icon, height, pinned = "<div/>") => {
	let box = findBox(title);
	if (!box) {
		box = createSidebarItem(title, pinned, icon);
	}
	if (height) box.style.height = height;

	const _clearLog = ns.clearLog;
	ns.clearLog = () => {
		_clearLog();
		box.logDiv = box.body.querySelector('div.log');
		if (box.logDiv) box.logDiv.replaceChildren([]);
	}
	const logEntryLimit = 500;
	const _print = ns.print;
	ns.print = (m) => {
		box.log(`<span>${m}</span>`);
		_print(m);
		box.logDiv = box.body.querySelector('div.log');
		while (box.logDiv.children.length > logEntryLimit) box.logDiv.children[0].remove();
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

const weaken_script = "weaken.js";
const grow_script = "grow.js";
const hack_script = "hack.js";
/** @param {NS} ns **/
export async function copyHackingFiles(ns, server) {
	if (server.hasAdminRights) {
		if (!ns.fileExists(hack_script, server.hostname)) {
			await ns.scp(hack_script, server.hostname);
		}
		if (!ns.fileExists(grow_script, server.hostname)) {
			await ns.scp(grow_script, server.hostname);
		}
		if (!ns.fileExists(weaken_script, server.hostname)) {
			await ns.scp(weaken_script, server.hostname);
		}
	}
}
export function tryGetBitNodeMultipliers(ns) {
	return JSON.parse(ns.read(`/tmp/getBitNodeMultipliers.txt`));
}
export function inGangStatic(ns) {
	return ns.read(`/tmp/ingang.txt`);
}